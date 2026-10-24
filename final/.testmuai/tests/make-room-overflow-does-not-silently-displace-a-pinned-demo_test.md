---
assurance:
  id: t-7
  base: sha256:dcb8b18bc3f6494b8fca16bdab5243b2f2328b38f6cd1d6d23785b9e5db528f2
---
# Make room overflow does not silently displace a pinned demo essential

> Restore the demo inventory, pin an included item, choose the smallest bag and inspect Make room alternatives; the protected item cannot be displaced, each alternative identifies what it would leave behind, and no removal occurs before an explicit choice.

## Step 1

In desktop Chrome, open http://127.0.0.1:3000/pack and restore the workspace's labeled nine-item demo inventory with Load demo.

## Step 2 @verifies ac-34

In the packing workspace, choose The light traveler (personal) from Suitcase preset and inspect the resulting packed and unplaced inventory, then assert every included demo item is accounted for as packed or unplaced.

## Step 3 @verifies ac-32, ac-37

In the workspace inventory, pin one included demo item as an essential using its Pin control, then open Make room and inspect the alternatives naming existing items that each would leave behind; assert each presented alternative identifies its displaced existing items and none identifies a pinned essential as displaced.

## Step 4 @verifies ac-36

In Make room for the small suitcase overflow, inspect any unavailable-swap or bounded-search explanation, then assert it does not claim the bounded search proves that no packing is possible.

## Step 5 @verifies ac-38

Return from Make room to the packing workspace without choosing a swap or Leave out, then assert no item has been removed from the packing selection by Make room.
