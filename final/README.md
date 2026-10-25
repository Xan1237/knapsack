# Knapsack — final combined MVP

The root Next.js application and the step2 studio are combined here in one Next.js app. The original implementations remain intact.

## What makes this original

**Knapsack combines your photographed belongings as AI-generated 3D meshes with editable suitcase geometry, essential-preserving packing choices, and independent validation.** Correct an item's estimated dimensions, move it between the two suitcase halves, adjust clothing compression, and review an AI keep/leave suggestion against the actual inventory and a checked packing preview. Meshes remain linked to their source photos through saving and export; estimated envelopes determine packing fit.

See [why Knapsack is different](../README.md#why-knapsack-is-different) for the product comparison, source links, evidence, and verification limits.

## Run

From the repository root:

```sh
cd final
npm ci
cp .env.example .env.local
# Add OPENAI_API_KEY to .env.local for photo analysis and Astra advice.
npm run dev
```

Open http://127.0.0.1:3000 and choose a packing link. The workspace is http://127.0.0.1:3000/pack. Use Node 22 or newer. `OPENAI_MODEL` defaults to `gpt-6-astra` and controls both photo-to-mesh generation and packing advice. The old `OPENAI_VISION_MODEL` setting is no longer used by this app. The demo inventory, manual edits, and local packing work without an API key.

`npm run typecheck`, `npm run lint`, `npm test`, and `npm run build` check the combined source. Kane CLI browser journeys are generated from `requirements/integration.md`. Raw browser evidence, credentials and environment files stay ignored.

For a local production run, use `npm run build && npm start` from `final/`. The start command serves Next's standalone output with the built static files and public assets. Set `PORT` and `HOSTNAME` to change its default `127.0.0.1:3000` address.

Production hosting and updates are documented in [deploy/README.md](deploy/README.md).

### Take a photo with your camera

Choose **Take a photo** beside the existing photo upload control, allow camera access, and frame your item in the live preview. Choose **Take photo**, then **Use photo** to send that capture through the same Astra analysis and source-linked inventory flow as an uploaded image. **Retake**, **Cancel**, and Escape let you review or leave before submitting. The camera stops after capture or when the dialog closes. Camera capture requires HTTPS or localhost and browser camera permission; ordinary file upload remains available if a camera cannot open. Captures use the existing 12-photo and 6 MB limits.

## Integration status

Choose **Load demo** in the workspace to start the travel demonstration. Nine folded garments, sneakers, packing pouches, and a power bank fill **85.65%** of the weekender's declared 35.7 L interior. The outlined gap holds a **500 ml water bottle (75 × 75 × 220 mm)**. Use the existing photo-upload flow to add your own bottle; a bottle of those dimensions packs with all nine demo items at **89.12%**. Recognized water bottles may lie sideways, while other bottle types retain their upright default. The marker is shown only when that space passes the independent geometric checker.

These percentages use the same item envelopes and full suitcase volume as the rest of the app, with the normal 3 mm clearances. Items retain their full estimated sizes and folded orientations; the demo does not shrink them or alter suitcase capacity. Existing saved trips are preserved until you choose Load demo.

The mesh increment and its verification are described in [Astra mesh validation](artifacts/astra-mesh-validation.md). The integration counts in that report record an earlier checkpoint.

The workspace includes real photo analysis, editable source-linked inventory, essential pins, Astra advice with preview and explicit apply, overflow swaps, animated 3D packing, inspection controls, collection import and plan export. Choose **Try a 3D model collection** to load the bundled glTF item and bag assets, or import your own model URLs.

The solver uses millimeters with Z up. Import also accepts the step2 centimeter/Y-up collection and converts it once. Packing is a bounded estimate checked by an independent validator; it does not promise a global optimum.

## Astra-generated geometry

Uploading a photo asks Astra to recognize belongings and return actual colored triangle meshes: normalized vertices, triangle indices, and materials. New photo items display **Astra 3D**. The suitcase and editor render that supplied topology directly; the photo path does not substitute a category shape when generation or validation fails. Invalid or timed-out responses are retryable photo errors.

Meshes are approximate low-poly reconstructions from one image, not measured scans. A mesh is bounded to 512 vertices, 1,024 triangles, and 16 materials. Validation rejects nonfinite coordinates, geometry outside its envelope, invalid references, flat geometry, and zero-area triangles. Generated data is never executed as code.

Resizing, duplication, IndexedDB restoration, native collection import, and plan export preserve the mesh and model provenance. Packing still uses estimated millimeter envelopes; mesh topology is excluded from worker and advice payloads. Manual/demo items and imported glTF collections remain supported.

For a live API check against a server on another port, use `KNAPSACK_BASE_URL=http://127.0.0.1:3005 npm run test:live`. It exercises both real Astra paths and writes a safe count-based report to `artifacts/astra-mesh-live.json`.

## Two-sided suitcase

The landing animation shows a single open suitcase compartment. Eight travel essentials settle into a fitted arrangement one by one as you scroll, and the completed interior stays visible. Scrolling back reverses the sequence; reduced motion reveals each item directly in its final position.

In the workspace, choose **Move items** and drag a belonging to a new spot in either half. Dropping reserves that floor position and repacks the other belongings around it. The latest moved item takes precedence; moving another item releases the previous reservation. **Auto arrange** returns everything to automatic packing. Drag empty space to orbit; Top view makes precise moves easier.

Items that cannot fit are placed in separate empty floor spaces beside the suitcase in the 3D explorer. Their actual sizes determine spacing, and the camera expands to show the suitcase and overflow together. Overflow items remain selectable and draggable for another packing attempt.

Explorer labels and hover tooltips are rendered in the page's React tree, outside the Three canvas. This avoids nested HTML roots being synchronously unmounted during React scene updates.

Clothing has a separate **Clothing compression** slider from 0–40%, reducing folded thickness while preserving width and length. The scene, solver and validator use the same compressed envelope. Compression and the latest manual position survive saving and native export/import. Changing suitcases or editing an anchored item's size/rotations releases its position.

The preset suitcases open flat with a main compartment and a lid compartment, each using half the total interior depth. Packing results identify the half containing each item; clearance, overlap and orientation checks run within that half. Capacity is not doubled. The demo uses folded clothing dimensions and packs all nine items across both sides.

Packing playback ends with an additional **close suitcase** step. **Open suitcase**, **Show all**, the layer slider, and exploded inspection reopen the interior for review. Imported bags without the clamshell flag retain their existing asset layout.

Current local check (2026-10-24): TypeScript, lint, 73 direct tests in 15 files, and the production build pass. The [live two-photo API report](artifacts/astra-mesh-live.json) is provider evidence from a separate run; it is not a browser journey. Kane's initial seven-test browser run passed the overflow/essential workflow and failed six journeys. Its findings led to individual demo labels, automatic demo-item selection and an HTTP attachment download for plans, plus CLI-generated test-flow refinements. Full browser verification remains incomplete; see the [historical integration run](artifacts/validation.md), [architecture and handoff notes](INTEGRATION.md), and [nine-case smoke harness](../testing/kane/README.md).
