---
assurance:
  id: t-28
  base: sha256:b2bb55ebb3544e565b4e11a3f0e540e0af2ca956e4310d2b37b07f4562f6e1e3
---
# Chosen Make room swap is reflected in the selection

> Restore demo overflow, open Make room and explicitly choose an offered verified swap, then inspect the updated packing selection.

## Step 1 @verifies ac-58

In desktop Chrome, open {{knapsack_base_url}}/pack, restore the nine-item inventory with Load demo, select The light traveler (personal) from Suitcase preset, open Make room for an unplaced item and choose an offered verified alternative with Choose this swap; assert the packing selection reflects that chosen swap's item and named displaced existing items.
