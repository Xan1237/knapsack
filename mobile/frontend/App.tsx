import type { Session } from "@supabase/supabase-js";
import { StatusBar } from "expo-status-bar";
import { useEffect, useState } from "react";
import { ActivityIndicator, View } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import Auth from "./src/screens/Auth";
import Workspace from "./src/screens/Workspace";
import { supabase } from "./src/supabase";
import { colors } from "./src/theme";

export default function App() {
  const [session, setSession] = useState<Session | null | undefined>(undefined);

  useEffect(() => {
    supabase.auth
      .getSession()
      .then(({ data }) => setSession(data.session))
      .catch(() => setSession(null));
    const { data } = supabase.auth.onAuthStateChange((_event, next) => setSession(next));
    return () => data.subscription.unsubscribe();
  }, []);

  const userId = session?.user.id;
  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      {session === undefined ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.paper }}>
          <ActivityIndicator color={colors.green} />
        </View>
      ) : !session || !userId ? (
        <Auth />
      ) : (
        // Keyed by user so switching accounts starts a fresh workspace.
        <Workspace
          key={userId}
          userId={userId}
          email={session.user.email ?? ""}
        />
      )}
    </SafeAreaProvider>
  );
}
