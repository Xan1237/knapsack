---
assurance:
  id: t-65
  base: sha256:23709079d675252f048220dfea9d7fe0473b37e77f6f1cf60863cff5dd0416f8
---
# Move items offers Finish moving

> Open /pack directly, use Move items and find a Finish moving control in the DOM; do not assert animation or rearrangement.

## Step 1 @verifies ac-64

At {{knapsack_base_url}}/pack in desktop Chrome, open the packing workspace directly and use its Move items control, then assert a Finish moving control exists in the workspace DOM.
