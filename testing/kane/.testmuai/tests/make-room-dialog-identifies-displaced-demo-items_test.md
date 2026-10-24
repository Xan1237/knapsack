---
assurance:
  id: t-26
  base: sha256:fc03f0ab38c158dcc1cf632feabc77172cea1f339e6bbd7577802cfeacc9706c
---
# Make room dialog identifies displaced demo items

> Restore demo overflow and inspect each Make room alternative's existing items left behind while the dialog remains open.

## Step 1 @verifies ac-37

In desktop Chrome, open {{knapsack_base_url}}/pack, restore demo inventory with Load demo, select The light traveler (personal) in Suitcase preset, and open Make room for an unplaced item; while the Make room dialog remains open, inspect its offered alternatives, then assert each alternative names the existing items it would leave behind.
