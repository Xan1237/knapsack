# Short Kane checks

The user requested: "please have the test be shorter an multiple small ones" and "instead of long running ones they should all run under 30s".

The previously approved seven product workflows remain the scope. Split each workflow into several small, independent browser checks instead of preserving a long journey in one file. Each runnable file should contain one short intent step, including its own navigation/setup and a narrowly focused observable result. Do not put the setup into a separate step. Prefer the already bundled demo data, sample inputs and model-collection controls. Do not depend on another test's cookies, storage, outputs or browser.

The 30-second budget is per recorded check, including its browser-session startup. First-time recording/repair is a separate operation and may take longer; do not add a tiny authoring timeout to the generated file. The CI harness enforces the 30-second check deadline. A strict check cannot repair itself, silently author missing recordings, or call a timed-out test passed.

Use the existing ci-runtime facts and the nonsecret knapsack_base_url/knapsack_collection_fixture variables. A file should verify one small behavior, rather than chaining a complete packing/photo/Astra journey. Multiple assertions are acceptable only when they describe that one visible result. A larger use case may produce several one-step files so its already approved criteria remain covered.

Separate deterministic demo/inventory/3D/import/export checks from tests that actually need live Astra/photo responses. Inventory resize/persistence can be checked without obtaining advice first; stale-advice behavior belongs in its own live check. UI controls and behavior must come from the actual application; do not invent seed endpoints, injected state, fake responses or new app controls.

Keep modal assertions inside the open dialog. The Make room dialog does not always contain the workspace's bounded-search explanation. Read that explanation in the workspace, rather than requiring nonexistent text in an open dialog. Keep provider correctness, precise geometry transformations and downloaded JSON contents in their existing direct tests where browser observability cannot establish them.

The harness should expose a small deterministic PR smoke subset, a broader deterministic suite, and a separate live-provider suite. Short tests should cover the original accepted behaviors with honest gaps where a browser cannot prove a criterion.
