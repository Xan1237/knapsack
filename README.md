# Knapsack

See your suitcase packed before you start. The combined prototype turns photos of your belongings into editable AI-generated 3D meshes and a validated geometric packing layout.

The combined MVP now lives in [final](final/README.md). Run `cd final`, `npm ci`, and `npm run dev` to use photo recognition, Astra suggestions, essential pins, overflow choices, imported 3D assets and plan export in one application. The root app and [step2](step2/README.md) remain available as the source implementations. Final browser validation is in progress.

See the [architecture walkthrough](docs/architecture.md) for the three application boundaries, combined-app data flow, geometry and AI contracts, current verification, and review findings.

## Why Knapsack is different

**Knapsack brings photo-generated 3D belongings, personal packing priorities, and independently checked spatial decisions into one editable suitcase workspace.** A traveler can photograph an item, recognize it in the scene, correct its estimated size, protect essentials, and decide what to change when space runs out.

The original contribution is the way these capabilities work together in the [combined application](final/README.md):

- **Your photographed belongings become editable geometry.** Astra generates colored vertices, triangles, and materials from the uploaded photo. The scene renders that supplied geometry, preserves its photo and model provenance, and retains it through editing, saving, and export. See [photo analysis](final/src/lib/vision.ts) and [mesh rendering](final/src/components/packing/GeneratedMesh.tsx).
- **Packing responds to both physical constraints and personal choices.** Two suitcase compartments, permitted rotations, manual placement, and user-controlled clothing compression feed the packing calculation. Essential pins protect belongings during AI selection and make-room choices; the traveler previews and explicitly applies those decisions. See [manual layout](final/src/lib/manual-layout.ts), [packing advice](final/src/lib/astra.ts), and [make-room choices](final/src/lib/choices.ts).
- **Generated suggestions must pass explicit checks.** The app validates mesh data and checks packing bounds, clearance, overlap, orientations, and complete item accounting independently of the search. AI advice must use the actual inventory IDs and preserve essentials. Packing uses estimated rectangular envelopes; generated mesh detail improves recognition, while the envelope defines estimated fit. See [mesh validation](final/src/lib/mesh.ts) and [plan validation](final/src/lib/validate.ts).

### Comparison with related products

The following comparison uses the products' own public descriptions, reviewed on 2026-10-24. It identifies the focus of our implementation without assuming that an unadvertised competitor feature is absent.

| Related product | Publicly described focus | Knapsack's specific contribution |
| --- | --- | --- |
| [JetKit](https://jetkit.ai/) (beta) | Photo-based wardrobe recognition and packing recommendations based on destination and weather. | Connects photo-derived belongings to generated 3D geometry, editable dimensions, and a compartment-aware suitcase arrangement with checked keep/leave decisions. |
| [PackPilot](https://packpilot.io/) (early access) | Camera/LiDAR or manual capture, constrained 3D packing plans, load order, and AR placement guidance. | Centers an ordinary photo-to-generated-mesh workflow in a browser, with editable belongings, essential-preserving AI advice, and independently validated packing previews. |

**Our case for full credit on the rubric's 10-point Originality criterion is this implemented combination: a traveler's own photos become recognizable 3D belongings, personal constraints drive packing tradeoffs, and independent validation checks the resulting spatial decisions.** The linked source and [validation records](final/artifacts/astra-mesh-validation.md) make that case inspectable. The [live two-photo report](final/artifacts/astra-mesh-live.json) demonstrates real generated meshes, corrected dimensions, a validated plan, and real packing advice; full browser verification remains incomplete. Originality credit ultimately rests with the judges under the [published rubric](https://kaneclihack.sh/#judging).

## Project structure

```text
src/
  app/                    Routes, layouts, global styles, and API handlers
  components/
    landing/              Landing page and scroll-driven 3D packing animation
    packing/              Packing workspace and interactive suitcase viewer
  lib/                    Shared domain, packing, persistence, vision, and tests
public/fixtures/          Bundled recognition images and source information
scripts/                  Development utilities
.testmuai/tests/          Kane-generated browser journeys
```

Keep route files small and place feature-specific UI beside its 3D components and styles.

## Run locally

Requires Node.js 20.9+ and npm.

```sh
npm ci
cp .env.example .env.local
# Set OPENAI_API_KEY in .env.local, or inherit it from your server environment.
npm run dev
```

Open [the landing page](http://127.0.0.1:3000) or [the packing workspace](http://127.0.0.1:3000/pack). `npm run build && npm start` serves the production build on the same address. Keep the server running during browser tests; run production builds between test sessions.

The server uses `OPENAI_VISION_MODEL=gpt-4.1-mini` by default; configure another model supporting image input and strict structured output if needed. The ignored `.env.local` stays local; `.env.example` contains placeholders only. Never prefix the API key with `NEXT_PUBLIC_`.

## Try it

The workspace opens with **Demo inventory**: nine reproducible belongings, computed by the real packing engine, with no model calls. Select an item in the scene or inventory, resize it visually, duplicate/delete/exclude it, change rotations, or add a category template. Suitcase changes and visual edits repack in a worker. Explore hidden layers, the exploded arrangement, and the packing-order slider or playback.

For **live analysis**, reset the trip to start empty, then upload JPEG, PNG or WebP photos (up to 6 MB each, 12 retained photos, 80 total items). Photos are sent to OpenAI by the server and retained in this browser's IndexedDB; this app does not persist photos on its server. Each photo has independent progress and retries, with at most two in flight. Missing credentials produce a clear error; demo items are never substituted for analysis. Source thumbnails stay linked to generated items. Visually correct estimates and merge multiple views only when they represent one physical belonging.

Use [bundled recognition fixtures](public/fixtures/README.md) for repeatable live checks. Live outputs vary. A separate nine-item inventory in `src/lib/domain.ts` supports deterministic demo regressions.

The trip autosaves locally, including photos, suitcase choice and visual overrides. Reset clears this browser's retained session; Load demo replaces the current trip with the sample inventory. The app reports unavailable or invalid storage and leaves editing usable.

## Validate

```sh
npm run typecheck
npm run lint
npm test
npm run build
# Optional genuine live endpoint check; requires the server and API credential:
npm run test:live
```

Vitest covers rotations and renderer transforms, tight clearance, incomplete layouts, overlap and completeness rejection, randomized inventories, stable identities, retries/deletions/late responses, persistence recovery and server upload/concurrency boundaries.

Browser tests must be generated through the [Kane CLI skill](https://github.com/LambdaTest/kane-cli). This repo uses a local assurance store, preserves generated `.testmuai/tests/*_test.md`, and ignores raw evidence and credentials. Follow the skill's human review checkpoints before authoring tests. Requirement source: [requirements.md](requirements.md).

```sh
# Server must remain running. Browser tests use visible Chrome by default.
KANE_CLI_USER_AGENT=codex kane-cli testrun run --agent < /dev/null
KANE_CLI_USER_AGENT=codex kane-cli cover gaps
```

See [PROGRESS.md](PROGRESS.md) for current workflow state and [artifacts](artifacts) for safe review/validation summaries. A launched Kane process is not a passed suite.

## Model and limits

All solver geometry uses millimeters, with X=width, Y=length, Z=up. Renderer coordinates are X=width, Y=up, Z=length, at 100 mm per world unit. The signed rotation transform matches each permitted envelope permutation. Four bounded deterministic item orders try lower supported placements, with a 3 mm wall/item margin. An independent module validates dimensions, orientations, bounds, overlaps and complete placed/unplaced accounting before accepting a plan. The plan revision includes all solver inputs, including suitcase selection and clearance; late results are discarded.

Rectangular suitcase interiors and conservative envelopes approximate fit. Absolute scale cannot be recovered reliably from arbitrary photos. Category meshes are recognizable approximations; recognition can miss or misclassify belongings. Static geometric layouts and the proposed packing order do not prove physical insertion feasibility, compressibility or cloth behavior. A partial search result does not prove packing impossible. Direct oversized-envelope/total-volume conflicts are reported separately from bounded-search exhaustion.

Full reconstruction, physics, accounts, multiple bags, camera tracking and bag-specific curved interiors are deferred. Storage is per browser/device. This local prototype's process concurrency guard is not a distributed production quota system. Broader device coverage and a physical packing trial require separate validation.

The OpenAI adapter follows official [image input](https://developers.openai.com/api/docs/guides/images-vision), [structured output](https://developers.openai.com/api/docs/guides/structured-outputs), and [GPT-4.1 mini](https://developers.openai.com/api/docs/models/gpt-4.1-mini) documentation. See [design.md](design.md) for architecture decisions.

## Step-two packing studio

The separately runnable [step2 MVP](step2/README.md) adds a 3D packing studio, animated placement, essential-item pins, user-selected swaps for items that do not fit, model URL import, and a server-side Astra suggestions adapter. See [its handoff contract](step2/INTEGRATION.md) for integration with the main app.

Kane CLI E2E checks are required throughout implementation. Generate requirement-linked tests, run them as features are implemented, and retain evidence. See the [design workflow](design.md#kane-cli-development-and-evidence-workflow) and [step-two validation record](step2/evidence/README.md).

## Validation status

See [the validation report](artifacts/validation.md) for the earlier command results, browser smoke results, actual Kane coverage, and unverified paths. Full browser coverage is not claimed (the recorded Kane baseline reports 2%, 3/106 criteria). The genuine live API check is separate from browser evidence. Root TypeScript and ESLint now exclude the independent `final/` and `step2/` packages; both Next.js apps pass their own type checks, lint, and production builds.

For the committed packing smoke tests, copy the nonsecret fixture definitions before execution:

```sh
mkdir -p .testmuai/variables
cp scripts/kane-variables.example.json .testmuai/variables/knapsack.json
```

Unexecuted local Kane drafts are outside the completed verification scope. The application ships demo inventory and real OpenAI analysis; no deterministic photo-analysis adapter is enabled.
