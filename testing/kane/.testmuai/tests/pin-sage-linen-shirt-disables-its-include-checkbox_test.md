---
assurance:
  id: t-72
  base: sha256:8dd0f5bc4f537661ce9f6526b3ab2ef230734f5b4e61208fcb3fe56ffa64d21c
---
# Pin Sage linen shirt disables its Include checkbox

> From direct /pack with demo inventory, pin Sage linen shirt as essential and inspect its Include checkbox disabled state.

## Step 1 @verifies ac-65

At {{knapsack_base_url}}/pack in the inventory workspace, use Load demo to restore the bundled items and pin Sage linen shirt as essential using its real Pin Sage linen shirt control, then inspect the current live DOM checkbox accessible as Include Sage linen shirt and assert its disabled Boolean property equals true.
