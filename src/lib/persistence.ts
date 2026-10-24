import { openDB } from "idb";
import { z } from "zod";
import { itemSchema, suitcases } from "./domain";
import { type InventoryState } from "./state";

const persistedSchema = z.object({
  version: z.literal(1),
  items: z.array(itemSchema).max(80),
  photos: z
    .array(
      z.object({
        id: z.string(),
        name: z.string(),
        status: z.enum(["queued", "analyzing", "done", "error"]),
        requestId: z.string(),
        accepted: z.boolean(),
        error: z.string().optional(),
      }),
    )
    .max(12),
  bagId: z.enum(["cabin", "personal", "checked"]),
  dismissed: z.array(z.string()).max(10000),
  demo: z.boolean(),
});
const db = () =>
  openDB("knapsack-local", 1, {
    upgrade(db) {
      db.createObjectStore("session");
      db.createObjectStore("photos");
    },
  });
export async function saveSession(state: InventoryState) {
  const database = await db();
  const tx = database.transaction(["session", "photos"], "readwrite");
  const keys = await tx.objectStore("photos").getAllKeys();
  for (const key of keys)
    if (!state.photos.some((p) => p.id === key))
      await tx.objectStore("photos").delete(key);
  for (const photo of state.photos) {
    if (!keys.includes(photo.id)) {
      // Source data is stored separately from frequently changing inventory metadata.
      await tx.objectStore("photos").put(photo.url, photo.id);
    }
  }
  await tx.objectStore("session").put(
    {
      version: 1,
      ...state,
      photos: state.photos.map(({ url, ...p }) => {
        void url;
        return p;
      }),
    },
    "current",
  );
  await tx.done;
}
export async function loadSession(): Promise<InventoryState | null> {
  const database = await db(),
    raw = await database.get("session", "current");
  if (raw === undefined) return null;
  const data = persistedSchema.parse(raw);
  if (
    !suitcases.some((b) => b.id === data.bagId) ||
    new Set(data.items.map((i) => i.id)).size !== data.items.length
  )
    throw new Error("Invalid saved inventory");
  const photos = await Promise.all(
    data.photos.map(async (p) => {
      const url = await database.get("photos", p.id);
      if (
        typeof url !== "string" ||
        !/^data:image\/(jpeg|png|webp);base64,/.test(url) ||
        url.length > 9_000_000
      )
        throw new Error("Invalid saved photo");
      return {
        ...p,
        url,
        ...(["queued", "analyzing"].includes(p.status)
          ? {
              status: "error" as const,
              error: "Analysis interrupted by reload. Retry when ready.",
            }
          : {}),
      };
    }),
  );
  return {
    items: data.items,
    photos,
    bagId: data.bagId,
    dismissed: data.dismissed,
    demo: data.demo,
  };
}
