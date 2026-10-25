# Initial combined MVP validation

This is the initial combined-app checkpoint from 2026-10-24. Its 41-test count and Kane result describe that run, not the current repository state. For current local checks, run the commands in [the application README](../README.md). Implementation is in `final`. The root app and `step2` are preserved. The app runs at http://127.0.0.1:3000/pack.

## Completed source checks

- `npm run typecheck`: passed.
- `npm run lint`: passed.
- `npm test`: 41 tests in seven files passed.
- `npm run build`: passed, including the packing export route.
- `npm run test:live`: passed a genuine two-photo API-to-inventory-to-validated-plan check. [Safe result](live-api-smoke.json). This is API evidence, not browser proof.

## Kane CLI design and first execution

Kane CLI 0.10.0-rc.3 ingested [the integration requirements](../requirements/integration.md), extracted seven use cases, generated criteria, scenarios and runnable tests, and refined tests through `maintain evolve`. Tests were not authored by hand. The user approved automatic review and execution within the seven workflows. [Safe design snapshot](kane-design.json).

The initial suite completed in 21m 30s: **one passed, six failed**, with 346.39 browser-execution credits used. [Safe result summary and Test Manager links](kane-initial-results.json). A sealed evidence pack was published to Test Manager; raw evidence remains ignored. Kane reported 11% of 55 criteria proven by that run; no full-coverage claim is made.

| Journey | First run | Finding and response |
| --- | --- | --- |
| Overflow choices and essentials | Passed | Alternatives identified removals, protected essential pins and waited for an explicit choice. |
| Astra preview/apply | Failed | The runner attempted to inspect background checkboxes through a modal. A CLI-generated successor separates dialog inspection, closing, comparison and reopening. HAR evidence confirms the live suggestion POST returned 200. |
| Photo recognition | Failed | The runner stalled on an abstract real-provider assertion after a successful sample request. A CLI-generated successor uses a concrete HTTP response checkpoint and separate source-link checks. HAR evidence confirms the analysis POST returned 200. |
| Collection import | Failed | The runner opened the file chooser without selecting the file. A CLI-generated successor names the absolute fixture path and upload action. Direct tests cover unit/axis conversion and retained metadata. |
| Inventory edit/persistence | Failed | The runner did not select an item before reading its size. Loading demo now selects the first item; the generated size check uses the actual percentage slider. |
| Plan export | Failed | The browser did not verify the client-created blob download. Export now submits a native form to a server route returning a named JSON attachment. Direct tests verify filename headers and a plan computed from the latest inventory. |
| 3D inspection | Failed | Collection-level demo text did not label individual rows. Each demo item now carries its own demo provenance and label. The later 3D inspection steps were not reached. |

## Handoff limit

The user requested a five-minute wrap-up while a second Kane run was underway. The latest recheck snapshot is recorded separately. Completed app source and safe summaries are pushed; credentials, local environment files, raw recordings and unfinished test drafts are excluded.
