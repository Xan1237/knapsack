---
assurance:
  id: t-2
  base: sha256:d8e663c339c8780456b8a7f79f27485927426400e7be88265d0ee626e7401c52
---
# Partial packing shows each unplaced item and its reason

> Inspect a partial packing outcome and compare each unplaced rendered item with its named reason in the list.

## Step 1

At http://127.0.0.1:3000, open the suitcase packing view.

## Step 2

Establish a partially packed plan using {{partial_inventory_fixture}}.

## Step 3 @verifies ac-6, ac-3

On the partial packing view, inspect the rendered suitcase and the unplaced-items area, then assert an interactive WebGL 3D open suitcase is shown and every unplaced item is rendered outside the case.

## Step 4 @verifies ac-4, ac-5

In the unplaced-items list beside the suitcase, inspect each unplaced object from the partial packing result, then assert every unplaced item is listed by name with a reason.
