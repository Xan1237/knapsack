import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { matrixFor } from "./matrix.mjs";

test("matrix gives every selected case an independent stable ID and changes its cache hash when the design changes", async () => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), "kane-matrix-"));
  try {
    const tests = [
      { id: "workspace", file: "workspace_test.md", label: "01 Workspace" },
      { id: "photos", file: "photos_test.md", label: "02 Photo formats" },
    ];
    const manifest = { tests, suites: { smoke: { tests: tests.map(t => t.id) } } };
    await fs.writeFile(path.join(directory, tests[0].file), "first design");
    await fs.writeFile(path.join(directory, tests[1].file), "second design");
    const first = await matrixFor(manifest, "smoke", "", directory);
    assert.deepEqual(first.include.map(t => t.id), ["workspace", "photos"]);
    assert.equal(first.include[1].label, "02 Photo formats");
    await fs.writeFile(path.join(directory, tests[0].file), "new design");
    const next = await matrixFor(manifest, "smoke", "", directory);
    assert.notEqual(next.include[0].hash, first.include[0].hash);
    assert.equal(next.include[1].hash, first.include[1].hash);
    assert.deepEqual((await matrixFor(manifest, "smoke", "photos", directory)).include, [next.include[1]]);
    await assert.rejects(matrixFor(manifest, "smoke", "unknown", directory), /not in suite/);
  } finally {
    const resolved = path.resolve(directory);
    if (path.dirname(resolved) !== path.resolve(os.tmpdir()) || !path.basename(resolved).startsWith("kane-matrix-"))
      throw new Error("Unexpected temporary test directory");
    await fs.rm(resolved, { recursive: true, force: true });
  }
});
