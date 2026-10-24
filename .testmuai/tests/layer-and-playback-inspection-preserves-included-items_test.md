---
assurance:
  id: t-1
  base: sha256:c39485f8ea27f3412eb11ce18098a54e349aa3fff438894685edd2f500b55f31
---
# Layer and playback inspection preserves included items

> Compare item inclusion and rendered objects across upper-layer hiding and stepwise playback without changing the underlying plan.

## Step 1 @verifies ac-6

At http://127.0.0.1:3000, open the packed suitcase inspection view and establish a rendered packing plan, then assert an interactive WebGL 3D open suitcase is rendered.

## Step 2

capture baseline: included item identities in the inventory and packing plan

## Step 3

capture baseline: visible rendered objects in the suitcase before hiding upper layers

## Step 4 @verifies ac-14, ac-1

In the suitcase scene's layer controls, hide upper layers at the initial playback step, then assert upper-layer rendered objects become hidden while the included item identities still match the captured identities.

## Step 5

capture baseline: visible rendered objects before advancing playback

## Step 6 @verifies ac-16, ac-1

In the suitcase scene's stepwise playback controls, advance to a later step while upper layers are hidden, then assert the visible rendered objects change while included item identities still match the captured identities.

## Step 7 @verifies ac-1

In the suitcase scene, show upper layers while remaining at the later playback step, then assert included item identities still match the captured identities.

## Step 8 @verifies ac-20

In the suitcase scene's layer and playback controls, inspect their accessible names while restoring the initial visible step, then assert each inspection control has an accessible name.
