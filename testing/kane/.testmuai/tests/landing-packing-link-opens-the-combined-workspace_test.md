---
assurance:
  id: t-33
  base: sha256:fac44f6f2be26c26903173413da29a185d7ac0d5fd01a0c833fad830e1ea36b0
---
# Landing packing link opens the combined workspace

> Follow a packing link from the landing page to /pack.

## Step 1 @verifies ac-22

In desktop Chrome, open {{knapsack_base_url}} at the landing page and follow its packing link into the combined workspace, then assert the browser URL contains /pack.
