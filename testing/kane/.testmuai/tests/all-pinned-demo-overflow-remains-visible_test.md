---
assurance:
  id: t-23
  base: sha256:f4cc32386f0104b81cee7877b9899be5d53d64b0bcf44acd54bcd3a26ee760e1
---
# All-pinned demo overflow remains visible

> Restore nine demo items, pin all included items, choose the smallest personal suitcase and inspect visible unplaced items despite protected pins.

## Step 1 @verifies ac-35

In desktop Chrome, open {{knapsack_base_url}}/pack, restore the nine-item inventory with Load demo, pin every included demo item using its Pin control, select The light traveler (personal) in Suitcase preset and inspect the workspace packing result; assert unplaced items remain visible when the pinned collection cannot all fit.
