---
assurance:
  id: t-67
  base: sha256:9171eb2cf888b596b7b3b320cfc311a71de2e7aec8f46eb6aa0ee09dddaf8308
---
# Exclude Cream knit unchecks its Include checkbox

> From direct /pack with demo inventory, exclude unpinned Cream knit and inspect its Include checkbox.

## Step 1 @verifies ac-66

At {{knapsack_base_url}}/pack in the inventory workspace, use Load demo to restore the bundled items and exclude the unpinned Cream knit item using its Include Cream knit checkbox, then assert that checkbox is unchecked.
