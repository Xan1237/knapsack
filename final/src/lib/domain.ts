import { z } from "zod";

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
/** All geometry uses mm. Solver axes X width, Y length, Z up. */
export type Vec3 = [number, number, number];
export const permutations = [
  [0, 1, 2],
  [1, 0, 2],
  [0, 2, 1],
  [2, 0, 1],
  [1, 2, 0],
  [2, 1, 0],
] as const;
export const dimensionsSchema = z.tuple([
  z.number().finite().min(5).max(2000),
  z.number().finite().min(5).max(2000),
  z.number().finite().min(5).max(2000),
]);
export const proposalSchema = z.object({
  key: z.string().min(1).max(80),
  label: z.string().min(1).max(60),
  category: z.enum(categories),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  appearance: z.string().max(240),
  dimensions: dimensionsSchema,
});
export const analysisSchema = z.object({
  items: z.array(proposalSchema).max(30),
});
export type Proposal = z.infer<typeof proposalSchema>;
export const itemSchema = proposalSchema.extend({
  id: z.string(),
  sourceIds: z.array(z.string()),
  estimate: dimensionsSchema,
  scale: z.tuple([
    z.number().min(0.1).max(5),
    z.number().min(0.1).max(5),
    z.number().min(0.1).max(5),
  ]),
  included: z.boolean(),
  orientations: z.array(z.number().int().min(0).max(5)).min(1),
  edited: z.boolean(),
  proposalId: z.string().optional(),
  required: z.boolean().optional(),
  priority: z.number().int().min(1).max(5).optional(),
  modelUrl: z.string().max(2048).regex(/^(https?:\/\/|\/(?!\/))/).optional(),
});
export type Item = z.infer<typeof itemSchema>;
export type Photo = {
  id: string;
  name: string;
  url: string;
  status: "queued" | "analyzing" | "done" | "error";
  requestId: string;
  error?: string;
  accepted: boolean;
};
export const suitcaseSchema = z.object({
  id: z.string().min(1).max(100),
  name: z.string().min(1).max(100),
  subtitle: z.string().max(150),
  dimensions: dimensionsSchema,
  clearance: z.number().finite().min(0).max(50),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
  modelUrl: z.string().max(2048).regex(/^(https?:\/\/|\/(?!\/))/).optional(),
  modelDimensions: dimensionsSchema.optional(),
  modelOffset: z.tuple([z.number().finite(), z.number().finite(), z.number().finite()]).optional(),
});
export type Suitcase = z.infer<typeof suitcaseSchema>;
export const suitcases: Suitcase[] = [
  {
    id: "cabin",
    name: "The weekender",
    subtitle: "Cabin · 35 L",
    dimensions: [340, 500, 210],
    clearance: 3,
  },
  {
    id: "personal",
    name: "The light traveler",
    subtitle: "Personal · 18 L",
    dimensions: [280, 400, 160],
    clearance: 3,
  },
  {
    id: "checked",
    name: "The long escape",
    subtitle: "Checked · 69 L",
    dimensions: [430, 650, 250],
    clearance: 3,
  },
];
export const templates: Record<
  Category,
  { label: string; dimensions: Vec3; color: string }
> = {
  clothing: {
    label: "Folded shirt",
    dimensions: [220, 270, 45],
    color: "#b9c9a4",
  },
  shoes: { label: "Sneaker", dimensions: [110, 280, 105], color: "#e3cba7" },
  bottle: {
    label: "Travel bottle",
    dimensions: [65, 65, 160],
    color: "#9db5c7",
  },
  pouch: {
    label: "Toiletry pouch",
    dimensions: [180, 110, 85],
    color: "#d9a180",
  },
  camera: { label: "Little film camera", dimensions: [140, 110, 90], color: "#4d6056" },
  headphones: { label: "Over-ear headphones", dimensions: [180, 160, 80], color: "#b3a0b5" },
  book: { label: "A good paperback", dimensions: [140, 210, 30], color: "#d3a250" },
  other: {
    label: "Travel essential",
    dimensions: [120, 90, 40],
    color: "#b8abc5",
  },
};
export function createItem(category: Category, id = crypto.randomUUID()): Item {
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
export function sizeOf(item: Item): Vec3 {
  return item.estimate.map(
    (n, i) => Math.round(n * item.scale[i] * 100) / 100,
  ) as Vec3;
}
export type Placement = {
  id: string;
  position: Vec3;
  dimensions: Vec3;
  orientation: number;
  order: number;
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
export function revisionOf(items: Item[], bag: Suitcase): string {
  return JSON.stringify([
    bag.id,
    bag.dimensions,
    bag.clearance,
    items.map((i) => [i.id, i.included, sizeOf(i), i.orientations, !!i.required, i.priority ?? 3]),
  ]);
}
export function planIsCurrent(plan: Plan, items: Item[], bag: Suitcase) {
  return plan.revision === revisionOf(items, bag);
}
export function demoItems(): Item[] {
  const specs: [Category, string, Vec3, string][] = [
    ["clothing", "Sage linen shirt", [235, 270, 48], "#adbd98"],
    ["clothing", "Cream knit", [235, 270, 65], "#e7d8bd"],
    ["clothing", "Everyday denim", [240, 280, 55], "#729098"],
    ["clothing", "Terracotta tee", [210, 240, 40], "#c98f75"],
    ["shoes", "Left sneaker", [105, 275, 100], "#e5d9c6"],
    ["shoes", "Right sneaker", [105, 275, 100], "#e5d9c6"],
    ["pouch", "Wash bag", [190, 110, 85], "#bf8969"],
    ["bottle", "Daily sunscreen", [60, 60, 145], "#cfbd87"],
    ["other", "Paperback", [125, 190, 25], "#887f9f"],
  ];
  return specs.map(([category, label, dimensions, color], i) => ({
    ...createItem(category, `demo-${i}`),
    label,
    dimensions,
    estimate: dimensions,
    color,
  }));
}
