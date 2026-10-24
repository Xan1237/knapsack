# Kane CLI validation history

## Initial implementation

- User brief recorded in `requirements/mvp.md` before implementation.
- Kane CLI 0.10.0-rc.3 installed and authenticated.
- Kane extracted two use cases from the user's brief; the user approved both and automatic review/execution of consistent test details.
- Kane generated five active desktop-web tests: animation, real Astra suggestions and apply, keep decisions, exclusion, and completing choices without replacement products. An initial incorrect emulator draft was superseded through `maintain evolve`, not edited by hand.
- `npm run build`: **passed** for the compatibility increment.
- `npm run test:geometry`: **5 passed**, covering native main-app units/axes/size overrides/orientations, impossible and empty inventories, independent rejection of corrupt plans, valid essential-preserving swaps, and 30 bounded random inventories.
- Live Astra endpoint: **HTTP 200**, provider `astra`, model `gpt-6-astra`; returned real item IDs and a locally validated preview. This is an API smoke result, not a browser E2E pass.
- Browser E2E suite: **5 passed, 0 failed** in 11m 37s, covering 55 browser steps in Chrome 155 on Windows. The five Kane-generated files are under `.testmuai/tests/`.
- Kane folder coverage: **8/8 approved criteria across 2/2 use cases (100%)**, confirmed by `kane-cli cover gaps --mode agent` after the run. This is coverage of the approved MVP scope. The suite summary separately emitted a 38% run-scope figure; the folder rollup includes all five passed tests.
- Browser suite credits: **268.15 used**, with approximately **100,689 remaining** after the suite.
- Nonsecret fixture values are generated from the real demo inventory by `npm run kane:fixtures`; credentials and raw evidence remain ignored.

## Compatibility handoff

The remote main app added in `79438d4` was merged and preserved in `b3ad229`. The step-two adapter reads its actual `InventoryState` structure, uses `estimate × scale`, converts millimeters/Z-up to centimeters/Y-up, converts permitted rotation indices, and carries bag clearance. See `INTEGRATION.md` for the import boundary. The two applications still run independently; their routes and browser storage have not been joined yet.

## Results and visible evidence

| Kane-generated journey | Result |
| --- | --- |
| Complete a keep decision using existing items | Passed |
| Keep a preferred item through a capacity conflict | Passed |
| Exclude an unchosen item from the selected set | Passed |
| Play the modeled-bag packing animation | Passed |
| Request, preview, and apply a real Astra suggestion | Passed |

[Machine-readable results and Test Manager links](kane-results.json) · [Kane design graph snapshot](kane-design.json)

The local sealed packs remain under `.testmuai/evidence/`; raw packs, recordings, and screenshots are ignored by Git. This sanitized record and the design graph are the tracked handoff artifacts. Initial design notes about the app platform, Astra connection, trip preference, and conflict fixture were answered before execution; Kane retains those historical notes. The visualization use case currently has happy-path browser coverage. The combined Next application and physical packing accuracy need their own integration checks.
