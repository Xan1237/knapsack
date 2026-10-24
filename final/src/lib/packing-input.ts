import { z } from "zod";
import { itemSchema, suitcaseSchema } from "./domain";

export const packingInputSchema = z.object({
  items: z.array(itemSchema).max(80),
  bag: suitcaseSchema,
  preference: z.string().max(1500).optional(),
});

export function parsePackingInput(raw: unknown) {
  const data = packingInputSchema.parse(raw);
  if (new Set(data.items.map((i) => i.id)).size !== data.items.length)
    throw new Error("Duplicate item IDs.");
  if (data.items.some((i) => i.required && !i.included))
    throw new Error("Essential items must stay included.");
  if (data.bag.dimensions.some((n) => n <= data.bag.clearance * 2))
    throw new Error("Bag clearance leaves no usable space.");
  return data;
}
