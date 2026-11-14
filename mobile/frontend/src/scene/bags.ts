import {
  BufferGeometry,
  CatmullRomCurve3,
  CylinderGeometry,
  Float32BufferAttribute,
  Group,
  type Material,
  Mesh,
  TorusGeometry,
  TubeGeometry,
  Vector3,
} from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { type BagKind, type BagStyle, type Suitcase, type Vec3, bagStyleFor } from "../domain";
import { lightness, mix, shade, surfaceMaterial, type Surface } from "./fabric";
import { clamshellPose, type ModelKit } from "./models";

/**
 * Photographed and hand-measured bags, built from their style rather than a stock box.
 *
 * Scene units are 10 cm. The packing space is the box x in [-w/2, w/2], z in [-l/2, l/2],
 * y in [0, h]: the bag's walls, padding and details all sit outside it, so items never clip.
 */

// One texture tile per this many scene units (about 3 cm).
const tile = 0.3;

type Palette = {
  body: string;
  accent: string;
  lining: string;
  binding: string;
  webbing: string;
  zip: string;
  trim: string;
};

function palette(color: string, style: BagStyle): Palette {
  const dark = lightness(color) < 0.35;
  return {
    body: color,
    accent: style.accent,
    // Linings are a muted grey taking a little of the bag's color.
    lining: dark ? mix(color, "#80827e", 0.6) : mix(color, "#5f635f", 0.55),
    // Rim binding is a darker tone of the body; the accent stays on pulls, grips and patches.
    binding: shade(color, dark ? -0.3 : -0.35),
    webbing: shade(style.accent, -0.15),
    zip: dark ? "#2a2c2b" : shade(color, -0.55),
    trim: shade(color, -0.4),
  };
}

/** Superellipse radius of an outline at angle t, with separate top (z < 0) and bottom reach. */
type Outline = (t: number) => number;
function superellipse(a: number, top: number, bottom: number, n: number): Outline {
  return (t) => {
    const c = Math.cos(t),
      s = Math.sin(t);
    const b = s < 0 ? top : bottom;
    return Math.pow(Math.pow(Math.abs(c) / a, n) + Math.pow(Math.abs(s) / b, n), -1 / n);
  };
}
/**
 * A rounded rectangle from -top to +bottom in z (top is the bag's top end, z < 0) and +-hx in x,
 * with its own corner radius at each end. Radius along each direction, by bisecting its SDF.
 */
function roundedRect(hx: number, top: number, bottom: number, rTop: number, rBottom: number): Outline {
  const zc = (bottom - top) / 2,
    hz = (top + bottom) / 2;
  const inside = (x: number, z: number) => {
    const r = Math.min(z < zc ? rTop : rBottom, hx, hz);
    const qx = Math.abs(x) - (hx - r),
      qz = Math.abs(z - zc) - (hz - r);
    return Math.hypot(Math.max(qx, 0), Math.max(qz, 0)) + Math.min(Math.max(qx, qz), 0) - r < 0;
  };
  return (t) => {
    const c = Math.cos(t),
      s = Math.sin(t);
    let lo = 0,
      hi = hx + top + bottom;
    for (let i = 0; i < 26; i++) {
      const mid = (lo + hi) / 2;
      if (inside(mid * c, mid * s)) lo = mid;
      else hi = mid;
    }
    return lo;
  };
}

/**
 * The outside of a bag that hugs its packing box: walls `wall` thick along the sides, and corner
 * arcs of radius rBottom / rTop placed so every box corner keeps at least `wall` of padding.
 * A large rTop gives a daypack's arched top; large radii both ends give a duffel's round ends.
 */
function hugOutline(a: number, b: number, wall: number, rBottom: number, rTop = rBottom): Outline {
  // Side thickness so a corner arc of radius r clears the box corner by `wall` (symmetric case).
  const symmetric = (r: number) => (r <= wall ? wall : r - (r - wall) / Math.SQRT2);
  const side = symmetric(Math.min(rBottom, a + wall, b + wall));
  const hx = a + side;
  // The end's reach that keeps the box corner `wall` inside an arc of radius r at this side.
  const end = (r: number) => {
    const radius = Math.min(r, hx);
    const dx = radius - side;
    if (dx <= 0) return wall;
    return Math.max(wall, radius - Math.sqrt(Math.max(0, (radius - wall) ** 2 - dx * dx)));
  };
  return roundedRect(hx, b + end(rTop), b + end(rBottom), Math.min(rTop, hx), Math.min(rBottom, hx));
}

/** The lining: the packing box with corners just soft enough not to touch an item's corner. */
function liningOutline(a: number, b: number) {
  return roundedRect(a + 0.004, b + 0.004, b + 0.004, 0.06, 0.06);
}

/** Uniform angles plus the box's four corners, so walls hug the box exactly at its corners. */
function angles(a: number, b: number, count = 72) {
  const list = Array.from({ length: count }, (_, i) => -Math.PI + (i / count) * Math.PI * 2);
  for (const [x, z] of [
    [a, b],
    [-a, b],
    [-a, -b],
    [a, -b],
  ])
    list.push(Math.atan2(z, x));
  return list.sort((p, q) => p - q);
}

type Row = { points: Vec3[]; group: number };

/**
 * A closed lofted surface from rings of equal length. Each band takes its lower row's material
 * group; the seam where the ring closes gets matching normals so it doesn't show.
 */
function loft(rows: Row[]): BufferGeometry {
  const cols = rows[0].points.length + 1;
  const positions: number[] = [];
  const uvs: number[] = [];
  const v = new Array(cols).fill(0);
  rows.forEach((row, r) => {
    let u = 0;
    for (let c = 0; c < cols; c++) {
      const p = row.points[c % row.points.length];
      if (c > 0) {
        const q = row.points[(c - 1) % row.points.length];
        u += Math.hypot(p[0] - q[0], p[1] - q[1], p[2] - q[2]);
      }
      if (r > 0) {
        const q = rows[r - 1].points[c % row.points.length];
        v[c] += Math.hypot(p[0] - q[0], p[1] - q[1], p[2] - q[2]);
      }
      positions.push(...p);
      uvs.push(u / tile, v[c] / tile);
    }
  });
  const geometry = new BufferGeometry();
  geometry.setAttribute("position", new Float32BufferAttribute(positions, 3));
  geometry.setAttribute("uv", new Float32BufferAttribute(uvs, 2));
  const index: number[] = [];
  let groupStart = 0,
    group = rows[0].group;
  for (let r = 0; r < rows.length - 1; r++) {
    if (rows[r].group !== group) {
      geometry.addGroup(groupStart, index.length - groupStart, group);
      groupStart = index.length;
      group = rows[r].group;
    }
    for (let c = 0; c < cols - 1; c++) {
      const a = r * cols + c,
        b = a + 1,
        d = a + cols,
        e = d + 1;
      index.push(a, d, b, b, d, e);
    }
  }
  geometry.addGroup(groupStart, index.length - groupStart, group);
  geometry.setIndex(index);
  geometry.computeVertexNormals();
  const normals = geometry.getAttribute("normal");
  for (let r = 0; r < rows.length; r++) {
    const first = r * cols,
      last = first + cols - 1;
    const n = new Vector3(
      normals.getX(first) + normals.getX(last),
      normals.getY(first) + normals.getY(last),
      normals.getZ(first) + normals.getZ(last),
    ).normalize();
    normals.setXYZ(first, n.x, n.y, n.z);
    normals.setXYZ(last, n.x, n.y, n.z);
  }
  return geometry;
}

const ring = (ts: number[], radius: (t: number) => number, y: number, center: [number, number] = [0, 0]) =>
  ts.map((t) => [center[0] + radius(t) * Math.cos(t), y, center[1] + radius(t) * Math.sin(t)] as Vec3);
const point = (ts: number[], at: Vec3) => ts.map(() => [...at] as Vec3);

type ShellSpec = {
  /** Half the packing box's width and length, and its height. */
  a: number;
  b: number;
  h: number;
  /** The outside silhouette at the rim, before bulging. */
  outline: Outline;
  /** Wall, base and rim thickness. */
  wall: number;
  base: number;
  /** Rounding where the base meets the walls. */
  baseRound: number;
  /** Soft sides bulge outward at mid-height by this fraction. */
  bulge: number;
  /** The rim is this much wider than the base (totes flare). */
  flare: number;
  /** Rim height above the packing box. */
  rise: number;
  /** Soft fabric creases outward by up to this much (scene units); 0 for rigid shells. */
  wrinkle?: number;
};

/** Smooth periodic creases: never inward, so walls stay clear of the packing box. */
function crease(t: number, s: number) {
  const v =
    Math.sin(t * 7 + s * 5.1) * 0.5 +
    Math.sin(t * 13 - s * 7.3 + 1.7) * 0.3 +
    Math.sin(t * 23 + s * 11.9 + 0.4) * 0.2;
  return (v + 1) / 2;
}

/** Outer radius at angle t and height y. */
function outerRadius(spec: ShellSpec, t: number, y: number) {
  const top = spec.h + spec.rise;
  const s = Math.max(0, Math.min(1, y / top));
  const flare = 1 - spec.flare * (1 - s);
  const belly = Math.sin(Math.PI * Math.min(1, s * 1.15));
  const creases = (spec.wrinkle ?? 0) * crease(t, s) * belly;
  return spec.outline(t) * flare * (1 + spec.bulge * belly) + creases;
}

/**
 * An open bag body: rounded base, soft or rigid walls, a rolled rim and a lined inside.
 * Groups: 0 outside, 1 rim binding, 2 lining.
 */
function shell(spec: ShellSpec) {
  const ts = angles(spec.a, spec.b);
  const lining = liningOutline(spec.a, spec.b);
  const top = spec.h + spec.rise;
  // The lining hugs the packing box, so packed things sit right against the walls and into the
  // corners. Only a flared tote's lining follows its sloping walls outward.
  const inner = (t: number, y: number) =>
    spec.flare > 0 ? Math.max(lining(t), outerRadius({ ...spec, bulge: 0, wrinkle: 0 }, t, y) - spec.wall) : lining(t);
  // Where the outside reaches well past the lining (an arched top, round ends) the rim swells
  // into a padded roll rather than a flat ledge.
  const rimHeight = (t: number) =>
    Math.max(spec.wall / 2, Math.min(0.3, (outerRadius(spec, t, top) - inner(t, top)) * 0.32));
  const rows: Row[] = [];
  const rb = Math.min(spec.baseRound, spec.base + spec.h * 0.5);
  rows.push({ points: point(ts, [0, -spec.base, 0]), group: 0 });
  for (let k = 0; k <= 5; k++) {
    const phi = (k / 5) * (Math.PI / 2);
    const y = -spec.base + rb * (1 - Math.cos(phi));
    const inset = rb * (1 - Math.sin(phi));
    rows.push({ points: ring(ts, (t) => outerRadius(spec, t, y) - inset, y), group: 0 });
  }
  const start = -spec.base + rb;
  for (let k = 1; k <= 10; k++) {
    const y = start + ((top - start) * k) / 10;
    rows.push({ points: ring(ts, (t) => outerRadius(spec, t, y), y), group: 0 });
  }
  // The rolled rim: a half round from the outside over to the lining.
  for (let k = 1; k <= 8; k++) {
    const phi = (k / 8) * Math.PI;
    const f = (1 - Math.cos(phi)) / 2;
    rows.push({
      points: ts.map((t) => {
        const r = outerRadius(spec, t, top) * (1 - f) + inner(t, top) * f;
        return [r * Math.cos(t), top + rimHeight(t) * Math.sin(phi), r * Math.sin(t)] as Vec3;
      }),
      group: 1,
    });
  }
  for (let k = 1; k <= 4; k++) {
    const y = top - (top * k) / 4;
    rows.push({ points: ring(ts, (t) => inner(t, y), y), group: 2 });
  }
  rows.push({ points: point(ts, [0, 0, 0]), group: 2 });
  return {
    geometry: loft(rows),
    /** A closed path along the crest of the rim, where the zip runs. */
    rim: ts.map((t) => {
      // The zip runs along the inner edge of the rim, where the opening is: on the rim's surface,
      // half a wall in from the lining (or at the crest where the rim is narrow).
      const outer = outerRadius(spec, t, top),
        lin = inner(t, top);
      const fromLining = Math.min(0.5, spec.wall / 2 / Math.max(1e-6, outer - lin));
      const f = 1 - fromLining; // the rim's own parameter, 0 at the outside, 1 at the lining
      const r = outer * (1 - f) + lin * f;
      return new Vector3(r * Math.cos(t), top + rimHeight(t) * Math.sin(Math.acos(1 - 2 * f)), r * Math.sin(t));
    }),
    reach: (t: number) => Math.max(...[0, 0.25, 0.5, 0.75, 1].map((s) => outerRadius(spec, t, s * top))),
    /** A ring hugging the outside at height y, for moulded ribs. */
    band: (y: number) =>
      ts.map((t) => {
        const r = outerRadius(spec, t, y) + 0.004;
        return new Vector3(r * Math.cos(t), y, r * Math.sin(t));
      }),
    /** Where the base panel meets the walls. */
    seam: ts.map((t) => {
      const y = start + 0.02;
      const r = outerRadius(spec, t, y) + 0.008;
      return new Vector3(r * Math.cos(t), y, r * Math.sin(t));
    }),
  };
}

/**
 * A padded panel lying flat: puffed top, fully rounded edge. Groups: 0 underside, 1 edge, 2 top.
 */
function pillow(outline: Outline, a: number, b: number, thickness: number, dome = 0.25) {
  const ts = angles(a, b, 64);
  const r = thickness / 2;
  const rows: Row[] = [];
  rows.push({ points: point(ts, [0, 0, 0]), group: 0 });
  rows.push({ points: ring(ts, (t) => (outline(t) - r) * 0.5, 0), group: 0 });
  for (let k = 0; k <= 8; k++) {
    const phi = -Math.PI / 2 + (k / 8) * Math.PI;
    rows.push({
      points: ring(ts, (t) => outline(t) - r + r * Math.cos(phi), r + r * Math.sin(phi)),
      group: k < 8 ? 1 : 2,
    });
  }
  rows.push({ points: ring(ts, (t) => (outline(t) - r) * 0.6, thickness * (1 + dome * 0.7)), group: 2 });
  rows.push({ points: point(ts, [0, thickness * (1 + dome), 0]), group: 2 });
  return loft(rows);
}

/** A strap or handle: a flattened tube along a path. */
function strap(points: Vec3[], width: number, flatness = 0.35, closed = false) {
  const curve = new CatmullRomCurve3(
    points.map((p) => new Vector3(...p)),
    closed,
    "centripetal",
  );
  const geometry = new TubeGeometry(curve, Math.max(24, points.length * 12), width / 2, 8, closed);
  // Flatten across the path's own up direction (paths here lie mostly level or rise gently).
  const pos = geometry.getAttribute("position");
  const samples = curve.getSpacedPoints(400);
  for (let i = 0; i < pos.count; i++) {
    const p = new Vector3(pos.getX(i), pos.getY(i), pos.getZ(i));
    let nearest = samples[0],
      best = Infinity;
    for (const s of samples) {
      const d = s.distanceToSquared(p);
      if (d < best) {
        best = d;
        nearest = s;
      }
    }
    pos.setY(i, nearest.y + (p.y - nearest.y) * flatness);
  }
  geometry.computeVertexNormals();
  return geometry;
}

function mesh(geometry: BufferGeometry, material: Material | Material[], at: Vec3 = [0, 0, 0], rotation?: Vec3) {
  const m = new Mesh(geometry, material);
  // Bag geometry is built per bag (materials are shared): the scene disposes it with the bag.
  m.userData.ownsGeometry = true;
  m.position.set(...at);
  if (rotation) m.rotation.set(...rotation);
  return m;
}

type Built = { group: Group; reach: number };

class BagBuilder {
  readonly group = new Group();
  constructor(
    readonly kit: ModelKit,
    readonly colors: Palette,
    readonly body: Surface,
  ) {}
  mat(surface: Surface, color: string) {
    return surfaceMaterial(this.kit, surface, color);
  }
  get bodyMat() {
    return this.mat(this.body, this.colors.body);
  }
  add(geometry: BufferGeometry, material: Material | Material[], at?: Vec3, rotation?: Vec3) {
    const m = mesh(geometry, material, at, rotation);
    this.group.add(m);
    return m;
  }
  /** A slider and its pull, lying along the zip at fraction t. */
  pullOn(curve: CatmullRomCurve3, t: number, flip = false) {
    const at = curve.getPointAt(t);
    const tangent = curve.getTangentAt(t);
    this.pull(at, Math.atan2(tangent.z, tangent.x) + (flip ? Math.PI : 0));
  }
  /** A slider and its pull, resting on the zip and pointing along `direction`. */
  pull(at: Vector3, direction: number) {
    const tab = new RoundedBoxGeometry(0.12, 0.035, 0.32, 2, 0.016);
    this.add(tab, this.mat("leather", this.colors.accent), [at.x + Math.cos(direction) * 0.17, at.y + 0.025, at.z + Math.sin(direction) * 0.17], [0, -direction + Math.PI / 2, 0]);
    const slider = new RoundedBoxGeometry(0.1, 0.05, 0.12, 2, 0.02);
    this.add(slider, this.mat("metal", "#8d8f8c"), [at.x, at.y + 0.015, at.z], [0, -direction + Math.PI / 2, 0]);
  }
  zip(path: Vector3[], radius = 0.032) {
    const curve = new CatmullRomCurve3(path, true, "centripetal");
    this.add(new TubeGeometry(curve, 240, radius, 6, true), this.mat("zipper", this.colors.zip));
    return curve;
  }
  /** A corded seam around a body at one height. */
  piping(path: Vector3[]) {
    this.add(new TubeGeometry(new CatmullRomCurve3(path, true, "centripetal"), 200, 0.022, 6, true), this.mat("binding", this.colors.binding));
  }
  /** Moulded ribs on a hard shell, in the shell's own material. */
  ribs(band: (y: number) => Vector3[], heights: number[], into: Group = this.group) {
    for (const y of heights)
      into.add(mesh(new TubeGeometry(new CatmullRomCurve3(band(y), true, "centripetal"), 200, 0.02, 8, true), this.mat(this.body, shade(this.colors.body, -0.08))));
  }
  webbing(points: Vec3[], width = 0.25, closed = false) {
    this.add(strap(points, width, 0.22, closed), this.mat("webbing", this.colors.webbing));
  }
  buckle(at: Vec3, rotationY = 0, scale = 1) {
    this.add(new RoundedBoxGeometry(0.32 * scale, 0.08 * scale, 0.42 * scale, 2, 0.03 * scale), this.mat("rubber", "#262827"), at, [0, rotationY, 0]);
  }
  /** A maker's patch, stitched on. */
  patch(at: Vec3, rotation: Vec3, width = 0.6) {
    this.add(new RoundedBoxGeometry(width, 0.025, width * 0.42, 2, 0.01), this.mat("leather", this.colors.accent), at, rotation);
  }
}

/** Two spinner wheels at the bottom end of a case lying on its back. */
function wheels(b: BagBuilder, x: number, z: number, y: number) {
  for (const side of [-1, 1]) {
    const cx = side * (x - 0.16);
    b.add(new RoundedBoxGeometry(0.22, 0.14, 0.22, 2, 0.05), b.mat("rubber", "#2f3130"), [cx, y + 0.04, z - 0.07]);
    for (const offset of [-0.045, 0.045]) {
      const wheel = new CylinderGeometry(0.1, 0.1, 0.06, 20);
      b.add(wheel, b.mat("rubber", "#1d1e1e"), [cx + offset, y - 0.06, z], [0, 0, Math.PI / 2]);
      b.add(new CylinderGeometry(0.045, 0.045, 0.065, 12), b.mat("metal", "#9a9c98"), [cx + offset, y - 0.06, z], [0, 0, Math.PI / 2]);
    }
  }
}

/** A carry handle standing proud of a wall: a padded grip between two anchors. */
function carryHandle(b: BagBuilder, from: Vec3, to: Vec3, lift: Vec3) {
  const mid: Vec3 = [(from[0] + to[0]) / 2 + lift[0], (from[1] + to[1]) / 2 + lift[1], (from[2] + to[2]) / 2 + lift[2]];
  const q1: Vec3 = [from[0] * 0.55 + mid[0] * 0.45, from[1] * 0.4 + mid[1] * 0.6, from[2] * 0.55 + mid[2] * 0.45];
  const q2: Vec3 = [to[0] * 0.55 + mid[0] * 0.45, to[1] * 0.4 + mid[1] * 0.6, to[2] * 0.55 + mid[2] * 0.45];
  const curve = new CatmullRomCurve3([from, q1, mid, q2, to].map((p) => new Vector3(...p)), false, "centripetal");
  b.add(strap([from, q1, mid, q2, to], 0.25, 0.3), b.mat("webbing", b.colors.webbing));
  const grip = new CatmullRomCurve3(curve.getPoints(40).slice(13, 28), false);
  b.add(new TubeGeometry(grip, 24, 0.09, 14, false), b.mat("leather", b.colors.accent));
}

function backpack(b: BagBuilder, style: BagStyle, a: number, l2: number, h: number): Built {
  const shape = style.shape;
  const wall = 0.11;
  // A daypack's top arches over in padding; a travel pack is squarer; a roll-top in between.
  const rBottom = shape === "travel" ? 0.3 : shape === "rolltop" ? 0.35 : 0.45;
  const rTop = shape === "daypack" ? a + 1 : rBottom;
  const outline = hugOutline(a, l2, wall, rBottom, rTop);
  const A = outline(0);
  const bottom = outline(Math.PI / 2);
  const soft = b.body !== "hardshell" && b.body !== "aluminum";
  const body = shell({
    a,
    b: l2,
    h,
    outline,
    wall,
    base: 0.2,
    baseRound: 0.24,
    bulge: soft ? 0.06 : 0.01,
    flare: 0,
    rise: 0.03,
    wrinkle: soft ? 0.035 : 0,
  });
  b.add(body.geometry, [b.bodyMat, b.mat("binding", b.colors.binding), b.mat("lining", b.colors.lining)]);
  const zip = b.zip(body.rim);
  b.pullOn(zip, 0.31);
  b.pullOn(zip, 0.19, true);
  b.piping(body.seam);
  const reach = body.reach(0);
  // Straps and buckles keep real proportions on a full-size pack and shrink with small ones.
  const detail = Math.max(0.5, Math.min(1.25, Math.min(2 * a, 2 * l2) / 2.9));

  // The front panel, unzipped and folded open beside the bag, lining up.
  const panelThickness = style.frontPocket ? 0.24 : 0.14;
  const gap = 0.05;
  const panelX = -(reach * 2 + gap);
  const panel = pillow(outline, a, l2, panelThickness, 0.15);
  b.add(panel, [b.bodyMat, b.bodyMat, b.mat("lining", b.colors.lining)], [panelX, -0.2, 0]);
  // The panel's half of the main zip, around its lining edge.
  const panelTop = -0.2 + panelThickness;
  b.add(
    new TubeGeometry(
      new CatmullRomCurve3(angles(a, l2, 96).map((t) => new Vector3(panelX + (outline(t) - 0.1) * Math.cos(t), panelTop + 0.004, (outline(t) - 0.1) * Math.sin(t))), true, "centripetal"),
      200, 0.03, 6, true,
    ),
    b.mat("zipper", b.colors.zip),
  );
  // A zipped mesh organiser pocket on the panel's lining.
  const pocketA = A * 0.62,
    pocketB = l2 * 0.42,
    pocketZ = l2 * 0.18;
  const meshColor = shade(b.colors.lining, -0.3);
  b.add(
    pillow(superellipse(pocketA, pocketB, pocketB, 5), pocketA * 0.8, pocketB * 0.8, 0.05, 0.5),
    [b.mat("mesh", meshColor), b.mat("binding", b.colors.binding), b.mat("mesh", meshColor)],
    [panelX, panelTop * 1.0 + 0.02, pocketZ],
  );
  const pocketZip = new CatmullRomCurve3([
    new Vector3(panelX - pocketA * 0.82, panelTop + 0.1, pocketZ - pocketB * 0.9),
    new Vector3(panelX + pocketA * 0.82, panelTop + 0.1, pocketZ - pocketB * 0.9),
  ]);
  b.add(new TubeGeometry(pocketZip, 24, 0.022, 6, false), b.mat("zipper", b.colors.zip));
  b.pullOn(pocketZip, 0.75);
  // The fabric hinge joining panel and body along the left side.
  b.add(new RoundedBoxGeometry(gap + 0.12, 0.06, l2 * 1.5, 2, 0.025), b.bodyMat, [-reach - gap / 2, -0.17, 0]);

  // A top grab handle, lying flat beyond the top end.
  const topZ = -outline(-Math.PI / 2);
  b.webbing([
    [-0.45 * detail, -0.14, topZ + 0.08],
    [-0.4 * detail, -0.12, topZ - 0.35 * detail],
    [0, -0.11, topZ - 0.55 * detail],
    [0.4 * detail, -0.12, topZ - 0.35 * detail],
    [0.45 * detail, -0.14, topZ + 0.08],
  ], 0.26 * detail);

  // Shoulder straps: padded, curving out from under the top and back in to the base corners.
  for (const side of [-1, 1]) {
    // Only the strap on the far side shows; the near one is folded under the open panel.
    if (side < 0) continue;
    const pts: Vec3[] = [
      [0.5 * detail, -0.17, topZ + 0.5 * detail],
      [A * 0.7, -0.15, topZ - 0.15 * detail],
      [A + 0.55 * detail, -0.14, topZ * 0.3],
      [A + 0.6 * detail, -0.14, l2 * 0.3],
      [A + 0.3 * detail, -0.15, l2 * 0.72],
    ];
    b.add(strap(pts, 0.68 * detail, 0.32), b.mat(b.body === "leather" ? "leather" : b.body, shade(b.colors.body, -0.12)));
    b.webbing([
      [A + 0.3 * detail, -0.16, l2 * 0.7],
      [A + 0.05, -0.17, l2 * 0.98],
      [A * 0.6, -0.18, bottom * 1.02],
    ], 0.25 * detail);
    b.buckle([A + 0.18 * detail, -0.1, l2 * 0.86], 0.5, detail);
  }

  if (style.sidePockets) {
    // A stretch mesh bottle pocket low on the far side.
    const x = body.reach(0.4) - 0.04;
    const pocketOutline = superellipse(h * 0.5, l2 * 0.34, l2 * 0.34, 5);
    const meshColor = mix(b.colors.body, "#2a2b2a", 0.25);
    b.add(
      pillow(pocketOutline, h * 0.4, l2 * 0.3, 0.16, 0.6),
      [b.mat("mesh", meshColor), b.mat("binding", b.colors.binding), b.mat("mesh", meshColor)],
      [x, h * 0.42, l2 * 0.48],
      [0, 0, -Math.PI / 2],
    );
  }

  if (shape === "rolltop") {
    // The unrolled collar, lying flat past the top end, with its buckle.
    const collar = superellipse(A * 0.96, 0.5, 0.5, 6);
    b.add(pillow(collar, A * 0.8, 0.4, 0.06, 0.1), [b.bodyMat, b.bodyMat, b.mat("lining", b.colors.lining)], [0, -0.05, topZ - 0.6]);
    b.webbing([
      [-A * 0.5, 0.03, topZ - 0.95],
      [0, 0.04, topZ - 1.05],
      [A * 0.5, 0.03, topZ - 0.95],
    ], 0.08);
    b.buckle([0, 0.06, topZ - 1.05]);
  } else {
    b.patch([0, h * 0.62, -(body.reach(-Math.PI / 2) + 0.02)], [Math.PI / 2, 0, 0], 0.6 * detail);
  }
  return { group: b.group, reach: reach * 2 + gap + 0.3 };
}

function suitcaseBody(b: BagBuilder, style: BagStyle, a: number, l2: number, h: number): Built {
  const hard = style.shape === "hard";
  const wall = hard ? 0.07 : 0.11;
  const outline = hugOutline(a, l2, wall, hard ? 0.28 : 0.38);
  const body = shell({ a, b: l2, h, outline, wall, base: 0.18, baseRound: hard ? 0.12 : 0.2, bulge: hard ? 0.005 : 0.04, flare: 0, rise: 0.02, wrinkle: hard ? 0 : 0.025 });
  b.add(body.geometry, [b.bodyMat, b.mat("binding", b.colors.binding), b.mat("lining", b.colors.lining)]);
  const zip = b.zip(body.rim, 0.03);
  b.pullOn(zip, 0.3);
  b.pullOn(zip, 0.2, true);
  b.piping(body.seam);
  if (hard) b.ribs(body.band, [h * 0.3, h * 0.62]);
  const reach = body.reach(0);
  // The lid, open flat beside it.
  const panelX = -(reach * 2 + 0.05);
  b.add(pillow(outline, a, l2, hard ? 0.18 : 0.2, hard ? 0.05 : 0.15), [b.bodyMat, b.bodyMat, b.mat("lining", b.colors.lining)], [panelX, -0.18, 0]);
  const strapZ = [-l2 * 0.3, l2 * 0.3];
  for (const z of strapZ) b.webbing([[panelX - a * 0.85, 0.06, z], [panelX, 0.08, z], [panelX + a * 0.85, 0.06, z]], 0.08);
  for (const z of strapZ) b.buckle([panelX + a * 0.15, 0.1, z]);
  const topZ = -outline(-Math.PI / 2);
  // Telescoping handle housing at the top end, and a side carry handle.
  b.add(new RoundedBoxGeometry(0.7, 0.16, 0.12, 2, 0.04), b.mat("rubber", "#2b2d2c"), [0, h * 0.55, topZ - 0.03]);
  carryHandle(b, [-0.25, h * 0.6, topZ - 0.01], [0.25, h * 0.6, topZ - 0.01], [0, 0.04, -0.18]);
  if (style.wheels) wheels(b, a, l2 + wall, -0.2);
  return { group: b.group, reach: reach * 2 + 0.4 };
}

function duffel(b: BagBuilder, style: BagStyle, a: number, l2: number, h: number): Built {
  const barrel = style.shape === "barrel";
  const wall = 0.1;
  // A barrel's ends round right over; a boxy duffel keeps firm corners.
  const outline = hugOutline(a, l2, wall, barrel ? l2 + wall : 0.35);
  const body = shell({ a, b: l2, h, outline, wall, base: 0.16, baseRound: barrel ? 0.35 : 0.2, bulge: barrel ? 0.12 : 0.05, flare: 0, rise: 0.04, wrinkle: 0.04 });
  b.add(body.geometry, [b.bodyMat, b.mat("binding", b.colors.binding), b.mat("lining", b.colors.lining)]);
  const zip = b.zip(body.rim);
  b.pullOn(zip, 0.04);
  b.pullOn(zip, 0.46, true);
  b.piping(body.seam);
  // Carry handles sewn to both long sides, standing up and leaning out of the way.
  for (const side of [-1, 1]) {
    const z = side * (outerRadius({ a, b: l2, h, outline, wall, base: 0, baseRound: 0, bulge: barrel ? 0.12 : 0.05, flare: 0, rise: 0.04 }, side * Math.PI / 2, h * 0.85) - 0.01);
    carryHandle(b, [-a * 0.32, h * 0.85, z], [a * 0.32, h * 0.85, z], [0, h * 0.42, side * h * 0.55]);
  }
  // Rings for the shoulder strap at both ends, with the strap lying along the front.
  for (const side of [-1, 1]) {
    const x = side * (body.reach(0) - 0.01);
    b.add(new TorusGeometry(0.07, 0.016, 8, 20), b.mat("metal", "#a3a39d"), [x + side * 0.05, h * 0.7, 0], [0, Math.PI / 2, 0]);
    b.webbing([[x, h * 0.7, 0], [x + side * 0.12, h * 0.25, 0.1]], 0.08);
  }
  if (style.frontPocket) {
    // Zipped end pockets, sewn flat against both ends.
    const pocket = superellipse(h * 0.3, l2 * 0.62, l2 * 0.62, 4);
    for (const side of [-1, 1]) {
      const x = side * (outline(side > 0 ? 0 : Math.PI) * (1 + (barrel ? 0.12 : 0.05)) - 0.12);
      b.add(
        pillow(pocket, h * 0.22, l2 * 0.48, 0.16, 0.3),
        [b.bodyMat, b.mat("binding", b.colors.binding), b.bodyMat],
        [x, h * 0.48, 0],
        [0, 0, side * -Math.PI / 2],
      );
    }
  }
  b.patch([0, h * 0.55, body.reach(Math.PI / 2) + 0.02], [Math.PI / 2, 0, 0]);
  return { group: b.group, reach: body.reach(0) + 0.3 };
}

function tote(b: BagBuilder, style: BagStyle, a: number, l2: number, h: number): Built {
  const tapered = style.shape === "tapered";
  const wall = 0.06;
  const flare = tapered ? 0.1 : 0;
  // The rim is the widest point; the base, narrower by `flare`, hugs the box.
  const widen = 1 / (1 - flare);
  const hug = hugOutline(a, l2, wall, tapered ? 0.3 : 0.18);
  const outline: Outline = (t) => hug(t) * widen;
  const body = shell({ a, b: l2, h, outline, wall, base: 0.1, baseRound: 0.12, bulge: tapered ? 0.03 : 0.01, flare, rise: 0.06, wrinkle: b.body === "leather" ? 0.01 : 0.03 });
  b.add(body.geometry, [b.bodyMat, b.mat("binding", b.colors.binding), b.mat("lining", b.colors.lining)]);
  // Two shoulder handles, standing up and leaning out over the long sides.
  const top = h + 0.06;
  for (const side of [-1, 1]) {
    const z = side * (outline(side * Math.PI / 2) - wall / 2);
    carryHandle(b, [-a * 0.4, top, z], [a * 0.4, top, z], [0, h * 0.55, side * h * 0.35]);
  }
  b.patch([0, h * 0.5, body.reach(Math.PI / 2) + 0.02], [Math.PI / 2, 0, 0]);
  return { group: b.group, reach: body.reach(0) + 0.2 };
}

/** One open compartment, built from the bag's kind and style. */
export function styledBag(kit: ModelKit, bag: Suitcase): Built {
  const kind: BagKind = bag.kind ?? "other";
  const style = bagStyleFor(kind, bag.style, bag.color);
  const colors = palette(bag.color ?? "#4f5d57", style);
  const b = new BagBuilder(kit, colors, style.material);
  const a = bag.dimensions[0] / 200,
    l2 = bag.dimensions[1] / 200,
    h = bag.dimensions[2] / 100;
  switch (kind) {
    case "backpack":
      return backpack(b, style, a, l2, h);
    case "suitcase":
      return suitcaseBody(b, style, a, l2, h);
    case "duffel":
      return duffel(b, style, a, l2, h);
    case "tote":
      return tote(b, style, a, l2, h);
    default:
      return style.shape === "boxy"
        ? suitcaseBody(b, { ...style, shape: "soft", wheels: false }, a, l2, h)
        : duffel(b, { ...style, shape: "barrel" }, a, l2, h);
  }
}

/** One half of a suitcase that opens flat, lining up, for the clamshell pose. */
function styledHalf(b: BagBuilder, style: BagStyle, w: number, l: number, h: number, lid: boolean) {
  const hard = style.shape === "hard";
  const wall = hard ? 0.07 : 0.1;
  const a = w / 2,
    l2 = l / 2;
  const outline = hugOutline(a, l2, wall, hard ? 0.28 : 0.38);
  const group = new Group();
  const half = shell({ a, b: l2, h, outline, wall, base: 0.16, baseRound: hard ? 0.1 : 0.18, bulge: hard ? 0.004 : 0.03, flare: 0, rise: 0.015, wrinkle: hard ? 0 : 0.02 });
  group.add(mesh(half.geometry, [b.bodyMat, b.mat("binding", b.colors.binding), b.mat("lining", b.colors.lining)]));
  const zip = new CatmullRomCurve3(half.rim, true, "centripetal");
  group.add(mesh(new TubeGeometry(zip, 240, 0.024, 6, true), b.mat("zipper", b.colors.zip)));
  if (hard) b.ribs(half.band, [h * 0.35, h * 0.7], group);
  if (lid) {
    for (const z of [-l2 * 0.32, l2 * 0.32])
      group.add(mesh(strap([[-a * 0.9, 0.05, z], [0, 0.07, z], [a * 0.9, 0.05, z]], 0.08, 0.22), b.mat("webbing", b.colors.webbing)));
    group.add(mesh(pillow(superellipse(a * 0.75, l2 * 0.32, l2 * 0.32, 4), a * 0.6, l2 * 0.25, 0.05, 0.3), [b.mat("mesh", shade(b.colors.lining, -0.35)), b.mat("binding", b.colors.binding), b.mat("mesh", shade(b.colors.lining, -0.35))], [0, 0.002, -l2 * 0.55]));
  }
  return { group, reach: half.reach(0) };
}

/** A suitcase that opens flat, in the same hinge rig as the built-in cases. */
export function styledClamshell(kit: ModelKit, bag: Suitcase) {
  const style = bagStyleFor("suitcase", bag.style, bag.color);
  const colors = palette(bag.color ?? "#4f5d57", style);
  const b = new BagBuilder(kit, colors, style.material);
  const w = bag.dimensions[0] / 100,
    l = bag.dimensions[1] / 100,
    h = bag.dimensions[2] / 200;
  const pose = clamshellPose(w, h, 0);
  const root = new Group();
  root.position.x = pose.rootX;
  root.add(styledHalf(b, style, w, l, h, false).group);
  const base = new Group();
  root.add(base);
  const hinge = new Group();
  hinge.position.set(...pose.hinge);
  const lidGroup = new Group();
  lidGroup.position.set(...pose.lidOrigin);
  lidGroup.add(styledHalf(b, style, w, l, h, true).group);
  const lidItems = new Group();
  lidGroup.add(lidItems);
  hinge.add(lidGroup);
  root.add(hinge);
  // Handle housing, carry handle and wheels on the base half; the details sit outside the cavity.
  const hardware = b.group;
  hardware.add(mesh(new RoundedBoxGeometry(0.7, 0.16, 0.12, 2, 0.04), b.mat("rubber", "#2b2d2c"), [0, h * 0.7, -l / 2 - 0.13]));
  carryHandle(b, [w / 2 + 0.08, h * 0.75, -0.25], [w / 2 + 0.08, h * 0.75, 0.25], [0.18, 0.03, 0]);
  if (style.wheels) wheels(b, w / 2, l / 2 + 0.1, -0.18);
  root.add(hardware);
  return { root, hinge, base, lid: lidItems, w, h };
}
