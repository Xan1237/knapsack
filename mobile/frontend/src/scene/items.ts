import {
  CylinderGeometry,
  ExtrudeGeometry,
  Group,
  LatheGeometry,
  type Material,
  Mesh,
  Shape,
  TorusGeometry,
  Vector2,
} from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import type { Item, Vec3 } from "../domain";
import { lightness, mix, shade, surfaceMaterial, type Surface } from "./fabric";
import type { ModelKit } from "./models";

/**
 * Belongings built from their category, in a unit cube the scene stretches to the item's exact
 * packing size (x width, y up, z length). Every model reaches all six faces of the cube, so what
 * you see is exactly the space it takes.
 */

type Parts = { kit: ModelKit; group: Group };

function box(p: Parts, key: string, size: Vec3, radius: number, at: Vec3, material: Material, rotation?: Vec3) {
  const geometry = p.kit.geometry(`ib|${key}|${size.join()}|${radius}`, () => {
    const safe = Math.max(1e-3, Math.min(radius, Math.min(...size) / 2 - 1e-3));
    return new RoundedBoxGeometry(size[0], size[1], size[2], 3, safe);
  });
  const mesh = new Mesh(geometry, material);
  mesh.position.set(...at);
  if (rotation) mesh.rotation.set(...rotation);
  p.group.add(mesh);
  return mesh;
}

function cylinder(p: Parts, key: string, top: number, bottom: number, height: number, at: Vec3, material: Material, rotation?: Vec3, segments = 28) {
  const geometry = p.kit.geometry(`ic|${key}|${top}|${bottom}|${height}|${segments}`, () => new CylinderGeometry(top, bottom, height, segments));
  const mesh = new Mesh(geometry, material);
  mesh.position.set(...at);
  if (rotation) mesh.rotation.set(...rotation);
  p.group.add(mesh);
  return mesh;
}

const mat = (p: Parts, surface: Surface, color: string, repeat = 1) => surfaceMaterial(p.kit, surface, color, repeat);

/** Folded clothes: soft stacked folds, with the details that tell a shirt from jeans or a knit. */
function clothing(p: Parts, item: Item) {
  const text = `${item.label} ${item.appearance}`.toLowerCase();
  const jeans = /jean|denim|chino|trouser|pant|short/.test(text);
  const knit = /knit|sweater|jumper|hoodie|cardigan|wool|fleece/.test(text);
  const surface: Surface = jeans ? "denim" : knit ? "knit" : "cotton";
  const body = mat(p, surface, item.color, jeans ? 5 : knit ? 3 : 6);
  const fold = mat(p, surface, shade(item.color, -0.08), jeans ? 5 : knit ? 3 : 6);
  // Three folded layers, each a little softer and inset, filling the full height.
  box(p, "fold-a", [1, 0.38, 1], 0.17, [0, -0.31, 0], fold);
  box(p, "fold-b", [0.985, 0.36, 0.99], 0.17, [0.004, 0.01, -0.002], body);
  box(p, "fold-c", [0.97, 0.34, 0.98], 0.16, [0, 0.33, 0.004], body);
  if (jeans) {
    const stitch = mat(p, "cotton", "#c9893d");
    box(p, "jean-pocket", [0.42, 0.02, 0.36], 0.01, [0.18, 0.495, 0.12], mat(p, "denim", shade(item.color, 0.06), 3));
    box(p, "jean-seam", [0.012, 0.012, 0.86], 0.004, [-0.12, 0.5, 0], stitch);
    box(p, "jean-band", [0.9, 0.03, 0.1], 0.012, [0, 0.488, -0.4], fold);
    cylinder(p, "rivet", 0.025, 0.025, 0.02, [0.38, 0.5, 0.0], mat(p, "metal", "#b08d57"), undefined, 10);
  } else if (knit) {
    // A ribbed cuff along one end.
    box(p, "knit-cuff", [0.96, 0.05, 0.14], 0.02, [0, 0.48, 0.4], mat(p, "knit", shade(item.color, -0.12), 2));
  } else {
    // A shirt: collar band and points, placket and buttons on the top fold.
    const collar = mat(p, "cotton", shade(item.color, 0.1), 3);
    box(p, "collar-band", [0.42, 0.07, 0.1], 0.03, [0, 0.47, -0.4], collar);
    for (const side of [-1, 1])
      box(p, "collar-point", [0.2, 0.05, 0.16], 0.022, [side * 0.12, 0.485, -0.31], collar, [0, side * 0.55, 0]);
    box(p, "placket", [0.08, 0.02, 0.58], 0.008, [0, 0.495, 0.06], fold);
    const button = mat(p, "plastic", lightness(item.color) > 0.6 ? "#7a7268" : "#efe9dc");
    for (const z of [-0.14, 0.04, 0.22]) cylinder(p, "button", 0.022, 0.022, 0.015, [0, 0.505, z], button, undefined, 12);
  }
}

/** A sneaker: rubber sole, padded upper and collar, laces, toe box and a side stripe. */
function shoe(p: Parts, item: Item) {
  const upper = mat(p, "nylon", item.color, 3);
  const sole = mat(p, "rubber", lightness(item.color) > 0.75 ? "#d8d2c6" : "#f1ede4", 2);
  const dark = mat(p, "nylon", shade(item.color, -0.45), 3);
  // Toe points along -z. The sole fills the footprint; the upper rises toward the heel.
  // A foot-shaped sole: rounded toe and heel, a little narrower at the arch.
  const soleGeometry = p.kit.geometry("shoe-sole", () => {
    const outline = new Shape();
    const steps = 48;
    for (let i = 0; i <= steps; i++) {
      const t = (i / steps) * Math.PI * 2;
      const z = 0.5 * Math.sin(t);
      // Superellipse footprint, pinched slightly at the arch on one side.
      const r = 0.5 * Math.pow(Math.pow(Math.abs(Math.cos(t)), 2.6) + Math.pow(Math.abs(Math.sin(t)), 2.6), -1 / 2.6);
      const pinch = Math.cos(t) > 0 ? 1 - 0.12 * Math.exp(-Math.pow((z - 0.05) / 0.16, 2)) : 1;
      const x = Math.cos(t) * r * pinch;
      if (i === 0) outline.moveTo(x, z);
      else outline.lineTo(x, z);
    }
    const g = new ExtrudeGeometry(outline, { depth: 0.16, bevelEnabled: true, bevelThickness: 0.02, bevelSize: 0.02, bevelSegments: 3, curveSegments: 8 });
    g.rotateX(Math.PI / 2);
    g.scale(0.96, 1, 0.96);
    g.translate(0, -0.3, 0);
    return g;
  });
  p.group.add(new Mesh(soleGeometry, sole));
  box(p, "upper", [0.96, 0.78, 0.7], 0.32, [0, 0.07, 0.14], upper);
  box(p, "toe", [0.94, 0.5, 0.56], 0.24, [0, -0.06, -0.21], upper);
  box(p, "toe-cap", [0.9, 0.3, 0.2], 0.13, [0, -0.15, -0.4], mat(p, "rubber", shade(item.color, -0.08), 2));
  box(p, "opening", [0.56, 0.04, 0.3], 0.02, [0, 0.455, 0.27], mat(p, "lining", "#3a3b38", 2));
  // A padded collar ringing the opening.
  const ring = new Mesh(p.kit.geometry("shoe-collar", () => new TorusGeometry(0.3, 0.075, 10, 32)), dark);
  ring.position.set(0, 0.43, 0.27);
  ring.rotation.x = Math.PI / 2;
  ring.scale.set(1.05, 0.62, 1);
  p.group.add(ring);
  box(p, "tongue", [0.4, 0.1, 0.32], 0.05, [0, 0.44, -0.02], mat(p, "nylon", mix(item.color, "#ffffff", 0.25), 3));
  const lace = mat(p, "cotton", lightness(item.color) > 0.7 ? "#cfc8ba" : "#f4f1ea");
  for (const z of [-0.14, -0.06, 0.02]) box(p, "lace", [0.5, 0.035, 0.04], 0.014, [0, 0.49, z], lace);
  box(p, "heel-tab", [0.26, 0.34, 0.06], 0.03, [0, 0.3, 0.47], dark);
}

/** A bottle: shaped body, label, and a cap or a pump. */
function bottle(p: Parts, item: Item) {
  const pump = /pump|lotion|soap|serum|spray|cleanser|shampoo/i.test(`${item.label} ${item.appearance}`);
  const body = p.kit.geometry("bottle-body", () => {
    const profile = [
      [0, -0.5], [0.44, -0.5], [0.49, -0.47], [0.5, -0.4], [0.5, 0.12], [0.47, 0.2], [0.34, 0.27], [0.22, 0.31], [0.2, 0.34], [0, 0.34],
    ].map(([r, y]) => new Vector2(r, y));
    return new LatheGeometry(profile, 36);
  });
  const shell = new Mesh(body, mat(p, "plastic", item.color));
  p.group.add(shell);
  cylinder(p, "label", 0.503, 0.503, 0.38, [0, -0.12, 0], mat(p, "plastic", mix(item.color, "#f3efe6", 0.75)), undefined, 36);
  if (pump) {
    cylinder(p, "collar", 0.22, 0.22, 0.06, [0, 0.37, 0], mat(p, "plastic", "#2d2f2e"));
    cylinder(p, "stem", 0.06, 0.06, 0.08, [0, 0.43, 0], mat(p, "plastic", "#efede8"));
    box(p, "pump-head", [0.22, 0.06, 0.5], 0.025, [0, 0.47, -0.12], mat(p, "plastic", "#2d2f2e"));
  } else {
    cylinder(p, "cap", 0.24, 0.24, 0.16, [0, 0.42, 0], mat(p, "plastic", shade(item.color, -0.35)));
    cylinder(p, "cap-top", 0.22, 0.24, 0.02, [0, 0.5, 0], mat(p, "plastic", shade(item.color, -0.4)));
  }
}

/** A soft zipped pouch. */
function pouch(p: Parts, item: Item) {
  box(p, "pouch", [1, 1, 1], 0.42, [0, 0, 0], mat(p, "nylon", item.color, 4));
  box(p, "pouch-zip", [0.62, 0.035, 0.05], 0.015, [0, 0.49, 0], mat(p, "zipper", shade(item.color, -0.55), 2));
  box(p, "pouch-pull", [0.07, 0.03, 0.2], 0.012, [0.24, 0.5, 0.1], mat(p, "leather", mix(item.color, "#1f1f1f", 0.5)));
}

/** A camera: body with a leather grip, lens barrel, viewfinder and controls. The lens points along -z. */
function camera(p: Parts, item: Item) {
  const body = mat(p, "plastic", item.color);
  const grip = mat(p, "leather", lightness(item.color) > 0.5 ? "#2b2a28" : shade(item.color, 0.15), 3);
  box(p, "cam-body", [1, 0.84, 0.5], 0.1, [0, -0.08, 0.25], body);
  box(p, "cam-grip", [1.004, 0.5, 0.42], 0.06, [0, -0.12, 0.26], grip);
  box(p, "cam-finder", [0.3, 0.22, 0.34], 0.06, [0, 0.39, 0.28], body);
  cylinder(p, "lens", 0.27, 0.3, 0.42, [0, -0.08, -0.21], mat(p, "rubber", "#1f2120"), [Math.PI / 2, 0, 0]);
  cylinder(p, "lens-ring", 0.31, 0.31, 0.06, [0, -0.08, -0.06], mat(p, "metal", "#9a9c98"), [Math.PI / 2, 0, 0]);
  cylinder(p, "glass", 0.2, 0.2, 0.02, [0, -0.08, -0.43], mat(p, "glass", "#33475a"), [Math.PI / 2, 0, 0]);
  cylinder(p, "lens-rim", 0.27, 0.27, 0.06, [0, -0.08, -0.47], mat(p, "metal", "#5b5d5a"), [Math.PI / 2, 0, 0]);
  cylinder(p, "shutter", 0.06, 0.06, 0.1, [0.3, 0.38, 0.32], mat(p, "metal", "#b9b6ad"), undefined, 14);
  cylinder(p, "dial", 0.1, 0.1, 0.08, [-0.3, 0.37, 0.3], mat(p, "metal", "#6b6d6a"), undefined, 18);
}

/** Folded headphones lying flat: cups with cushions and an arching band. */
function headphones(p: Parts, item: Item) {
  const shell = mat(p, "plastic", item.color);
  const cushion = mat(p, "leather", shade(item.color, -0.35), 3);
  for (const side of [-1, 1]) {
    cylinder(p, "cup", 0.26, 0.26, 0.62, [side * 0.24, -0.19, 0.24], shell);
    const pad = new Mesh(p.kit.geometry("cushion", () => new TorusGeometry(0.19, 0.08, 12, 28)), cushion);
    pad.position.set(side * 0.24, 0.19, 0.24);
    pad.rotation.x = Math.PI / 2;
    p.group.add(pad);
    cylinder(p, "cup-in", 0.17, 0.17, 0.02, [side * 0.24, 0.13, 0.24], mat(p, "mesh", "#2b2b2b", 2));
  }
  const band = new Mesh(p.kit.geometry("band", () => new TorusGeometry(0.42, 0.08, 10, 36, Math.PI)), mat(p, "leather", shade(item.color, -0.25), 3));
  band.position.set(0, -0.3, 0.08);
  band.rotation.x = -Math.PI / 2;
  band.scale.set(1.05, 1.4, 1);
  p.group.add(band);
}

/** A hardback: covers, spine and a cream page block with page edges. */
function book(p: Parts, item: Item) {
  const cover = mat(p, "canvas", item.color, 3);
  box(p, "cover-bottom", [1, 0.11, 1], 0.03, [0, -0.445, 0], cover);
  box(p, "cover-top", [1, 0.11, 1], 0.03, [0, 0.445, 0], cover);
  box(p, "spine", [0.1, 1, 1], 0.04, [-0.45, 0, 0], cover);
  box(p, "page-block", [0.95, 0.8, 0.96], 0.01, [0.015, 0, 0], mat(p, "pages", "#efe7d4", 1));
  box(p, "title", [0.6, 0.012, 0.08], 0.004, [0.05, 0.5, -0.25], mat(p, "metal", "#c9a55a"));
  box(p, "title-2", [0.4, 0.012, 0.05], 0.004, [0.05, 0.5, -0.1], mat(p, "metal", "#c9a55a"));
}

/** Anything else: a zipped travel case. */
function travelCase(p: Parts, item: Item) {
  box(p, "case", [1, 1, 1], 0.2, [0, 0, 0], mat(p, "nylon", item.color, 4));
  box(p, "case-zip", [1.004, 0.04, 1.004], 0.02, [0, 0.12, 0], mat(p, "zipper", shade(item.color, -0.5), 3));
  box(p, "case-loop", [0.3, 0.05, 0.12], 0.02, [0, 0.5, -0.36], mat(p, "webbing", shade(item.color, -0.3)));
}

const builders: Record<Item["category"], (p: Parts, item: Item) => void> = {
  clothing,
  shoes: shoe,
  bottle,
  pouch,
  camera,
  headphones,
  book,
  other: travelCase,
};

/** A unit-cube model of the item, built from its category, label and color. */
export function belongingModel(kit: ModelKit, item: Item) {
  const parts: Parts = { kit, group: new Group() };
  builders[item.category](parts, item);
  return parts.group;
}
