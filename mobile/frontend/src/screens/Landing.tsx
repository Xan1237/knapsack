import { ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Button, Icon, type IconName } from "../components/ui";
import { colors, radius, serif, type } from "../theme";

const features: { icon: IconName; title: string; body: string }[] = [
  {
    icon: "camera-outline",
    title: "Snap your stuff",
    body: "A photo becomes a 3D item you can resize.",
  },
  {
    icon: "lock-closed-outline",
    title: "Pin the essentials",
    body: "Suggestions never leave them behind.",
  },
  {
    icon: "move-outline",
    title: "Move things around",
    body: "Drag items and everything else repacks.",
  },
];

export default function Landing({ onStart }: { onStart: () => void }) {
  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        <Text style={styles.wordmark}>✳ knapsack</Text>
        <View style={styles.hero}>
          <Text style={styles.title}>
            See what fits.{"\n"}
            <Text style={styles.accent}>Keep what matters.</Text>
          </Text>
          <Text style={styles.lead}>Find out if your things fit your bag before you start packing.</Text>
        </View>
        <View style={styles.features}>
          {features.map((f) => (
            <View key={f.title} style={styles.feature}>
              <View style={styles.featureIcon}>
                <Icon name={f.icon} size={20} color={colors.green} />
              </View>
              <View style={styles.featureText}>
                <Text style={type.bodyStrong}>{f.title}</Text>
                <Text style={type.secondary}>{f.body}</Text>
              </View>
            </View>
          ))}
        </View>
      </ScrollView>
      <View style={styles.footer}>
        <Button label="Start packing" kind="primary" onPress={onStart} />
        <Text style={styles.footnote}>Sizes are estimates. A real trial pack is still the final word.</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.paper },
  scroll: { flex: 1 },
  content: { flexGrow: 1, paddingHorizontal: 24, paddingTop: 16, paddingBottom: 16 },
  wordmark: { color: colors.ink, fontSize: 18, fontWeight: "700" },
  hero: { flexGrow: 1, justifyContent: "center", gap: 12, paddingVertical: 20 },
  title: { color: colors.ink, fontFamily: serif, fontSize: 34, lineHeight: 40 },
  accent: { color: colors.green, fontStyle: "italic" },
  lead: { color: colors.muted, fontSize: 16, lineHeight: 23 },
  features: { gap: 16 },
  feature: { flexDirection: "row", alignItems: "center", gap: 14 },
  featureIcon: {
    width: 40,
    height: 40,
    borderRadius: radius.sm,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.soft,
  },
  featureText: { flex: 1 },
  footer: { paddingHorizontal: 24, paddingTop: 8, paddingBottom: 12, gap: 10 },
  footnote: { ...type.secondary, fontSize: 12, textAlign: "center" },
});
