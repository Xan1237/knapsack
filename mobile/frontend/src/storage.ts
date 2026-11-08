import { Directory, File, Paths } from "expo-file-system";
import { ImageManipulator, SaveFormat } from "expo-image-manipulator";
import { Platform } from "react-native";
import { uid } from "./domain";
import type { InventoryState } from "./state";

const sessionFile = () => new File(Paths.document, "knapsack-session.json");
const photosDir = () => new Directory(Paths.document, "photos");
const maxPhotoBytes = 6 * 1024 * 1024;
const maxPhotoEdge = 1600;

/** iOS changes the app container path across updates, so stored file URIs are re-resolved. */
function localPhotoUri(url: string) {
  if (!url.startsWith("file:")) return url;
  return new File(photosDir(), url.split("/").pop() as string).uri;
}

export async function saveSession(state: InventoryState) {
  if (Platform.OS === "web") return;
  const file = sessionFile();
  if (!file.exists) file.create();
  file.write(JSON.stringify({ version: 1, ...state }));
}

export async function loadSession(): Promise<InventoryState | null> {
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
  return {
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
  };
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

export function clearPhotos() {
  if (Platform.OS === "web") return;
  const dir = photosDir();
  if (dir.exists) dir.delete();
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
