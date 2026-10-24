# Knapsack validation — 2026-10-24

Completion was time-boxed by the user at 20:45 UTC: stop expanding browser coverage, run final local checks and one packing smoke, document gaps, then commit and push completed work. The existing main-app base was 79438d4; concurrent remote commits are preserved during integration.

## Final checks

| Command | Result |
| --- | --- |
| `npm run typecheck` | Passed |
| `npm run lint` | Passed |
| `npm test` | 29 tests passed across four files |
| `npm run format:check` | Passed |
| `npm run build` | Passed; production server then started on port 3000 |
| Kane final complete-packing smoke | Passed, 1/1 tests, 2/2 steps, 100 s suite duration; terminal completion and process exit 0 checked |

The direct tests cover solver bounds/clearance/rotations, renderer transforms, overlap/completeness rejection, deterministic and adversarial inventories, production-budget search exhaustion, state identity and late-response invariants, IndexedDB restoration/corruption and API upload/concurrency boundaries.

The final source corrects the minimum layer cutoff to retain floor items and adds recoverable WebGL-context-loss handling. It excludes evidence and assurance directories from TypeScript compilation. The completed experimental fixture-helper draft was set aside before final checks; no deterministic photo-analysis mode is shipped.

## Actual browser evidence

| Run | Actual result | Reference |
| --- | --- | --- |
| Initial 3D inspection batch | 2 passed / 1 failed in 740.6 s. Layers/playback and partial/unplaced checks passed. Camera inspection failed at the pre-zoom baseline-capture step; 7 later steps were skipped. Kane classified this as an automation error, and the pack had no app console errors. | Execution `77b676ae-1aaa-4832-905b-2e2a711e2662` |
| Final production packing smoke | All nine demo items placed, independent validation and complete identity accounting confirmed in the rendered suitcase and diagnostics. No physical-insertion guarantee was claimed. | Execution `b61a3ac1-4679-44d0-872c-d8d28c883fdb`, case `01M5QTMVGZMKFACF5666BC55EP` |

Kane commands used the installed 0.10.0-rc.3, visible desktop Chrome, `KANE_CLI_USER_AGENT=codex`, noninteractive suite stdin, and the existing custom Chrome for Testing executable. No generated test bodies or assurance pins were hand-edited. The first launch attempt was refused before any browser step because Chrome was absent from standard paths; the custom executable resolved that setup issue.

**Actual requirement coverage: 2%, with 3 of 106 criteria proven in Kane's current graph.** See [coverage-summary.json](coverage-summary.json). Six use cases have generated designs; the operational-readiness use case contains non-browser process/source-policy criteria. Forced phase regeneration superseded the earlier 3D tests in the graph, so their historical browser evidence does not increase this figure. The 2/3 batch pass rate is not requirement coverage.

Only the four executed packing test definitions are included in this completion commit. Their replay recordings and raw evidence remain ignored. Unexecuted approved test designs and local review snapshots remain local, including unresolved controlled-response fixtures. Nonsecret fixture definitions for the committed checks are in [scripts/kane-variables.example.json](../scripts/kane-variables.example.json).

## Live vision and remaining gaps

A genuine live two-upload API → state → corrected complete plan check passed earlier: [live-api-smoke.json](live-api-smoke.json). One fixture is a real photograph, the other a stock illustration. It explicitly records `browserVerified: false`; demo evidence does not establish live vision success. The larger cosmetics photo missed a jar, documented in the [fixture notes](../public/fixtures/README.md).

Unverified: the full live photo-to-plan browser journey; complete camera inspection/reset/exploded-view regression; WebGL failure recovery; phone-width planner behavior; browser persistence, retry, stale-response and cap regressions; the full generated suite; and a real physical packing trial. Minimum-layer behavior was corrected after the earlier layer test and received the final packing smoke, but no complete layer regression was rerun within the time box.

Raw evidence, photos from browser runs, provider payloads and credentials are not committed. No public deployment or hackathon submission was performed. The user separately authorized this completion commit and push.
