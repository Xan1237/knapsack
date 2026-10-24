# Single-compartment landing animation

Validated locally on 2026-10-24 against the combined app at `http://127.0.0.1:3005`.

The landing story keeps one suitcase half open. Eight essentials arrive in separate scroll intervals, occupy a fitted arrangement, and remain visible at completion. The counter and progress bar use the same timeline. Reverse scrolling removes the essentials in reverse order; reduced motion reveals each directly in its final position. The WebGL fallback also shows one compartment.

## Checks

- TypeScript, ESLint, changed-source formatting, and the production build passed.
- All 68 direct tests passed. The existing landing timeline tests now verify sequential arrivals, completed-item counts, interval boundaries, and reverse scrolling.
- Kane CLI's `single-compartment-scroll-check` browser run passed in desktop Chrome at 1920 × 1080: two tops and two sneakers at 04/08, eight neatly fitted essentials at 08/08 with no lid, and an empty compartment after returning to the top.
- The first browser attempt failed because the test agent became stuck in incremental scrolling and clicked the optional story shortcut. The successful follow-up used specific scroll positions.

Phone-width and reduced-motion browser runs were not performed. This visual story uses a fixed illustrative layout; the packing workspace retains its two-sided interactive suitcase.

Raw browser evidence and the generated local test recordings remain outside this commit.
