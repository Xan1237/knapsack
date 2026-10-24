import { BufferGeometry, Float32BufferAttribute } from "three";
import { type ItemMesh, meshSchema } from "./mesh";

/** Render supplied topology; never infer shapes from an item category. */
export function meshGeometry(data: ItemMesh): BufferGeometry {
  const mesh = meshSchema.parse(data);
  const geometry = new BufferGeometry();
  geometry.setAttribute(
    "position",
    new Float32BufferAttribute(
      mesh.vertices.flatMap(({ x, y, z }) => [x, z, y]),
      3,
    ),
  );
  const indices: number[] = [];
  mesh.materials.forEach((_, material) => {
    const start = indices.length;
    for (const face of mesh.triangles) {
      // Swapping Y/Z reflects handedness; reverse the winding too.
      if (face.material === material) indices.push(face.a, face.c, face.b);
    }
    if (indices.length > start)
      geometry.addGroup(start, indices.length - start, material);
  });
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  geometry.computeBoundingBox();
  geometry.computeBoundingSphere();
  return geometry;
}
