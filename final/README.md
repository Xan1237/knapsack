# Knapsack — final combined MVP

The root Next.js application and the step2 studio are combined here in one Next.js app. The original implementations remain intact.

## Run

```powershell
cd final
npm ci
npm run dev
```

Open http://127.0.0.1:3000 and choose a packing link. The workspace is http://127.0.0.1:3000/pack. Install dependencies with Node 22 or newer; the project also includes a local Node 22 runtime for its development commands. Copy `.env.example` to `.env.local` and enter the OpenAI key locally if setting up another machine. Vision defaults to `gpt-4.1-mini`; packing suggestions use `gpt-6-astra`.

`npm run typecheck`, `npm run lint`, `npm test`, and `npm run build` check the combined source. Kane CLI browser journeys are generated from `requirements/integration.md`. Raw browser evidence, credentials and environment files stay ignored.

## Integration status

The workspace includes real photo analysis, editable source-linked inventory, essential pins, Astra advice with preview and explicit apply, overflow swaps, animated 3D packing, inspection controls, collection import and plan export. Choose **Try a 3D model collection** to load the bundled glTF item and bag assets, or import your own model URLs.

The solver uses millimeters with Z up. Import also accepts the step2 centimeter/Y-up collection and converts it once. Packing is a bounded estimate checked by an independent validator; it does not promise a global optimum.

Validation: 41 direct tests, TypeScript, lint, production build and a live two-photo API check pass. Kane's initial seven-test browser run passed the overflow/essential workflow and failed six journeys. Its findings led to individual demo labels, automatic demo-item selection and an HTTP attachment download for plans, plus CLI-generated test-flow refinements. Full browser verification is still incomplete; see [the validation record](artifacts/validation.md) and [INTEGRATION.md](INTEGRATION.md).
