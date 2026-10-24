# Final Knapsack MVP

## User's integration request

Read all the code in the repo create a third folder called final and use the 2 other folders of written code integrate them and make a final project

## User's packing request

ok cool so for my part of the projet assume you have 3d models of items and a bag and we need to have a interfact that lets you pciture putting the items in the bag optimallly and an animation 3d models everything using astra as well also add like a interface that lets you pick between items that dont fit remeber that this will intergrate with step one later and i am not sure exactly how htis will look so keep that in mind use kane cli for everything this is a mvp so dont be concerned with production readyness of my application please

Astra clarification: Astra suggestions inside the app.

## Combined interface contract

This is a desktop web application at http://127.0.0.1:3000, with a landing page at / and a single combined packing workspace at /pack. Tests must target desktop Chrome, not a mobile emulator. The two source implementations are the root Next.js application and step2.

The landing page's packing links open the real workspace. The workspace keeps photo uploads, source-linked inventory, visual resizing, manual additions, duplicate/delete/merge actions, and local persistence from the main application. Photos are analyzed through the real server vision adapter; missing configuration produces an explicit error. The bundled sample photo is a real input sent through that same adapter, not substituted recognition output.

The same inventory drives an actual WebGL 3D bag, selection, orbit/zoom, camera reset, top view, layer inspection, exploded view, animated packing order, and independently validated packing results. Item and bag models can be supplied by collection JSON. Demo items are explicitly labeled. Every included item remains accounted for as packed or unplaced. A bounded search is an estimate, not a proof of global optimality.

For items that cannot all fit, Make room opens alternatives showing which existing items would be left behind. The user must choose a swap or explicitly leave an item out. Essential pins protect items from swap and Astra exclusions. Changing inventory invalidates old suggestions and repacks using the latest revision.

Astra accepts a trip preference through Ask Astra, returns a real server-side packing suggestion, displays its keep/leave selection and a fit preview, and applies that selection only after the user chooses Apply selection. A disconnected or failed Astra response leaves inventory usable. API keys stay on the server.

Import collection accepts the source app's millimeter/Z-up inventory and step2's centimeter/Y-up collection, preserving stable IDs, scale overrides, permitted rotations and optional model URLs. The final project uses millimeters and Z-up for solver state. Importing a collection must not silently apply the scale conversion twice. Save packing plan exports the latest inventory and plan.

## Validation flow

Use Kane CLI assurance to generate the browser tests from these requirements; do not hand-author Kane test files. Preserve safe test results and traceability, and ignore raw browser recordings, screenshots, credentials and local environment files.
