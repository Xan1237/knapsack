# Step one → step two

The handoff is a collection, independent of the photo-processing provider. Import it through the interface or deliver it from a same-origin parent page:

```js
packingFrame.contentWindow.postMessage({
  type: 'knapsack:inventory',
  payload: collection,
}, window.location.origin);
```

For a shared React application, `normalizeSession(collection)` in `src/data.js` is the validation boundary. `packItems(items, bag)` in `src/packing.js` is independent of rendering and Astra. The current App owns the session; it can be converted to accept a collection prop when step one's code lands.

## Collection shape

```json
{
  "schemaVersion": 1,
  "bag": {
    "id": "bag-1",
    "name": "Cabin bag",
    "dimensions": [48, 20, 32],
    "color": "#d7b68a"
  },
  "items": [{
    "id": "stable-item-id",
    "name": "Everyday sneakers",
    "category": "shoes",
    "dimensions": [29, 12, 21],
    "color": "#e3dfd1",
    "modelUrl": "/models/sneakers.glb",
    "included": true,
    "required": false,
    "priority": 3
  }]
}
```

- All dimensions use **centimeters** and `[width, height, depth]`. Y points up. Bag dimensions are its **usable interior**. There is no mandatory measurement-entry screen.
- IDs must be unique and stable. Step one can attach source photo IDs or other metadata; unknown fields are preserved.
- `modelUrl` is optional. Models must be accessible to the browser (same origin or with CORS) and use the same X/Y/Z orientation as dimensions. The renderer centers and scales the mesh to its envelope before applying the packing rotation. Use a conservative envelope including all geometry.
- Bag `modelUrl` should point to an **open or cutaway bag**. Optional `modelDimensions: [w,h,d]` controls its external mesh bounds; `modelOffset: [x,y,z]` positions it relative to the cavity origin at its horizontal center and bottom. The preset shell is used when no bag asset is supplied.
- Categories with demo geometry: `shoes`, `clothing`, `pouch`, `camera`, `headphones`, `book`, `bottle`; other categories get an editable-source-compatible box preview.
- `included` defaults to true, `required` to false, `priority` to 3 (1–5). Required items are always included and searched first. `upright: true` limits rotation to the vertical Y axis.
- The MVP supports up to 60 items and positive dimensions up to 300 cm. Arbitrary mesh collision, automatic scale inference, and compressed-asset decoders are outside this adapter.

The exported packing plan adds positions, occupied dimensions, and axis permutations in this same coordinate system. Its `estimated` flag is true. A result may be partial even when a different arrangement exists.
