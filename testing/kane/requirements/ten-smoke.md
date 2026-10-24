# Ten fast parallel smoke checks

User request: "pull from the main branch there where new code changes update the tests so i have 10 tests as a set of smoke tests with kane cli that all run in paralell in github actions and all pass make them all very simple and run fast so I can be clear on what they do go this is your prioraty you are done when the ci is green go".

The application is the combined app in `final`, updated from main commit d812836. Keep application implementation identical to main; only testing and CI may be changed. The user's earlier limits remain: each recorded browser check under 30 seconds and the automatic pipeline targeting under five minutes from push to success. Put each test on its own GitHub Actions matrix runner, with all ten allowed to run simultaneously and only one Chrome session on each runner. Recording and repair remain separate manual operations.

This smoke slice has exactly ten narrow observable responsibilities within the existing workspace:

- Direct `/pack` navigation renders the Your belongings workspace heading.
- The existing Upload item photos file input advertises JPEG, PNG and WebP image formats through its DOM `accept` attribute.
- The Add item control opens the Add an item manually category menu.
- Load demo restores the nine-item bundled inventory, including Sage linen shirt.
- Selecting the Cream knit demo inventory row makes the item-name editor show Cream knit.
- Excluding the unpinned Cream knit demo item leaves its Include Cream knit checkbox unchecked.
- Pinning Sage linen shirt as essential makes its Include Sage linen shirt checkbox disabled.
- The Top view control switches to a Perspective view control after it is used.
- The Exploded view control exposes `aria-pressed=true` after it is toggled on.
- The Move items control switches to Finish moving after it is used.

These are smoke-level UI state checks, not visual geometry, exact physics, persistence or provider correctness claims. Each should have one short intent step with its own direct workspace navigation, minimal required setup using real existing controls, and one concise DOM/text-based terminal assertion. No landing-page animation, screenshot interpretation, WebGL pixel comparison, camera drag, upload or file chooser, provider calls, network interception, injected storage, mocked responses, invented controls or application changes. Do not create a large multi-step journey. Reuse the existing nonsecret `knapsack_base_url` variable. Do not add other requirements or tests to this smoke slice.
