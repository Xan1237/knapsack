# Step one → step two

The handoff is a collection, independent of the photo-processing provider. Import it through the interface or deliver it from a same-origin parent page:

The main app added in commit `79438d4` is now supported directly. `normalizeSession` recognizes its `InventoryState` / persisted session shape (`items`, `bagId`) and converts millimeters and Z-up coordinates into centimeters and Y-up coordinates. It uses `estimate × scale`, preserves allowed orientations and inclusion, and carries across the bag's 3 mm clearance. The three current main-app bag presets are mapped explicitly. This adapter was checked against `src/lib/domain.ts`, `state.ts`, `persistence.ts`, and `render-transform.ts`.

For a custom main-app bag, pass `{ units: "mm", upAxis: "z", bag, items }`. Already-normalized step-two collections use the shape below without those source-unit markers. This avoids ambiguous automatic scale detection. The two apps run on separate ports, so their browser storage is not shared; the JSON handoff is intentional until they share an origin.

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
- The MVP supports up to 80 items and positive dimensions up to 300 cm. Arbitrary mesh collision, automatic scale inference, and compressed-asset decoders are outside this adapter.

The exported packing plan adds positions, occupied dimensions, and axis permutations in this same coordinate system. Its `estimated` flag is true. A result may be partial even when a different arrangement exists.

## Combining the two applications

The source handoff and runtime checks are ready; the applications currently have separate entry points. Keep the main app's photo analysis and inventory state, and feed that state through `normalizeSession` when mounting the step-two studio. The Express Astra handler lives in `step2/server/index.js`; it can become a Next route at `/api/astra/suggest` using the main server's OpenAI configuration. Its request and response payloads already use the collection contract.

The main app and step two both define global UI classes. Scope the studio stylesheet when embedding its components into the Next layout. Reuse one packing renderer for the final combined screen and keep conversion at the input boundary; applying the unit/axis conversion twice would corrupt the layout. Step two's local session key is `knapsack-step2-v1`, while the main app persists through IndexedDB. Decide which state owner to retain when joining the routes.
