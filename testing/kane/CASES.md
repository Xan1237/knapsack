# Nine automatic smoke checks

Application baseline: main `5822969`, merged into `kane-cli`, including standalone deployment output. The travel demo still has nine rows including Sage linen shirt and Cream knit; the nine retained control contracts remain present. The application sources match that baseline; changes in this branch concern tests, CI and documentation.

Each row is one independent Kane-generated one-step test on a separate GitHub runner. The label is its Actions job name. Assertions use DOM/text state; these checks make no claims about physical geometry, rendered pixels, provider correctness or persistence.

| Actions label | Generated design | Criterion | Test definition |
| --- | --- | --- | --- |
| 01 Workspace heading | t-62 | ac-61 | [direct-pack-shows-your-belongings](.testmuai/tests/direct-pack-shows-your-belongings_test.md) |
| 02 Photo formats | t-71 | ac-71 | [photo-upload-input-advertises-jpeg-png-and-webp](.testmuai/tests/photo-upload-input-advertises-jpeg-png-and-webp_test.md) |
| 03 Add item menu | t-70 | ac-70 | [add-item-opens-add-an-item-manually-menu](.testmuai/tests/add-item-opens-add-an-item-manually-menu_test.md) |
| 04 Demo inventory | t-68 | ac-67, ac-68 | [load-demo-restores-nine-items-including-sage-linen-shirt](.testmuai/tests/load-demo-restores-nine-items-including-sage-linen-shirt_test.md) |
| 05 Select item | t-69 | ac-69 | [select-cream-knit-fills-item-name-with-cream-knit](.testmuai/tests/select-cream-knit-fills-item-name-with-cream-knit_test.md) |
| 06 Exclude item | t-67 | ac-66 | [exclude-cream-knit-unchecks-its-include-checkbox](.testmuai/tests/exclude-cream-knit-unchecks-its-include-checkbox_test.md) |
| 07 Top view | t-63 | ac-62 | [top-view-offers-perspective-view](.testmuai/tests/top-view-offers-perspective-view_test.md) |
| 08 Exploded toggle | t-64 | ac-63 | [exploded-view-becomes-pressed](.testmuai/tests/exploded-view-becomes-pressed_test.md) |
| 09 Move items mode | t-65 | ac-64 | [move-items-offers-finish-moving](.testmuai/tests/move-items-offers-finish-moving_test.md) |

Requirements: [ten-smoke.md](requirements/ten-smoke.md), containing the user request and current app controls. The user previously authorized automatic review and execution within these existing workflows and explicitly requested this ten-case slice. The retained ten criteria, nine scenarios and nine tests were reviewed under that authorization; generation warnings about unapproved criteria are resolved by that review. Generated test bodies are copied unchanged.

CI runs all nine in parallel, one browser per runner, and reports actual assertion results and elapsed times. The user removed the earlier custom test/job deadlines in [runtime-policy.md](requirements/runtime-policy.md). The shared build and per-test JSON/JUnit/evidence artifacts make the result reviewable. Recording and repair require a separate manual workflow run and may take longer than replay.

The [first parallel recording run](https://github.com/Xan1237/knapsack/actions/runs/40141411126) passed all ten cases and cached their recordings. Normal push checks use those recordings with adaptive repair disabled; their own result artifacts report strict replay timings.

Older long/visual/provider designs remain manual regression snapshots, including known unresolved assertions. A green smoke suite proves only the nine narrow states above. The previous two-browser-per-runner smoke attempt exceeded its deadline, which is why the current workflow isolates each case on its own machine. No application code was changed to accommodate the tests.


Current scope: [nine-smoke.md](requirements/nine-smoke.md). The failing pinning case was removed from the repository and all suites at the user's explicit request. The active gate has nine checks and does not cover pinning.
