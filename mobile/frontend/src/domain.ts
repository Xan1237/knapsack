/** All geometry uses mm. Solver axes X width, Y length, Z up. */
export const categories = [
  "clothing",
  "shoes",
  "bottle",
  "pouch",
  "camera",
  "headphones",
  "book",
  "other",
] as const;
export type Category = (typeof categories)[number];
export type Vec3 = [number, number, number];
export const permutations = [
  [0, 1, 2],
  [1, 0, 2],
  [0, 2, 1],
  [2, 0, 1],
  [1, 2, 0],
  [2, 1, 0],
] as const;

export type ItemMesh = {
  version: 1;
  vertices: { x: number; y: number; z: number }[];
  triangles: { a: number; b: number; c: number; material: number }[];
  materials: { color: string }[];
};
export type Proposal = {
  key: string;
  label: string;
  category: Category;
  color: string;
  appearance: string;
  dimensions: Vec3;
  mesh?: ItemMesh;
  meshModel?: string;
};
export type ItemAnchor = {
  position: Vec3;
  orientation: number;
  compartment?: "base" | "lid";
};
export type Item = Proposal & {
  id: string;
  sourceIds: string[];
  estimate: Vec3;
  scale: Vec3;
  included: boolean;
  orientations: number[];
  edited: boolean;
  demo?: boolean;
  proposalId?: string;
  required?: boolean;
  priority?: number;
  compression?: number;
  anchor?: ItemAnchor;
  /** Coming on the trip, but deliberately left beside the case instead of packed. */
  aside?: boolean;
  modelUrl?: string;
};
export type Photo = {
  id: string;
  name: string;
  /** A local file URI, a data URL from an imported web export, or empty for exports. */
  url: string;
  status: "queued" | "analyzing" | "done" | "error";
  requestId: string;
  error?: string;
  accepted: boolean;
};
export const bagKinds = ["suitcase", "backpack", "duffel", "tote", "other"] as const;
export type BagKind = (typeof bagKinds)[number];
export const bagKindNames: Record<BagKind, string> = {
  suitcase: "Suitcase",
  backpack: "Backpack",
  duffel: "Duffel",
  tote: "Tote",
  other: "Bag",
};
export const bagMaterials = ["nylon", "polyester", "canvas", "leather", "hardshell", "aluminum"] as const;
export type BagMaterial = (typeof bagMaterials)[number];
export const bagMaterialNames: Record<BagMaterial, string> = {
  nylon: "Nylon",
  polyester: "Polyester",
  canvas: "Canvas",
  leather: "Leather",
  hardshell: "Hard shell",
  aluminum: "Aluminium",
};
/** The silhouettes each kind of bag can take. The first is the default. */
export const bagShapes = {
  backpack: ["daypack", "travel", "rolltop"],
  suitcase: ["hard", "soft"],
  duffel: ["barrel", "boxy"],
  tote: ["tapered", "structured"],
  other: ["soft", "boxy"],
} as const satisfies Record<BagKind, readonly string[]>;
export type BagShape = (typeof bagShapes)[BagKind][number];
export const bagShapeNames: Record<BagShape, string> = {
  daypack: "Daypack",
  travel: "Travel pack",
  rolltop: "Roll-top",
  hard: "Hard-sided",
  soft: "Soft-sided",
  barrel: "Barrel",
  boxy: "Boxy",
  tapered: "Tapered",
  structured: "Structured",
};
/** How a bag looks, read from its photos or chosen by the traveler. Never affects packing. */
export type BagStyle = {
  shape: BagShape;
  material: BagMaterial;
  /** Zips, straps, handles and trim. */
  accent: string;
  frontPocket: boolean;
  sidePockets: boolean;
  wheels: boolean;
};
/** A sensible look for a kind of bag in a color, for bags without a reading. */
export function defaultBagStyle(kind: BagKind, color = "#4f5d57"): BagStyle {
  const shape = bagShapes[kind][0];
  const material: BagMaterial =
    kind === "suitcase" ? "hardshell" : kind === "tote" ? "canvas" : kind === "duffel" ? "polyester" : "nylon";
  return {
    shape,
    material,
    accent: color,
    frontPocket: kind === "backpack" || kind === "duffel",
    sidePockets: kind === "backpack",
    wheels: kind === "suitcase",
  };
}
/** A style whose shape belongs to this kind; repairs styles saved for another kind. */
export function bagStyleFor(kind: BagKind, style: BagStyle | undefined, color?: string): BagStyle {
  const base = style ?? defaultBagStyle(kind, color);
  const shapes = bagShapes[kind] as readonly string[];
  return shapes.includes(base.shape) ? base : { ...base, shape: bagShapes[kind][0] };
}

/** `dimensions` is always the usable packing space. Photographed bags add the rest. */
export type Suitcase = {
  id: string;
  name: string;
  subtitle: string;
  dimensions: Vec3;
  clearance: number;
  clamshell?: boolean;
  color?: string;
  modelUrl?: string;
  modelDimensions?: Vec3;
  modelOffset?: Vec3;
  kind?: BagKind;
  appearance?: string;
  /** Outside size, including wheels, handles and pockets. */
  exterior?: Vec3;
  mesh?: ItemMesh;
  meshModel?: string;
  /** How many photos Astra built it from; 0 for a bag measured by hand. */
  photoCount?: number;
  style?: BagStyle;
};
export const maxCustomBags = 8;
/** Ids of bags the traveler made, so they never collide with built-in or imported ones. */
export const customBagPrefix = "bag-";
export type Placement = {
  id: string;
  position: Vec3;
  dimensions: Vec3;
  orientation: number;
  order: number;
  compartment?: "base" | "lid";
  /** How much of its height a soft item gave up to fit (0 or absent: natural size). */
  squish?: number;
};
export type Plan = {
  revision: string;
  placements: Placement[];
  unplaced: { id: string; reason: string }[];
  outcome: "complete" | "partial" | "search-exhausted" | "constraint-conflict";
  conflicts: string[];
  attempts: number;
  exhausted: boolean;
};
export type PackingChoice = {
  removeIds: string[];
  includeIds: string[];
  placed: number;
  unplaced: number;
};
export type AstraAdvice = {
  summary: string;
  keepIds: string[];
  leaveIds: string[];
  revision: string;
  model: string;
  preview: { placed: number; unplaced: string[]; valid: boolean };
};

export const categoryNames: Record<Category, string> = {
  clothing: "Clothing",
  shoes: "Shoes",
  bottle: "Bottle",
  pouch: "Pouch",
  camera: "Camera",
  headphones: "Headphones",
  book: "Book",
  other: "Other",
};
export const suitcases: Suitcase[] = [
  {
    id: "cabin",
    name: "The weekender",
    subtitle: "Cabin · 35 L",
    dimensions: [340, 500, 210],
    clearance: 3,
    clamshell: true,
  },
  {
    id: "personal",
    name: "The light traveler",
    subtitle: "Personal · 18 L",
    dimensions: [280, 400, 160],
    clearance: 3,
    clamshell: true,
  },
  {
    id: "checked",
    name: "The long escape",
    subtitle: "Checked · 69 L",
    dimensions: [430, 650, 250],
    clearance: 3,
    clamshell: true,
  },
];
const templates: Record<Category, { label: string; dimensions: Vec3; color: string }> = {
  clothing: { label: "Folded shirt", dimensions: [220, 270, 45], color: "#b9c9a4" },
  shoes: { label: "Sneaker", dimensions: [110, 280, 70], color: "#e3cba7" },
  bottle: { label: "Travel bottle", dimensions: [50, 50, 70], color: "#9db5c7" },
  pouch: { label: "Toiletry pouch", dimensions: [180, 110, 70], color: "#d9a180" },
  camera: { label: "Little film camera", dimensions: [140, 110, 70], color: "#4d6056" },
  headphones: { label: "Over-ear headphones", dimensions: [180, 160, 70], color: "#b3a0b5" },
  book: { label: "A good paperback", dimensions: [140, 210, 30], color: "#d3a250" },
  other: { label: "Travel essential", dimensions: [120, 90, 40], color: "#b8abc5" },
};
/** Folded, full-size travel belongings for the weekender's two 105 mm-deep halves. */
// Every item fits each suitcase on its own, including the small bag's 74 mm halves, and the
// whole set packs into the Weekender and the Big trip.
const travelDemoSpecs: [Category, string, Vec3, string][] = [
  ["clothing", "Sage linen shirt", [256, 300, 48], "#adbd98"],
  ["clothing", "Cream knit", [334, 211, 70], "#e7d8bd"],
  ["clothing", "Jeans & chinos", [256, 191, 70], "#729098"],
  ["clothing", "Terracotta tee", [256, 300, 48], "#c98f75"],
  ["shoes", "Left sneaker", [110, 280, 70], "#e5d9c6"],
  ["shoes", "Right sneaker", [110, 280, 70], "#e5d9c6"],
  ["pouch", "Socks & underwear cube", [108, 280, 70], "#a7b5a1"],
  ["pouch", "Wash bag", [75, 271, 70], "#bf8969"],
  ["other", "Power bank", [75, 180, 21], "#887f9f"],
];
// The knit turns flat to fit the small bag's width; the rest keep the Weekender's tuned layout.
const demoOrientations: Record<number, number[]> = { 1: [0, 1] };
// The power bank sits on the Weekender's lid floor, leaving room above it for the reserved
// water bottle. Changing bags or auto-arranging clears this like any manual position.
const demoAnchors: Record<number, ItemAnchor> = {
  8: { position: [262, 277, 3], orientation: 0, compartment: "lid" },
};

export function uid() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}
export function createItem(category: Category, id = uid()): Item {
  const t = templates[category];
  return {
    id,
    key: id,
    label: t.label,
    category,
    color: t.color,
    appearance: t.label,
    dimensions: [...t.dimensions],
    estimate: [...t.dimensions],
    scale: [1, 1, 1],
    sourceIds: [],
    included: true,
    orientations: category === "bottle" ? [0, 1] : [0, 1, 2, 3, 4, 5],
    edited: false,
    required: false,
    priority: 3,
  };
}
export function demoItems(): Item[] {
  return travelDemoSpecs.map(([category, label, dimensions, color], i) => ({
    ...createItem(category, `demo-${i}`),
    demo: true,
    orientations: demoOrientations[i] ?? [0],
    ...(demoAnchors[i] ? { anchor: demoAnchors[i] } : {}),
    label,
    dimensions: [...dimensions],
    estimate: [...dimensions],
    color,
  }));
}
/**
 * How each kind of belonging behaves: density (kg per litre of its envelope), how far its
 * height can squeeze when packed, and how springy it is when it lands (0 dead, 1 bouncy).
 * Squeeze limits mirror the server's SOFTNESS table, which decides real fits.
 */
export const softness: Record<Category, { density: number; squish: number; bounce: number }> = {
  clothing: { density: 0.25, squish: 0.4, bounce: 0.05 },
  pouch: { density: 0.45, squish: 0.25, bounce: 0.15 },
  shoes: { density: 0.35, squish: 0.1, bounce: 0.3 },
  headphones: { density: 0.3, squish: 0.05, bounce: 0.35 },
  bottle: { density: 1, squish: 0, bounce: 0.25 },
  camera: { density: 0.8, squish: 0, bounce: 0.2 },
  book: { density: 0.75, squish: 0, bounce: 0.1 },
  other: { density: 0.5, squish: 0, bounce: 0.2 },
};
/** Estimated kilograms. */
export function weightOf(item: Item) {
  const d = sizeOf(item);
  return (softness[item.category].density * d[0] * d[1] * d[2]) / 1e6;
}
/** An item's size as packed: its own height shrinks by the placement's squeeze. */
export function packedSize(item: Item, squish = 0): Vec3 {
  const d = sizeOf(item);
  return squish ? [d[0], d[1], Math.floor(d[2] * (1 - squish) * 100 + 0.5) / 100] : d;
}

export function sizeOf(item: Item): Vec3 {
  const compression = item.category === "clothing" ? (item.compression ?? 0) : 0;
  return item.estimate.map(
    (n, i) => Math.round(n * item.scale[i] * (i === 2 ? 1 - compression : 1) * 100) / 100,
  ) as Vec3;
}
/** Millimetres as a short whole-centimetre label, such as "26 × 30 × 5 cm". */
export function formatSize(size: Vec3): string {
  return `${size.map((n) => Math.max(1, Math.round(n / 10))).join(" × ")} cm`;
}
/** Keep generated topology out of packing and advice request payloads. */
export function packingItems(items: Item[]): Item[] {
  return items.map(packingItem);
}
/**
 * Items set aside stay out of the search, like ones left at home. An essential set aside is
 * sent as non-essential too, since the server requires essentials to be packed; the pin
 * itself stays on the item.
 */
export function packingItem<T extends Item>(item: T): T {
  if (!item.aside) return { ...item, mesh: undefined };
  return { ...item, mesh: undefined, included: false, required: false, aside: undefined };
}
/** Litres of packing space, for labels such as "Backpack · 24 L". */
export function bagLitres(dimensions: Vec3) {
  return Math.max(1, Math.round(dimensions.reduce((v, n) => v * n, 1) / 1e6));
}
export function bagSubtitle(kind: BagKind, dimensions: Vec3) {
  return `${bagKindNames[kind]} · ${bagLitres(dimensions)} L`;
}
/** Packing needs only the space; the 3D model stays on the phone. */
export function packingBag(bag: Suitcase): Suitcase {
  return bag.mesh ? { ...bag, mesh: undefined } : bag;
}
/**
 * Whether a bag has room to pack in after its clearance. A clamshell splits its depth into two
 * halves, so each half has to clear it too. Mirrors the server's PackingInput check.
 */
export function bagUsable(bag: Pick<Suitcase, "dimensions" | "clearance" | "clamshell">) {
  return (
    bag.dimensions.every((n) => Number.isFinite(n) && n > bag.clearance * 2) &&
    (!bag.clamshell || bag.dimensions[2] / 2 > bag.clearance * 2)
  );
}

export function revisionOf(items: Item[], bag: Suitcase): string {
  return JSON.stringify([
    bag.id,
    bag.dimensions,
    bag.clearance,
    !!bag.clamshell,
    items.map((i) => [
      i.id,
      i.included,
      !!i.aside,
      sizeOf(i),
      i.orientations,
      !!i.required,
      i.priority ?? 3,
      i.anchor ?? null,
    ]),
  ]);
}

/**
 * Whether a drop point (open-case Three coordinates, 1 unit = 10 cm) lands clear of the case's
 * footprint. `half` is the dragged item's half size on the floor (x, z): it only counts as taken
 * out once it is essentially clear of the walls, so pushing something hard against a side or
 * into a corner packs it flush there instead of setting it aside.
 */
export function outsideCase(bag: Suitcase, point: Vec3, half: [number, number] = [0, 0]): boolean {
  const halfWidth = bag.dimensions[0] / (bag.clamshell ? 100 : 200);
  const halfLength = bag.dimensions[1] / 200;
  const margin = 0.3;
  return Math.abs(point[0]) > halfWidth + half[0] * 0.8 + margin || Math.abs(point[2]) > halfLength + half[1] * 0.8 + margin;
}

/**
 * Where a dropped item comes to rest at (x, y) under gravity: on top of whatever is beneath its
 * footprint, or down a gap to the floor. Mirrors the server's drop settling. `fits` is false
 * when it would stick out past the lid at its natural size.
 */
export function restingHeight(
  x: number,
  y: number,
  dims: Vec3,
  others: Placement[],
  bag: Suitcase,
  cavityHeight: number,
): { z: number; fits: boolean } {
  const gap = bag.clearance;
  let z = gap;
  for (const p of others) {
    const overlaps =
      p.position[0] < x + dims[0] + gap &&
      x < p.position[0] + p.dimensions[0] + gap &&
      p.position[1] < y + dims[1] + gap &&
      y < p.position[1] + p.dimensions[1] + gap;
    if (overlaps) z = Math.max(z, p.position[2] + p.dimensions[2] + gap);
  }
  return { z, fits: z + dims[2] <= cavityHeight - gap + 1e-6 };
}

/** A touch drop in the open case's Three coordinates, before scene translation. */
export function anchorAtPoint(
  item: Item,
  bag: Suitcase,
  point: Vec3,
  orientation: number,
  /** Everything else packed now: the drop rests on it. Without it the drop goes to the floor. */
  placed: Placement[] = [],
): ItemAnchor | null {
  if (
    !point.every(Number.isFinite) ||
    !item.orientations.includes(orientation) ||
    !permutations[orientation]
  )
    return null;
  const size = sizeOf(item);
  const dimensions = permutations[orientation].map((axis) => size[axis]);
  const cavity = [
    bag.dimensions[0],
    bag.dimensions[1],
    bag.dimensions[2] / (bag.clamshell ? 2 : 1),
  ];
  if (dimensions.some((n, k) => n + bag.clearance * 2 > cavity[k])) return null;
  const compartment = bag.clamshell ? (point[0] < 0 ? "lid" : "base") : undefined;
  const others = placed.filter((p) => p.id !== item.id && p.compartment === compartment);
  const centerX = bag.clamshell
    ? ((compartment === "base" ? 1 : -1) * bag.dimensions[0]) / 200
    : 0;
  const desired = [
    (point[0] - centerX) * 100 + cavity[0] / 2 - dimensions[0] / 2,
    point[2] * 100 + cavity[1] / 2 - dimensions[1] / 2,
    bag.clearance,
  ];
  const position = desired.map((n, k) =>
    Math.max(
      bag.clearance,
      Math.min(cavity[k] - bag.clearance - dimensions[k], Math.round(n * 100) / 100),
    ),
  ) as Vec3;
  // Gravity: it falls onto what's beneath it. A soft item may still squeeze in on the server,
  // so only a rigid one that can't clear the lid is refused here.
  const rest = restingHeight(position[0], position[1], dimensions as Vec3, others, bag, cavity[2]);
  if (!rest.fits && softness[item.category].squish === 0) return null;
  position[2] = Math.round(rest.z * 100) / 100;
  return { position, orientation, ...(compartment ? { compartment } : {}) };
}
