# Knapsack implementation prompt

Paste the prompt below into a new Codex session opened in this repository.

---

Build and test the complete Knapsack prototype described in `design.md`. Use `$kane-cli` for browser testing and test generation. Carry the work through implementation, validation, debugging, and documentation. Do not stop after scaffolding, a plan, or a partially connected demo.

## Product priorities

The main product is an interactive **fully packed 3D suitcase** containing the user's belongings. A basic web interface supports it.

The experience is: choose a suitcase preset → upload item photos → review generated 3D items → resize, add, duplicate, delete, or merge items → generate and explore the packed suitcase.

Users must not have to enter or confirm numerical measurements. Estimate initial sizes and let users adjust them visually beside the suitcase. Provide a bigger/smaller slider and optional controls for individual dimensions. Numerical entry may be an advanced option only.

The 3D scene must contain recognizable, editable objects, with selection, orbit/zoom, a reset view, layer inspection, and step-by-step packing playback. Photos should remain associated with their items. Unplaced items must stay visible and accounted for.

Read `README.md`, `design.md`, repository instructions, and existing code before editing. This prompt and the latest product decisions in `design.md` supersede older descriptions. Preserve unrelated user changes. Resolve ordinary implementation details yourself.

## Stack

Use TypeScript throughout:

- Next.js App Router and React for the application and server-side vision endpoint.
- Three.js, React Three Fiber, and Drei for rendering and interaction. Keep the viewer client-side and select compatible stable versions.
- Zod for external-input and vision-response validation.
- A pure TypeScript packing module and independent validator, with a Web Worker for calculations that would block interaction.
- IndexedDB for local photos and session persistence. A small state library is optional.
- Vitest or an equivalent lightweight runner for meaningful packing and state-invariant tests.
- Kane CLI for all actual browser interaction and E2E testing.

Use one application, a lockfile, and documented scripts. Add dependencies only when they serve the implementation. Start with procedural geometry and conservative rectangular packing envelopes. Full mesh reconstruction, physics simulation, live camera tracking, accounts, and multiple-bag optimization are deferred.

Before implementing the OpenAI integration, follow the available OpenAI documentation skill and check current official API/model support. Use any available approved credential setup capability. Never request or print secrets in chat. Keep credentials server-side, provide an ignored local environment file and a placeholder-only `.env.example`, and make the vision model configurable.

## Implementation requirements

1. Create an attractive, usable layout with the 3D suitcase as the dominant view, an inventory/photo panel, and contextual editing controls. Support desktop and a usable narrow-screen layout. Include empty, loading, failure, and partial-packing states.
2. Build category-based procedural models for folded clothing, shoes, bottles, and pouches, plus a generic fallback. Keep each display mesh inside its packing envelope. Scaling must update the visible model and solver geometry together.
3. Implement real multiple-photo analysis through a server-side vision adapter. Return validated structured item proposals, source-photo associations, category, appearance, and estimated dimensions. Bound upload size and processing concurrency; support per-photo progress and retries. Treat model output as data, never executable geometry or code.
4. Preserve stable item IDs. Distinguish duplicates from multiple views of one object. Let users review suggested merges. Retries and late responses must not duplicate items, overwrite user size changes, or resurrect deleted proposals.
5. Implement add, delete, duplicate, merge, rename, uniform resizing, and optional axis resizing. Editing must work immediately without another LLM call. Provide manual category-based additions if photo processing fails.
6. Implement a deterministic packing heuristic with permitted rotations, conservative clearance, bounded alternative orders, and sensible placement/support preferences. Keep one internal unit system and explicitly map solver coordinates and rotations to the viewer.
7. Validate bounds, overlap, allowed orientations, finite positive dimensions, and completeness independently. Account for every included physical item exactly once as placed or unplaced. Distinguish a complete layout, partial layout, search exhaustion, and directly proven constraint conflicts. Never label heuristic failure as proof that packing is impossible.
8. Associate plans with a revision covering all solver inputs, including suitcase changes. Reject stale results. Debounce recalculation while dragging, show immediate visual size changes, and reconcile the scene with the latest validated plan. Keep item identities and colors stable across repacks.
9. Implement layer hiding or an exploded view and packing playback that reveals covered items. Do not claim physical insertion feasibility or cloth behavior that the geometric model does not establish.
10. Persist inventory, source photos, suitcase selection, and user overrides across reloads. Handle unavailable or invalid persisted data gracefully. Provide a clear reset action.
11. Include a clearly labeled sample/demo mode with bundled reproducible fixtures so editing and packing remain demonstrable without credentials. It must not silently replace real photo analysis or be presented as evidence that the live vision integration works.

Weight is optional and must not delay the spatial experience. Describe photo-derived size and fit as estimates without interrupting the main flow with measurement forms.

## Work sequence

Implement in complete increments:

1. A real packed 3D scene from a deterministic sample inventory, backed by the packing engine and validator.
2. Visual inventory editing, repacking, and plan inspection.
3. Real photo analysis and generated item geometry.
4. Persistence, recovery states, polish, and comprehensive validation.

Keep a concise progress file containing completed milestones, decisions, commands/results, and outstanding work so the session can resume after context compaction. Give brief progress updates during long work. Ask only for information or authorization that genuinely blocks dependent work; continue independent implementation while waiting.

If credentials or an external service are unavailable, finish everything that can be implemented and validated locally, then state the exact blocked live check. Do not describe the entire application as complete while that required path is unverified.

## Kane CLI workflow

Read the installed `$kane-cli` skill and its relevant references before constructing commands. Also read hack-os `references/kane-apis.md` once if that skill is installed. Kane's data APIs are optional development tooling; do not add a quality dashboard to the product.

Run the skill's preflight before the first Kane command. Check the installed version and authentication. For this hack day, install or upgrade using `@testmuai/kane-cli@rc` if needed, with version 0.10.0-rc or newer. Follow current skill documentation rather than copying obsolete flags or inventing commands.

Use desktop Chrome initially. Honor existing Kane preferences; in their absence, use a visible browser where a display is available and keep a reusable suite. This task authorizes the necessary test-design and execution work; notify me about credit use and do not buy credits or upgrade a paid plan.

Determine the assurance store before ingestion. Preserve an existing project link. If a team project is available, follow the shared-project workflow and save the required sessions. If no project choice can be established, ask once and continue implementation while awaiting the answer. Never hand-edit or git-merge `.context/`, and never run concurrent assurance-store mutations.

Write `requirements.md` from this prompt and `design.md` as product behavior and acceptance criteria. Use Kane's assurance commands to ingest the requirements, extract/review use cases and criteria, and generate runnable requirement-linked tests. **Never hand-write Kane test cases, scenarios, or `_test.md` files.** Review generated output against the requirements, surface gaps and missing variables, and continue when it matches this authorized scope. Observe any skill checkpoint that requires new user input.

Use `KANE_CLI_USER_AGENT=codex` on each Kane command. Use the agent mode appropriate to each command family; suite execution must receive noninteractive stdin, ending `testrun run` commands with `< /dev/null`. Resolve variables before execution. Start the app on a documented local URL, verify readiness, and keep the server running during browser work.

Run the designed suite through Kane. Parse the process exit and the command's terminal completion event; a launched run or intermediate success is not a passing suite. Present the ready/run/result information required by the skill. Inspect failure screenshots, console/network evidence, and application state; fix product defects and rerun affected checks. Once fixes are complete, run the final relevant regression suite.

Do not use Playwright, Puppeteer, Selenium, direct CDP, or another browser-driving tool instead of Kane. Do not weaken assertions or alter generated tests to hide application defects. Route test-design problems through the documented Kane workflow, preserving requirement traceability. If Kane cannot validate a capability, disclose that limitation and validate the underlying behavior through meaningful non-browser tests where possible.

## Validation scope

Requirements must cover the complete photo-to-packed-suitcase journey, visual inventory corrections, repacking after edits, revealing covered items, playback, session restoration, photo-analysis failure recovery, and incomplete packing outcomes.

Use reproducible photo fixtures with explicit expected recognition attributes. Maintain separate evidence for deterministic demo-mode regressions and a genuine live vision smoke check. Do not claim live integration success from stubbed responses. Repeated UI regression runs can use a clearly identified deterministic adapter; at least one live photo-to-plan journey must be verified when credentials are available.

Kane must inspect the actual rendered 3D experience as well as the surrounding interface. Accessible labels, inventory summaries, and truthful plan diagnostics should support interaction and debugging, but a status label alone does not prove a correct rendered scene. Keep renderer transforms derived from the same placements that passed validation.

Write direct automated tests for important solver/state invariants: rotations, exact fits and clearance, non-overlap, completeness, oversized items, bounded-search outcomes, scaling consistency, stable identity, and stale asynchronous responses. These are ordinary code tests, not hand-authored Kane tests. Use meaningful boundary and adversarial inputs rather than tests that merely mirror implementation details.

Run type checking, linting, direct tests, a production build, the Kane suite, and Kane coverage reporting. Report actual requirement coverage and outstanding gaps; never invent a coverage percentage. Keep replayable generated test files and safe evidence summaries. Raw evidence packs may contain sensitive data and must stay ignored and unpublished.

## Finish criteria and handoff

Do not stop at the first green smoke check. Finish the agreed features and required checks, fix actionable failures, and clearly identify any genuine external blockers.

Update `README.md` with concise install/run instructions, environment setup, demo/live distinctions, test commands, and limitations. Update `design.md` where implementation decisions materially change the design. Include a concise validation report with tested commit or working-tree state, actual commands, run/report references, coverage, and remaining gaps.

Do not publish, deploy publicly, push commits, or finalize a hackathon submission unless I separately request it. Leave the implementation reviewable locally.

End with a short summary of what works, how to run it, what passed, and what remains unverified. Include links to the relevant files and safe test reports.
