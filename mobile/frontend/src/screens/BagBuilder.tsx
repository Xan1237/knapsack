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
import BagPreview from "../components/BagPreview";
import { Banner, Button, Group, Icon, IconButton, Section, ToggleRow } from "../components/ui";
import {
  type BagKind,
  type BagMaterial,
  type BagShape,
  type BagStyle,
  type Suitcase,
  type Vec3,
  bagKindNames,
  bagKinds,
  bagMaterialNames,
  bagMaterials,
  bagShapeNames,
  bagShapes,
  bagStyleFor,
  bagSubtitle,
  bagUsable,
  customBagPrefix,
  uid,
} from "../domain";
import * as storage from "../storage";
import { colors, radius, type } from "../theme";

export const maxBagPhotos = 4;
/**
 * How each kind sits while being packed, so the three sizes read naturally: backpacks and
 * suitcases lie on their back, duffels rest on their base, totes stand up.
 */
const axes: Record<BagKind, [string, string][]> = {
  backpack: [["Width", "Side to side"], ["Height", "Top to bottom"], ["Depth", "Front to back"]],
  suitcase: [["Width", "Side to side"], ["Height", "Top to bottom"], ["Depth", "Front to back"]],
  duffel: [["Length", "End to end"], ["Width", "Front to back"], ["Height", "Base to opening"]],
  tote: [["Width", "Side to side"], ["Depth", "Front to back"], ["Height", "Base to opening"]],
  other: [["Width", "Side to side"], ["Length", "Front to back"], ["Depth", "Base to opening"]],
};
/** Colors to choose from; the bag's own reading is added in front when it's not one of these. */
const swatches = [
  "#1f2326", "#3d4a5c", "#2c3b33", "#56653f", "#7a2e2a", "#b8452f",
  "#c98f3e", "#d8c7a6", "#8fa7b8", "#6b3b2a", "#9a9c98", "#e9e5dc",
];
const defaultColor = "#3d4a5c";
// Packing space in whole centimetres; larger than this is furniture, not luggage.
const minCm = 8;
const maxCm = 200;

type Shot = { id: string; uri: string };
type Draft = {
  name: string;
  kind: BagKind;
  sizeCm: [string, string, string];
  clamshell: boolean;
  color: string;
  style: BagStyle;
  appearance?: string;
  exterior?: Vec3;
  meshModel?: string;
  photoCount: number;
  assumptions: string;
};

const blankDraft = (): Draft => ({
  name: "My bag",
  kind: "backpack",
  sizeCm: ["30", "45", "18"],
  clamshell: false,
  color: defaultColor,
  style: bagStyleFor("backpack", undefined, defaultColor),
  photoCount: 0,
  assumptions: "",
});

function draftFrom(bag: Suitcase, assumptions = ""): Draft {
  const kind = bag.kind ?? (bag.clamshell ? "suitcase" : "other");
  const color = bag.color ?? defaultColor;
  return {
    name: bag.name,
    kind,
    sizeCm: bag.dimensions.map((n) => String(Math.round(n / 10))) as Draft["sizeCm"],
    clamshell: !!bag.clamshell,
    color,
    style: bagStyleFor(kind, bag.style, color),
    appearance: bag.appearance,
    exterior: bag.exterior,
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
    color: draft.color,
    style: draft.style,
    ...(draft.appearance ? { appearance: draft.appearance } : {}),
    ...(draft.exterior ? { exterior: draft.exterior } : {}),
    ...(draft.meshModel ? { meshModel: draft.meshModel } : {}),
  };
  return bagUsable(bag) ? bag : null;
}

/** The draft as the suitcase view will draw it, at a stand-in size while a side is invalid. */
function previewBag(draft: Draft): Suitcase {
  return (
    bagFromDraft(draft, "preview") ??
    bagFromDraft({ ...draft, sizeCm: draft.kind === "duffel" ? ["55", "28", "28"] : draft.kind === "tote" ? ["40", "15", "32"] : ["30", "45", "18"] }, "preview") ?? {
      id: "preview",
      name: "",
      subtitle: "",
      dimensions: [300, 450, 180],
      clearance: 5,
      kind: draft.kind,
      color: draft.color,
      style: draft.style,
    }
  );
}

/** A row of tappable color dots. */
function Swatches({ label, value, onChange }: { label: string; value: string; onChange: (color: string) => void }) {
  const options = swatches.includes(value.toLowerCase()) ? swatches : [value, ...swatches];
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.swatches}>
      {options.map((color) => {
        const selected = color.toLowerCase() === value.toLowerCase();
        return (
          <Pressable
            key={color}
            accessibilityRole="button"
            accessibilityLabel={`${label} color ${color}`}
            accessibilityState={{ selected }}
            hitSlop={4}
            onPress={() => onChange(color)}
            style={[styles.swatch, selected && styles.swatchSelected]}
          >
            <View style={[styles.swatchFill, { backgroundColor: color }]} />
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

/** Pill buttons for one choice among a few. */
function Chips<T extends string>({ options, names, value, onChange }: { options: readonly T[]; names: Record<T, string>; value: T; onChange: (value: T) => void }) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
      {options.map((option) => (
        <Pressable
          key={option}
          accessibilityRole="button"
          accessibilityState={{ selected: value === option }}
          style={[styles.chip, value === option && styles.chipActive]}
          onPress={() => onChange(option)}
        >
          <Text style={[styles.chipText, value === option && styles.chipTextActive]}>{names[option]}</Text>
        </Pressable>
      ))}
    </ScrollView>
  );
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
  const restyle = (patch: Partial<BagStyle>) => setDraft((d) => ({ ...d, style: { ...d.style, ...patch } }));
  const changeKind = (kind: BagKind) =>
    setDraft((d) => ({
      ...d,
      kind,
      clamshell: kind === "suitcase" ? d.clamshell : false,
      // Keep the colors and material; take the new kind's usual shape and details.
      style: {
        ...bagStyleFor(kind, undefined, d.color),
        material: kind === "suitcase" || !["hardshell", "aluminum"].includes(d.style.material) ? d.style.material : "nylon",
        accent: d.style.accent,
      },
    }));
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
                {visible && <BagPreview bag={previewBag(draft)} background={colors.canvas} />}
                <Text style={styles.previewTag} pointerEvents="none">
                  {draft.photoCount
                    ? `Read by Astra from ${draft.photoCount} photo${draft.photoCount === 1 ? "" : "s"}`
                    : "Your own design"}
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
                <Chips options={bagKinds} names={bagKindNames} value={draft.kind} onChange={changeKind} />
              </Section>

              <Section title="Look">
                <Text style={styles.label}>Shape</Text>
                <Chips
                  options={bagShapes[draft.kind] as readonly BagShape[]}
                  names={bagShapeNames}
                  value={draft.style.shape}
                  onChange={(shape) => restyle({ shape })}
                />
                <Text style={styles.label}>Material</Text>
                <Chips
                  options={bagMaterials.filter((m) => draft.kind === "suitcase" || (m !== "hardshell" && m !== "aluminum")) as BagMaterial[]}
                  names={bagMaterialNames}
                  value={draft.style.material}
                  onChange={(material) => restyle({ material })}
                />
                <Text style={styles.label}>Color</Text>
                <Swatches label="Body" value={draft.color} onChange={(color) => update({ color })} />
                <Text style={styles.label}>Zips, straps and trim</Text>
                <Swatches label="Accent" value={draft.style.accent} onChange={(accent) => restyle({ accent })} />
              </Section>

              {(draft.kind === "backpack" || draft.kind === "duffel" || draft.kind === "suitcase") && (
                <Group>
                  {draft.kind === "backpack" && (
                    <ToggleRow label="Padded front pocket" value={draft.style.frontPocket} onChange={(frontPocket) => restyle({ frontPocket })} />
                  )}
                  {draft.kind === "backpack" && (
                    <ToggleRow label="Bottle pocket" value={draft.style.sidePockets} onChange={(sidePockets) => restyle({ sidePockets })} />
                  )}
                  {draft.kind === "duffel" && (
                    <ToggleRow label="End pockets" value={draft.style.frontPocket} onChange={(frontPocket) => restyle({ frontPocket })} />
                  )}
                  {draft.kind === "suitcase" && (
                    <ToggleRow label="Wheels" value={draft.style.wheels} onChange={(wheels) => restyle({ wheels })} />
                  )}
                </Group>
              )}

              <Section
                title="Packing space"
                right={<Text style={type.secondary}>{result ? result.subtitle.split(" · ")[1] : "Check the sizes"}</Text>}
              >
                <Group>
                  {axes[draft.kind].map(([label, hint], index) => (
                    <View key={label} style={styles.sizeRow}>
                      <View style={styles.flex}>
                        <Text style={type.body}>{label}</Text>
                        <Text style={type.secondary}>{hint}</Text>
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
                  label={draft.photoCount ? "Retake photos" : "Use photos instead"}
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
  label: { ...type.secondary, paddingHorizontal: 4, marginTop: 2 },
  swatches: { gap: 10, paddingVertical: 2, paddingHorizontal: 2 },
  swatch: { width: 34, height: 34, borderRadius: 17, padding: 3, borderWidth: 2, borderColor: "transparent" },
  swatchSelected: { borderColor: colors.green },
  swatchFill: { flex: 1, borderRadius: 14, borderWidth: StyleSheet.hairlineWidth, borderColor: "rgba(0,0,0,0.2)" },
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
