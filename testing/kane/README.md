# Kane CLI test setup

This folder owns the browser-test harness. Application development can continue independently in another branch. No application source is changed by the runner.

## Everyday commands

Use Node 22 or newer. From the repository root:

```sh
npm ci --prefix testing/kane
npm run check --prefix testing/kane
npm test --prefix testing/kane
npm run build --prefix final
```

The local runner starts a production server on port **3100**, waits for `/pack`, runs Kane, and closes only the server it started. It leaves a development server on port 3000 alone.

```sh
# One-time recording, or an explicit repair after a UI/test change:
npm run run --prefix testing/kane -- --suite smoke --mode record --start-server

# Routine fast regression check, using approved recordings:
npm run run --prefix testing/kane -- --suite smoke --mode check --start-server
```

Use `--headless` to hide the local test browser. CI always uses headless Chrome. Without `--start-server`, the runner targets an already running application at `KANE_BASE_URL` (default `http://127.0.0.1:3100`). `KANE_APP_DIR` can point at a separate checkout; by default it is the repo's `final` folder.

Kane locally uses the existing OAuth sign-in. GitHub uses the encrypted repository secrets `LT_USERNAME` and `LT_ACCESS_KEY`. Live suites additionally use `OPENAI_API_KEY`, exclusively on the application server. The fixture pool contains no credentials.

## Small tests and runtime limits

Every generated test file contains one small, independent intent step. Strict check mode gives **each test a hard 30-second budget**, including its session startup. A slow test fails the gate; it is not counted as passed. The smoke suite selects a few deterministic checks. The broader suites collect the other approved behaviors.

| Suite | Coverage | Provider calls |
| --- | --- | --- |
| `smoke` | Direct workspace readiness and demo inventory labels | None |
| `regression` | Smoke plus packing overflow and selection checks | None |
| `live` | Pinned-item behavior in live Astra advice | Real OpenAI calls |
| `all` | All currently configured checks | Real OpenAI calls |

Automatic runs target **under five minutes from push to success**, including installs and build. The single CI job has a four-minute limit; GitHub queue delays remain outside our control. The smoke browser batch has two DOM checks capped at 60 seconds total, with a 30-second limit per test. Recording/repair is manual and has a 40-minute runner limit because first authoring is substantially slower than replay. `--timeout <seconds>` sets the whole-run limit and `--parallel <1–4>` sets isolated workers; neither relaxes the per-test check limit. Default parallelism is two.

Check mode uses `--no-adaptive-heal` and fail-fast. It refuses missing or changed recordings before starting paid browser work. Record mode permits Kane to author or repair recordings. Successful cases are retained even if another repair fails; failed cases lose their recording approval. A failed or interrupted run always fails the job.

## GitHub Actions

The [Kane smoke workflow](../../.github/workflows/kane.yml) runs on relevant pushes to `main` and `kane-cli`, and on PRs into `main` after the workflow is merged there. One job:

1. Checks the harness, lints/tests the selected application, and builds it once with TypeScript checking.
2. Runs that exact build and application commit in the same job, avoiding a second install and build transfer.
3. Restores npm, Next build and Kane recording caches.
4. Runs the strict smoke suite for ordinary pushes/PRs. Outdated runs are cancelled.
5. Publishes a job summary, JSON, JUnit and sealed Kane evidence even on a test failure.

Use **Actions → Kane smoke → Run workflow** for wider suites or record mode. `test_id` optionally selects a single test for a focused repair; it must belong to the selected suite. `application_ref` accepts your friend's branch name or commit; the test harness stays on the workflow branch, and the application is checked out separately. `application_directory` defaults to `final` and can select the repository root if the app moves there.

Select `kane-cli` as the workflow branch while this setup is being developed. Manual REST workflow dispatch has been verified on that branch. **Pushes and PRs always run strict smoke check mode**, regardless of commit message. Record mode and larger suites require manual dispatch; fork PRs receive source checks without secret-backed browser execution. Check and record runs use separate cancellation groups, so a routine PR check cannot cancel a recording run.

After merging the workflow into `main`, run record mode there once. GitHub's default-branch cache can then be restored by application PR branches. A cache produced only on `kane-cli` is scoped to that branch. A cache miss is an explicit setup failure, not a skipped green test.

## Updating tests

The `_test.md` files are Kane-generated designs for the previously approved app workflows, split into small checks. Do not write or rewrite their steps by hand. Use Kane assurance (`context`, `design`, `maintain evolve`), review the proposed changes, and run record mode before using them as a PR gate. `suite.json` selects tests without changing their generated bodies. Validation rejects multi-step files from the active suite.

The active smoke designs and approval are listed in [CASES.md](CASES.md). Broader regression tests can expose unresolved failures; they are not implied to pass by a green smoke run.

Recordings live under ignored `.testmuai/tests/output-*` folders and have a content/version approval file, `.testmuai/recordings.json`. GitHub stores them in its cache, not git. Account profiles, credentials and `.env` files are never cached. Increment `recording-version.txt` to deliberately discard the existing recording pool.

The generated collection-import test uses the bundled [step2 collection fixture](fixtures/step2-collection.json), independent of the application's checkout path. `npm run fixtures` writes absolute local fixture paths and the configured base URL to an ignored nonsecret Kane variable file.

## Results and honest status

Local results appear in ignored `results/`: `summary.md`, `summary.json`, `junit.xml`, CLI logs and the server log. Kane seals its evidence under `.testmuai/evidence/` and uploads completed runs to Test Manager. CI attaches these artifacts for seven days. No unfinished journey is counted as passed, and this setup does not imply that every app acceptance criterion has been proven.

Useful commands:

```sh
npm run report --prefix testing/kane
npm run run --prefix testing/kane -- --suite regression --mode record --start-server
npm run run --prefix testing/kane -- --suite live --mode record --start-server
```

Implementation follows the official [Kane CI recipes](https://github.com/LambdaTest/kane-cli/blob/main/docs/user-guide/cicd.md), [recorded replay behavior](https://github.com/LambdaTest/kane-cli/blob/main/docs/user-guide/testmd/running.md), and [GitHub cache scoping](https://docs.github.com/en/actions/using-workflows/caching-dependencies-to-speed-up-workflows).
