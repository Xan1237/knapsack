---
assurance:
  id: t-29
  base: sha256:1017d0cf826d4fe4bb6490abceb8c88d9cb24d54ebc6b0b71cc564166f899918
---
# Explicit Leave out excludes the selected unplaced item

> Restore demo overflow and explicitly choose Leave out for an unplaced item, then inspect the packing selection.

## Step 1 @verifies ac-59

In desktop Chrome, open {{knapsack_base_url}}/pack, restore the nine-item inventory with Load demo, select The light traveler (personal) from Suitcase preset, and explicitly use Leave out for an unplaced item; assert that chosen item is absent from the included packing selection.
