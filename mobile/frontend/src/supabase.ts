import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient } from "@supabase/supabase-js";
import { AppState, Platform } from "react-native";
import type { InventoryState } from "./state";

const url = process.env.EXPO_PUBLIC_SUPABASE_URL ?? "";
const key = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? "";

/** False when the app was started without its Supabase settings (see frontend/.env.example). */
export const supabaseConfigured = !!url && !!key;

export const supabase = createClient(url || "https://not-configured.supabase.co", key || "missing", {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

// Refresh the session only while the app is in the foreground, as Supabase recommends on mobile.
if (Platform.OS !== "web") {
  AppState.addEventListener("change", (state) => {
    if (state === "active") supabase.auth.startAutoRefresh();
    else supabase.auth.stopAutoRefresh();
  });
}

/** The signed-in user's access token, for the Python backend. */
export async function accessToken() {
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? null;
}

export type RemoteTrip = { state: InventoryState; updatedAt: number };

export async function loadTrip(userId: string): Promise<RemoteTrip | null> {
  const { data, error } = await supabase
    .from("trips")
    .select("state, updated_at")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data ? { state: data.state as InventoryState, updatedAt: Date.parse(data.updated_at) } : null;
}

/** Photo files stay on the phone, so only their records go to the account. */
export async function saveTrip(userId: string, state: InventoryState, updatedAt: number) {
  const synced: InventoryState = { ...state, photos: state.photos.map((p) => ({ ...p, url: "" })) };
  const { error } = await supabase
    .from("trips")
    .upsert({ user_id: userId, state: synced, updated_at: new Date(updatedAt).toISOString() });
  if (error) throw new Error(error.message);
}
