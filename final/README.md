# Knapsack — final combined MVP

The root Next.js application and the step2 studio are combined here in one Next.js app. The original implementations remain intact.

## Run

```powershell
cd final
npm ci
npm run dev
```

Open http://127.0.0.1:3000 and choose a packing link. The workspace is http://127.0.0.1:3000/pack. Install dependencies with Node 22 or newer; the project also includes a local Node 22 runtime for its development commands. Copy `.env.example` to `.env.local` and enter the OpenAI key locally if setting up another machine. `OPENAI_MODEL` defaults to `gpt-6-astra` and controls both photo-to-mesh generation and packing advice. The old `OPENAI_VISION_MODEL` setting is no longer used by this app.

`npm run typecheck`, `npm run lint`, `npm test`, and `npm run build` check the combined source. Kane CLI browser journeys are generated from `requirements/integration.md`. Raw browser evidence, credentials and environment files stay ignored.

## Integration status

The latest mesh increment and its verification are described in [Astra mesh validation](artifacts/astra-mesh-validation.md). The integration counts below record the earlier baseline.

The workspace includes real photo analysis, editable source-linked inventory, essential pins, Astra advice with preview and explicit apply, overflow swaps, animated 3D packing, inspection controls, collection import and plan export. Choose **Try a 3D model collection** to load the bundled glTF item and bag assets, or import your own model URLs.

The solver uses millimeters with Z up. Import also accepts the step2 centimeter/Y-up collection and converts it once. Packing is a bounded estimate checked by an independent validator; it does not promise a global optimum.

## Astra-generated geometry

Uploading a photo asks Astra to recognize belongings and return actual colored triangle meshes: normalized vertices, triangle indices, and materials. New photo items display **Astra 3D**. The suitcase and editor render that supplied topology directly; the photo path does not substitute a category shape when generation or validation fails. Invalid or timed-out responses are retryable photo errors.

Meshes are approximate low-poly reconstructions from one image, not measured scans. A mesh is bounded to 512 vertices, 1,024 triangles, and 16 materials. Validation rejects nonfinite coordinates, geometry outside its envelope, invalid references, flat geometry, and zero-area triangles. Generated data is never executed as code.

Resizing, duplication, IndexedDB restoration, native collection import, and plan export preserve the mesh and model provenance. Packing still uses estimated millimeter envelopes; mesh topology is excluded from worker and advice payloads. Manual/demo items and imported glTF collections remain supported.

For a live API check against a server on another port, use `KNAPSACK_BASE_URL=http://127.0.0.1:3005 npm run test:live`. It exercises both real Astra paths and writes a safe count-based report to `artifacts/astra-mesh-live.json`.

## Two-sided suitcase

The preset suitcases open flat with a main compartment and a lid compartment, each using half the total interior depth. Packing results identify the half containing each item; clearance, overlap and orientation checks run within that half. Capacity is not doubled. The demo uses folded clothing dimensions and packs all nine items across both sides.

Packing playback ends with an additional **close suitcase** step. **Open suitcase**, **Show all**, the layer slider, and exploded inspection reopen the interior for review. The landing story uses the same hinged shell and closes after its eight items settle. Imported bags without the clamshell flag retain their existing asset layout.

Validation: 41 direct tests, TypeScript, lint, production build and a live two-photo API check pass. Kane's initial seven-test browser run passed the overflow/essential workflow and failed six journeys. Its findings led to individual demo labels, automatic demo-item selection and an HTTP attachment download for plans, plus CLI-generated test-flow refinements. Full browser verification is still incomplete; see [the validation record](artifacts/validation.md) and [INTEGRATION.md](INTEGRATION.md).
