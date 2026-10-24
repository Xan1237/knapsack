# Active smoke designs

The user authorized automatic review and execution within the seven existing product workflows. These smaller Kane-generated scenarios/tests were reviewed and approved under that authorization on 2026-10-24; bodies are copied unchanged from assurance output.

| Test | Scenario | Criterion | Observable result |
| --- | --- | --- | --- |
| t-61 | sc-54 | ac-60 | Direct `/pack` navigation renders the Your belongings heading and Add your photos control. |
| t-32 | sc-22 | ac-21 | Loaded demo inventory rows show Demo labels. |

Both use the configured nonsecret `knapsack_base_url`. They need no provider keys or responses. Each has one independent DOM intent step. Check mode caps each at 30 seconds and the batch at 60 seconds. The new readiness criterion/scenario/test were reviewed under the user's existing automatic approval and latest smoke requirement; approving ac-60 resolved the generation warning about its initial unreviewed state.

The initial three-case smoke selection recorded successfully, but strict replay exposed an unstable landing-link click and a visual 3D check exceeding 30 seconds. Those saved designs remain in manual regression. The demo-label check subsequently passed strict replay on its own. The local assurance evolve session superseded the older uc-4 design generation when narrowing the scope; the repo preserves the historical generated files for manual replay, without claiming those old criteria are proven by the new readiness test.

The previous packing/overflow smoke selection is retained in manual regression. Its initial CI recording passed two checks and failed the explicit leave-out selection check. This unresolved failure must remain visible in regression results; reducing smoke scope does not establish that behavior as passing. Other generated app designs remain outside this active gate until reviewed and recorded.

Failure inspection found an automation error: the recorded assertion inspected the currently selected Sage linen shirt after clicking Leave out for Cream knit. The screenshot showed Cream knit unchecked and eight items included, while Sage remained selected. No application change was made. The recorded assertion still needs a focused Kane repair before this regression case can pass.
