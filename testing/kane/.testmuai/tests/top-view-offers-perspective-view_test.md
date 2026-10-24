---
assurance:
  id: t-63
  base: sha256:1c43844046b66cc2ae64fa2a997aa3c30e764466648974be9982b779c8647142
---
# Top view offers Perspective view

> Open /pack directly, use Top view and find a Perspective view control in the DOM; do not infer a correct camera position.

## Step 1 @verifies ac-62

At {{knapsack_base_url}}/pack in desktop Chrome, open the packing workspace directly and use its Top view control, then assert a Perspective view control exists in the workspace DOM.
