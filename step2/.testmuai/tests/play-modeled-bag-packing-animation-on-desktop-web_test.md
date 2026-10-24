---
assurance:
  id: t-4
  base: sha256:992a8f3a834d02ef9367815df1c6db8871d921ed62c9d12b64b988b68df8f16f
---
# Play modeled-bag packing animation on desktop web

> With the demo bag and items loaded on desktop web, start Play packing animation and observe visible motion of modeled items into the bag and the items placed counter.

## Step 1

Open http://127.0.0.1:5173 in the desktop browser and reach the Knapsack bag-packing interface with its demo bag and items loaded.

## Step 2 @verifies ac-1

On the Knapsack bag-packing interface, use Play packing animation, then assert the modeled items visibly move into an animated 3D arrangement within the modeled bag.

## Step 3 @verifies ac-3

During packing playback on the Knapsack bag-packing interface, observe playback progress, then assert an items placed counter is visible.
