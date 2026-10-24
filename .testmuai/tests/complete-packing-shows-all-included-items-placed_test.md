---
assurance:
  id: t-12
  base: sha256:18e3cf60527863c71eb539cea19cb9c4d00f439a68d6a9e7e2ae29fbd7c48232
---
# Complete packing shows all included items placed

> Generate a fitting plan and inspect valid placed objects in the suitcase.

## Step 1

Open http://127.0.0.1:3000 and on the Knapsack inventory page establish the fitting included inventory {{complete_inventory_fixture}} using the available inventory editing controls.

## Step 2 @verifies ac-71, ac-59, ac-62

On the suitcase view, generate and inspect a complete plan for {{complete_inventory_fixture}}, then assert every included item has a validated placement, each included identity is accounted for once, and the display makes no claim that spatial fit proves physical insertion feasibility.
