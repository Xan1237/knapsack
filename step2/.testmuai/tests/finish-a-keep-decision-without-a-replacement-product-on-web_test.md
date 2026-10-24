---
assurance:
  id: t-7
  base: sha256:c508b1829aba199c4908835aa12ab0fcd7c65dc43de5c3ea89855289bc147adc
---
# Finish a keep decision without a replacement product on web

> With a non-fitting set, complete the keep decision without a replacement-product selection requirement.

## Step 1 @verifies ac-5

At http://127.0.0.1:5173, in the Knapsack item-selection interface, select the modeled items {{conflicting_item_set}} for the bag until that set cannot all fit, then assert the interface offers a choice of which conflicting items to keep.

## Step 2 @verifies ac-6, ac-7

For that bag-capacity conflict, choose to keep {{item_to_keep}} and complete the decision using the existing modeled items, then assert the resulting selected-item set contains the chosen item without any mandatory replacement-product selection.
