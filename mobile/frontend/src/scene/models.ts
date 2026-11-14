import {
  BoxGeometry,
  BufferGeometry,
  CylinderGeometry,
  DoubleSide,
  EdgesGeometry,
  Float32BufferAttribute,
  Group,
  LineBasicMaterial,
  LineSegments,
  Material,
  Mesh,
  MeshStandardMaterial,
} from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import type { Item, ItemMesh, Suitcase, Vec3 } from "../domain";
import { belongingModel } from "./items";

/** Clamshell pose: both halves are floor-up while open; the lid rotates over the center seam. */
export function clamshellPose(width: number, halfDepth: number, closing: number) {
  const progress = Math.max(0, Math.min(1, closing));
  return {
    rootX: (width / 2) * (1 - progress),
    lidAngle: -Math.PI * progress,
    hinge: [-width / 2, halfDepth, 0] as Vec3,
    lidOrigin: [-width / 2, -halfDepth, 0] as Vec3,
  };
}

/** Shares geometries and materials across a scene so a phone only uploads each one once. */
export class ModelKit {
  private geometries = new Map<string, BufferGeometry>();
  private materials = new Map<string, Material>();
  private meshGeometries = new WeakMap<ItemMesh, BufferGeometry>();
  private owned: { dispose(): void }[] = [];
  private extras = new Map<string, { dispose(): void }>();

  geometry(key: string, build: () => BufferGeometry) {
    let geometry = this.geometries.get(key);
    if (!geometry) {
      geometry = build();
      this.geometries.set(key, geometry);
    }
    return geometry;
  }
  material(color: string, roughness = 0.85) {
    const key = `${color}|${roughness}`;
    let material = this.materials.get(key);
    if (!material) {
      material = new MeshStandardMaterial({ color, roughness });
      this.materials.set(key, material);
    }
    return material;
  }
  /** Anything disposable built once per scene, such as textures and textured materials. */
  cached<T extends { dispose(): void }>(key: string, build: () => T): T {
    let value = this.extras.get(key) as T | undefined;
    if (!value) {
      value = build();
      this.extras.set(key, value);
    }
    return value;
  }
  line(color: string) {
    const key = `line|${color}`;
    let material = this.materials.get(key);
    if (!material) {
      material = new LineBasicMaterial({ color });
      this.materials.set(key, material);
    }
    return material;
  }
  /** Render supplied topology; never infer shapes from an item category. */
  generated(data: ItemMesh) {
    let geometry = this.meshGeometries.get(data);
    if (!geometry) {
      geometry = new BufferGeometry();
      // Stretch the mesh to fill its unit cube exactly, so it takes up just the space it's packed in.
      const range = (axis: "x" | "y" | "z") => {
        const values = data.vertices.map((v) => v[axis]);
        const min = Math.min(...values),
          span = Math.max(...values) - min;
        return (n: number) => (span > 1e-6 ? (n - min) / span - 0.5 : n);
      };
      const fx = range("x"),
        fy = range("y"),
        fz = range("z");
      geometry.setAttribute(
        "position",
        new Float32BufferAttribute(
          data.vertices.flatMap(({ x, y, z }) => [fx(x), fz(z), fy(y)]),
          3,
        ),
      );
      const indices: number[] = [];
      data.materials.forEach((_, material) => {
        const start = indices.length;
        // Swapping Y/Z reflects handedness; reverse the winding too.
        for (const face of data.triangles)
          if (face.material === material) indices.push(face.a, face.c, face.b);
        if (indices.length > start) geometry!.addGroup(start, indices.length - start, material);
      });
      geometry.setIndex(indices);
      geometry.computeVertexNormals();
      this.meshGeometries.set(data, geometry);
      this.owned.push(geometry);
    }
    const materials = data.materials.map((m) => {
      const material = new MeshStandardMaterial({
        color: m.color,
        roughness: 0.75,
        flatShading: true,
        side: DoubleSide,
      });
      this.owned.push(material);
      return material;
    });
    return new Mesh(geometry, materials);
  }
  dispose() {
    this.geometries.forEach((g) => g.dispose());
    this.materials.forEach((m) => m.dispose());
    this.owned.forEach((o) => o.dispose());
    this.extras.forEach((o) => o.dispose());
  }
}

function place(mesh: Mesh, at: Vec3 = [0, 0, 0], rotation?: Vec3) {
  mesh.position.set(...at);
  if (rotation) mesh.rotation.set(...rotation);
  return mesh;
}
function rounded(kit: ModelKit, size: Vec3, radius: number) {
  return kit.geometry(`rb|${size.join()}|${radius}`, () => {
    const safe = Math.min(radius, Math.min(...size) / 2 - 1e-4);
    return new RoundedBoxGeometry(size[0], size[1], size[2], 2, Math.max(safe, 1e-4));
  });
}
function block(kit: ModelKit, size: Vec3, at: Vec3 | undefined, color: string, roughness = 0.85) {
  return place(new Mesh(rounded(kit, size, Math.min(...size) * 0.18), kit.material(color, roughness)), at);
}
function cylinder(kit: ModelKit, args: [number, number, number, number], at: Vec3, color: string, roughness = 0.85, rotation?: Vec3) {
  const geometry = kit.geometry(`cyl|${args.join()}`, () => new CylinderGeometry(...args));
  return place(new Mesh(geometry, kit.material(color, roughness)), at, rotation);
}

/** The generated mesh when Astra made one, otherwise a detailed model of its category. */
export function itemModel(kit: ModelKit, item: Item) {
  if (!item.mesh) return belongingModel(kit, item);
  const group = new Group();
  group.add(kit.generated(item.mesh));
  return group;
}

/** A clean outline, since triangle wireframes scribble across items at phone size. */
export function selectionBox(kit: ModelKit, item: Item) {
  const edges = kit.geometry(
    "unit-edges",
    () => new EdgesGeometry(new BoxGeometry(1.02, 1.02, 1.02)),
  );
  const outline = new LineSegments(edges, kit.line(item.mesh ? "#d18c54" : "#3b5745"));
  outline.raycast = () => {};
  return outline;
}

function part(kit: ModelKit, size: Vec3, at: Vec3, color: string, rotation?: Vec3) {
  const radius = Math.min(0.12, ...size.map((n) => n * 0.45));
  return place(new Mesh(rounded(kit, size, radius), kit.material(color, 0.78)), at, rotation);
}

function half(kit: ModelKit, w: number, l: number, h: number, color: string, lid: boolean) {
  const group = new Group();
  const add = (size: Vec3, at: Vec3, c: string, rotation?: Vec3) =>
    group.add(part(kit, size, at, c, rotation));
  add([w + 0.18, 0.18, l + 0.18], [0, -0.12, 0], color);
  add([w, 0.045, l], [0, -0.004, 0], lid ? "#c3c8b4" : "#d2d3c0");
  for (const s of [-1, 1]) {
    add([0.1, h + 0.12, l + 0.16], [s * (w / 2 + 0.035), h / 2 - 0.045, 0], color);
    add([w + 0.16, h + 0.12, 0.1], [0, h / 2 - 0.045, s * (l / 2 + 0.035)], color);
    add([0.035, 0.045, l + 0.12], [s * (w / 2 + 0.04), h + 0.03, 0], "#47563e");
    add([w + 0.12, 0.045, 0.035], [0, h + 0.03, s * (l / 2 + 0.04)], "#47563e");
    add([0.025, h * 0.82, l - 0.08], [s * (w / 2 - 0.03), h * 0.43, 0], "#adb69c");
  }
  for (let i = 0; i < 9; i++)
    add([0.024, h * 0.73, 0.025], [-w * 0.4 + i * w * 0.1, h * 0.39, l / 2 + 0.095], "#65775c");
  if (lid) {
    for (let i = 0; i < 7; i++)
      add([0.055, 0.045, l * 0.76], [-w * 0.36 + i * w * 0.12, -0.232, 0], "#68795e");
    add([0.64, 0.045, 0.25], [0, -0.267, -l * 0.16], "#68795e");
    add([0.35, 0.012, 0.022], [0, -0.296, -l * 0.16], "#d8ddc7");
    add([w * 0.82, 0.025, 0.075], [0, h + 0.015, 0], "#9ba78b", [0, 0.6, 0]);
    add([w * 0.82, 0.025, 0.075], [0, h + 0.015, 0], "#9ba78b", [0, -0.6, 0]);
    add([0.16, 0.055, 0.16], [0, h + 0.035, 0], "#56674c");
  }
  return group;
}

export function clamshellCase(kit: ModelKit, bag: Suitcase) {
  const w = bag.dimensions[0] / 100,
    l = bag.dimensions[1] / 100,
    h = bag.dimensions[2] / 200;
  const color = bag.color || "#76876c";
  const pose = clamshellPose(w, h, 0);
  const root = new Group();
  root.position.x = pose.rootX;
  root.add(half(kit, w, l, h, color, false));
  const base = new Group();
  root.add(base);
  const hinge = new Group();
  hinge.position.set(...pose.hinge);
  const lid = new Group();
  lid.position.set(...pose.lidOrigin);
  lid.add(half(kit, w, l, h, color, true));
  const lidItems = new Group();
  lid.add(lidItems);
  hinge.add(lid);
  root.add(hinge);
  for (const z of [-0.7, 0.7]) root.add(part(kit, [0.17, 0.13, 0.22], [-w / 2, h, z * l * 0.45], "#56674c"));
  root.add(part(kit, [0.13, 0.25, 0.7], [w / 2 + 0.14, h, 0], "#4f6046"));
  root.add(part(kit, [0.13, 0.12, 0.47], [w / 2 + 0.22, h + 0.02, 0], "#9aa78b"));
  for (const s of [-1, 1])
    root.add(cylinder(kit, [0.14, 0.14, 0.13, 16], [s * (w / 2 - 0.18), -0.29, l / 2 - 0.17], "#374333", 0.85, [0, 0, Math.PI / 2]));
  root.add(part(kit, [0.07, 0.06, 0.16], [w / 2 + 0.08, h + 0.07, -l * 0.24], "#c3b18a"));
  return { root, hinge, base, lid: lidItems, w, h };
}

/** Imported bags without the clamshell flag use one open compartment. */
export function openBag(kit: ModelKit, bag: Suitcase) {
  const w = bag.dimensions[0] / 100,
    l = bag.dimensions[1] / 100,
    h = bag.dimensions[2] / 100;
  const color = bag.color || "#5c6c60";
  const group = new Group();
  const add = (size: Vec3, at: Vec3, c: string) => group.add(block(kit, size, at, c));
  add([w + 0.28, 0.2, l + 0.25], [0, -0.18, 0], "#46584f");
  add([w, 0.08, l], [0, -0.035, 0], "#d1cdbd");
  add([0.13, h * 0.67, l + 0.2], [-w / 2 - 0.075, h * 0.335 - 0.08, 0], color);
  add([0.13, h * 0.67, l + 0.2], [w / 2 + 0.075, h * 0.335 - 0.08, 0], color);
  add([w + 0.2, h * 0.78, 0.12], [0, h * 0.39 - 0.08, -l / 2 - 0.06], color);
  add([w + 0.2, 0.3, 0.12], [0, 0.04, l / 2 + 0.06], color);
  add([0.72, 0.1, 0.25], [0, -0.1, l / 2 + 0.2], "#394a40");
  for (const side of [-1, 1])
    group.add(cylinder(kit, [0.17, 0.17, 0.15, 16], [side * (w / 2 - 0.28), -0.32, l / 2 - 0.2], "#333c34", 0.85, [0, 0, Math.PI / 2]));
  return group;
}
