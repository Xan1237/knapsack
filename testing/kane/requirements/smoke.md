# Push smoke checks

The user requested: "look liks its failing i want he set to act like smoke tests and run under 5 mins please" and "from push to success". Earlier they requested multiple small checks, each under 30 seconds, and instructed us not to change application code.

Provide a tiny deterministic smoke gate for basic workspace readiness. On a fresh browser session, direct navigation to the configured application's `/pack` route should render the existing `Your belongings` workspace heading and its `Add your photos` upload control. This checks that the actual workspace loads, without requiring a landing-page animation, dragging a 3D camera, visual-model analysis, or a live provider call. A separate independent smoke check should load the bundled demo through the existing `Load demo` button and check the inventory's visible Demo labels using DOM/text evidence.

Each test must remain one short intent step with its own navigation/setup and one narrow DOM-based terminal assertion. Retain the existing landing-link and visual 3D tests for manual regression; their acceptance criteria must not be claimed by the simpler readiness check. Do not inject storage, mock requests, invent app controls, or change application code. Use the existing nonsecret `knapsack_base_url` variable.
