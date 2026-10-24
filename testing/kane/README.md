# Kane smoke setup

The automatic gate is exactly **nine small Kane-generated smoke tests**. Each checks one visible workspace behavior; [CASES.md](CASES.md) lists their plain-English purpose and generated identities. Application code remains identical to the merged `main` baseline.

## GitHub Actions

The [workflow](../../.github/workflows/kane.yml) builds the application once, then starts nine separate matrix jobs with `max-parallel: 9`. Each gets its own production server and one headless Chrome session. A failed test does not cancel the other eight, so every result is visible.

- Ordinary pushes and PRs always use strict replay, with repair disabled.
- Kane reports actual assertion results and elapsed time. Custom test, batch and CI job deadlines have been removed at the user's request.
- Small scope, parallel runners and caching keep the pipeline fast. Actual push-to-result timing is visible in the workflow run.
- npm, Next build and managed Kane runtime caches shorten setup. Each test has its own recording cache, keyed by CLI version and generated test content; parallel jobs cannot overwrite each other's recordings.
- Each job publishes Markdown, JSON, JUnit and sealed Kane evidence. Missing recordings, unresolved variables, interrupted tests and absent terminal results fail the gate.
- Fork PRs receive build/source checks without secret-backed browser execution.

The gate needs repository secrets `LT_USERNAME` and `LT_ACCESS_KEY`, already configured. These smoke checks make no provider calls. Optional manual live suites use the server-only `OPENAI_API_KEY` secret.

## Recording and repair

Choose **Actions > Kane smoke > Run workflow**, branch `kane-cli`, suite `smoke`, mode `record`. Record mode explicitly re-authors the selected case on its existing Test Manager identity. First authoring is slower than replay. Successful recordings are cached even if another test fails. Failed repairs invalidate that case's approval.

Set optional `test_id` to repair only that case. Normal pushes never start authoring, regardless of commit message. Check and record runs have separate cancellation groups.

Successful trusted tests also publish a `kane-recording-<id>` artifact. To carry recordings to `main`, set repository variable `KANE_RECORDING_RUN_ID` (or manual input `recording_run_id`) to a successful Kane run on `kane-cli` or `main`. A cache miss verifies that run's repository, branch, workflow and successful conclusion before importing its recording. The runner still checks test-content/CLI hashes and executes the real assertions. Successful main runs populate main's own caches. This avoids repeating paid authoring merely because GitHub scopes caches by branch.

`application_ref` tests a teammate's branch or exact commit while retaining this harness. `application_directory` defaults to `final` and also supports the repository root. CI checks out the application separately and runs the exact SHA used by the shared build.

## Local use

Use Node 22+. From the repository root:

```sh
npm ci --prefix testing/kane
npm run check --prefix testing/kane
npm test --prefix testing/kane
npm run build --prefix final
npm run run --prefix testing/kane -- --suite smoke --mode record --start-server --parallel 1
npm run run --prefix testing/kane -- --suite smoke --mode check --start-server --parallel 1
```

Local smoke runs use one browser at a time. CI runs all nine simultaneously on separate machines. `--test <id>` selects one case. The managed server defaults to port 3100 and closes only its own process; an existing development server on port 3000 is left alone. `--base-url` or `KANE_BASE_URL` can target an existing server when `--start-server` is omitted.

## Scope and maintenance

`smoke` is the automatic nine-case set. `regression`, `live` and `all` are optional manual suites containing earlier saved designs, including known unresolved assertions; a green smoke run does not establish those broader behaviors as passing. Historical landing-animation and visual 3D checks are outside the small gate.

Tests must be generated/refined through Kane assurance, never handwritten. The current requirements are [nine-smoke.md](requirements/nine-smoke.md). Generated files retain their assurance headers and criterion links. Recording directories, account profiles, local environment files and raw evidence stay out of git; GitHub retains evidence artifacts for seven days. Increment `recording-version.txt` to discard recordings deliberately.

Implementation follows the official [Kane CI guide](https://github.com/LambdaTest/kane-cli/blob/main/docs/user-guide/cicd.md) and [GitHub cache scoping](https://docs.github.com/en/actions/using-workflows/caching-dependencies-to-speed-up-workflows).

The pinning smoke test was deleted at the user's request; the automatic gate has nine checks and makes no pinning-coverage claim. Current scope: [nine-smoke.md](requirements/nine-smoke.md).
