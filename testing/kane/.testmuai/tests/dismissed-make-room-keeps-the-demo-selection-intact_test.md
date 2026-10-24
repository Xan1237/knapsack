---
assurance:
  id: t-22
  base: sha256:5f8a9e313fed9cf95ef9b2bf650489ce7273e15fae0eac9eacf808d6efcb4134
---
# Dismissed Make room keeps the demo selection intact

> Restore demo overflow, open Make room and dismiss it without choosing a swap or Leave out; included inventory must not silently change.

## Step 1 @verifies ac-38

In desktop Chrome, open {{knapsack_base_url}}/pack, restore the nine-item inventory with Load demo, select The light traveler (personal) in Suitcase preset, open Make room for an unplaced item, then dismiss the dialog without choosing a swap or Leave out; assert all nine demo items remain included in the workspace packing selection.
