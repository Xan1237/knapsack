import { Asset } from "expo-asset";
import * as DocumentPicker from "expo-document-picker";
import * as ImagePicker from "expo-image-picker";
import * as Sharing from "expo-sharing";
import { useEffect, useReducer, useRef, useState } from "react";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import * as api from "../api";
import { Icon, IconButton } from "../components/ui";
import {
  type Item,
  type Photo,
  type Placement,
  type Plan,
  type Vec3,
  anchorAtPoint,
  revisionOf,
  uid,
} from "../domain";
import { bagForState, initialState, type InventoryState, reducer } from "../state";
import * as storage from "../storage";
import { colors } from "../theme";
import Assistant from "./Assistant";
import BelongingsTab from "./BelongingsTab";
import ItemEditor from "./ItemEditor";
import SuitcaseTab from "./SuitcaseTab";

const maxPhotos = 12;

export default function Workspace({ onHome }: { onHome: () => void }) {
  const [state, dispatch] = useReducer(reducer, undefined, initialState);
  const [tab, setTab] = useState<"suitcase" | "belongings">("suitcase");
  const [loaded, setLoaded] = useState(false);
  const [canPersist, setCanPersist] = useState(true);
  const [storageStatus, setStorageStatus] = useState("Restoring");
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

  useEffect(() => {
    let mounted = true;
    storage
      .loadSession()
      .then((saved) => {
        if (!mounted) return;
        if (saved) dispatch({ type: "restore", state: saved });
        setLoaded(true);
      })
      .catch(() => {
        if (!mounted) return;
        setNotice(
          "Saved data could not be read. A fresh demo is ready; edits stay temporary until Reset trip clears the invalid session.",
        );
        setCanPersist(false);
        setStorageStatus("Needs reset");
        setLoaded(true);
      });
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (!loaded || !canPersist) return;
    const timer = setTimeout(() => {
      setStorageStatus("Saving");
      storage
        .saveSession(state)
        .then(() => setStorageStatus("Saved on this phone"))
        .catch(() => {
          setStorageStatus("Not saving");
          setNotice("This phone's storage is unavailable or full. Changes may not survive a restart.");
        });
    }, 350);
    return () => clearTimeout(timer);
  }, [state, loaded, canPersist]);

  // Notices sit above the scene, so they clear themselves rather than keep it pushed down.
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
    Alert.alert(
      "A fresh start?",
      "This clears this trip's inventory and retained photos from your phone. Your new suitcase will be empty.",
      [
        { text: "Keep my trip", style: "cancel" },
        { text: "Clear session", style: "destructive", onPress: () => resetTo("reset") },
      ],
    );

  const openEditor = (id: string) => {
    setSelected(id);
    setMergeWith("");
    setEditing(true);
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top", "left", "right"]}>
      <View style={styles.header}>
        <Pressable onPress={onHome} accessibilityRole="button" accessibilityLabel="Knapsack home">
          <Text style={styles.wordmark}>✳ knapsack</Text>
        </Pressable>
        <View style={styles.headerRight}>
          <Text style={styles.status}>{storageStatus}</Text>
          <IconButton icon="trash-outline" label="Reset trip" onPress={confirmReset} />
        </View>
      </View>
      {!!notice && (
        <View style={styles.notice} accessibilityLiveRegion="polite">
          <Text style={styles.noticeText}>{notice}</Text>
          <Pressable accessibilityLabel="Dismiss notice" hitSlop={10} onPress={() => setNotice("")}>
            <Icon name="close" size={18} color={colors.ink} />
          </Pressable>
        </View>
      )}
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
          />
        ) : (
          <BelongingsTab
            state={state}
            current={current}
            canSave={!!current}
            ready={loaded}
            dispatch={dispatch}
            onOpen={openEditor}
            addPhotos={addPhotos}
            samplePhoto={samplePhoto}
            importFile={importFile}
            savePlan={savePlan}
            loadDemo={() => resetTo("demo")}
            reviewMerge={(a, b) => {
              openEditor(a);
              setMergeWith(b);
            }}
          />
        )}
      </View>
      <SafeAreaView edges={["bottom"]} style={styles.tabBar}>
        {(
          [
            ["suitcase", "Suitcase", "briefcase-outline"],
            ["belongings", `Belongings · ${state.items.length}`, "list-outline"],
          ] as const
        ).map(([key, label, icon]) => (
          <Pressable
            key={key}
            accessibilityRole="tab"
            accessibilityState={{ selected: tab === key }}
            style={styles.tab}
            onPress={() => setTab(key)}
          >
            <Icon name={icon} size={20} color={tab === key ? colors.green : colors.muted} />
            <Text style={[styles.tabText, tab === key && styles.tabActive]}>{label}</Text>
          </Pressable>
        ))}
      </SafeAreaView>
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
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  wordmark: { color: colors.ink, fontSize: 18, fontWeight: "700" },
  headerRight: { flexDirection: "row", alignItems: "center", gap: 10 },
  status: { color: colors.muted, fontSize: 12 },
  notice: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    marginHorizontal: 16,
    marginBottom: 8,
    padding: 10,
    borderRadius: 10,
    backgroundColor: "#f3e7d4",
  },
  noticeText: { flex: 1, color: colors.ink, fontSize: 13, lineHeight: 18 },
  body: { flex: 1 },
  tabBar: {
    flexDirection: "row",
    borderTopWidth: 1,
    borderTopColor: colors.line,
    backgroundColor: colors.white,
  },
  tab: { flex: 1, alignItems: "center", paddingVertical: 8, gap: 2 },
  tabText: { color: colors.muted, fontSize: 12 },
  tabActive: { color: colors.green, fontWeight: "700" },
});
