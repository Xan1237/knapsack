import fs from "node:fs/promises";
import path from "node:path";
import { parseDocument } from "yaml";
import { harnessDir, loadManifest, selectSuite, testsDir } from "./lib.mjs";

const manifest = await loadManifest();
const tests = selectSuite(manifest, "all");
const seen = new Set();
for (const test of tests) {
  const content = await fs.readFile(path.join(testsDir, test.file), "utf8");
  const header = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!header)
    throw new Error(`${test.file} has no generated assurance header`);
  const document = parseDocument(header[1]);
  if (document.errors.length)
    throw new Error(`${test.file}: invalid frontmatter`);
  const data = document.toJS();
  if (!data.assurance?.id || !String(data.assurance.base).startsWith("sha256:"))
    throw new Error(
      `${test.file} is missing its Kane-generated design identity`,
    );
  if (seen.has(data.assurance.id))
    throw new Error("Two test files refer to the same design");
  seen.add(data.assurance.id);
  if (!content.includes("{{knapsack_base_url}}"))
    throw new Error(`${test.file} must use the configured application URL`);
  if (/https?:\/\/(?:localhost|127\.0\.0\.1):\d/.test(content))
    throw new Error(`${test.file} hardcodes a local server`);
  if (
    /\{\{[^}]*(?:api_key|access_key|password|token|secret)[^}]*\}\}/i.test(
      content,
    )
  )
    throw new Error(
      `${test.file} must not send provider/account secrets into browser variables`,
    );
  if (!/^## /m.test(content))
    throw new Error(`${test.file} has no runnable steps`);
  if ((content.match(/^## /gm) || []).length !== 1)
    throw new Error(
      `${test.file} must be one small intent step, not a long journey`,
    );
}
for (const id of manifest.suites.smoke.tests) {
  const test = manifest.tests.find((test) => test.id === id);
  if (test.live)
    throw new Error("Smoke tests must not require live provider calls");
  if (test.file !== `${test.id}_test.md` || !test.label)
    throw new Error("Smoke cases need a clear matrix label and matching recording-folder ID");
}
if (manifest.suites.smoke.tests.length !== 9)
  throw new Error("Automatic smoke must contain exactly nine small checks");
const workflow = parseDocument(
  await fs.readFile(
    path.resolve(harnessDir, "../../.github/workflows/kane.yml"),
    "utf8",
  ),
);
if (workflow.errors.length)
  throw new Error(
    "Invalid GitHub Actions YAML: " +
      workflow.errors.map((error) => error.message).join("; "),
  );
const yaml = workflow.toJS();
if (yaml.on?.pull_request_target)
  throw new Error(
    "Do not run application code with pull_request_target secrets",
  );
if (yaml.permissions?.contents !== "read")
  throw new Error("The workflow must use read-only repository permissions");
if (yaml.env?.KANE_MODE !== "${{ inputs.mode || 'check' }}")
  throw new Error("Pushes and PRs must always use strict check mode");
if (yaml.jobs.browser?.strategy?.["max-parallel"] !== 9 || yaml.jobs.browser.strategy["fail-fast"] !== false)
  throw new Error("Run all nine smoke matrix jobs independently in parallel");
if (!yaml.jobs.build || yaml.jobs.browser.needs !== "build")
  throw new Error("Build the exact application once before the browser matrix");
for (const job of Object.values(yaml.jobs)) {
  for (const step of job.steps || []) {
    if (step.uses && !/@[a-f0-9]{40}$/.test(step.uses))
      throw new Error(`Pin action ${step.uses} to a reviewed commit`);
    if (/\$\{\{\s*(?:inputs\.|github\.event\.)/.test(step.run || ""))
      throw new Error(
        "Pass workflow inputs through env, not interpolated shell scripts",
      );
  }
}
console.log(
  `Validated ${tests.length} Kane-generated tests, ${Object.keys(manifest.suites).length} suites, and GitHub Actions configuration.`,
);
