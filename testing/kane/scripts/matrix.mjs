import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { hash, loadManifest, selectSuite, testsDir } from "./lib.mjs";

export async function matrixFor(manifest, suite, testId = "", directory = testsDir) {
  const selected = selectSuite(manifest, suite, testId);
  return {
    include: await Promise.all(selected.map(async (test) => ({
      id: test.id,
      label: test.label || test.id,
      file: test.file,
      hash: hash(await fs.readFile(path.join(directory, test.file), "utf8")),
    }))),
  };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const matrix = await matrixFor(await loadManifest(), process.env.KANE_SUITE || "smoke", process.env.KANE_TEST_ID || "");
  if (process.env.GITHUB_OUTPUT)
    await fs.appendFile(process.env.GITHUB_OUTPUT, `matrix=${JSON.stringify(matrix)}\n`);
  console.log(`Selected ${matrix.include.length} independent Kane matrix jobs.`);
}
