---
assurance:
  id: t-31
  base: sha256:cc8363212405983f839e156bb2b7ba0b84494d49349d3c69cee22c7b44569c65
---
# Current demo inventory drives the WebGL bag

> Load the nine-item demo and inspect its completed result represented in the WebGL bag.

## Step 1 @verifies ac-19

In desktop Chrome, open {{knapsack_base_url}}/pack, use Load demo to restore the nine-item inventory and inspect its completed packing result in the rendered WebGL 3D bag, then assert the bag depicts packed items from that current included inventory rather than an unrelated empty scene.
