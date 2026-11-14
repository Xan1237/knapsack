import {
  Color,
  DataTexture,
  LinearMipmapLinearFilter,
  LinearFilter,
  MeshStandardMaterial,
  RepeatWrapping,
  RGBAFormat,
  SRGBColorSpace,
  UnsignedByteType,
} from "three";
import type { BagMaterial } from "../domain";
import type { ModelKit } from "./models";

/** Surfaces a bag is made of: its outer fabric, plus the parts every bag shares. */
export type Surface = BagMaterial | "lining" | "mesh" | "webbing" | "zipper" | "binding" | "rubber" | "metal";

const size = 128;

/** A tiling hash in [0, 1). Integer lattice coordinates wrap at `period`. */
function hash(x: number, y: number, period: number) {
  const xi = ((x % period) + period) % period;
  const yi = ((y % period) + period) % period;
  const s = Math.sin(xi * 127.1 + yi * 311.7) * 43758.5453;
  return s - Math.floor(s);
}

/** Smooth value noise that tiles across the texture. */
function noise(x: number, y: number, period: number) {
  const x0 = Math.floor(x),
    y0 = Math.floor(y);
  const fx = x - x0,
    fy = y - y0;
  const sx = fx * fx * (3 - 2 * fx),
    sy = fy * fy * (3 - 2 * fy);
  const a = hash(x0, y0, period),
    b = hash(x0 + 1, y0, period),
    c = hash(x0, y0 + 1, period),
    d = hash(x0 + 1, y0 + 1, period);
  return a + (b - a) * sx + (c - a) * sy + (a - b - c + d) * sx * sy;
}

function fbm(x: number, y: number, octaves: number, base: number) {
  let value = 0,
    amplitude = 0.5,
    frequency = base,
    total = 0;
  for (let o = 0; o < octaves; o++) {
    value += noise((x / size) * frequency, (y / size) * frequency, frequency) * amplitude;
    total += amplitude;
    amplitude *= 0.5;
    frequency *= 2;
  }
  return value / total;
}

/** Brightness patterns in [0, 1], multiplied over the material color. */
const patterns: Record<Surface, (x: number, y: number) => number> = {
  // Ripstop: a fine plain weave crossed by a heavier thread every 16 px.
  nylon: (x, y) => {
    const weave = ((x >> 1) + (y >> 1)) % 2 ? 0.95 : 0.9;
    const grid = x % 16 < 2 || y % 16 < 2 ? 0.8 : 1;
    return weave * grid * (0.95 + fbm(x, y, 2, 8) * 0.08);
  },
  polyester: (x, y) => {
    const weave = ((x >> 1) + (y >> 1)) % 2 ? 0.96 : 0.88;
    return weave * (0.92 + fbm(x, y, 3, 8) * 0.12);
  },
  // Twill: diagonal ribs with slubby thread.
  canvas: (x, y) => {
    const rib = 0.86 + 0.1 * Math.sin(((x + y) * Math.PI) / 3);
    return rib * (0.86 + fbm(x, y, 4, 4) * 0.2);
  },
  // Leather: soft pebbled grain.
  leather: (x, y) => {
    const grain = fbm(x, y, 4, 16);
    const pebble = Math.abs(Math.sin(fbm(x, y, 2, 8) * 18)) * 0.08;
    return 0.8 + grain * 0.22 - pebble;
  },
  // Polycarbonate: almost smooth, with a faint speckle.
  hardshell: (x, y) => 0.95 + (hash(x, y, size) - 0.5) * 0.05 + fbm(x, y, 2, 4) * 0.04,
  // Brushed aluminium: long streaks.
  aluminum: (x, y) => 0.84 + fbm(x * 0.05, y * 6, 3, 4) * 0.2,
  lining: (x, y) => (((x >> 1) + (y >> 1)) % 2 ? 0.97 : 0.92) * (0.95 + fbm(x, y, 2, 8) * 0.06),
  // Mesh pockets: open diamonds on a light lattice.
  mesh: (x, y) => {
    const u = (x + y) % 12,
      v = (x - y + 1200) % 12;
    return u < 3 || v < 3 ? 0.95 : 0.32;
  },
  // Webbing: tight ribs across the strap.
  webbing: (x, y) => (y % 6 < 3 ? 0.98 : 0.8) * (0.94 + hash(x >> 3, y, size) * 0.06),
  // Zip: teeth across a darker tape.
  zipper: (x, y) => (x % 8 < 4 ? (y % 32 > 6 && y % 32 < 26 ? 1 : 0.55) : 0.35),
  binding: (x, y) => (y % 4 < 2 ? 0.95 : 0.85),
  rubber: (x, y) => 0.9 + (hash(x, y, size) - 0.5) * 0.08,
  metal: () => 1,
};

const finish: Record<Surface, { roughness: number; metalness: number; bump: number }> = {
  nylon: { roughness: 0.62, metalness: 0, bump: 0.6 },
  polyester: { roughness: 0.82, metalness: 0, bump: 0.6 },
  canvas: { roughness: 0.94, metalness: 0, bump: 1.1 },
  leather: { roughness: 0.48, metalness: 0, bump: 1 },
  hardshell: { roughness: 0.3, metalness: 0.05, bump: 0.15 },
  // Without an environment map, strong metalness renders almost black: brushed sheen instead.
  aluminum: { roughness: 0.38, metalness: 0.3, bump: 0.25 },
  lining: { roughness: 0.9, metalness: 0, bump: 0.3 },
  mesh: { roughness: 0.85, metalness: 0, bump: 1.4 },
  webbing: { roughness: 0.88, metalness: 0, bump: 1 },
  zipper: { roughness: 0.45, metalness: 0.35, bump: 1.2 },
  binding: { roughness: 0.7, metalness: 0, bump: 0.5 },
  rubber: { roughness: 0.92, metalness: 0, bump: 0.4 },
  metal: { roughness: 0.3, metalness: 0.45, bump: 0 },
};

function texture(kit: ModelKit, surface: Surface) {
  return kit.cached(`tex|${surface}`, () => {
    const data = new Uint8Array(size * size * 4);
    const pattern = patterns[surface];
    for (let y = 0; y < size; y++)
      for (let x = 0; x < size; x++) {
        const v = Math.round(Math.max(0, Math.min(1, pattern(x, y))) * 255);
        const i = (y * size + x) * 4;
        data[i] = data[i + 1] = data[i + 2] = v;
        data[i + 3] = 255;
      }
    const t = new DataTexture(data, size, size, RGBAFormat, UnsignedByteType);
    t.wrapS = t.wrapT = RepeatWrapping;
    t.magFilter = LinearFilter;
    t.minFilter = LinearMipmapLinearFilter;
    t.generateMipmaps = true;
    t.colorSpace = SRGBColorSpace;
    t.needsUpdate = true;
    return t;
  });
}

/** A textured material for one surface in one color, shared across the scene. */
export function surfaceMaterial(kit: ModelKit, surface: Surface, color: string) {
  return kit.cached(`mat|${surface}|${color}`, () => {
    const f = finish[surface];
    const map = surface === "metal" ? null : texture(kit, surface);
    return new MeshStandardMaterial({
      color,
      roughness: f.roughness,
      metalness: f.metalness,
      map,
      bumpMap: f.bump ? map : null,
      bumpScale: f.bump,
    });
  });
}

/** Lighten (amount > 0) or darken (amount < 0) a hex color, keeping its hue. */
export function shade(hex: string, amount: number) {
  const c = new Color(hex);
  const target = amount > 0 ? new Color("#ffffff") : new Color("#000000");
  return `#${c.lerp(target, Math.min(1, Math.abs(amount))).getHexString()}`;
}

export function mix(a: string, b: string, t: number) {
  return `#${new Color(a).lerp(new Color(b), t).getHexString()}`;
}

/** Perceived lightness in [0, 1]. */
export function lightness(hex: string) {
  const c = new Color(hex);
  return 0.299 * c.r + 0.587 * c.g + 0.114 * c.b;
}
