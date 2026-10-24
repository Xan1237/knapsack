import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import {
  checkRecordings,
  hash,
  junit,
  outputName,
  parseEvents,
  redactWith,
  saveRecordings,
  selectSuite,
  summarize,
} from "./lib.mjs";

const selected = [
  { id: "choices", file: "choices_test.md", live: false },
  { id: "export", file: "export_test.md", live: false },
];
const plan = { type: "testrun_plan", valid: true };
const terminal = {
  type: "testrun_done",
  overall_status: "passed",
  execution_id: "example-run",
};
const pass = (file) => ({
  type: "testrun_member_end",
  path: file,
  status: "passed",
  duration_s: 2,
});

test("suite selection rejects misspellings, duplicate files and duplicate members", () => {
  const manifest = {
    tests: selected,
    suites: { smoke: { tests: ["choices"] } },
  };
  assert.deepEqual(selectSuite(manifest, "smoke"), [selected[0]]);
  assert.deepEqual(selectSuite(manifest, "smoke", "choices"), [selected[0]]);
  assert.throws(() => selectSuite(manifest, "smoke", "export"), /not in suite/);
  assert.throws(() => selectSuite(manifest, "smok"), /Unknown/);
  assert.throws(
    () =>
      selectSuite(
        {
          ...manifest,
          tests: [selected[0], { ...selected[1], file: selected[0].file }],
        },
        "smoke",
      ),
    /unique/,
  );
  assert.throws(
    () =>
      selectSuite(
        { ...manifest, suites: { smoke: { tests: ["choices", "choices"] } } },
        "smoke",
      ),
    /Duplicate/,
  );
});

test("a complete suite accepts cross-platform member paths and both member types", () => {
  const events = [
    plan,
    pass("C:\\work\\choices_test.md"),
    {
      ...pass(".testmuai/tests/export_test.md"),
      type: "testrun_authored_member_end",
    },
    terminal,
  ];
  const summary = summarize(events, selected);
  assert.equal(summary.status, "passed");
  assert.equal(summary.totals.passed, 2);
  assert.equal(summary.executionId, "example-run");
});

test("an exit zero without the terminal result cannot pass", () => {
  const summary = summarize(
    [plan, pass("choices_test.md"), pass("export_test.md")],
    selected,
  );
  assert.equal(summary.status, "incomplete");
  assert.notEqual(summary.exitCode, 0);
});

test("an interrupted member and an unstarted member are accounted for honestly", () => {
  const summary = summarize(
    [plan, { type: "testrun_member_start", path: "choices_test.md" }],
    selected,
    { interrupted: true },
  );
  assert.deepEqual(summary.totals, {
    tests: 2,
    passed: 0,
    failed: 0,
    interrupted: 1,
    skipped: 1,
  });
  assert.equal(summary.exitCode, 3);
});

test("a passing terminal event cannot override failed or absent member results", () => {
  const summary = summarize(
    [
      plan,
      pass("choices_test.md"),
      { ...pass("export_test.md"), status: "failed" },
      terminal,
    ],
    selected,
  );
  assert.equal(summary.status, "failed");
  assert.equal(summary.totals.failed, 1);
  assert.notEqual(
    summarize([plan, pass("choices_test.md"), terminal], selected).exitCode,
    0,
  );
});

test("unresolved variables and unexpected tests fail the gate", () => {
  const complete = [plan, ...selected.map((test) => pass(test.file)), terminal];
  assert.equal(
    summarize(
      [...complete, { type: "warning", code: "unresolved_variables" }],
      selected,
    ).status,
    "setup-error",
  );
  assert.equal(
    summarize([...complete, pass("other_test.md")], selected).status,
    "setup-error",
  );
});

test("secret redaction handles encoded values and a reconstructed pipe stream", () => {
  const key = "synthetic/private value";
  const chunks = [
    "prefix synthetic/pri",
    "vate value suffix " + encodeURIComponent(key),
  ];
  const safe = redactWith([key])(chunks.join(""));
  assert.equal(safe, "prefix *** suffix ***");
  assert.equal(
    parseEvents('\uFEFF{"type":"start"}\nnoise\n{"type":"end"}\n').length,
    2,
  );
});

test("JUnit escapes failure text and reports incomplete infrastructure separately", () => {
  const summary = summarize(
    [
      plan,
      {
        ...pass("choices_test.md"),
        status: "failed",
        failure: { message: '<bad> & "quoted"' },
      },
    ],
    selected,
  );
  summary.suite = "smoke";
  const xml = junit(summary);
  assert.match(xml, /&lt;bad&gt; &amp; &quot;quoted&quot;/);
  assert.match(xml, /<error message=/);
  assert.match(xml, /<skipped\/>/);
});

async function recordingFixture(context) {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), "knapsack-kane-"));
  context.after(async () => {
    const root = path.resolve(os.tmpdir()) + path.sep + "knapsack-kane-";
    assert.ok(path.resolve(directory).startsWith(root));
    await fs.rm(directory, { recursive: true, force: true });
  });
  const test = selected[0];
  await fs.writeFile(
    path.join(directory, test.file),
    "cache policy fixture, never executed by Kane",
  );
  const internal = path.join(directory, outputName(test.file), ".internal");
  await fs.mkdir(path.join(internal, "steps", "one", "flows", "0"), {
    recursive: true,
  });
  await fs.writeFile(
    path.join(internal, "meta.json"),
    JSON.stringify({ test_id: "synthetic-test-id" }),
  );
  await fs.writeFile(path.join(internal, "execution.json"), "{}");
  await fs.writeFile(
    path.join(internal, "steps", "one", "flows", "0", "actions.ndjson"),
    "{}\n",
  );
  const lockFile = path.join(directory, "recordings.json");
  return { directory, lockFile, test };
}

test("missing recordings fail before a PR can start paid authoring", async (context) => {
  const fixture = await recordingFixture(context);
  await assert.rejects(
    checkRecordings([fixture.test], "pinned", fixture),
    /No approved recording cache/,
  );
});

test("a recorded cache is reusable only with the same test content and CLI version", async (context) => {
  const fixture = await recordingFixture(context);
  await saveRecordings([fixture.test], "pinned", fixture);
  await checkRecordings([fixture.test], "pinned", fixture);
  await assert.rejects(
    checkRecordings([fixture.test], "different", fixture),
    /stale recording/,
  );
  await fs.appendFile(
    path.join(fixture.directory, fixture.test.file),
    " changed",
  );
  await assert.rejects(
    checkRecordings([fixture.test], "pinned", fixture),
    /stale recording/,
  );
});

test("missing cache files and paths escaping the recording folder are rejected", async (context) => {
  const fixture = await recordingFixture(context);
  await saveRecordings([fixture.test], "pinned", fixture);
  const lock = JSON.parse(await fs.readFile(fixture.lockFile, "utf8"));
  assert.equal(
    lock.tests.choices.testHash,
    hash("cache policy fixture, never executed by Kane"),
  );
  lock.tests.choices.files.push("../outside.json");
  await fs.writeFile(fixture.lockFile, JSON.stringify(lock));
  await assert.rejects(
    checkRecordings([fixture.test], "pinned", fixture),
    /invalid path/,
  );
  lock.tests.choices.files.pop();
  lock.tests.choices.files.push(".internal/missing.json");
  await fs.writeFile(fixture.lockFile, JSON.stringify(lock));
  await assert.rejects(
    checkRecordings([fixture.test], "pinned", fixture),
    /ENOENT/,
  );
});

test("a failed repair invalidates its old approval without deleting unrelated approvals", async (context) => {
  const fixture = await recordingFixture(context);
  await saveRecordings([fixture.test], "pinned", fixture);
  const lock = JSON.parse(await fs.readFile(fixture.lockFile, "utf8"));
  lock.tests.unrelated = { testHash: "unchanged" };
  await fs.writeFile(fixture.lockFile, JSON.stringify(lock));
  await saveRecordings([], "pinned", { ...fixture, removeIds: ["choices"] });
  const updated = JSON.parse(await fs.readFile(fixture.lockFile, "utf8"));
  assert.equal(updated.tests.choices, undefined);
  assert.equal(updated.tests.unrelated.testHash, "unchanged");
});
