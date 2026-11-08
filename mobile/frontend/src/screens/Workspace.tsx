import { Asset } from "expo-asset";
import * as DocumentPicker from "expo-document-picker";
import * as ImagePicker from "expo-image-picker";
import * as Sharing from "expo-sharing";
import { useEffect, useReducer, useRef, useState } from "react";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import * as api from "../api";
import { afterSheet, Sheet } from "../components/Sheet";
import { ActionRow, Group, Icon, IconButton } from "../components/ui";
import {
  type Item,
  type Photo,
  type Placement,
  type Plan,
  type Vec3,
  anchorAtPoint,
  outsideCase,
  formatSize,
  revisionOf,
  suitcases,
  uid,
} from "../domain";
import { bagForState, initialState, type InventoryState, reducer } from "../state";
import * as storage from "../storage";
import { loadTrip, saveTrip, supabase } from "../supabase";
import { colors, radius, type } from "../theme";
import Assistant from "./Assistant";
import BelongingsTab from "./BelongingsTab";
import ItemEditor from "./ItemEditor";
import SuitcaseTab from "./SuitcaseTab";

const maxPhotos = 12;

export default function Workspace({ userId, email, onHome }: { userId: string; email: string; onHome: () => void }) {
  const [state, dispatch] = useReducer(reducer, undefined, initialState);
  const [tab, setTab] = useState<"suitcase" | "belongings">("suitcase");
  const [loaded, setLoaded] = useState(false);
  const [canPersist, setCanPersist] = useState(true);
  const [storageStatus, setStorageStatus] = useState("Restoring");
  const [syncStatus, setSyncStatus] = useState("");
  const [remoteReady, setRemoteReady] = useState(false);
  const [notice, setNotice] = useState("");
  const [selected, setSelected] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [mergeWith, setMergeWith] = useState("");
  const [plan, setPlan] = useState<Plan | null>(null);
  const [reservedSpace, setReservedSpace] = useState<Placement | null>(null);
  const [packingError, setPackingError] = useState("");
  const [packAttempt, setPackAttempt] = useState(0);
  const [layer, setLayer] = useState(100);
  const [exploded, setExploded] = useState(false);
  const [resetKey, setResetKey] = useState(0);
  const [view, setView] = useState<"perspective" | "top">("perspective");
  const [moveMode, setMoveMode] = useState(false);
  const [playback, setPlayback] = useState({ revision: "", step: 0, playing: false });
  const [astraOpen, setAstraOpen] = useState(false);
  const [wantedId, setWantedId] = useState<string | null>(null);
  const [sheet, setSheet] = useState<"bags" | "more" | "add" | null>(null);
  const inFlight = useRef(new Map<string, AbortController>());
  const generation = useRef(0);
  const latestRevision = useRef("");

  const bag = bagForState(state);
  const revision = revisionOf(state.items, bag);
  latestRevision.current = revision;
  const current = plan?.revision === revision ? plan : null;
  const busy = loaded && !current && !packingError;
  const effectivePlayback =
    playback.revision === revision
      ? playback
      : { revision, step: plan?.placements.length ?? 0, playing: false };
  const maxStep = plan ? plan.placements.length + (bag.clamshell ? 1 : 0) : 0;
  const step = Math.min(maxStep, effectivePlayback.step);
  const active = state.items.find((i) => i.id === selected) ?? null;

  // Restore whichever copy changed last: this phone's, or the one saved to the account.
  useEffect(() => {
    let mounted = true;
    (async () => {
      let local: Awaited<ReturnType<typeof storage.loadSession>> = null;
      let localBroken = false;
      try {
        local = await storage.loadSession();
      } catch {
        localBroken = true;
      }
      // A trip saved on this phone by a different account is never shown or uploaded.
      const mine = local && (!local.meta.userId || local.meta.userId === userId) ? local : null;
      let remote: Awaited<ReturnType<typeof loadTrip>> = null;
      let remoteOk = true;
      try {
        remote = await loadTrip(userId);
      } catch {
        remoteOk = false;
      }
      if (!mounted) return;
      if (remote && (!mine || remote.updatedAt >= (mine.meta.updatedAt ?? 0))) {
        // Photo files exist only on the phone that took them; reattach any this phone has.
        const files = new Map(mine?.state.photos.map((p) => [p.id, p.url]) ?? []);
        dispatch({
          type: "restore",
          state: { ...remote.state, photos: remote.state.photos.map((p) => ({ ...p, url: files.get(p.id) ?? p.url })) },
        });
      } else if (mine) dispatch({ type: "restore", state: mine.state });
      else if (localBroken) {
        setNotice("Saved data on this phone could not be read, so a fresh demo is ready.");
      }
      if (!remoteOk) {
        setNotice("Couldn't reach your account, so changes are only saved on this phone for now.");
        setSyncStatus("Not synced to your account");
      }
      setRemoteReady(remoteOk);
      setLoaded(true);
    })();
    return () => {
      mounted = false;
    };
  }, [userId]);

  useEffect(() => {
    if (!loaded || !canPersist) return;
    const updatedAt = Date.now();
    const timer = setTimeout(() => {
      setStorageStatus("Saving");
      storage
        .saveSession(state, { userId, updatedAt })
        .then(() => setStorageStatus("Saved on this phone"))
        .catch(() => {
          setStorageStatus("Not saving");
          setNotice("This phone's storage is unavailable or full. Changes may not survive a restart.");
        });
    }, 350);
    // Only write to the account once its copy was read, so a newer trip there is never overwritten.
    const remoteTimer = remoteReady
      ? setTimeout(() => {
          saveTrip(userId, state, updatedAt)
            .then(() => setSyncStatus("Synced to your account"))
            .catch(() => setSyncStatus("Not synced yet. Retrying on your next change"));
        }, 1500)
      : undefined;
    return () => {
      clearTimeout(timer);
      clearTimeout(remoteTimer);
    };
  }, [state, loaded, canPersist, remoteReady, userId]);

  // Notices float over the content, so they clear themselves rather than keep covering it.
  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(""), 8000);
    return () => clearTimeout(timer);
  }, [notice]);

  // The Python backend packs and validates; a stale response is dropped by its revision.
  useEffect(() => {
    if (!loaded) return;
    const controller = new AbortController();
    const timer = setTimeout(() => {
      setPackingError("");
      api
        .packPlan(state.items, bag, revision, state.demo, controller.signal)
        .then((result) => {
          if (result.plan.revision !== latestRevision.current) return;
          setPlan(result.plan);
          setReservedSpace(result.reservedSpace);
        })
        .catch((error) => {
          if (!(error instanceof api.AbortedError)) setPackingError(error.message);
        });
    }, 180);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
    // `revision` covers every packing input in items and bag.
  }, [revision, loaded, state.demo, packAttempt]);

  useEffect(() => {
    for (const photo of state.photos) {
      if (inFlight.current.size >= 2) break;
      if (photo.status !== "queued" || inFlight.current.has(photo.id)) continue;
      const controller = new AbortController();
      inFlight.current.set(photo.id, controller);
      dispatch({ type: "start", id: photo.id, requestId: photo.requestId });
      api
        .analyzePhoto(photo, controller.signal)
        .then((result) => {
          inFlight.current.delete(photo.id);
          dispatch({
            type: "analysis",
            id: photo.id,
            requestId: photo.requestId,
            proposals: result.items,
          });
        })
        .catch((error) => {
          inFlight.current.delete(photo.id);
          if (!controller.signal.aborted)
            dispatch({
              type: "failure",
              id: photo.id,
              requestId: photo.requestId,
              error: error instanceof Error ? error.message : "Analysis failed. Retry or add items manually.",
            });
        });
    }
  }, [state.photos]);

  useEffect(() => {
    const requests = inFlight.current;
    return () => {
      requests.forEach((c) => c.abort());
      requests.clear();
    };
  }, []);

  useEffect(() => {
    if (!effectivePlayback.playing) return;
    const timer = setInterval(
      () =>
        setPlayback((p) =>
          p.step >= maxStep ? { ...p, playing: false } : { ...p, step: p.step + 1 },
        ),
      900,
    );
    return () => clearInterval(timer);
  }, [effectivePlayback.playing, maxStep]);

  function stopRequests() {
    generation.current++;
    inFlight.current.forEach((c) => c.abort());
    inFlight.current.clear();
  }
  function clearScene() {
    setPlan(null);
    setReservedSpace(null);
    setLayer(100);
    setExploded(false);
    setMoveMode(false);
    setPlayback({ revision: "", step: 0, playing: false });
    setAstraOpen(false);
    setWantedId(null);
    setEditing(false);
  }
  function resetTo(mode: "reset" | "demo") {
    stopRequests();
    setCanPersist(true);
    dispatch({ type: mode });
    setSelected(null);
    clearScene();
    setNotice("");
    try {
      storage.clearPhotos();
    } catch {}
  }

  async function queuePhotos(assets: { uri: string; width: number; height: number; name: string }[]) {
    const started = generation.current;
    if (state.photos.length + assets.length > maxPhotos) {
      setNotice("You can retain up to 12 photos. Reset the trip to start a new collection.");
      return;
    }
    const accepted: Photo[] = [];
    const errors: string[] = [];
    for (const asset of assets) {
      try {
        accepted.push({
          id: uid(),
          name: asset.name,
          url: await storage.storePhoto(asset),
          status: "queued",
          requestId: uid(),
          accepted: false,
        });
      } catch (error) {
        errors.push(error instanceof Error ? error.message : `${asset.name} could not be read.`);
      }
    }
    if (started !== generation.current) return;
    if (accepted.length) dispatch({ type: "photos", photos: accepted });
    setNotice(errors.join(" "));
  }

  async function addPhotos(source: "camera" | "library") {
    try {
      let result: ImagePicker.ImagePickerResult;
      if (source === "camera") {
        const permission = await ImagePicker.requestCameraPermissionsAsync();
        if (!permission.granted) {
          setNotice("Camera access is off. You can choose a photo from your library instead.");
          return;
        }
        result = await ImagePicker.launchCameraAsync({ mediaTypes: ["images"], quality: 1 });
      } else {
        result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ["images"],
          quality: 1,
          allowsMultipleSelection: true,
          selectionLimit: Math.max(1, maxPhotos - state.photos.length),
        });
      }
      if (result.canceled) return;
      await queuePhotos(
        result.assets.map((a, index) => ({
          uri: a.uri,
          width: a.width,
          height: a.height,
          name: a.fileName || `photo-${index + 1}.jpg`,
        })),
      );
    } catch {
      setNotice("That photo could not be opened. You can still add items manually.");
    }
  }

  async function samplePhoto() {
    try {
      const asset = Asset.fromModule(require("../../assets/sample-pump-bottle.jpg"));
      await asset.downloadAsync();
      await queuePhotos([
        {
          uri: asset.localUri || asset.uri,
          width: asset.width ?? 230,
          height: asset.height ?? 590,
          name: "sample-pump-bottle.jpg",
        },
      ]);
    } catch {
      setNotice("The sample photo could not load. You can still add your own photo.");
    }
  }

  async function importFile() {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: "application/json",
        copyToCacheDirectory: true,
      });
      if (result.canceled) return;
      const imported = await api.importCollection(JSON.parse(await storage.readText(result.assets[0].uri)));
      const next: InventoryState = { ...imported, customBag: imported.customBag ?? undefined };
      stopRequests();
      dispatch({ type: "restore", state: next });
      setCanPersist(true);
      setSelected(next.items[0]?.id ?? null);
      clearScene();
      setNotice(`Imported ${next.items.length} items. Your collection is ready to pack.`);
    } catch (error) {
      setNotice(
        error instanceof SyntaxError
          ? "That file isn't a Knapsack collection."
          : error instanceof Error
            ? error.message
            : "That collection could not be read.",
      );
    }
  }

  async function savePlan() {
    try {
      const uri = storage.writeExport(JSON.stringify(await api.exportPlan(state, bag), null, 2));
      if (await Sharing.isAvailableAsync())
        await Sharing.shareAsync(uri, { mimeType: "application/json", dialogTitle: "Save packing plan" });
      else setNotice("Sharing isn't available on this device.");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Your packing plan could not be exported.");
    }
  }

  function dropItem(item: Item, point: Vec3, orientation: number) {
    if (outsideCase(bag, point)) {
      if (item.aside) return false;
      dispatch({ type: "aside", id: item.id, aside: true });
      setSelected(item.id);
      setNotice(`${item.label} is beside the suitcase. Drag it back in to pack it.`);
      return true;
    }
    const anchor = anchorAtPoint(item, bag, point, orientation);
    if (!anchor) {
      setNotice("This item cannot fit there in its current orientation. Resize it or allow another rotation.");
      return false;
    }
    dispatch({ type: "move", id: item.id, anchor });
    setSelected(item.id);
    setNotice("Position saved. Your other belongings are adjusting around it.");
    return true;
  }

  const confirmReset = () =>
    Alert.alert("Clear this trip?", "This removes all items and photos from your phone. You'll start with an empty suitcase.", [
      { text: "Keep my trip", style: "cancel" },
      { text: "Clear trip", style: "destructive", onPress: () => resetTo("reset") },
    ]);

  // Signing out removes the trip and photos from this phone; the account keeps the trip.
  const confirmSignOut = () =>
    Alert.alert("Sign out?", "Your trip stays in your account. Photos taken on this phone are removed from it.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign out",
        style: "destructive",
        onPress: async () => {
          stopRequests();
          setCanPersist(false);
          setRemoteReady(false);
          try {
            storage.clearSession();
            storage.clearPhotos();
          } catch {}
          await supabase.auth.signOut();
        },
      },
    ]);

  // The demo replaces the current trip, so anything other than the demo itself gets a warning.
  const confirmDemo = () => {
    if (state.demo || state.items.length === 0) {
      resetTo("demo");
      return;
    }
    Alert.alert("Load the demo trip?", "This replaces your items and photos with the demo.", [
      { text: "Keep my trip", style: "cancel" },
      { text: "Load demo", style: "destructive", onPress: () => resetTo("demo") },
    ]);
  };

  const openEditor = (id: string) => {
    setSelected(id);
    setMergeWith("");
    setEditing(true);
  };

  const fromMenu = (action: () => void) => {
    setSheet(null);
    afterSheet(action);
  };
  const bags = state.customBag ? [...suitcases, state.customBag] : suitcases;
  const includedCount = state.items.filter((i) => i.included).length;
  const storageProblem = storageStatus === "Not saving" || storageStatus === "Needs reset";

  return (
    <SafeAreaView style={styles.safe} edges={["top", "left", "right"]}>
      <View style={styles.header}>
        {tab === "suitcase" ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Suitcase: ${bag.name}, ${bag.subtitle}. Change suitcase`}
            onPress={() => setSheet("bags")}
            style={({ pressed }) => [styles.headerMain, pressed && { opacity: 0.6 }]}
          >
            <View style={styles.bagTitle}>
              <Text style={type.title} numberOfLines={1}>
                {bag.name}
              </Text>
              <Icon name="chevron-down" size={18} color={colors.muted} />
            </View>
            <Text style={type.secondary} numberOfLines={1}>
              {bag.subtitle}
            </Text>
          </Pressable>
        ) : (
          <View style={styles.headerMain}>
            <Text style={type.title}>Your items</Text>
            <Text style={type.secondary} numberOfLines={1}>
              {state.items.length ? `${includedCount} of ${state.items.length} coming on this trip` : "Nothing added yet"}
            </Text>
          </View>
        )}
        {storageProblem && <Text style={styles.storageProblem}>{storageStatus}</Text>}
        <IconButton icon="ellipsis-horizontal" label="More options" onPress={() => setSheet("more")} />
      </View>
      <View style={styles.body}>
        {tab === "suitcase" ? (
          <SuitcaseTab
            state={state}
            bag={bag}
            revision={revision}
            plan={plan}
            current={current}
            busy={busy}
            packingError={packingError}
            reservedSpace={reservedSpace}
            selected={selected}
            active={active}
            layer={layer}
            exploded={exploded}
            resetKey={resetKey}
            view={view}
            moveMode={moveMode}
            step={step}
            maxStep={maxStep}
            playing={effectivePlayback.playing}
            dispatch={dispatch}
            setLayer={setLayer}
            setExploded={setExploded}
            setPlayback={setPlayback}
            setMoveMode={setMoveMode}
            setView={setView}
            bumpReset={() => setResetKey((k) => k + 1)}
            setSelected={setSelected}
            openEditor={openEditor}
            retryPacking={() => setPackAttempt((n) => n + 1)}
            dropItem={dropItem}
            askAstra={() => {
              setWantedId(null);
              setAstraOpen(true);
            }}
            makeRoom={(id) => {
              setSelected(id);
              setAstraOpen(false);
              setWantedId(id);
            }}
            addItems={() => {
              setTab("belongings");
              setSheet("add");
            }}
          />
        ) : (
          <BelongingsTab
            state={state}
            current={current}
            ready={loaded}
            addOpen={sheet === "add"}
            setAddOpen={(open) => setSheet(open ? "add" : null)}
            dispatch={dispatch}
            onOpen={openEditor}
            addPhotos={addPhotos}
            samplePhoto={samplePhoto}
            loadDemo={confirmDemo}
            reviewMerge={(a, b) => {
              openEditor(a);
              setMergeWith(b);
            }}
          />
        )}
        {!!notice && (
          <View style={styles.notice} accessibilityLiveRegion="polite">
            <Text style={styles.noticeText}>{notice}</Text>
            <Pressable accessibilityRole="button" accessibilityLabel="Dismiss" hitSlop={12} onPress={() => setNotice("")}>
              <Icon name="close" size={18} color={colors.white} />
            </Pressable>
          </View>
        )}
      </View>
      <SafeAreaView edges={["bottom"]} style={styles.tabBar}>
        {(
          [
            ["suitcase", "Suitcase", "briefcase", "briefcase-outline"],
            ["belongings", `Items (${state.items.length})`, "list", "list-outline"],
          ] as const
        ).map(([key, label, activeIcon, icon]) => (
          <Pressable
            key={key}
            accessibilityRole="tab"
            accessibilityState={{ selected: tab === key }}
            style={styles.tab}
            onPress={() => setTab(key)}
          >
            <Icon name={tab === key ? activeIcon : icon} size={24} color={tab === key ? colors.green : colors.muted} />
            <Text style={[styles.tabText, tab === key && styles.tabActive]}>{label}</Text>
          </Pressable>
        ))}
      </SafeAreaView>
      <Sheet visible={sheet === "bags"} title="Choose a suitcase" onClose={() => setSheet(null)}>
        <Group>
          {bags.map((b) => (
            <ActionRow
              key={b.id}
              icon="briefcase-outline"
              label={b.name}
              hint={`${b.subtitle} · ${formatSize(b.dimensions)}`}
              onPress={() => {
                dispatch({ type: "bag", id: b.id });
                setSheet(null);
              }}
              trailing={b.id === bag.id ? <Icon name="checkmark-circle" size={24} color={colors.green} /> : undefined}
            />
          ))}
        </Group>
      </Sheet>
      <Sheet visible={sheet === "more"} onClose={() => setSheet(null)}>
        <Group>
          <ActionRow
            icon="share-outline"
            label="Save packing plan"
            hint={current ? "Share or save it as a file" : "Available once the layout is ready"}
            disabled={!current}
            onPress={() => fromMenu(savePlan)}
          />
          <ActionRow
            icon="download-outline"
            label="Import a collection"
            hint="Replaces your current trip"
            onPress={() => fromMenu(importFile)}
          />
          <ActionRow icon="sparkles-outline" label="Load the demo trip" onPress={() => fromMenu(confirmDemo)} />
          <ActionRow icon="home-outline" label="Back to welcome screen" onPress={() => fromMenu(onHome)} />
        </Group>
        <Group>
          <ActionRow icon="trash-outline" label="Clear trip" destructive onPress={() => fromMenu(confirmReset)} />
        </Group>
        <Group>
          <ActionRow icon="log-out-outline" label="Sign out" hint={email} onPress={() => fromMenu(confirmSignOut)} />
        </Group>
        <Text style={styles.storageNote}>{[storageStatus, syncStatus].filter(Boolean).join(" · ")}</Text>
      </Sheet>
      {active && (
        <ItemEditor
          key={active.id}
          visible={editing}
          item={active}
          items={state.items}
          photos={state.photos}
          mergeWith={mergeWith}
          setMergeWith={setMergeWith}
          dispatch={dispatch}
          onClose={() => setEditing(false)}
          onSelect={setSelected}
        />
      )}
      <Assistant
        open={astraOpen}
        wantedId={wantedId}
        items={state.items}
        bag={bag}
        revision={revision}
        onClose={() => {
          setAstraOpen(false);
          setWantedId(null);
        }}
        onApply={(includeIds, priorityId) => {
          dispatch({ type: "selection", includeIds, priorityId });
          setAstraOpen(false);
          setWantedId(null);
          setLayer(100);
          setExploded(false);
          setNotice(
            priorityId
              ? "Your swap is applied. Finding a place for your choice."
              : "Astra's selection is applied. Fit is being checked against your latest list.",
          );
        }}
        onLargerBag={() => {
          dispatch({ type: "bag", id: "checked" });
          setAstraOpen(false);
          setWantedId(null);
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.paper },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingLeft: 16,
    paddingRight: 6,
    paddingVertical: 6,
    minHeight: 60,
  },
  headerMain: { flex: 1 },
  bagTitle: { flexDirection: "row", alignItems: "center", gap: 4 },
  storageProblem: { color: colors.warn, fontSize: 13, fontWeight: "600" },
  storageNote: { ...type.secondary, textAlign: "center" },
  notice: {
    position: "absolute",
    top: 8,
    left: 12,
    right: 12,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    padding: 12,
    borderRadius: radius.md,
    backgroundColor: colors.ink,
  },
  noticeText: { flex: 1, color: colors.white, fontSize: 14, lineHeight: 20 },
  body: { flex: 1 },
  tabBar: {
    flexDirection: "row",
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.line,
    backgroundColor: colors.white,
  },
  tab: { flex: 1, alignItems: "center", justifyContent: "center", minHeight: 56, gap: 2 },
  tabText: { color: colors.muted, fontSize: 12, fontWeight: "500" },
  tabActive: { color: colors.green, fontWeight: "700" },
});
