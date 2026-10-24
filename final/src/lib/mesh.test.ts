import { describe, expect, it } from "vitest";
import { meshLimits, meshSchema } from "./mesh";
import { meshGeometry } from "./mesh-geometry";
import { tetrahedronMesh } from "./test-fixtures/mesh";

describe("model-supplied mesh boundary", () => {
  it("accepts explicit topology and refuses missing or unbounded geometry", () => {
    expect(meshSchema.parse(tetrahedronMesh)).toEqual(tetrahedronMesh);
    expect(
      meshSchema.safeParse({ version: 1, primitive: "bottle" }).success,
    ).toBe(false);
    for (const coordinate of [NaN, Infinity, 0.5001, -0.5001]) {
      const mesh = structuredClone(tetrahedronMesh);
      mesh.vertices[0].x = coordinate;
      expect(meshSchema.safeParse(mesh).success).toBe(false);
    }
    const enormous = structuredClone(tetrahedronMesh);
    enormous.vertices = Array.from({ length: meshLimits.vertices + 1 }, () => ({
      x: 0,
      y: 0,
      z: 0,
    }));
    expect(meshSchema.safeParse(enormous).success).toBe(false);
  });

  it("rejects missing vertex/material references and zero-area triangles", () => {
    for (const triangle of [
      { a: 0, b: 1, c: 12, material: 0 },
      { a: 0, b: 1, c: 2, material: 1 },
      { a: 0, b: 0, c: 2, material: 0 },
    ]) {
      const mesh = structuredClone(tetrahedronMesh);
      mesh.triangles[0] = triangle;
      expect(meshSchema.safeParse(mesh).success).toBe(false);
    }
    const line = structuredClone(tetrahedronMesh);
    line.vertices[2] = { x: 0, y: -0.5, z: -0.5 };
    expect(meshSchema.safeParse(line).success).toBe(false);
  });

  it("does not count unreferenced vertices as a three-dimensional surface", () => {
    const mesh = structuredClone(tetrahedronMesh);
    mesh.vertices.forEach((vertex) => {
      vertex.z = 0;
    });
    mesh.vertices.push({ x: 0, y: 0, z: 0.5 });
    expect(meshSchema.safeParse(mesh).success).toBe(false);
  });

  it("preserves supplied triangles, converts Z-up to Y-up, and reverses reflected winding", () => {
    const geometry = meshGeometry(tetrahedronMesh);
    expect(Array.from(geometry.getIndex()!.array)).toEqual(
      tetrahedronMesh.triangles.flatMap(({ a, b, c }) => [a, c, b]),
    );
    const positions = geometry.getAttribute("position");
    tetrahedronMesh.vertices.forEach((vertex, index) => {
      expect([
        positions.getX(index),
        positions.getY(index),
        positions.getZ(index),
      ]).toEqual([vertex.x, vertex.z, vertex.y]);
    });
    expect(geometry.boundingBox!.min.toArray()).toEqual([-0.5, -0.5, -0.5]);
    expect(geometry.boundingBox!.max.toArray()).toEqual([0.5, 0.5, 0.5]);
    expect(
      Array.from(geometry.getAttribute("normal").array).every(Number.isFinite),
    ).toBe(true);
    geometry.dispose();
  });

  it("batches faces by actual material without losing triangles", () => {
    const mesh = structuredClone(tetrahedronMesh);
    mesh.materials.push({ color: "#f1ddba" });
    mesh.triangles[0].material = 1;
    const geometry = meshGeometry(mesh);
    expect(geometry.groups).toEqual([
      { start: 0, count: 9, materialIndex: 0 },
      { start: 9, count: 3, materialIndex: 1 },
    ]);
    expect(geometry.getIndex()!.count).toBe(12);
    geometry.dispose();
  });
});
