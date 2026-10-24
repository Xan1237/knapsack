# Active smoke designs

The user authorized automatic review and execution within the seven existing product workflows. These smaller Kane-generated scenarios/tests were reviewed and approved under that authorization on 2026-10-24; bodies are copied unchanged from assurance output.

| Test | Scenario | Criterion | Observable result |
| --- | --- | --- | --- |
| t-33 | sc-23 | ac-22 | Landing packing link reaches `/pack`. |
| t-32 | sc-22 | ac-21 | Loaded demo inventory rows show Demo labels. |
| t-31 | sc-21 | ac-19 | The current demo packing result populates the rendered WebGL bag. |

All three use the configured nonsecret `knapsack_base_url`. They need no provider keys or responses. Each has one independent intent step. Check mode caps each at 30 seconds and the batch at 90 seconds.

The previous packing/overflow smoke selection is retained in manual regression. Its initial CI recording passed two checks and failed the explicit leave-out selection check. This unresolved failure must remain visible in regression results; reducing smoke scope does not establish that behavior as passing. Other generated app designs remain outside this active gate until reviewed and recorded.
