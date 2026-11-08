import { Directory, File, Paths } from "expo-file-system";
import { ImageManipulator, SaveFormat } from "expo-image-manipulator";
import { Platform } from "react-native";
import { uid } from "./domain";
import type { InventoryState } from "./state";

const sessionFile = () => new File(Paths.document, "knapsack-session.json");
const photosDir = () => new Directory(Paths.document, "photos");
// Which file on this phone belongs to which photo id, across every trip. The account keeps
// photo records without files, so switching trips reattaches photos from here.
const photoIndexFile = () => new File(Paths.document, "knapsack-photo-files.json");
let photoIndex: Record<string, string> | null = null;
const maxPhotoBytes = 6 * 1024 * 1024;
const maxPhotoEdge = 1600;

/** iOS changes the app container path across updates, so stored file URIs are re-resolved. */
function localPhotoUri(url: string) {
  if (!url.startsWith("file:")) return url;
  return new File(photosDir(), url.split("/").pop() as string).uri;
}

/** Which account and trip the saved copy belongs to, and when it last changed (ms since epoch). */
export type SessionMeta = { userId?: string; tripId?: string; updatedAt?: number };

export async function saveSession(state: InventoryState, meta: SessionMeta = {}) {
  if (Platform.OS === "web") return;
  const file = sessionFile();
  if (!file.exists) file.create();
  file.write(JSON.stringify({ version: 1, ...state, meta }));
  await rememberPhotos(state.photos);
}

async function readPhotoIndex() {
  if (photoIndex) return photoIndex;
  const file = photoIndexFile();
  try {
    photoIndex = file.exists ? JSON.parse(await file.text()) : {};
  } catch {
    photoIndex = {};
  }
  return photoIndex as Record<string, string>;
}

function writePhotoIndex() {
  const file = photoIndexFile();
  if (!file.exists) file.create();
  file.write(JSON.stringify(photoIndex ?? {}));
}

/** Note the files behind these photos so any trip can find them again. */
export async function rememberPhotos(photos: InventoryState["photos"]) {
  if (Platform.OS === "web") return;
  const index = await readPhotoIndex();
  let changed = false;
  for (const p of photos) {
    if (!p.url.startsWith("file:")) continue;
    const name = p.url.split("/").pop() as string;
    if (index[p.id] !== name) {
      index[p.id] = name;
      changed = true;
    }
  }
  if (changed) writePhotoIndex();
}

/** File URIs on this phone for the given photo ids, where they exist. */
export async function photoUris(ids: string[]) {
  const found = new Map<string, string>();
  if (Platform.OS === "web") return found;
  const index = await readPhotoIndex();
  for (const id of ids) {
    if (!index[id]) continue;
    const file = new File(photosDir(), index[id]);
    if (file.exists) found.set(id, file.uri);
  }
  return found;
}

/** Delete the files behind these photos (a cleared or deleted trip). */
export async function forgetPhotos(ids: string[]) {
  if (Platform.OS === "web" || !ids.length) return;
  const index = await readPhotoIndex();
  for (const id of ids) {
    const name = index[id];
    if (!name) continue;
    const file = new File(photosDir(), name);
    if (file.exists) file.delete();
    delete index[id];
  }
  writePhotoIndex();
}

export function clearSession() {
  if (Platform.OS === "web") return;
  const file = sessionFile();
  if (file.exists) file.delete();
}

export async function loadSession(): Promise<{ state: InventoryState; meta: SessionMeta } | null> {
  if (Platform.OS === "web") return null;
  const file = sessionFile();
  if (!file.exists) return null;
  const data = JSON.parse(await file.text());
  if (
    data.version !== 1 ||
    !Array.isArray(data.items) ||
    !Array.isArray(data.photos) ||
    !Array.isArray(data.dismissed) ||
    typeof data.bagId !== "string"
  )
    throw new Error("Invalid saved inventory");
  const meta: SessionMeta = data.meta && typeof data.meta === "object" ? data.meta : {};
  return { meta, state: {
    items: data.items,
    bagId: data.bagId,
    dismissed: data.dismissed,
    demo: !!data.demo,
    customBag: data.customBag,
    photos: data.photos.map((p: InventoryState["photos"][number]) => ({
      ...p,
      url: localPhotoUri(p.url),
      ...(p.status === "queued" || p.status === "analyzing"
        ? { status: "error", error: "Analysis interrupted when the app closed. Retry when ready." }
        : {}),
    })),
  } };
}

/**
 * Normalize any picked image (including iPhone HEIC) to a bounded JPEG the backend accepts,
 * then keep it in the app's documents so the source photo survives cache cleanup.
 */
export async function storePhoto(source: { uri: string; width: number; height: number }) {
  const context = ImageManipulator.manipulate(source.uri);
  if (Math.max(source.width, source.height) > maxPhotoEdge)
    context.resize(
      source.width >= source.height ? { width: maxPhotoEdge } : { height: maxPhotoEdge },
    );
  const image = await context.renderAsync();
  const saved = await image.saveAsync({ format: SaveFormat.JPEG, compress: 0.8 });
  if (Platform.OS === "web") return saved.uri;
  const dir = photosDir();
  if (!dir.exists) dir.create({ intermediates: true });
  const target = new File(dir, `${uid()}.jpg`);
  new File(saved.uri).copy(target);
  if (target.size > maxPhotoBytes) {
    target.delete();
    throw new Error("That photo is larger than 6 MB.");
  }
  return target.uri;
}

/** Every photo file on this phone, for every trip (signing out). */
export function clearPhotos() {
  if (Platform.OS === "web") return;
  const dir = photosDir();
  if (dir.exists) dir.delete();
  const index = photoIndexFile();
  if (index.exists) index.delete();
  photoIndex = {};
}

/** Hand back a shareable temporary copy of an exported plan. */
export function writeExport(contents: string) {
  const file = new File(Paths.cache, "knapsack-plan.json");
  if (file.exists) file.delete();
  file.create();
  file.write(contents);
  return file.uri;
}

export function readText(uri: string) {
  return new File(uri).text();
}
