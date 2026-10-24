---
assurance:
  id: t-6
  base: sha256:936681732bacf5434fddf6b7cbd0a0a3d92977d92c7ab97f6fec83c9b9497a71
---
# Leave an unchosen modeled item out of the selected set on web

> With a non-fitting set, choose a different item to keep and establish the unchosen item is absent from the resulting selected-item set.

## Step 1 @verifies ac-5

At http://127.0.0.1:5173, in the Knapsack item-selection interface, select the modeled items {{conflicting_item_set}} for the bag until that set cannot all fit, then assert the interface offers a choice of which conflicting items to keep.

## Step 2 @verifies ac-6, ac-7, ac-8

For that bag-capacity conflict, choose to keep {{item_to_keep}} but not {{item_to_exclude}}, and complete the keep decision without selecting a replacement product, then assert the resulting selected-item set contains the chosen item, excludes {{item_to_exclude}}, and required no replacement-product selection.
