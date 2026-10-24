# Knapsack

**See what fits. Keep what matters.**

Knapsack turns ordinary photos of your belongings into editable, AI-generated 3D objects and helps you arrange them inside a suitcase. Correct an estimated size, protect an essential, move something between compartments, and preview what would need to change to bring another item.

The traveler’s question is concrete: **“Can these particular belongings fit together, and which tradeoff am I willing to make?”** Knapsack connects what an object looks like, how much space it needs, and how much it matters to the person packing it.

[Open the live workspace](https://knapsack.pontrolcanel.top/pack) · [Run the combined app](final/README.md) · [Architecture](docs/architecture.md) · [Validation and limitations](final/artifacts/validation.md)

## Why Knapsack is different

**A photographed belonging keeps the same identity as it moves through recognition, generated geometry, visual correction, packing, and a keep-or-leave decision.** That continuity is the core of Knapsack’s originality: the traveler can change the model’s interpretation and inspect how that correction changes the actual packing plan.

### 1. A photo becomes geometry you can correct

Astra returns colored vertices, triangle indices, and materials for the photographed object. Knapsack renders that supplied mesh in both the suitcase and the item editor. A bottle’s pump or nozzle can remain recognizable as you resize it beside the suitcase.

The item retains its source photo and model provenance through duplication, saving, collection import, and export. The visual mesh and its estimated packing envelope scale together. Reviewing a photo and correcting its size become part of the same spatial interaction.

Implementation: [photo-to-mesh generation](final/src/lib/vision.ts), [generated-mesh rendering](final/src/components/packing/GeneratedMesh.tsx), and [mesh validation](final/src/lib/mesh.ts).

### 2. “Must bring” changes the available tradeoffs

An essential pin protects an item from removal by AI advice and make-room alternatives. When another belonging cannot fit, Knapsack can calculate alternatives using the actual inventory IDs, preserve those essentials, and show the resulting arrangement before the traveler applies a choice.

For example, **“Keep my charger. Help me bring this bottle.”** becomes an inspectable packing decision: which belongings remain, which would be excluded, and where the selected items would go. Essential status protects a belonging from suggested removal; geometric feasibility is still checked separately.

Implementation: [packing advice](final/src/lib/astra.ts), [make-room alternatives](final/src/lib/choices.ts), and [independent plan validation](final/src/lib/validate.ts).

### 3. The traveler can revise the spatial assumptions

Drag an item to a floor position in either suitcase half, change its permitted rotations, or adjust a garment’s folded thickness with the clothing-compression control. These edits change the geometry used by the solver and validator. The suitcase’s two compartments share its declared capacity, and overflow remains visible beside it.

Generated meshes provide a recognizable visual reference. Conservative rectangular envelopes define estimated fit. This separation lets the app show detailed belongings while checking bounds, clearance, overlaps, orientations, and complete item accounting with explicit rules.

Implementation: [manual placement](final/src/lib/manual-layout.ts), [packing engine](final/src/lib/packing.ts), and [validator](final/src/lib/validate.ts).

**The contribution is the connected decision process: your photos become persistent objects, your corrections and priorities affect the arrangement, and proposed tradeoffs produce a preview that can be checked before you accept it.**

### Related work and positioning

These descriptions were reviewed on 2026-10-24 using the products’ own websites. Each row summarizes a published product focus; Knapsack’s originality claim concerns the workflow implemented here.

| Product | Publicly described focus | Knapsack’s emphasis |
| --- | --- | --- |
| [JetKit](https://jetkit.ai/) | Recognizing a personal wardrobe from photos and recommending what to bring for a destination, weather, and trip. | Connect photographed belongings to editable generated meshes and a spatial packing plan whose tradeoffs respect the traveler’s essentials. |
| [PackPilot](https://packpilot.io/) | Capturing spaces and objects with camera/LiDAR, AR tracing, or manual input; constrained 3D packing, load order, and AR guidance. | Bring ordinary photo uploads, generated mesh data, visual correction, essential-preserving choices, and independently checked previews into one browser workspace. |

## Inspect the evidence

The implementation and verification records make the originality claim reviewable.

| Evidence | What it establishes | Scope |
| --- | --- | --- |
| [Live Astra mesh report](final/artifacts/astra-mesh-live.json) | The pump-bottle fixture produced 72 vertices and 136 triangles; the water-bottle fixture produced 64 vertices and 124 triangles. Both items packed after explicit size/orientation corrections, and real Astra advice retained both essentials in a valid preview. | Genuine provider API → generated meshes → corrected inventory → validated plan and advice. The inputs include one real photograph and one stock illustration. |
| [Mesh and suitcase validation](final/artifacts/astra-mesh-validation.md) | Mesh data is bounded and validated; geometry survives editing and persistence; compartment packing and closed-suitcase bounds have direct tests. | Source checks, direct tests, live API evidence, and explicitly limited browser observations. |
| [Studio Kane results](step2/evidence/kane-results.json) | Five generated browser journeys passed, including capacity choices, essential protection, animation, and requesting and applying real Astra advice. | The earlier studio MVP: eight approved criteria across two use cases. |
| [Combined-app Kane results](final/artifacts/validation.md) | Kane findings led to individual demo labels, automatic item selection, a server attachment for exports, and generated test-flow refinements. | The initial combined suite passed one journey and failed six; the partial rerun does not establish a full regression pass. |
| [Landing animation check](final/artifacts/landing-animation-validation.md) | Kane verified sequential arrivals, the completed eight-item arrangement, and reverse scrolling. The increment also records 68 passing direct tests. | The documented landing increment; the visual story uses a fixed illustrative layout. |

Kane participates in development through requirements ingestion, use-case and acceptance-criteria generation, runnable `_test.md` files, execution, evidence inspection, and coverage reporting. The coding agent used the results to change the implementation and refine tests through Kane’s documented workflow.

**Full browser verification of the current photo-to-packed-suitcase journey remains incomplete.** The studio’s 8/8 coverage applies to its approved MVP scope. The combined app’s initial run reported 11% of 55 criteria proven. These records describe different scopes and are kept separate.

## Try the workflow

1. Open the [packing workspace](https://knapsack.pontrolcanel.top/pack), choose a suitcase, and upload item photos. **Load demo** provides a labeled inventory for exploring the scene without a recognition call.
2. Compare each generated object with its source photo. Make it bigger or smaller visually, adjust its shape, or correct the inventory. Numerical measurement entry is optional.
3. Pin the belongings you must bring. Explore rotations, manual placement, and clothing compression, then inspect the resulting arrangement across both suitcase halves.
4. If an item remains outside, inspect **Make room** alternatives or **Ask Astra**. Review the proposed selection and packing preview before applying it.
5. Explore layers and packing playback, inspect closure, and export the plan. Inventory and photos persist in this browser.

## Run locally

The current combined application lives in **`final/`**. Use Node.js 22 or newer.

```sh
cd final
npm ci
cp .env.example .env.local
# Set OPENAI_API_KEY in this ignored file, or inherit it from the server environment.
npm run dev
```

Open `http://127.0.0.1:3000/pack`. The server setting `OPENAI_MODEL` defaults to `gpt-6-astra` and controls photo-to-mesh generation and packing advice. Credentials stay on the server. See [the application README](final/README.md) for configuration and [deployment instructions](final/deploy/README.md) for production hosting.

From `final/`, run the local checks:

```sh
npm run typecheck
npm run lint
npm test
npm run build
```

`npm run test:live` exercises real provider calls against a running server and requires its API credential. Its result is API evidence. Browser journeys use Kane CLI; their requirements and recorded status are linked from the [combined validation report](final/artifacts/validation.md). Credentials, raw recordings, and evidence packs remain ignored; safe reports and available Test Manager links are retained.

## Boundaries of the prototype

Photo-derived dimensions and unseen surfaces are estimates. The meshes are approximate low-poly reconstructions. Packing uses conservative envelopes and a bounded heuristic; a failed search does not prove packing impossible. Clothing compression is a user-supplied spatial assumption. Geometric checks and a closing animation do not establish physical insertion feasibility, fabric behavior, or real-world closure.

Live analysis sends uploaded images to OpenAI. The application retains trip photos and inventory in the visitor’s browser and does not persist uploaded photos on its server. Recognition and provider failures remain visible and retryable; manual additions remain available. These limits are part of the product’s interaction and documented validation scope.

## Repository map

| Path | Role |
| --- | --- |
| [`final/`](final/README.md) | Current combined Next.js application and primary demo target. |
| [`docs/architecture.md`](docs/architecture.md) | Data flow, AI/geometry contracts, application boundaries, and review findings. |
| [`src/`](src/) | Original Next.js implementation, preserved as a source implementation. |
| [`step2/`](step2/README.md) | Original packing studio and its separately scoped Kane evidence. |
| [`artifacts/validation.md`](artifacts/validation.md) | Historical validation of the original root application. |

The original source applications remain available; the combined product and its current setup instructions are in `final/`.

The independent [Kane CI harness](testing/kane/README.md) lives in `testing/kane`. Its automatic gate runs nine small deterministic smoke checks in parallel and reports actual assertion results and elapsed times. Larger suites and recording/repair are manual. It can test a separate application branch without changing application source.
