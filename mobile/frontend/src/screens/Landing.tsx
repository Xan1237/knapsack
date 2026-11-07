import { ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Button, Eyebrow, Icon, type IconName } from "../components/ui";
import { colors, serif } from "../theme";

const features: { icon: IconName; title: string; body: string }[] = [
  {
    icon: "camera-outline",
    title: "A photo becomes geometry you can correct",
    body: "Astra turns a photo of a belonging into an editable 3D object you can resize beside your suitcase.",
  },
  {
    icon: "lock-closed-outline",
    title: "“Must bring” changes the tradeoffs",
    body: "Pin your essentials. Make-room swaps and advice protect them, and you review every change first.",
  },
  {
    icon: "move-outline",
    title: "Revise the spatial assumptions",
    body: "Drag items between suitcase halves, allow rotations, or press folded clothes flatter, and see it repack.",
  },
];

export default function Landing({ onStart }: { onStart: () => void }) {
  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.wordmark}>✳ knapsack</Text>
        <Eyebrow>LESS GUESSWORK. MORE GOING.</Eyebrow>
        <Text style={styles.title}>
          See what fits.{"\n"}
          <Text style={styles.italic}>Keep what matters.</Text>
        </Text>
        <Text style={styles.lead}>
          Can these particular belongings fit together, and which tradeoff are you willing to make?
        </Text>
        <Button label="Start packing" icon="arrow-forward" kind="primary" onPress={onStart} />
        <View style={styles.features}>
          {features.map((f) => (
            <View key={f.title} style={styles.feature}>
              <Icon name={f.icon} size={22} color={colors.green} />
              <View style={styles.featureText}>
                <Text style={styles.featureTitle}>{f.title}</Text>
                <Text style={styles.featureBody}>{f.body}</Text>
              </View>
            </View>
          ))}
        </View>
        <Text style={styles.footnote}>
          Sizes are estimates, and packing is a bounded search over conservative envelopes. A real
          trial packing is still the final word.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.paper },
  content: { padding: 24, gap: 18 },
  wordmark: { color: colors.ink, fontSize: 20, fontWeight: "700", marginBottom: 24 },
  title: { color: colors.ink, fontFamily: serif, fontSize: 40, lineHeight: 46 },
  italic: { fontStyle: "italic", color: colors.green },
  lead: { color: colors.muted, fontSize: 16, lineHeight: 23 },
  features: { gap: 18, marginTop: 14 },
  feature: { flexDirection: "row", gap: 14 },
  featureText: { flex: 1, gap: 3 },
  featureTitle: { color: colors.ink, fontSize: 15, fontWeight: "700" },
  featureBody: { color: colors.muted, fontSize: 14, lineHeight: 20 },
  footnote: { color: colors.muted, fontSize: 12, lineHeight: 17, marginTop: 8 },
});
