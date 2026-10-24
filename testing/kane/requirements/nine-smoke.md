# Current nine-case smoke scope

The user explicitly requested: "delete that one failing test". Remove the pinning smoke test from the repository and every suite. The active automatic gate now contains nine checks, all in parallel. Preserve the other nine assertions, use actual pass/fail results without custom time cutoffs, and merge to main only after the remaining suite passes. Do not modify application code or claim that the smoke gate covers pinning.

This overrides the earlier ten-case count. The original ten-smoke source remains the design provenance for the nine retained generated cases.
