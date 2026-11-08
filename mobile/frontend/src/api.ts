import Constants from "expo-constants";
import type {
  AstraAdvice,
  Item,
  PackingChoice,
  Photo,
  Placement,
  Plan,
  Proposal,
  Suitcase,
} from "./domain";
import { packingItem, packingItems } from "./domain";
import type { InventoryState } from "./state";
import { accessToken } from "./supabase";

/**
 * Expo Go loads the bundle from the computer running Metro, so by default the Python
 * backend is the same host on port 8000. EXPO_PUBLIC_API_URL overrides this (tunnels, deploys).
 */
function resolveApiBase() {
  const configured = process.env.EXPO_PUBLIC_API_URL;
  if (configured) return configured.replace(/\/+$/, "");
  const host = Constants.expoConfig?.hostUri?.split(":")[0];
  return `http://${host || "localhost"}:8000`;
}
export const apiBase = resolveApiBase();

export class AbortedError extends Error {}

/**
 * XMLHttpRequest instead of fetch: iOS otherwise fails requests with no response bytes after
 * 60 seconds, and mesh generation legitimately takes minutes. xhr.timeout overrides that.
 */
function send<T>(
  path: string,
  body?: object | FormData,
  options: { timeoutMs?: number; signal?: AbortSignal } = {},
): Promise<T> {
  // The backend only serves signed-in users, so each request carries the Supabase session token.
  return accessToken().then((token) => new Promise<T>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open(body ? "POST" : "GET", `${apiBase}${path}`);
    if (token) xhr.setRequestHeader("Authorization", `Bearer ${token}`);
    xhr.timeout = options.timeoutMs ?? 30000;
    const isForm = typeof FormData !== "undefined" && body instanceof FormData;
    if (body && !isForm) xhr.setRequestHeader("Content-Type", "application/json");
    xhr.onload = () => {
      let data: unknown = null;
      try {
        data = JSON.parse(xhr.responseText);
      } catch {}
      if (xhr.status >= 200 && xhr.status < 300 && data) resolve(data as T);
      else {
        const message = (data as { error?: unknown } | null)?.error;
        reject(
          new Error(typeof message === "string" ? message : `The server replied ${xhr.status}.`),
        );
      }
    };
    xhr.onerror = () =>
      reject(
        new Error(
          `Can't reach the Knapsack server at ${apiBase}. Check it's running and your phone is on the same Wi-Fi.`,
        ),
      );
    xhr.ontimeout = () => reject(new Error("The server took too long to respond. Please retry."));
    xhr.onabort = () => reject(new AbortedError());
    if (options.signal?.aborted) return reject(new AbortedError());
    options.signal?.addEventListener("abort", () => xhr.abort());
    xhr.send(isForm ? (body as FormData) : body ? JSON.stringify(body) : null);
  }));
}

export function packPlan(
  items: Item[],
  bag: Suitcase,
  revision: string,
  demo: boolean,
  signal: AbortSignal,
) {
  return send<{ plan: Plan; reservedSpace: Placement | null }>(
    "/api/pack",
    { items: packingItems(items), bag, revision, demo },
    { signal },
  );
}

export function analyzePhoto(photo: Photo, signal: AbortSignal) {
  const form = new FormData();
  // React Native's FormData uploads local files from this { uri, name, type } shape.
  form.append("photo", { uri: photo.url, name: photo.name, type: "image/jpeg" } as unknown as Blob);
  return send<{ items: Proposal[] }>("/api/analyze", form, { timeoutMs: 170000, signal });
}

export function packingChoices(
  items: Item[],
  bag: Suitcase,
  wantedId: string,
  revision: string,
  signal: AbortSignal,
) {
  return send<{ revision: string; options: PackingChoice[] }>(
    "/api/packing/choices",
    { items: packingItems(items), bag, wantedId, revision },
    { timeoutMs: 60000, signal },
  );
}

export function askAstra(
  items: Item[],
  bag: Suitcase,
  preference: string,
  revision: string,
  signal: AbortSignal,
) {
  return send<AstraAdvice>(
    "/api/astra/suggest",
    { items: packingItems(items), bag, preference, revision },
    { timeoutMs: 90000, signal },
  );
}

export function astraStatus(signal: AbortSignal) {
  return send<{ configured: boolean; model: string }>("/api/astra/status", undefined, { signal });
}

export function exportPlan(state: InventoryState, bag: Suitcase) {
  return send<object>("/api/packing/export", {
    bag,
    // Items set aside are exported as not packed, matching the plan on screen.
    items: state.items.map((item) => (item.aside ? { ...packingItem(item), mesh: item.mesh } : item)),
    // Photos stay on the device; an export keeps their records so items stay linked.
    photos: state.photos.map((p) => ({ ...p, url: "" })),
  });
}

export function importCollection(raw: object) {
  return send<InventoryState & { customBag: Suitcase | null }>("/api/collection/import", raw, {
    timeoutMs: 60000,
  });
}

export type TripSummary = { id: string; name: string; updatedAt: number; itemCount: number };
export type RemoteTrip = { id: string; name: string; state: InventoryState; updatedAt: number };

// Trips go through the backend; the app can't reach the database itself.
export async function listTrips() {
  return (await send<{ trips: TripSummary[] }>("/api/trips")).trips;
}

export async function createTrip(name: string) {
  return (await send<{ trip: TripSummary }>("/api/trips", { name })).trip;
}

export async function loadTrip(id: string) {
  return (await send<{ trip: RemoteTrip }>(`/api/trips/${encodeURIComponent(id)}`)).trip;
}

/** Photo files stay on the phone, so only their records go to the account. */
export function saveTrip(id: string, state: InventoryState, updatedAt: number) {
  const synced: InventoryState = { ...state, photos: state.photos.map((p) => ({ ...p, url: "" })) };
  return send<{ ok: true }>(`/api/trips/${encodeURIComponent(id)}`, { state: synced, updatedAt });
}

export function renameTrip(id: string, name: string) {
  return send<{ ok: true }>(`/api/trips/${encodeURIComponent(id)}/rename`, { name });
}

/** Returns the deleted trip's photo ids, so the phone can remove those files. */
export function deleteTrip(id: string) {
  return send<{ photoIds: string[] }>(`/api/trips/${encodeURIComponent(id)}/delete`, {});
}
