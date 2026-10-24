# Knapsack — step two

An interactive 3D packing MVP: choose items, inspect a packed bag, play its packing sequence, and compare swaps for items that do not fit. Astra suggests an item selection based on trip preferences; the local engine checks its physical layout before you apply it.

## Run

```powershell
cd step2
npm install
npm run dev
```

Open http://127.0.0.1:5173. Vite serves the interface; Express serves the Astra endpoint on port 3001. `npm run build` builds the app, then `npm start` serves that build and the API together at http://127.0.0.1:3001.

## Connect Astra

Copy `.env.example` to `.env` and set `OPENAI_API_KEY` locally. Restart the API after changing it. The default model is `gpt-6-astra`, configured with `OPENAI_MODEL`. The key stays on the server. No key is needed for packing, playback, inspecting layers, or item swaps. The interface explicitly reports when Astra is not connected; it never substitutes fake model output.

The endpoint uses OpenAI's [Responses API](https://developers.openai.com/api/reference/resources/responses/methods/create) with [structured outputs](https://developers.openai.com/api/docs/guides/structured-outputs). It validates every returned item ID, keeps pinned essentials, previews the suggested selection through the packing engine, and requires the user to apply it.

## Step-one integration

See [INTEGRATION.md](INTEGRATION.md). Use **Import collection** to load either the collection contract or the main app's native inventory session. Custom item GLB/glTF URLs and an open bag model are supported. Demo items use procedural meshes until actual assets arrive. The compatibility adapter converts the main app's millimeters, Z-up axes, visual scale overrides, allowed orientations, and bag clearance explicitly.

## Packing scope

The engine tries six item orders, allowed axis rotations, and supported free-space placements. It keeps every included item accounted for as packed or unplaced. A separate validator checks bounds, orientations, completeness, and overlap. This is a conservative heuristic using rectangular envelopes; it does not prove a global optimum, simulate cloth, or verify an insertion path. The open suitcase is shown with a cutaway front for visibility. Layer expansion is an inspection mode, not a valid packing arrangement.

## Kane CLI in the build flow

Kane CLI 0.10.0-rc.3 is installed on the development machine. `requirements/mvp.md` preserves the user's brief. Kane's assurance commands derive use cases, criteria, scenarios, and runnable tests from it; no Kane test files are written by hand. Generated tests and the validation history will be retained here as checks finish. See [evidence/README.md](evidence/README.md) for actual run status.
