# Final integration

Source baseline: `49274da` (root Next.js app plus step2 and their recorded validation).

The root app supplies the landing page, photo analysis, inventory reducer, visual editing, persistence, worker, independent validator and React Three Fiber scene. Step2 supplies the conflict-choice flow, essential pins, Astra suggestion/preview/apply flow, model URL handoff, and packing-plan export. The final app has one Next server, one inventory and one canonical geometry convention: millimeters, X width / Y length / Z up. Rendering converts to Y up at the scene boundary.

Both source implementations remain in their original locations. New work stays in this folder. The source review covered both UIs and renderers, domain/state/persistence, packing/validation/workers, vision and server routes, styles, tests, fixtures and configuration. The installed Next.js route-handler, client-component, CSS and lazy-loading guides were read before modifying the copied application.

## Combined behavior

- One reducer and IndexedDB inventory connect photo uploads, manual edits, essential pins and packing. A separate database preserves the original app's saved sessions.
- Native and step2 collection imports preserve IDs, geometry, permitted rotations and model URLs. Export includes the current inventory and its packing plan.
- Astra runs server-side, previews its proposed keep/leave selection through the packing engine, and applies only on request. Inventory edits retire old advice.
- Make room offers checked swaps, protects essentials, names what would be removed and waits for the user's choice.
- The scene loads optional glTF assets for items and bags with category-shape fallbacks, smooth placement, top view, orbit, zoom, layers, exploded view and animated packing order.
- Bundled original model assets can be regenerated with `npm run fixtures:models`; `public/example-models.json` demonstrates the native handoff contract. `public/example-collection.json` demonstrates step2 import.

## Validation in progress

All 41 direct tests pass, including collection conversion, essential protections, independently checked swaps, server API behavior and a latest-inventory plan download with attachment headers. TypeScript, lint and production build pass. The live API smoke check analyzed both bundled source photos through the real server vision adapter.

Kane CLI ingested the user requirements, extracted seven use cases, generated acceptance criteria and runnable tests, and refined its initial disconnected-deployment assumptions against the configured app. The user approved automatic review and execution within these workflows. The first run passed one of seven journeys; the failed recordings exposed both automation-flow problems and app improvements. The app changes are committed, while browser verification remains incomplete. See [the validation record](artifacts/validation.md). Raw recordings, unfinished test drafts and credentials remain ignored.

## Handoff

Use this folder as the combined application; its dependencies, routes, worker URLs, assets and APIs are self-contained. The originals do not need to run beside it. `public/example-models.json` demonstrates native millimeter/Z-up assets, and `public/example-collection.json` demonstrates the step2 centimeter/Y-up adapter. A plan download can be imported again with Import collection.

Remaining verification: complete the corrected Astra, photo and collection-import browser journeys, verify the inventory edit/persistence flow, verify the HTTP plan download in Chrome, and finish the 3D inspection journey. Exact geometry, independent validation and server-side provider behavior also have direct tests; these are separate from browser evidence.
