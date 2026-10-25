# Browser verification: October 24, 2026

Reviewed source checkpoint: `4a33f051f40ef314df486ac92e66615a29d5b0b3`. Browser checks used the existing local production build of `final/`, not a fresh rebuild or a deployed-site check. No application source was changed in this session.

## Completed checks

- TypeScript and ESLint passed; all 73 direct tests in 15 files passed.
- All 21 existing harness tests executed in desktop Chrome with three isolated workers and adaptive healing disabled. Result: **18 passed, 3 failed**, exit 1, 497.564 seconds. Evidence execution: `3054ce08-aa93-4ca4-82e4-e63675d52c3b`; sealed evidence uploaded to Test Manager. This is a test pass count, not requirement coverage.
- Real photo-to-mesh browser journey passed: reset, submit bundled pump-bottle photograph to the configured Astra provider, observe recognizable generated shoulder/pump geometry, inspect matching editor mesh, resize, reload, and verify retained mesh, source photo and Astra label. Saved-test duration: 180 seconds; model run used 114.18 Kane credits. Session `1f5d3c77-8b31-4cb6-b29f-ca5814fc41a1`, Test Manager case `01M5R0D2CPS99ABFXTHRPNTJY7`. This does not independently prove physical fit or the full export/advice journey for that photo.
- Current single-compartment landing check passed after adaptive replay healing: four items at 04/08, eight fitted essentials at 08/08, empty compartment after reverse scroll. Saved-test duration: 113 seconds. Session `a0548134-1e34-49b9-b63f-d0473f9a1a47`, case `01M5R2P6SV2CPFVA33Z9YXS3JG`. The initial replay misclassified the visible four-item state; the subsequent authored run passed the unchanged objective.
- The 18 harness passes include real Astra advice protecting the pinned Sage linen shirt, all-pinned overflow, Make room dismissal, displaced-item labels, included-item accounting, demo provenance, WebGL display, navigation and inspection controls.

## Failures retained

| Test | Evidence and classification |
| --- | --- |
| Chosen Make room swap is reflected in the selection | Local port 3000 became unavailable during the journey. The failure record and browser error page identify an environment outage. Still recorded as failed; no successful rerun. |
| Exclude Cream knit unchecks its Include checkbox | Connection refused before the app loaded. Local production server was restarted. Still recorded as failed; no successful rerun. |
| Explicit Leave out excludes the selected unplaced item | Final verification failed. Evidence screenshot shows Cream knit unchecked and the included count reduced to eight. This supports the runner's automation-misclassification diagnosis: excluded inventory stays visible. Still recorded as failed; no successful rerun. |

No product defect was confirmed by these three failures. That is not a claim that the remaining app is defect-free.

## Time box and remaining work

The user imposed a ten-minute cap at approximately 00:08 UTC. The main suite completed by 00:16 UTC. A later tool approval wait held the assistant until 00:40 UTC; the export verification command began when that wait resolved and was immediately interrupted with exit 130. It supplies no completed export proof.

The user approved nine additional use cases and matching generated designs. Kane extracted those use cases from `requirements/browser-verification.md` and generated one 12-step export test covering eight criteria. The approved export draft remains uncommitted because execution is incomplete. The other new use cases have no generated tests in this new graph yet. Its reported 0% cannot be combined with older graph coverage or the 18/21 suite count.

Full browser verification remains incomplete: export/import round trips, broader inventory/reset behavior, manual placement and compression, closure playback, stale advice, narrow layout and failure injection still need current passing evidence. Raw screenshots, recordings, provider data and evidence packs remain ignored.
