# Kane CLI validation history

## Initial implementation

- User brief recorded in `requirements/mvp.md` before implementation.
- Kane CLI 0.10.0-rc.3 installed and authenticated.
- Kane extracted two use cases from the user's brief; the user approved both and automatic review/execution of consistent test details.
- Kane generated five active desktop-web tests: animation, real Astra suggestions and apply, keep decisions, exclusion, and completing choices without replacement products. An initial incorrect emulator draft was superseded through `maintain evolve`, not edited by hand.
- `npm run build`: **passed** for the compatibility increment.
- `npm run test:geometry`: **5 passed**, covering native main-app units/axes/size overrides/orientations, impossible and empty inventories, independent rejection of corrupt plans, valid essential-preserving swaps, and 30 bounded random inventories.
- Live Astra endpoint: **HTTP 200**, provider `astra`, model `gpt-6-astra`; returned real item IDs and a locally validated preview. This is an API smoke result, not a browser E2E pass.
- Browser E2E suite: **running**, with five Kane-generated files under `.testmuai/tests/`. No browser pass is claimed yet.
- Nonsecret fixture values are generated from the real demo inventory by `npm run kane:fixtures`; credentials and raw evidence remain ignored.

## Compatibility handoff

The remote main app added in `79438d4` was merged and preserved in `b3ad229`. The step-two adapter reads its actual `InventoryState` structure, uses `estimate × scale`, converts millimeters/Z-up to centimeters/Y-up, converts permitted rotation indices, and carries bag clearance. See `INTEGRATION.md` for the import boundary. The two applications still run independently; their routes and browser storage have not been joined yet.

This file will be updated with actual test results and report links. No E2E pass or coverage is claimed before the runs finish.
