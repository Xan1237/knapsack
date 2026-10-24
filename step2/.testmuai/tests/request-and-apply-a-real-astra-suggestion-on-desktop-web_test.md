---
assurance:
  id: t-3
  base: sha256:3a31516cd2a65ac095b2118b9d0273f122266a048edd86a2d35394b4e73c2cbd
---
# Request and apply a real Astra suggestion on desktop web

> On desktop web with demo items, enter a trip preference, Ask Astra for a real in-app packing suggestion, preview the proposed selection through the packing engine and apply it.

## Step 1

Open http://127.0.0.1:5173 in the desktop browser and reach the Knapsack bag-packing interface with its demo bag and items loaded.

## Step 2 @verifies ac-2

In the Knapsack interface's Astra section, enter the trip preference {{trip_preference}} and use Ask Astra; wait for its response, then assert a packing suggestion for the demo items appears inside the app rather than a disconnected-Astra notice.

## Step 3

In the Astra suggestion area, preview the proposed item selection through the packing interface.

## Step 4

capture baseline: item selection displayed in the Astra preview before applying it

## Step 5 @verifies ac-4

On the previewed Astra suggestion in the Knapsack interface, apply the proposed item selection, then assert the applied item selection reflects the selection shown in the preview.
