import { useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import type { TripSummary } from "../api";
import { Sheet } from "../components/Sheet";
import { Banner, Button, Group, Icon, IconButton, Section } from "../components/ui";
import { colors, radius, type } from "../theme";

export type TripActions = {
  switchTo: (id: string) => void;
  create: (name: string) => Promise<void>;
  rename: (id: string, name: string) => Promise<void>;
  remove: (id: string) => Promise<void>;
};

const day = (ms: number) => new Date(ms).toLocaleDateString(undefined, { month: "short", day: "numeric" });

/** Every trip on the account: switch between them, add, rename, or delete one. */
export default function TripsTab({
  trips,
  activeId,
  activeItemCount,
  actions,
}: {
  trips: TripSummary[];
  activeId: string;
  activeItemCount: number;
  actions: TripActions;
}) {
  // The name sheet serves both "New trip" (no id) and "Rename" (an id).
  const [naming, setNaming] = useState<{ id?: string; name: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function saveName() {
    if (!naming) return;
    setBusy(true);
    setError("");
    try {
      if (naming.id) await actions.rename(naming.id, naming.name.trim());
      else await actions.create(naming.name.trim());
      setNaming(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "That didn't work. Please retry.");
    } finally {
      setBusy(false);
    }
  }

  function options(trip: TripSummary) {
    Alert.alert(trip.name, undefined, [
      { text: "Rename", onPress: () => setNaming({ id: trip.id, name: trip.name }) },
      ...(trips.length > 1
        ? [
            {
              text: "Delete",
              style: "destructive" as const,
              onPress: () =>
                Alert.alert(`Delete ${trip.name}?`, "Its items and photos are removed from your account and this phone.", [
                  { text: "Cancel", style: "cancel" },
                  {
                    text: "Delete",
                    style: "destructive",
                    onPress: () =>
                      actions.remove(trip.id).catch((e) => Alert.alert("Couldn't delete the trip", e instanceof Error ? e.message : "")),
                  },
                ]),
            },
          ]
        : []),
      { text: "Cancel", style: "cancel" },
    ]);
  }

  return (
    <ScrollView contentContainerStyle={styles.content}>
      {!trips.length && <Banner tone="warn">Couldn't reach your account, so only the trip on this phone is open.</Banner>}
      <Section title="Your trips">
        <Group>
          {trips.map((trip) => {
            const active = trip.id === activeId;
            const count = active ? activeItemCount : trip.itemCount;
            return (
              <View key={trip.id} style={styles.row}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={active ? `${trip.name}, open` : `Open ${trip.name}`}
                  accessibilityState={{ selected: active }}
                  onPress={() => !active && actions.switchTo(trip.id)}
                  style={({ pressed }) => [styles.main, pressed && !active && { opacity: 0.6 }]}
                >
                  <View style={[styles.icon, active && styles.iconActive]}>
                    <Icon name="airplane-outline" size={18} color={active ? colors.white : colors.green} />
                  </View>
                  <View style={styles.grow}>
                    <Text style={type.bodyStrong} numberOfLines={1}>
                      {trip.name}
                    </Text>
                    <Text style={type.secondary} numberOfLines={1}>
                      {count} item{count === 1 ? "" : "s"} · {active ? "Open now" : `Updated ${day(trip.updatedAt)}`}
                    </Text>
                  </View>
                  {active && <Icon name="checkmark-circle" size={22} color={colors.green} />}
                </Pressable>
                <IconButton icon="ellipsis-horizontal" label={`${trip.name} options`} color={colors.muted} onPress={() => options(trip)} />
              </View>
            );
          })}
        </Group>
      </Section>
      <Button
        label="New trip"
        icon="add"
        kind="primary"
        disabled={!trips.length}
        onPress={() => {
          setError("");
          setNaming({ name: "" });
        }}
      />
      <Text style={styles.note}>Each trip has its own items, suitcase and photos.</Text>

      <Sheet visible={!!naming} title={naming?.id ? "Rename trip" : "New trip"} onClose={() => setNaming(null)}>
        {!!error && <Banner tone="error">{error}</Banner>}
        <TextInput
          accessibilityLabel="Trip name"
          style={styles.input}
          placeholder="e.g. Lisbon weekend"
          placeholderTextColor={colors.faint}
          autoFocus
          maxLength={60}
          value={naming?.name ?? ""}
          onChangeText={(name) => setNaming((n) => (n ? { ...n, name } : n))}
          onSubmitEditing={() => naming?.name.trim() && saveName()}
        />
        <Button
          label={busy ? "Saving…" : naming?.id ? "Save name" : "Create trip"}
          kind="primary"
          disabled={busy || !naming?.name.trim()}
          onPress={saveName}
        />
      </Sheet>
    </ScrollView>
  );
}


const styles = StyleSheet.create({
  content: { padding: 16, gap: 16, paddingBottom: 32 },
  row: { flexDirection: "row", alignItems: "center", paddingRight: 4 },
  main: { flex: 1, flexDirection: "row", alignItems: "center", gap: 12, paddingLeft: 14, paddingVertical: 12 },
  icon: {
    width: 36,
    height: 36,
    borderRadius: radius.pill,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.soft,
  },
  iconActive: { backgroundColor: colors.green },
  grow: { flex: 1 },
  note: { ...type.secondary, textAlign: "center" },
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
