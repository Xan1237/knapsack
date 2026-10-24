---
assurance:
  id: t-3
  base: sha256:94492cf7b8e51c6ce45bf9ac2025f7568aad43395c15d6fefb739aa89675b78f
---
# Explore the rendered bundled demo suitcase

> Inspect rendered bundled demo inventory without live analysis, then orbit, zoom, reset, select an object, and explode the scene.

## Step 1 @verifies ac-6, ac-8, ac-9

At http://127.0.0.1:3000, open the initial bundled demo inventory in the suitcase view without initiating live photo analysis, then assert an interactive WebGL 3D open suitcase appears with the Demo inventory label and rendered bundled inventory independent of live analysis.

## Step 2 @verifies ac-7

In the rendered suitcase, inspect the demo inventory's visual objects, then assert recognizable folded clothes, shoes, bottles, pouches and generic items are represented.

## Step 3

capture baseline: initial camera view of the rendered suitcase

## Step 4 @verifies ac-10

In the suitcase scene, orbit the camera around the rendered suitcase, then assert the suitcase is visible from a different rendered angle.

## Step 5

capture baseline: rendered scale of the suitcase before zoom

## Step 6 @verifies ac-11

In the suitcase scene, zoom the camera, then assert the rendered scale of the suitcase changes.

## Step 7 @verifies ac-12

In the suitcase scene, reset the camera after orbiting and zooming, then assert the initial camera view is restored.

## Step 8 @verifies ac-13

In the suitcase scene, select a rendered inventory object, then assert the selected rendered object is identifiable as selected.

## Step 9

capture baseline: rendered object positions before exploding the arrangement

## Step 10 @verifies ac-15

In the suitcase scene, explode the arrangement, then assert the rendered objects visibly separate from their prior positions.

## Step 11 @verifies ac-17

On the suitcase inspection view, inspect the visual simulation's explanatory text, then assert it makes no claim that spatial fit proves physical insertion feasibility or cloth behavior.

## Step 12 @verifies ac-20

In the suitcase inspection view, inspect the accessible names of orbit, zoom, camera reset, rendered selection and explode controls, then assert each inspection control has an accessible name.
