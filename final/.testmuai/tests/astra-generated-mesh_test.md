---
mode: testing
max_steps: 32
timeout: 360
target: chrome
---

# Session: astra-generated-mesh

## Step 1
Open http://127.0.0.1:3005/pack. Start a clean test trip with Reset trip then Clear session. Click Try a sample photo, which sends a real bundled pump-bottle photograph to Astra. Wait up to 150 seconds for 3D mesh ready and an inventory row labeled Astra 3D. Verify a visible generated pump-bottle mesh appears in the suitcase view, including its shoulder and pump/nozzle rather than a plain category cylinder. Select its inventory row and verify the editor shows ASTRA-GENERATED 3D with a visible matching mesh preview. Make the Item size slider slightly smaller and verify the generated shape remains recognizable. Reload the page, select the generated item again, and verify its Astra 3D label, source photo, and actual mesh remain visible. Use visual checkpoints and take screenshots. Do not import synthetic fixtures or change server settings.
