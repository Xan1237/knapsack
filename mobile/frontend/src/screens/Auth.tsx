import { useState } from "react";
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Banner, Button } from "../components/ui";
import { supabase, supabaseConfigured } from "../supabase";
import { colors, radius, serif, type } from "../theme";

/** Email and password sign-in. A new account may need its email confirmed first. */
export default function Auth({ onBack }: { onBack: () => void }) {
  const [mode, setMode] = useState<"sign-in" | "sign-up">("sign-in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const signUp = mode === "sign-up";
  const ready = supabaseConfigured && /\S+@\S+\.\S+/.test(email.trim()) && password.length >= 6 && !busy;

  async function submit() {
    setBusy(true);
    setError("");
    setInfo("");
    try {
      const credentials = { email: email.trim(), password };
      if (signUp) {
        const { data, error } = await supabase.auth.signUp(credentials);
        if (error) throw error;
        // With email confirmation on, Supabase returns no session until the link is opened.
        if (!data.session) {
          setInfo(`We sent a confirmation link to ${credentials.email}. Open it, then sign in here.`);
          setMode("sign-in");
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword(credentials);
        if (error) throw error;
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView style={styles.safe} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <Pressable accessibilityRole="button" onPress={onBack} hitSlop={10}>
            <Text style={styles.wordmark}>✳ knapsack</Text>
          </Pressable>
          <View style={styles.hero}>
            <Text style={styles.title}>{signUp ? "Create your account" : "Welcome back"}</Text>
            <Text style={styles.lead}>Your trip is saved to your account, so it's there on any phone you sign in on.</Text>
          </View>

          {!supabaseConfigured && (
            <Banner tone="error">
              Sign-in isn't set up in this build. Add the Supabase settings to frontend/.env.local and restart Expo.
            </Banner>
          )}
          {!!error && <Banner tone="error">{error}</Banner>}
          {!!info && <Banner>{info}</Banner>}

          <View style={styles.fields}>
            <TextInput
              accessibilityLabel="Email"
              style={styles.input}
              placeholder="Email"
              placeholderTextColor={colors.faint}
              autoCapitalize="none"
              autoComplete="email"
              keyboardType="email-address"
              textContentType="emailAddress"
              value={email}
              onChangeText={setEmail}
            />
            <TextInput
              accessibilityLabel="Password"
              style={styles.input}
              placeholder={signUp ? "Password (6+ characters)" : "Password"}
              placeholderTextColor={colors.faint}
              secureTextEntry
              autoComplete={signUp ? "new-password" : "current-password"}
              textContentType={signUp ? "newPassword" : "password"}
              value={password}
              onChangeText={setPassword}
              onSubmitEditing={() => ready && submit()}
            />
          </View>

          <Button
            label={busy ? "One moment…" : signUp ? "Create account" : "Sign in"}
            kind="primary"
            disabled={!ready}
            onPress={submit}
          />
          <Button
            label={signUp ? "I already have an account" : "New here? Create an account"}
            kind="quiet"
            onPress={() => {
              setMode(signUp ? "sign-in" : "sign-up");
              setError("");
            }}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.paper },
  content: { flexGrow: 1, paddingHorizontal: 24, paddingTop: 16, paddingBottom: 24, gap: 14 },
  wordmark: { color: colors.ink, fontSize: 18, fontWeight: "700" },
  hero: { gap: 8, paddingTop: 40, paddingBottom: 8 },
  title: { color: colors.ink, fontFamily: serif, fontSize: 30, lineHeight: 36 },
  lead: { ...type.body, color: colors.muted },
  fields: { gap: 10 },
  input: {
    borderRadius: radius.md,
    paddingHorizontal: 14,
    minHeight: 50,
    fontSize: 16,
    color: colors.ink,
    backgroundColor: colors.white,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.line,
  },
});
