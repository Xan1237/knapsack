import { z } from "zod";
import {
  categories,
  createItem,
  itemSchema,
  permutations,
  suitcaseSchema,
  suitcases,
  type Item,
  type Photo,
  type Suitcase,
  type Vec3,
} from "./domain";
import type { InventoryState } from "./state";

export const photoSchema = z.object({
  id: z.string(),
  name: z.string(),
  url: z
    .string()
    .regex(/^data:image\/(jpeg|png|webp);base64,/)
    .max(9_000_000),
  status: z.enum(["queued", "analyzing", "done", "error"]),
  requestId: z.string(),
  accepted: z.boolean(),
  error: z.string().optional(),
});
const rawSchema = z.object({
  items: z.array(z.record(z.string(), z.unknown())).max(80),
  bag: z.record(z.string(), z.unknown()).optional(),
  customBag: z.record(z.string(), z.unknown()).optional(),
  bagId: z.string().optional(),
  units: z.string().optional(),
  upAxis: z.string().optional(),
  photos: z.array(photoSchema).max(12).optional(),
});
const axisSwap = [0, 2, 1];
const cmToNative = (value: unknown): Vec3 => {
  const d = z
    .tuple([z.number().finite(), z.number().finite(), z.number().finite()])
    .parse(value);
  return [d[0] * 10, d[2] * 10, d[1] * 10];
};

export function importCollection(input: unknown): InventoryState {
  const raw = rawSchema.parse(input);
  const stepTwo = !!raw.bag && raw.units !== "mm";
  if (raw.units === "mm" && raw.upAxis && raw.upAxis !== "z")
    throw new Error("Millimeter collections must declare upAxis z.");
  let customBag: Suitcase | undefined;
  const supplied = raw.bag || raw.customBag;
  let bagId = raw.bagId || "cabin";
  if (supplied) {
    const id = String(supplied.id || "collection");
    customBag = suitcaseSchema.parse({
      ...supplied,
      id: id.startsWith("import-") ? id : `import-${id}`,
      name: supplied.name || "Your bag",
      subtitle: "Imported collection",
      dimensions: stepTwo
        ? cmToNative(supplied.dimensions)
        : supplied.dimensions,
      clearance: stepTwo
        ? Number(supplied.clearance || 0) * 10
        : (supplied.clearance ?? 3),
      modelDimensions:
        supplied.modelDimensions &&
        (stepTwo
          ? cmToNative(supplied.modelDimensions)
          : supplied.modelDimensions),
      modelOffset:
        supplied.modelOffset &&
        (stepTwo ? cmToNative(supplied.modelOffset) : supplied.modelOffset),
    });
    if (customBag.dimensions.some((n) => n <= customBag!.clearance * 2))
      throw new Error("Bag clearance leaves no usable interior.");
    bagId = customBag.id;
  } else if (!suitcases.some((b) => b.id === bagId))
    throw new Error("Choose a known suitcase or supply its dimensions.");
  const seen = new Set<string>();
  const items: Item[] = raw.items.map((source, index) => {
    const id = String(source.id ?? `collection-${index + 1}`);
    if (!id || seen.has(id)) throw new Error("Every item needs a unique ID.");
    seen.add(id);
    const category = categories.includes(source.category as Item["category"])
      ? (source.category as Item["category"])
      : "other";
    const estimate = stepTwo
      ? cmToNative(source.dimensions)
      : source.estimate || source.dimensions;
    let orientations = source.orientations;
    if (stepTwo) {
      const allowed =
        source.allowedPermutations ||
        (source.upright
          ? [
              [0, 1, 2],
              [2, 1, 0],
            ]
          : [
              [0, 1, 2],
              [2, 1, 0],
              [0, 2, 1],
              [1, 2, 0],
              [1, 0, 2],
              [2, 0, 1],
            ]);
      const parsed = z
        .array(
          z.tuple([
            z.number().int().min(0).max(2),
            z.number().int().min(0).max(2),
            z.number().int().min(0).max(2),
          ]),
        )
        .min(1)
        .max(6)
        .parse(allowed);
      orientations = parsed.map((p) => {
        if (new Set(p).size !== 3) throw new Error("Invalid item rotation.");
        const native = axisSwap.map((i) => axisSwap[p[i]]);
        return permutations.findIndex((p) =>
          p.every((n, i) => n === native[i]),
        );
      });
    }
    return itemSchema.parse({
      ...createItem(category, id),
      ...source,
      id,
      key: String(source.key || id),
      label: source.label || source.name || `Item ${index + 1}`,
      category,
      dimensions: estimate,
      estimate,
      scale: stepTwo ? [1, 1, 1] : source.scale || [1, 1, 1],
      orientations: orientations || [0, 1, 2, 3, 4, 5],
      sourceIds: source.sourceIds || source.sourcePhotoIds || [],
      required: !!source.required,
      included: !!source.required || source.included !== false,
      priority: source.priority ?? 3,
    });
  });
  const photos: Photo[] = (raw.photos || []).map((p) =>
    ["queued", "analyzing"].includes(p.status)
      ? {
          ...p,
          status: "error" as const,
          error: "Imported analysis was interrupted. Retry when ready.",
        }
      : p,
  );
  return { items, photos, bagId, customBag, dismissed: [], demo: false };
}

export function bagForState(state: InventoryState) {
  return state.customBag?.id === state.bagId
    ? state.customBag
    : suitcases.find((b) => b.id === state.bagId) || suitcases[0];
}
