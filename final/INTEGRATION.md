# Final integration

Source baseline: `49274da` (root Next.js app plus step2 and their recorded validation).

The root app supplies the landing page, photo analysis, inventory reducer, visual editing, persistence, worker, independent validator and React Three Fiber scene. Step2 supplies the conflict-choice flow, essential pins, Astra suggestion/preview/apply flow, model URL handoff, and packing-plan export. The final app has one Next server, one inventory and one canonical geometry convention: millimeters, X width / Y length / Z up. Rendering converts to Y up at the scene boundary.

Both source implementations remain in their original locations. New work stays in this folder. The source review covered both UIs and renderers, domain/state/persistence, packing/validation/workers, vision and server routes, styles, tests, fixtures and configuration. The installed Next.js route-handler, client-component, CSS and lazy-loading guides were read before modifying the copied application.

## Work in progress

- Base application copied and dependencies installed.
- Combine pins and selection semantics with the existing reducer and persistence.
- Add native collection import/export and model loading.
- Port Astra and swap suggestions into Next routes and the workspace.
- Add smooth placement and top-view inspection.
- Run focused checks and Kane-generated combined browser journeys.
