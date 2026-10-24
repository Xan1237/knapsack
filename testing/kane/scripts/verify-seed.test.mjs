import { test } from "node:test";
import assert from "node:assert/strict";
import { assertTrustedSeed } from "./verify-seed.mjs";

test("recordings can be promoted only from a successful same-repository Kane branch run", () => {
  const repository = 'team/project';
  const valid = { repository: { full_name: repository }, head_repository: { full_name: repository }, event: 'push', head_branch: 'kane-cli', conclusion: 'success', path: '.github/workflows/kane.yml' };
  assert.doesNotThrow(() => assertTrustedSeed(valid, repository));
  for (const change of [
    { conclusion: 'failure' }, { conclusion: null }, { event: 'pull_request' },
    { head_repository: { full_name: 'fork/project' } }, { repository: { full_name: 'another/project' } },
    { head_branch: 'unreviewed' }, { path: '.github/workflows/another.yml' },
  ]) assert.throws(() => assertTrustedSeed({ ...valid, ...change }, repository));
});
