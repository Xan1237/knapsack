import type { ItemMesh } from "../mesh";

/** Synthetic topology for contract tests; never presented as provider output. */
export const tetrahedronMesh: ItemMesh = {
  version: 1,
  vertices: [
    { x: -0.5, y: -0.5, z: -0.5 },
    { x: 0.5, y: -0.5, z: -0.5 },
    { x: 0, y: 0.5, z: -0.5 },
    { x: 0, y: 0, z: 0.5 },
  ],
  triangles: [
    { a: 0, b: 2, c: 1, material: 0 },
    { a: 0, b: 1, c: 3, material: 0 },
    { a: 1, b: 2, c: 3, material: 0 },
    { a: 2, b: 0, c: 3, material: 0 },
  ],
  materials: [{ color: "#54715a" }],
};
