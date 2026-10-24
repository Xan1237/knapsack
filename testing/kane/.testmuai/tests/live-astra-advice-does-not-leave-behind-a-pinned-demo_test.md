---
assurance:
  id: t-24
  base: sha256:0a20b383210ab683a7a291d745b72b07cfd5d12866693408893af1af7c46e170
---
# Live Astra advice does not leave behind a pinned demo essential

> Restore demo inventory, pin Sage linen shirt and request real Astra packing advice; inspect Leave behind in the live advice dialog without applying a selection.

## Step 1 @verifies ac-33

In desktop Chrome, open {{knapsack_base_url}}/pack, restore demo inventory with Load demo, pin Sage linen shirt using its Pin control, open Ask Astra, submit {{trip_preference}} as the trip preference to request real advice, and inspect Leave behind in the resulting advice dialog; assert pinned Sage linen shirt is absent from the Leave behind selection.
