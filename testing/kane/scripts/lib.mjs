import fs from "node:fs/promises";
import path from "node:path";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";

export const harnessDir = fileURLToPath(new URL("..", import.meta.url));
export const testsDir = path.join(harnessDir, ".testmuai", "tests");
export const resultsDir = path.join(harnessDir, "results");
export const recordingFile = path.join(
  harnessDir,
  ".testmuai",
  "recordings.json",
);

export function selectSuite(manifest, name) {
  const suite = manifest.suites?.[name];
  if (!suite || !Array.isArray(suite.tests) || !suite.tests.length)
    throw new Error(`Unknown or empty suite: ${name}`);
  const ids = new Set();
  const files = new Set();
  for (const test of manifest.tests || []) {
    if (
      ids.has(test.id) ||
      files.has(test.file) ||
      !/^[a-z][a-z0-9-]*$/.test(test.id) ||
      !/^[a-z0-9-]+_test\.md$/.test(test.file)
    )
      throw new Error("Test IDs and filenames must be unique, simple names");
    ids.add(test.id);
    files.add(test.file);
  }
  if (new Set(suite.tests).size !== suite.tests.length)
    throw new Error(`Duplicate test in suite ${name}`);
  return suite.tests.map((id) => {
    const test = manifest.tests.find((test) => test.id === id);
    if (!test) throw new Error(`Suite ${name} references unknown test ${id}`);
    return test;
  });
}

export async function loadManifest() {
  const manifest = JSON.parse(
    (await fs.readFile(path.join(harnessDir, "suite.json"), "utf8")).replace(
      /^\uFEFF/,
      "",
    ),
  );
  for (const name of Object.keys(manifest.suites || {}))
    selectSuite(manifest, name);
  return manifest;
}

export const hash = (text) => createHash("sha256").update(text).digest("hex");
export const outputName = (file) => `output-${file.replace(/_test\.md$/, "")}`;
export const basename = (file) =>
  path.posix.basename(String(file).replaceAll("\\", "/"));

export function memberBudget(milliseconds, onTimeout) {
  const timers = new Map();
  return {
    observe(event) {
      if (
        !/^testrun_(?:authored_)?member_(?:start|end)$/.test(event.type || "")
      )
        return;
      const file = basename(event.path);
      clearTimeout(timers.get(file));
      timers.delete(file);
      if (event.type.endsWith("_start"))
        timers.set(
          file,
          setTimeout(() => {
            timers.delete(file);
            onTimeout(file);
          }, milliseconds),
        );
    },
    close() {
      for (const timer of timers.values()) clearTimeout(timer);
      timers.clear();
    },
  };
}

export function redactWith(values = []) {
  const secrets = [
    ...new Set(
      values
        .filter((value) => typeof value === "string" && value.length > 3)
        .flatMap((value) => [value, encodeURIComponent(value)]),
    ),
  ].sort((a, b) => b.length - a.length);
  return (value) =>
    secrets.reduce(
      (text, secret) => text.split(secret).join("***"),
      String(value),
    );
}

export function parseEvents(text) {
  return String(text)
    .replace(/^\uFEFF/, "")
    .split(/\r?\n/)
    .flatMap((line) => {
      try {
        return [JSON.parse(line)];
      } catch {
        return [];
      }
    });
}

export function summarize(
  events,
  selected,
  { exitCode = 0, interrupted = false, durationSeconds = 0 } = {},
) {
  const terminal = events.findLast((event) => event.type === "testrun_done");
  const rollup = events.findLast((event) => event.type === "testrun_summary");
  const plan = events.findLast((event) => event.type === "testrun_plan");
  const started = new Set(
    events
      .filter((event) =>
        /testrun_(?:authored_)?member_start/.test(event.type || ""),
      )
      .map((event) => basename(event.path)),
  );
  const ended = new Map(
    events
      .filter((event) =>
        /testrun_(?:authored_)?member_end/.test(event.type || ""),
      )
      .map((event) => [basename(event.path), event]),
  );
  const selectedFiles = new Set(selected.map((test) => test.file));
  const unexpectedMembers = [...ended.keys()].filter(
    (file) => !selectedFiles.has(file),
  );
  const tests = selected.map((test) => {
    const result = ended.get(test.file);
    return {
      id: test.id,
      file: test.file,
      status:
        result?.status || (started.has(test.file) ? "interrupted" : "skipped"),
      durationSeconds: result?.duration_s || 0,
      ...(result?.failure ? { failure: result.failure } : {}),
    };
  });
  const unresolved = events.filter(
    (event) =>
      event.type === "warning" && event.code === "unresolved_variables",
  );
  const passed =
    !interrupted &&
    exitCode === 0 &&
    terminal?.overall_status === "passed" &&
    tests.every((test) => test.status === "passed") &&
    !unresolved.length &&
    !unexpectedMembers.length &&
    plan?.valid !== false;
  const setupError =
    plan?.valid === false ||
    unresolved.length > 0 ||
    exitCode === 2 ||
    unexpectedMembers.length > 0;
  return {
    status: passed
      ? "passed"
      : interrupted
        ? "interrupted"
        : setupError
          ? "setup-error"
          : terminal
            ? "failed"
            : "incomplete",
    exitCode: passed ? 0 : interrupted ? 3 : setupError ? 2 : 1,
    executionId:
      terminal?.execution_id ||
      events.find((event) => event.type === "testrun_start")?.execution_id ||
      rollup?.execution?.id,
    durationSeconds: rollup?.duration_s ?? durationSeconds,
    totals: {
      tests: tests.length,
      passed: tests.filter((test) => test.status === "passed").length,
      failed: tests.filter((test) => ["failed", "broken"].includes(test.status))
        .length,
      interrupted: tests.filter((test) => test.status === "interrupted").length,
      skipped: tests.filter((test) => test.status === "skipped").length,
    },
    tests,
    ...(unresolved.length
      ? { error: "Unresolved Kane variables; no passing result is accepted." }
      : {}),
    ...(unexpectedMembers.length
      ? { error: "Kane returned tests outside the selected suite." }
      : {}),
    ...(!terminal
      ? {
          note: "No terminal suite result was received; this is not a passing run.",
        }
      : {}),
  };
}

export function junit(summary) {
  const xml = (value) =>
    String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&apos;");
  const infrastructureError = [
    "setup-error",
    "incomplete",
    "interrupted",
  ].includes(summary.status);
  const cases = summary.tests.map((test) => {
    const result =
      test.status === "passed"
        ? ""
        : ["skipped", "interrupted"].includes(test.status)
          ? "<skipped/>"
          : `<failure message="${xml(test.failure?.message || test.status)}"/>`;
    return `<testcase classname="kane" name="${xml(test.id)}" time="${test.durationSeconds}">${result}</testcase>`;
  });
  if (infrastructureError)
    cases.push(
      `<testcase classname="kane" name="Suite completion"><error message="${xml(summary.error || summary.note || summary.status)}"/></testcase>`,
    );
  return `<?xml version="1.0" encoding="UTF-8"?>\n<testsuite name="Kane ${xml(summary.suite)}" tests="${cases.length}" failures="${summary.totals.failed}" errors="${infrastructureError ? 1 : 0}" skipped="${summary.totals.skipped + summary.totals.interrupted}" time="${summary.durationSeconds}">${cases.join("")}</testsuite>\n`;
}

export async function walk(directory) {
  const entries = await fs.readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    if (entry.isSymbolicLink())
      throw new Error("Recording directories must not contain symlinks");
    const file = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...(await walk(file)));
    else if (entry.isFile()) files.push(file);
  }
  return files;
}

export async function checkRecordings(
  selected,
  cliVersion,
  { directory = testsDir, lockFile = recordingFile } = {},
) {
  let lock;
  try {
    lock = JSON.parse(await fs.readFile(lockFile, "utf8"));
  } catch {
    throw new Error(
      "No approved recording cache. Run the separate record mode first; PR checks never author tests.",
    );
  }
  for (const test of selected) {
    const entry = lock.tests?.[test.id];
    const text = await fs.readFile(path.join(directory, test.file), "utf8");
    if (
      !entry ||
      entry.testHash !== hash(text) ||
      entry.cliVersion !== cliVersion ||
      !entry.files?.length
    )
      throw new Error(
        `Missing or stale recording for ${test.id}. Run record mode for this suite.`,
      );
    const root = path.resolve(directory, outputName(test.file));
    for (const relative of entry.files) {
      const file = path.resolve(root, relative);
      if (!file.startsWith(root + path.sep))
        throw new Error("Recording cache contains an invalid path");
      await fs.access(file);
    }
    const meta = JSON.parse(
      await fs.readFile(path.join(root, ".internal", "meta.json"), "utf8"),
    );
    if (!meta.test_id)
      throw new Error(`Recording for ${test.id} has no Test Manager identity`);
  }
}

export async function saveRecordings(
  selected,
  cliVersion,
  { directory = testsDir, lockFile = recordingFile, removeIds = [] } = {},
) {
  let lock = { version: 1, tests: {} };
  try {
    lock = JSON.parse(await fs.readFile(lockFile, "utf8"));
  } catch {}
  for (const id of removeIds) delete lock.tests[id];
  for (const test of selected) {
    const root = path.join(directory, outputName(test.file));
    const files = (await walk(path.join(root, ".internal")))
      .map((file) => path.relative(root, file).replaceAll("\\", "/"))
      .sort();
    if (
      !files.some((file) => file.endsWith("/actions.ndjson")) ||
      !files.includes(".internal/meta.json") ||
      !files.includes(".internal/execution.json")
    )
      throw new Error(
        `Incomplete recording for ${test.id}; nothing will be approved for CI`,
      );
    lock.tests[test.id] = {
      cliVersion,
      testHash: hash(
        await fs.readFile(path.join(directory, test.file), "utf8"),
      ),
      files,
    };
  }
  await fs.writeFile(lockFile, JSON.stringify(lock, null, 2) + "\n");
}
