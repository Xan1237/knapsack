# Astra mesh and clamshell increment

Branch: `bug-bash`. Implemented in `final/` on 2026-10-24.

- Both server model paths use the shared Astra setting, default `gpt-6-astra`.
- Photo analysis returns explicit vertex, triangle and material data; the suitcase and editor render that supplied mesh. Bounds, topology references, nondegeneracy and resource limits are validated before acceptance.
- Meshes and model provenance survive resize, duplication, IndexedDB, native import and JSON export. Worker and advice requests omit large geometry arrays.
- Preset suitcases have two usable half-depth cavities. Placement and independent validation track each compartment, without doubling total capacity. The lid and its contents hinge together into the original closed bounds.
- Packing playback has an additional close step and an open action. The landing story uses the same shell; its final closing transition now starts automatically at the eight-item completion boundary.

## Checks

TypeScript, ESLint, formatting, all 59 direct tests, and the production build passed for this increment. The new tests cover invalid mesh data, direct geometry conversion, mesh round trips, shared model selection, compartment bounds, closed-pose bounds, and closing at the exact landing completion threshold.

The real two-photo API-to-mesh-to-validated-plan check and real Astra suggestion passed after the two-compartment update. The safe report is [astra-mesh-live.json](astra-mesh-live.json). Both bottle meshes came from `gpt-6-astra`; the pump sample has 72 vertices/136 triangles and the water-bottle sample has 64 vertices/124 triangles. Both items were packed after explicit tipping/scale corrections and retained by Astra advice.

## Browser evidence and limits

The live mesh run visually confirmed the generated pump/nozzle mesh, matching editor preview and recognizable resized geometry. Its assertions succeeded, but the runner exceeded its step allowance during final screenshot preservation; the overall run is not claimed as passed. Execution: `90a8fcd1-46c6-4f47-a19d-ec71ae1e09c7`.

The clamshell run confirmed belongings in both halves (4 main, 5 lid), final workspace closure, and reopening. Its landing check exposed that the 08/08 counter appeared before the scroll-driven close threshold. The closing trigger was corrected to use the same completion boundary as the counter. Execution: `d73c88fb-d68e-477f-b081-cbfee2a6ce0b`.

The user requested a quick finish rather than full coverage. The final landing timing fix has direct regression tests; a browser rerun after that fix and full browser coverage are deferred. Raw evidence, provider payloads, credentials and the incomplete generated browser runs remain local and ignored or untracked. No broader coverage claim is made.
