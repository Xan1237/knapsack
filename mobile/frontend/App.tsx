import { StatusBar } from "expo-status-bar";
import { useState } from "react";
import { SafeAreaProvider } from "react-native-safe-area-context";
import Landing from "./src/screens/Landing";
import Workspace from "./src/screens/Workspace";

export default function App() {
  const [screen, setScreen] = useState<"landing" | "workspace">("landing");
  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      {screen === "landing" ? (
        <Landing onStart={() => setScreen("workspace")} />
      ) : (
        <Workspace onHome={() => setScreen("landing")} />
      )}
    </SafeAreaProvider>
  );
}
