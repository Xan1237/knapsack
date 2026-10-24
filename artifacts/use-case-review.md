# Kane use-case review

Generated from requirements.md. Awaiting human approval; no derived facts promoted. Extraction consumed 13.46 credits.

## uc-1: Create a packing inventory from photos

A traveler uploads supported photos after disclosure that live analysis sends them to OpenAI and retains them locally rather than on the server, then reviews and corrects source-linked proposals beside the suitcase; successful work survives failed, interrupted, retried, and stale analyses, and the owner's clarification makes manual additions and duplicates count toward the 80-item cap and rejects cap-exceeding actions without evicting saved content.

- Accept JPEG, PNG, and WebP; cap each upload at 6 MB, retained photos at 12, and total items at 80; per owner clarification count manually added and duplicated items and reject cap-exceeding actions rather than evicting content. (requirements.md L12-L12)
- Disclose before upload that live analysis sends photos to OpenAI, stores them locally in this browser, and does not persist them on the application server. (requirements.md L12-L12)
- Show each photo's queued, analyzing, done, or error state with retry; run at most two analyses concurrently. (requirements.md L12-L12)
- Validate live vision proposals with Zod for label, category, hex color, appearance, estimated millimeter dimensions, and source photo IDs; never turn data into executable geometry. (requirements.md L12-L12)
- Let travelers review and visually correct generated items beside the suitcase; preserve successful inventory on photo failures and permit manual additions. (requirements.md L12-L12)
- Reject unsupported files and oversized uploads with useful feedback. (requirements.md L12-L12)
- Retries and stale completions must not duplicate proposals, overwrite edits, or resurrect deleted proposals. (requirements.md L12-L12)
- Explicitly report missing credentials as configuration failure, without silently substituting demo analysis. (requirements.md L12-L12)
- After reload, interrupted pending analyses become retryable errors; handle failed-analysis state. (requirements.md L18-L18)

## uc-2: Correct inventory and repack a suitcase

A traveler selects a scene or inventory item to rename, resize visually or per axis, duplicate, delete, exclude, adjust permitted rotations, or merge a suggested multiple-view match; the traveler can add categories manually or switch among personal, cabin, and checked suitcase presets, triggering debounced worker repacking while preserving selected identities, colors, overrides, and source associations and invalidating old plans.

- Offer rename, visual slider and optional per-axis resize, duplicate, delete, exclude, permitted-rotation editing, and suggested multiple-view merging from inventory or scene selection. (requirements.md L9-L9)
- Allow manual category additions without numerical measurements or model calls and retain photo thumbnails with items. (requirements.md L9-L9)
- Give duplicates unique stable IDs; merge sources while keeping the selected item's edits and never automatically merge physically distinct belongings on appearance alone. (requirements.md L9-L9)
- Offer personal, cabin, and checked suitcase presets. (requirements.md L9-L9)
- Edits or suitcase changes immediately update visible item size, trigger debounced worker repacking, and invalidate prior plans. (requirements.md L9-L9)
- Retain selection, IDs, colors, and overrides across repacks; classify each included item exactly once as placed or unplaced, separately identifying excluded items. (requirements.md L9-L9)

## uc-3: Generate and assess a suitcase packing plan

A traveler generates or receives a validated layout for included items and the selected suitcase, sees whether all items fit or the result is partial, and can distinguish bounded-search exhaustion from oversized envelopes or excess total volume; the bounded deterministic millimeter solver checks supported placements, rotation, clearance, dimensions and identity, discards stale or invalid plans, and does not claim that a spatial fit proves physical insertion.

- Use a deterministic bounded millimeter heuristic with allowed axis-aligned rotations and conservative wall/item clearance, preferring supported lower placements. (requirements.md L15-L15)
- Independently validate finite positive dimensions, bounds, non-overlap, orientation/dimension agreement, unique identities, and completeness. (requirements.md L15-L15)
- Bind plans to all solver inputs including suitcase preset and clearance, rejecting stale results. (requirements.md L15-L15)
- Distinguish complete validated placements, partial layouts, bounded-search exhaustion, oversized envelopes, and excessive total volume; never present heuristic exhaustion as proof of impossibility. (requirements.md L15-L15)
- Handle computing, invalid-plan, and partial-packing states with loading feedback. (requirements.md L18-L18)
- Scale solver envelopes and display meshes consistently; numerical diagnostics remain optional details. (requirements.md L15-L15)

## uc-4: Inspect a packed suitcase visually

A traveler inspects recognizable folded clothes, shoes, bottles, pouches, and generic items in a real WebGL 3D open suitcase, explores placements using orbit, zoom, camera reset, scene selection, upper-layer hiding, exploded arrangement, and step-by-step playback, and sees unplaced items and reasons outside the case; bundled Demo inventory works independently of live analysis, visibility controls never modify solver inclusion, and WebGL failure has a recoverable message.

- Display an interactive WebGL 3D open suitcase with recognizable folded clothes, shoes, bottles, pouches, and generic items; label reproducible bundled fixtures Demo inventory, independent of live analysis. (requirements.md L6-L6)
- Provide orbit, zoom, reset, rendered selection, hidden upper layers, exploded layout, and stepwise playback with visible object changes, not status text alone. (requirements.md L6-L6)
- Layer and step visibility never change item inclusion or solver inputs. (requirements.md L6-L6)
- List unplaced items by name and reason outside the case; spatial simulation never claims physical insertion feasibility or cloth behavior. (requirements.md L6-L6)
- Provide a recoverable message for WebGL failure, usable narrow-screen layout, and accessible named controls. (requirements.md L18-L18)

## uc-5: Resume a saved packing session

A returning traveler reloads and recovers inventory, overrides, item sources, photos, thumbnails, visual edits, and suitcase selection from local IndexedDB; invalid or unavailable storage yields a non-crashing notice and pending analyses interrupted by reload are retryable errors rather than silently completed results.

- Persist inventory, overrides, sources, photos, and suitcase choice in IndexedDB across reloads, restoring source thumbnails and visual edits. (requirements.md L18-L18)
- Show a useful notice without crashing when persistence is invalid or unavailable. (requirements.md L18-L18)
- Treat interrupted pending analyses as retryable errors after reload. (requirements.md L18-L18)

## uc-6: Reset a packing session

A traveler clears locally retained session data to start again with an empty inventory and, where appropriate, clears stale selection and playback state so the reset session does not present prior packing activity.

- Clear retained data and display an empty inventory on session reset. (requirements.md L18-L18)
- Clear selection and playback state where appropriate after reset. (requirements.md L18-L18)

## uc-7: Verify and report packing application readiness

An assurance operator checks core solver and recovery behavior with direct automated tests, passes typecheck, lint, test, and build gates, generates browser requirements and test files with Kane assurance commands, and reports real reproducible coverage and gaps while keeping raw evidence ignored and avoiding publication or deployment.

- Direct tests cover rotations, exact fits, clearance, overlap rejection, completeness, oversized items, invalid values, bounded-search outcomes, geometry scaling, stable IDs, retry idempotency, deleted proposals, stale analyses, and stale plan acceptance. (requirements.md L21-L21)
- Pass typecheck, lint, tests, and production build; generate browser requirements and test files via Kane assurance commands rather than by hand. (requirements.md L21-L21)
- Separate live smoke evidence from deterministic demo regression evidence and use bundled fixtures with explicit recognition expectations. (requirements.md L12-L12)
- Preserve replayable tests, report real coverage and gaps, keep raw evidence ignored, and do not publish, deploy, push, or submit. (requirements.md L21-L21)
