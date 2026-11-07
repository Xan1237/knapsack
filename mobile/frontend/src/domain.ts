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
};
export type Placement = {
  id: string;
  position: Vec3;
  dimensions: Vec3;
  orientation: number;
  order: number;
  compartment?: "base" | "lid";
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
  shoes: { label: "Sneaker", dimensions: [110, 280, 105], color: "#e3cba7" },
  bottle: { label: "Travel bottle", dimensions: [65, 65, 160], color: "#9db5c7" },
  pouch: { label: "Toiletry pouch", dimensions: [180, 110, 85], color: "#d9a180" },
  camera: { label: "Little film camera", dimensions: [140, 110, 90], color: "#4d6056" },
  headphones: { label: "Over-ear headphones", dimensions: [180, 160, 80], color: "#b3a0b5" },
  book: { label: "A good paperback", dimensions: [140, 210, 30], color: "#d3a250" },
  other: { label: "Travel essential", dimensions: [120, 90, 40], color: "#b8abc5" },
};
/** Folded, full-size travel belongings for the weekender's two 105 mm-deep halves. */
const travelDemoSpecs: [Category, string, Vec3, string][] = [
  ["clothing", "Sage linen shirt", [256, 300, 48], "#adbd98"],
  ["clothing", "Cream knit", [334, 211, 99], "#e7d8bd"],
  ["clothing", "Jeans & chinos", [256, 191, 99], "#729098"],
  ["clothing", "Terracotta tee", [256, 300, 48], "#c98f75"],
  ["shoes", "Left sneaker", [110, 280, 99], "#e5d9c6"],
  ["shoes", "Right sneaker", [110, 280, 99], "#e5d9c6"],
  ["pouch", "Socks & underwear cube", [108, 280, 99], "#a7b5a1"],
  ["pouch", "Wash bag", [75, 271, 99], "#bf8969"],
  ["other", "Power bank", [75, 180, 21], "#887f9f"],
];

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
    orientations: [0],
    label,
    dimensions: [...dimensions],
    estimate: [...dimensions],
    color,
  }));
}
export function sizeOf(item: Item): Vec3 {
  const compression = item.category === "clothing" ? (item.compression ?? 0) : 0;
  return item.estimate.map(
    (n, i) => Math.round(n * item.scale[i] * (i === 2 ? 1 - compression : 1) * 100) / 100,
  ) as Vec3;
}
/** Keep generated topology out of packing and advice request payloads. */
export function packingItems(items: Item[]): Item[] {
  return items.map((item) => ({ ...item, mesh: undefined }));
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
      sizeOf(i),
      i.orientations,
      !!i.required,
      i.priority ?? 3,
      i.anchor ?? null,
    ]),
  ]);
}

/** A touch drop in the open case's Three coordinates, before scene translation. */
export function anchorAtPoint(
  item: Item,
  bag: Suitcase,
  point: Vec3,
  orientation: number,
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
  return { position, orientation, ...(compartment ? { compartment } : {}) };
}
