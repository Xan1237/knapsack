import * as ImagePicker from "expo-image-picker";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import * as api from "../api";
import ItemPreview from "../components/ItemPreview";
import { Banner, Button, Group, Icon, IconButton, Section, ToggleRow } from "../components/ui";
import {
  type BagKind,
  type Suitcase,
  type Vec3,
  bagKindNames,
  bagKinds,
  bagSubtitle,
  bagUsable,
  createItem,
  customBagPrefix,
  uid,
} from "../domain";
import * as storage from "../storage";
import { colors, radius, type } from "../theme";

export const maxBagPhotos = 4;
const axisNames = ["Width", "Length", "Depth"] as const;
const axisHints = ["Side to side", "Top to bottom", "Front to back"] as const;
// Packing space in whole centimetres; larger than this is furniture, not luggage.
const minCm = 8;
const maxCm = 200;

type Shot = { id: string; uri: string };
type Draft = {
  name: string;
  kind: BagKind;
  sizeCm: [string, string, string];
  clamshell: boolean;
  color?: string;
  appearance?: string;
  exterior?: Vec3;
  mesh?: Suitcase["mesh"];
  meshModel?: string;
  photoCount: number;
  assumptions: string;
};

const blankDraft = (): Draft => ({
  name: "My bag",
  kind: "backpack",
  sizeCm: ["30", "45", "18"],
  clamshell: false,
  photoCount: 0,
  assumptions: "",
});

function draftFrom(bag: Suitcase, assumptions = ""): Draft {
  return {
    name: bag.name,
    kind: bag.kind ?? (bag.clamshell ? "suitcase" : "other"),
    sizeCm: bag.dimensions.map((n) => String(Math.round(n / 10))) as Draft["sizeCm"],
    clamshell: !!bag.clamshell,
    color: bag.color,
    appearance: bag.appearance,
    exterior: bag.exterior,
    mesh: bag.mesh,
    meshModel: bag.meshModel,
    photoCount: bag.photoCount ?? 0,
    assumptions,
  };
}

/** The draft's packing space in mm, or null while any side is out of range. */
function draftSize(draft: Draft): Vec3 | null {
  const cm = draft.sizeCm.map((v) => Number(v.replace(",", ".")));
  if (cm.some((n) => !Number.isFinite(n) || n < minCm || n > maxCm)) return null;
  return cm.map((n) => Math.round(n * 10)) as Vec3;
}

export function bagFromDraft(draft: Draft, id: string): Suitcase | null {
  const dimensions = draftSize(draft);
  if (!dimensions) return null;
  const clearance = draft.kind === "suitcase" ? 3 : 5;
  const bag: Suitcase = {
    id,
    name: draft.name.trim().slice(0, 60) || "My bag",
    subtitle: bagSubtitle(draft.kind, dimensions),
    dimensions,
    clearance,
    clamshell: draft.clamshell,
    kind: draft.kind,
    photoCount: draft.photoCount,
    ...(draft.color ? { color: draft.color } : {}),
    ...(draft.appearance ? { appearance: draft.appearance } : {}),
    ...(draft.exterior ? { exterior: draft.exterior } : {}),
    ...(draft.mesh ? { mesh: draft.mesh, meshModel: draft.meshModel } : {}),
  };
  return bagUsable(bag) ? bag : null;
}

/** The bag's 3D model, turning slowly, through the item preview. */
function BagPreview({ draft }: { draft: Draft }) {
  const size = draftSize(draft) ?? [300, 450, 180];
  const outside = draft.exterior ?? size;
  const item = {
    ...createItem("other", "bag-preview"),
    color: draft.color ?? colors.green,
    mesh: draft.mesh,
    estimate: [...outside] as Vec3,
  };
  return <ItemPreview item={item} background={colors.canvas} />;
}

/**
 * Photograph a bag from a few angles and let Astra reconstruct it, or enter its size by hand.
 * `bag` opens an existing custom bag for editing.
 */
export default function BagBuilder({
  visible,
  bag,
  onSave,
  onDelete,
  onClose,
}: {
  visible: boolean;
  bag: Suitcase | null;
  onSave: (bag: Suitcase) => void;
  onDelete: (id: string) => void;
  onClose: () => void;
}) {
  const [step, setStep] = useState<"photos" | "building" | "review">(bag ? "review" : "photos");
  const [shots, setShots] = useState<Shot[]>([]);
  const [draft, setDraft] = useState<Draft>(() => (bag ? draftFrom(bag) : blankDraft()));
  const [error, setError] = useState("");
  const request = useRef<AbortController | null>(null);
  useEffect(() => () => request.current?.abort(), []);

  const update = (patch: Partial<Draft>) => setDraft((d) => ({ ...d, ...patch }));
  const result = bagFromDraft(draft, bag?.id ?? `${customBagPrefix}${uid()}`);

  async function addShots(source: "camera" | "library") {
    setError("");
    const room = maxBagPhotos - shots.length;
    if (room <= 0) return;
    try {
      let picked: ImagePicker.ImagePickerResult;
      if (source === "camera") {
        const permission = await ImagePicker.requestCameraPermissionsAsync();
        if (!permission.granted) {
          setError("Camera access is off. You can choose photos from your library instead.");
          return;
        }
        picked = await ImagePicker.launchCameraAsync({ mediaTypes: ["images"], quality: 1 });
      } else {
        picked = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ["images"],
          quality: 1,
          allowsMultipleSelection: true,
          selectionLimit: room,
        });
      }
      if (picked.canceled) return;
      const ready: Shot[] = [];
      for (const asset of picked.assets.slice(0, room)) {
        const saved = await storage.preparePhoto(asset);
        ready.push({ id: uid(), uri: saved.uri });
      }
      setShots((current) => [...current, ...ready].slice(0, maxBagPhotos));
    } catch {
      setError("That photo could not be opened. Try another one.");
    }
  }

  async function build() {
    if (!shots.length) return;
    setError("");
    setStep("building");
    const controller = new AbortController();
    request.current = controller;
    try {
      const reply = await api.analyzeBag(
        shots.map((s) => s.uri),
        controller.signal,
      );
      if (controller.signal.aborted) return;
      setDraft(draftFrom(reply.bag, reply.assumptions));
      setStep("review");
    } catch (e) {
      if (e instanceof api.AbortedError || controller.signal.aborted) return;
      setError(e instanceof Error ? e.message : "Astra couldn't build this bag. Please retry.");
      setStep("photos");
    } finally {
      if (request.current === controller) request.current = null;
    }
  }

  function cancelBuild() {
    request.current?.abort();
    request.current = null;
    setStep("photos");
  }

  function close() {
    request.current?.abort();
    onClose();
  }

  const confirmDelete = () =>
    bag &&
    Alert.alert(`Delete ${bag.name}?`, "Items packed in it move back to the weekender.", [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: () => onDelete(bag.id) },
    ]);

  const title = bag ? "Edit your bag" : step === "review" ? "Check your bag" : "Add your own bag";

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={close}>
      <SafeAreaView style={styles.safe}>
        <KeyboardAvoidingView style={styles.safe} behavior={Platform.OS === "ios" ? "padding" : undefined}>
          <View style={styles.header}>
            <Text style={type.heading}>{title}</Text>
            <Pressable accessibilityRole="button" accessibilityLabel="Cancel" hitSlop={12} onPress={close}>
              <Text style={styles.cancel}>Cancel</Text>
            </Pressable>
          </View>

          {step === "photos" && (
            <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
              <Text style={type.body}>
                Photograph your bag from up to {maxBagPhotos} angles. Astra combines them into a 3D model and
                estimates how much it holds.
              </Text>
              <View style={styles.tips}>
                {[
                  ["scan-outline", "The whole bag from the front"],
                  ["return-up-forward-outline", "One side, to show its depth"],
                  ["file-tray-open-outline", "Open, to show the main compartment"],
                ].map(([icon, text]) => (
                  <View key={text} style={styles.tip}>
                    <Icon name={icon as "scan-outline"} size={18} color={colors.green} />
                    <Text style={type.secondary}>{text}</Text>
                  </View>
                ))}
              </View>
              <View style={styles.shots} accessibilityLabel={`${shots.length} of ${maxBagPhotos} photos added`}>
                {shots.map((shot, index) => (
                  <View key={shot.id} style={styles.shot}>
                    <Image source={{ uri: shot.uri }} style={styles.shotImage} accessibilityLabel={`Bag photo ${index + 1}`} />
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={`Remove photo ${index + 1}`}
                      hitSlop={8}
                      style={styles.remove}
                      onPress={() => setShots((s) => s.filter((x) => x.id !== shot.id))}
                    >
                      <Icon name="close" size={14} color={colors.white} />
                    </Pressable>
                  </View>
                ))}
                {Array.from({ length: maxBagPhotos - shots.length }, (_, i) => (
                  <View key={`empty-${i}`} style={[styles.shot, styles.emptyShot]}>
                    <Icon name="image-outline" size={22} color={colors.faint} />
                  </View>
                ))}
              </View>
              <View style={styles.row}>
                <Button
                  label="Take photo"
                  icon="camera-outline"
                  style={styles.flex}
                  disabled={shots.length >= maxBagPhotos}
                  onPress={() => addShots("camera")}
                />
                <Button
                  label="Choose photos"
                  icon="images-outline"
                  style={styles.flex}
                  disabled={shots.length >= maxBagPhotos}
                  onPress={() => addShots("library")}
                />
              </View>
              {!!error && <Banner tone="error">{error}</Banner>}
              <Button
                label={
                  shots.length
                    ? `Build my bag from ${shots.length} photo${shots.length === 1 ? "" : "s"}`
                    : "Build my bag"
                }
                kind="primary"
                icon="cube-outline"
                disabled={!shots.length}
                onPress={build}
              />
              <Button
                label="Enter the size myself"
                kind="quiet"
                onPress={() => {
                  setError("");
                  setDraft(blankDraft());
                  setStep("review");
                }}
              />
            </ScrollView>
          )}

          {step === "building" && (
            <View style={styles.building} accessibilityLiveRegion="polite">
              <ActivityIndicator size="large" color={colors.green} />
              <Text style={type.heading}>Building your bag</Text>
              <Text style={[type.secondary, styles.center]}>
                Astra is measuring it from {shots.length} angle{shots.length === 1 ? "" : "s"} and shaping its 3D
                model. This can take a minute or two.
              </Text>
              <Button label="Stop" kind="quiet" onPress={cancelBuild} />
            </View>
          )}

          {step === "review" && (
            <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
              <View style={styles.preview}>
                {visible && <BagPreview draft={draft} />}
                <Text style={styles.previewTag} pointerEvents="none">
                  {draft.mesh
                    ? `Astra 3D model · from ${draft.photoCount} photo${draft.photoCount === 1 ? "" : "s"}`
                    : "Measured by hand"}
                </Text>
              </View>
              {!!draft.assumptions && <Banner>{draft.assumptions}</Banner>}

              <Section title="Name">
                <TextInput
                  accessibilityLabel="Bag name"
                  style={styles.input}
                  value={draft.name}
                  maxLength={60}
                  returnKeyType="done"
                  onChangeText={(name) => update({ name })}
                />
              </Section>

              <Section title="Type">
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
                  {bagKinds.map((kind) => (
                    <Pressable
                      key={kind}
                      accessibilityRole="button"
                      accessibilityState={{ selected: draft.kind === kind }}
                      style={[styles.chip, draft.kind === kind && styles.chipActive]}
                      onPress={() => update({ kind, clamshell: kind === "suitcase" ? draft.clamshell : false })}
                    >
                      <Text style={[styles.chipText, draft.kind === kind && styles.chipTextActive]}>
                        {bagKindNames[kind]}
                      </Text>
                    </Pressable>
                  ))}
                </ScrollView>
              </Section>

              <Section
                title="Packing space"
                right={<Text style={type.secondary}>{result ? result.subtitle.split(" · ")[1] : "Check the sizes"}</Text>}
              >
                <Group>
                  {axisNames.map((label, index) => (
                    <View key={label} style={styles.sizeRow}>
                      <View style={styles.flex}>
                        <Text style={type.body}>{label}</Text>
                        <Text style={type.secondary}>{axisHints[index]}</Text>
                      </View>
                      <TextInput
                        accessibilityLabel={`${label} in centimetres`}
                        style={styles.sizeInput}
                        value={draft.sizeCm[index]}
                        keyboardType="decimal-pad"
                        maxLength={5}
                        selectTextOnFocus
                        onChangeText={(text) => {
                          const sizeCm = [...draft.sizeCm] as Draft["sizeCm"];
                          sizeCm[index] = text;
                          update({ sizeCm });
                        }}
                      />
                      <Text style={type.secondary}>cm</Text>
                    </View>
                  ))}
                </Group>
                <Text style={styles.meta}>
                  {draft.exterior
                    ? `The inside of the main compartment. Outside it's about ${draft.exterior
                        .map((n) => Math.round(n / 10))
                        .join(" × ")} cm.`
                    : "The inside of the main compartment."}{" "}
                  Each side from {minCm} to {maxCm} cm.
                </Text>
              </Section>

              {draft.kind === "suitcase" && (
                <Group>
                  <ToggleRow
                    label="Opens flat into two halves"
                    hint="Pack both the base and the lid, like the built-in suitcases"
                    value={draft.clamshell}
                    onChange={(clamshell) => update({ clamshell })}
                  />
                </Group>
              )}

              <Button
                label={bag ? "Save changes" : "Use this bag"}
                kind="primary"
                icon="checkmark"
                disabled={!result}
                onPress={() => result && onSave(result)}
              />
              {!bag && (
                <Button
                  label={draft.mesh ? "Retake photos" : "Use photos instead"}
                  kind="quiet"
                  onPress={() => {
                    setDraft(blankDraft());
                    setStep("photos");
                  }}
                />
              )}
              {bag && <Button label="Delete this bag" kind="danger" icon="trash-outline" onPress={confirmDelete} />}
            </ScrollView>
          )}
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
}

/** The pencil beside a custom bag in the bag picker. */
export function EditBagButton({ name, onPress }: { name: string; onPress: () => void }) {
  return <IconButton icon="create-outline" label={`Edit ${name}`} color={colors.green} onPress={onPress} />;
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.paper },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    minHeight: 52,
  },
  cancel: { color: colors.green, fontSize: 16, fontWeight: "600" },
  content: { padding: 16, paddingTop: 4, paddingBottom: 32, gap: 16 },
  tips: { gap: 8 },
  tip: { flexDirection: "row", alignItems: "center", gap: 10 },
  shots: { flexDirection: "row", gap: 10 },
  shot: { flex: 1, aspectRatio: 0.8, borderRadius: radius.sm, overflow: "hidden" },
  shotImage: { width: "100%", height: "100%" },
  emptyShot: {
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: colors.faint,
  },
  remove: {
    position: "absolute",
    top: 6,
    right: 6,
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(31, 43, 34, 0.7)",
  },
  row: { flexDirection: "row", gap: 10 },
  flex: { flex: 1 },
  building: { flex: 1, alignItems: "center", justifyContent: "center", gap: 14, padding: 32 },
  center: { textAlign: "center" },
  preview: { height: 210, borderRadius: radius.md, overflow: "hidden", backgroundColor: colors.canvas },
  previewTag: { position: "absolute", left: 12, bottom: 10, fontSize: 12, color: colors.muted, fontWeight: "600" },
  input: {
    borderRadius: radius.md,
    paddingHorizontal: 14,
    minHeight: 48,
    fontSize: 16,
    color: colors.ink,
    backgroundColor: colors.white,
  },
  chips: { gap: 8 },
  chip: { paddingHorizontal: 14, paddingVertical: 9, borderRadius: radius.pill, backgroundColor: colors.soft },
  chipActive: { backgroundColor: colors.green },
  chipText: { color: colors.ink, fontSize: 14 },
  chipTextActive: { color: colors.white },
  sizeRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 14, minHeight: 60 },
  sizeInput: {
    width: 72,
    minHeight: 40,
    borderRadius: radius.sm,
    paddingHorizontal: 10,
    textAlign: "right",
    fontSize: 16,
    color: colors.ink,
    backgroundColor: colors.paper,
  },
  meta: { ...type.secondary, paddingHorizontal: 4 },
});
