import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

export function assertTrustedSeed(run, repository) {
  if (run.repository?.full_name !== repository || run.head_repository?.full_name !== repository)
    throw new Error("Recording seed must come from this repository");
  if (!['push', 'workflow_dispatch'].includes(run.event) || !['main', 'kane-cli'].includes(run.head_branch))
    throw new Error("Recording seed must be a trusted branch run");
  if (run.conclusion !== 'success' || run.path?.split('@')[0] !== '.github/workflows/kane.yml')
    throw new Error("Recording seed must be a successful Kane workflow");
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const id = process.env.KANE_RECORDING_SEED;
  const repository = process.env.GITHUB_REPOSITORY;
  if (!/^\d+$/.test(id || '') || !/^[\w.-]+\/[\w.-]+$/.test(repository || ''))
    throw new Error('Invalid recording seed run or repository');
  const response = await fetch(`https://api.github.com/repos/${repository}/actions/runs/${id}`, {
    headers: { Authorization: `Bearer ${process.env.GITHUB_TOKEN}`, Accept: 'application/vnd.github+json' },
  });
  if (!response.ok) throw new Error(`Cannot verify recording seed: HTTP ${response.status}`);
  const run = await response.json();
  assertTrustedSeed(run, repository);
  await fs.appendFile(process.env.GITHUB_OUTPUT, `run_id=${id}\n`);
  console.log(`Verified recording seed ${id} at ${run.head_sha}`);
}
