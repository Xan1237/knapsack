import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient } from "@supabase/supabase-js";
import { AppState, Platform } from "react-native";

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

// The latest token from Supabase's auth events (sign-in, refresh, sign-out). Right after
// signing in, getSession() can still be waiting on the sign-in to finish, so the workspace's
// first requests would otherwise go out without a token.
let latestToken: string | null = null;
supabase.auth.onAuthStateChange((_event, session) => {
  latestToken = session?.access_token ?? null;
});

/** The signed-in user's access token, for the Python backend. */
export async function accessToken() {
  if (latestToken) return latestToken;
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? null;
}
