import AsyncStorage from "@react-native-async-storage/async-storage";
import { useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import * as api from "../api";
import { Button } from "../components/ui";
import * as storage from "../storage";
import { colors, type } from "../theme";
import type { TripActions } from "./TripsTab";
import Workspace from "./Workspace";

/** Loads the account's trips, keeps track of the open one, and shows it in a workspace. */
export default function TripHost({ userId, email }: { userId: string; email: string }) {
  const [trips, setTrips] = useState<api.TripSummary[] | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const lastTripKey = `knapsack:last-trip:${userId}`;

  async function start() {
    setError("");
    try {
      let list = await api.listTrips();
      if (!list.length) {
        await api.createTrip("My trip");
        list = await api.listTrips();
      }
      const last = await AsyncStorage.getItem(lastTripKey).catch(() => null);
      setTrips(list);
      setActiveId(list.some((t) => t.id === last) ? last : list[0].id);
    } catch (e) {
      // Offline: reopen the trip this phone last had open, if it belongs to this account.
      const local = await storage.loadSession().catch(() => null);
      if (local?.meta.userId === userId && local.meta.tripId) {
        setTrips([]);
        setActiveId(local.meta.tripId);
      } else setError(e instanceof Error ? e.message : "Couldn't load your trips.");
    }
  }

  useEffect(() => {
    start();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  function switchTo(id: string) {
    setActiveId(id);
    AsyncStorage.setItem(lastTripKey, id).catch(() => {});
  }

  async function refresh() {
    setTrips(await api.listTrips());
  }

  const actions: TripActions = {
    switchTo,
    async create(name) {
      const trip = await api.createTrip(name);
      await refresh();
      switchTo(trip.id);
    },
    async rename(id, name) {
      await api.renameTrip(id, name);
      await refresh();
    },
    async remove(id) {
      const others = (trips ?? []).filter((t) => t.id !== id);
      if (!others.length) throw new Error("You need at least one trip.");
      // Leave the trip first, so its workspace saves and closes before it's deleted.
      if (id === activeId) switchTo(others[0].id);
      const { photoIds } = await api.deleteTrip(id);
      storage.forgetPhotos(photoIds).catch(() => {});
      await refresh();
    },
  };

  if (error)
    return (
      <SafeAreaView style={styles.center}>
        <Text style={type.heading}>Couldn't load your trips</Text>
        <Text style={styles.body}>{error}</Text>
        <Button label="Retry" kind="primary" onPress={start} />
      </SafeAreaView>
    );
  if (!trips || !activeId)
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.green} />
      </View>
    );
  return (
    // A new workspace per trip, so one trip's state never leaks into another.
    <Workspace
      key={activeId}
      userId={userId}
      email={email}
      tripId={activeId}
      trips={trips}
      tripActions={actions}
      onTripsChanged={() => refresh().catch(() => {})}
    />
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12, padding: 24, backgroundColor: colors.paper },
  body: { ...type.body, color: colors.muted, textAlign: "center" },
});
