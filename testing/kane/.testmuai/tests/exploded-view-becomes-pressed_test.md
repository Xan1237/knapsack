---
assurance:
  id: t-64
  base: sha256:e33cbc845717bc7b6be26dd78c4bfdd2c900c2c0baccce1770c8ee69a72f8624
---
# Exploded view becomes pressed

> Open /pack directly, toggle Exploded view on and inspect aria-pressed=true on its control, without checking visual separation.

## Step 1 @verifies ac-63

At {{knapsack_base_url}}/pack in desktop Chrome, open the packing workspace directly and toggle its Exploded view control on, then assert that control's DOM aria-pressed attribute equals true.
