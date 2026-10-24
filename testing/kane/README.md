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
| `smoke` | A small set of packing/accounting/selection checks | None |
| `regression` | Deterministic packing, inventory, 3D, import and export checks | None |
| `live` | Small checks that actually need Astra or photo recognition | Real OpenAI calls |
| `all` | All configured small checks across the seven approved workflows | Real OpenAI calls |

Dependency installation and the shared production build are separate CI steps. `suite.json` also caps the whole suite. Recording/repair mode has a 40-minute limit because first authoring is substantially slower than replay; the 30-second check budget applies to recorded checks, not first-time authoring. `--timeout <seconds>` sets the whole-run limit and `--parallel <1–4>` sets isolated workers; neither relaxes the per-test check limit. Default parallelism is two.

Check mode uses `--no-adaptive-heal` and fail-fast. It refuses missing or changed recordings before starting paid browser work. Record mode permits Kane to author or repair recordings. Successful cases are retained even if another repair fails; failed cases lose their recording approval. A failed or interrupted run always fails the job.

## GitHub Actions

The [Kane workflow](../../.github/workflows/kane.yml) runs on relevant pushes to `main` and `kane-cli`, and on PRs into `main` after the workflow is merged there. It:

1. Checks the harness, lints/tests the selected application, and builds it once with TypeScript checking.
2. Hands that exact build and application commit to the browser job.
3. Restores npm, Next build and Kane recording caches.
4. Runs the strict smoke suite for ordinary pushes/PRs. Outdated runs are cancelled.
5. Publishes a job summary, JSON, JUnit and sealed Kane evidence even on a test failure.

Use **Actions → Kane CLI → Run workflow** for wider suites or record mode. `application_ref` accepts your friend's branch name or commit; the test harness stays on the workflow branch, and the application is checked out separately. `application_directory` defaults to `final` and can select the repository root if the app moves there.

Select `kane-cli` as the workflow branch while this setup is being developed. Manual REST workflow dispatch has been verified on that branch. A trusted push whose commit message includes **`[kane:record]`** also runs smoke in record mode to bootstrap recordings. Ordinary commits run strict check mode. This marker is ignored for PR events; fork PRs receive source checks without secret-backed browser execution. Check and record runs use separate cancellation groups, so a routine PR check cannot cancel a recording run.

After merging the workflow into `main`, run record mode there once. GitHub's default-branch cache can then be restored by application PR branches. A cache produced only on `kane-cli` is scoped to that branch. A cache miss is an explicit setup failure, not a skipped green test.

## Updating tests

The `_test.md` files are Kane-generated designs for the previously approved app workflows, split into small checks. Do not write or rewrite their steps by hand. Use Kane assurance (`context`, `design`, `maintain evolve`), review the proposed changes, and run record mode before using them as a PR gate. `suite.json` selects tests without changing their generated bodies. Validation rejects multi-step files from the active suite.

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
