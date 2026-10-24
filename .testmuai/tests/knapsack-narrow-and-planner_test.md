---
mode: testing
max_steps: 18
timeout: 180
target: chrome
variables:
  global.partial_inventory_fixture:
    value: >-
      Open http://127.0.0.1:3000/pack. Click Load demo. Select Sage linen shirt.
      Move the Item size slider to its maximum, 300 percent. Wait for repacking.
      Expected: Sage linen shirt stays included, is unplaced, and appears beside
      the suitcase with reason Too large in every permitted orientation; the
      other eight demo items remain placed.
    secret: false
    syntax: '{{partial_inventory_fixture}}'
    type: global
  global.item_cap_fixture:
    value: ''
    secret: false
    syntax: '{{item_cap_fixture}}'
    type: global
  global.mixed_analysis_fixture:
    value: ''
    secret: false
    syntax: '{{mixed_analysis_fixture}}'
    type: global
---

# Session: knapsack-narrow-and-planner

## Step 1
Open http://127.0.0.1:3000 in the configured narrow 800 pixel browser window. Verify the Less baggage. More possibility. heading, rendered 3D suitcase, and Find your perfect fit button are visible with no overlapping text or horizontal overflow. Click Find your perfect fit. Verify the browser URL ends in /pack and the packing workspace displays its 3D suitcase and Demo inventory label.
