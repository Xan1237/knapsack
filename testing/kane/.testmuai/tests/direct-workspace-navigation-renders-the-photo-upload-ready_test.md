---
assurance:
  id: t-61
  base: sha256:9750f9e378a2bacace4f72d659c5653b4576e10dcce90eb0da4e4f5bc59a4285
---
# Direct workspace navigation renders the photo-upload-ready heading

> In a fresh desktop Chrome session, navigate directly to the configured /pack workspace and confirm through DOM/text that the Your belongings heading and Add your photos upload control are rendered, without touching landing navigation or the 3D scene.

## Step 1 @verifies ac-60

In a fresh desktop Chrome browser session, open {{knapsack_base_url}}/pack directly and inspect the packing workspace using DOM/text evidence, then assert the Your belongings heading and its Add your photos upload control are both rendered.
