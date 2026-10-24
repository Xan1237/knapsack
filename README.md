# Knapsack

See your suitcase fully packed before you start.

Knapsack is a planned web app that turns photos of your belongings into editable 3D items and arranges them inside a simulated suitcase.

## How it works

1. Choose a suitcase size and upload item photos.
2. Review the generated 3D items. Resize, add, duplicate, or delete them visually.
3. Generate a packed suitcase, explore its layers, and follow the packing order.

No measurement entry required. Item sizes and fit are estimates that you can adjust.

## Development

Concept stage for Kane CLI Hack Day; no runnable app yet. The plan combines vision analysis, procedural 3D models, a packing engine, and an interactive viewer, with Kane CLI validating the browser journey.

Kane CLI E2E checks are a required part of the build flow: generate requirement-linked tests, run them as features are implemented, and retain evidence. See the validation workflow in [design.md](design.md#kane-cli-development-and-evidence-workflow).

See [design.md](design.md) for the architecture and implementation plan.
