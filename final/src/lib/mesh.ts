import { z } from "zod";

export const meshLimits = {
  vertices: 512,
  triangles: 1024,
  materials: 16,
} as const;
const coordinate = z.number().finite().min(-0.5).max(0.5);

/** Data only: centered, normalized X-width / Y-length / Z-up geometry. */
export const meshDataSchema = z.object({
  version: z.literal(1),
  vertices: z
    .array(z.object({ x: coordinate, y: coordinate, z: coordinate }))
    .min(4)
    .max(meshLimits.vertices),
  triangles: z
    .array(
      z.object({
        a: z
          .number()
          .int()
          .min(0)
          .max(meshLimits.vertices - 1),
        b: z
          .number()
          .int()
          .min(0)
          .max(meshLimits.vertices - 1),
        c: z
          .number()
          .int()
          .min(0)
          .max(meshLimits.vertices - 1),
        material: z
          .number()
          .int()
          .min(0)
          .max(meshLimits.materials - 1),
      }),
    )
    .min(4)
    .max(meshLimits.triangles),
  materials: z
    .array(z.object({ color: z.string().regex(/^#[0-9a-fA-F]{6}$/) }))
    .min(1)
    .max(meshLimits.materials),
});

export const meshSchema = meshDataSchema.superRefine((mesh, context) => {
  const used = new Set<number>();
  mesh.triangles.forEach((triangle, index) => {
    const indices = [triangle.a, triangle.b, triangle.c];
    if (indices.some((vertex) => vertex >= mesh.vertices.length)) {
      context.addIssue({
        code: "custom",
        path: ["triangles", index],
        message: "Triangle refers to a missing vertex.",
      });
      return;
    }
    if (triangle.material >= mesh.materials.length)
      context.addIssue({
        code: "custom",
        path: ["triangles", index, "material"],
        message: "Triangle refers to a missing material.",
      });
    const [a, b, c] = indices.map((vertex) => mesh.vertices[vertex]);
    const u = [b.x - a.x, b.y - a.y, b.z - a.z];
    const v = [c.x - a.x, c.y - a.y, c.z - a.z];
    const area = Math.hypot(
      u[1] * v[2] - u[2] * v[1],
      u[2] * v[0] - u[0] * v[2],
      u[0] * v[1] - u[1] * v[0],
    );
    if (new Set(indices).size !== 3 || area < 1e-8)
      context.addIssue({
        code: "custom",
        path: ["triangles", index],
        message: "Triangle has no usable surface area.",
      });
    indices.forEach((vertex) => used.add(vertex));
  });
  for (const axis of ["x", "y", "z"] as const) {
    const values = [...used].map((index) => mesh.vertices[index][axis]);
    if (!values.length || Math.max(...values) - Math.min(...values) < 1e-4) {
      context.addIssue({
        code: "custom",
        path: ["vertices"],
        message: "Mesh must have visible extent on all three axes.",
      });
      break;
    }
  }
});
export type ItemMesh = z.infer<typeof meshDataSchema>;
