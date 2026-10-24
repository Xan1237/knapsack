---
assurance:
  id: t-5
  base: sha256:9516dbc56ef621ece413a4787a4a5a3156961d288ff1c7aaa2af92931f515114
---
# Keep preferred modeled items through a capacity conflict on web

> With a non-fitting set, choose items to keep and observe selected items reflect that choice.

## Step 1 @verifies ac-5

At http://127.0.0.1:5173, in the Knapsack item-selection interface, select the modeled items {{conflicting_item_set}} for the bag until that set cannot all fit, then assert the interface offers a choice of which conflicting items to keep.

## Step 2 @verifies ac-6, ac-7

For that bag-capacity conflict, choose to keep {{item_to_keep}} and complete the keep decision without selecting a replacement product, then assert the resulting selected-item set includes the item chosen to keep and the decision is completed without mandatory replacement-product selection.
