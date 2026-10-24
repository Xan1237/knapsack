import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { junit, resultsDir } from "./lib.mjs";

export function markdown(summary) {
  const escape = (value) =>
    String(value ?? "")
      .replaceAll("|", "\\|")
      .replaceAll("\n", " ");
  const totals = summary.totals;
  return [
    `## Kane ${summary.suite}: ${summary.status}`,
    "",
    `Mode: **${summary.mode}** · ${totals.passed}/${totals.tests} passed · ${totals.failed} failed · ${totals.interrupted} interrupted · ${totals.skipped} not run`,
    "",
    `Elapsed: ${Math.round(summary.durationSeconds)}s. Application ref: \`${escape(summary.applicationRef || "local checkout")}\`.`,
    "",
    ...(summary.error ? [`${escape(summary.error)}`, ""] : []),
    ...(summary.note ? [`${escape(summary.note)}`, ""] : []),
    "| Test | Result | Time | Detail |",
    "| --- | --- | --- | --- |",
    ...summary.tests.map(
      (test) =>
        `| ${escape(test.id)} | ${escape(test.status)} | ${Math.round(test.durationSeconds)}s | ${escape(test.failure?.message || "")} |`,
    ),
    "",
    "Kane evidence packs and logs are attached to this workflow run. An interrupted, missing-cache, or unstarted test is never counted as passed.",
    "",
  ].join("\n");
}

export async function writeReport(summary) {
  await fs.mkdir(resultsDir, { recursive: true });
  await fs.writeFile(
    path.join(resultsDir, "summary.json"),
    JSON.stringify(summary, null, 2) + "\n",
  );
  await fs.writeFile(path.join(resultsDir, "junit.xml"), junit(summary));
  const text = markdown(summary);
  await fs.writeFile(path.join(resultsDir, "summary.md"), text);
  if (process.env.GITHUB_STEP_SUMMARY)
    await fs.appendFile(process.env.GITHUB_STEP_SUMMARY, text);
}

if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  const summary = JSON.parse(
    await fs.readFile(path.join(resultsDir, "summary.json"), "utf8"),
  );
  process.stdout.write(markdown(summary));
}
