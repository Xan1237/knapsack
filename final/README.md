# Knapsack — final combined MVP

The root Next.js application and the step2 studio are being combined here. The original implementations remain intact.

## Run

```powershell
cd final
npm ci
npm run dev
```

Open http://127.0.0.1:3000 and choose a packing link. The workspace is http://127.0.0.1:3000/pack. The project includes a local Node 22 runtime for its development commands. Copy `.env.example` to `.env.local` and enter the OpenAI key locally if setting up another machine. Vision defaults to `gpt-4.1-mini`; packing suggestions use `gpt-6-astra`.

`npm run typecheck`, `npm run lint`, `npm test`, and `npm run build` check the combined source. Kane CLI browser journeys are generated from `requirements/integration.md`. Raw browser evidence, credentials and environment files stay ignored.

## Integration status

The first foundation includes the landing page, photo analysis, editable source-linked inventory, native packing worker and validator, essential/priority semantics, both collection formats, and server routes for Astra and packing choices. The combined controls, model loading and final browser validation are in progress. See [INTEGRATION.md](INTEGRATION.md) for the source map and remaining work.
