---
assurance:
  id: t-62
  base: sha256:00b99df584f1a143190c8044c6c778c41740cbbd497aef9258c35f092681e7b1
---
# Direct /pack shows Your belongings

> Open /pack directly and find the Your belongings workspace heading in the DOM, without asserting photo-upload readiness.

## Step 1 @verifies ac-61

At {{knapsack_base_url}}/pack in desktop Chrome, open the packing workspace directly, then assert the Your belongings heading exists in the workspace DOM.
