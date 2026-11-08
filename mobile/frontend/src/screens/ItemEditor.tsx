import { useState, type Dispatch } from "react";
import { Alert, Image, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import ItemPreview from "../components/ItemPreview";
import { ActionRow, Button, Group, Icon, Section, SliderRow, ToggleRow } from "../components/ui";
import { type Item, type Photo, type Vec3, categoryNames, formatSize, sizeOf, uid } from "../domain";
import type { Action } from "../state";
import { colors, radius, type } from "../theme";

export default function ItemEditor({
  visible,
  item,
  items,
  photos,
  mergeWith,
  setMergeWith,
  dispatch,
  onClose,
  onSelect,
}: {
  visible: boolean;
  item: Item;
  items: Item[];
  photos: Photo[];
  mergeWith: string;
  setMergeWith: (id: string) => void;
  dispatch: Dispatch<Action>;
  onClose: () => void;
  onSelect: (id: string | null) => void;
}) {
  const [name, setName] = useState(item.label);
  const [advanced, setAdvanced] = useState(false);
  const [mergeOpen, setMergeOpen] = useState(false);
  const edit = (patch: Extract<Action, { type: "edit" }>["patch"]) =>
    dispatch({ type: "edit", id: item.id, patch });
  const uniform = Math.cbrt(item.scale.reduce((v, n) => v * n, 1));
  const updateScale = (value: number) =>
    edit({
      scale: item.scale.map((n) => Math.min(5, Math.max(0.1, (n * value) / uniform))) as Vec3,
    });
  const sources = photos.filter((p) => item.sourceIds.includes(p.id) && p.url);
  const showMerge = mergeOpen || !!mergeWith;
  const origin = item.sourceIds.length
    ? `From ${item.sourceIds.length} photo${item.sourceIds.length === 1 ? "" : "s"}`
    : item.modelUrl
      ? "3D model shown as a simple shape"
      : "Standard size";

  const confirmDelete = () =>
    Alert.alert(`Delete ${item.label}?`, "This removes it from your trip.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => {
          dispatch({ type: "delete", id: item.id });
          onClose();
          onSelect(null);
        },
      },
    ]);

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={styles.safe}>
        <KeyboardAvoidingView style={styles.safe} behavior={Platform.OS === "ios" ? "padding" : undefined}>
          <View style={styles.header}>
            <Text style={type.heading}>Edit item</Text>
            <Pressable accessibilityRole="button" accessibilityLabel="Done" hitSlop={12} onPress={onClose}>
              <Text style={styles.done}>Done</Text>
            </Pressable>
          </View>
          <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
            <View style={styles.preview}>
              {visible && <ItemPreview item={item} background={colors.canvas} />}
              <Text style={styles.previewTag} pointerEvents="none">
                {item.mesh ? "Astra 3D model" : "Estimated shape"}
              </Text>
            </View>

            <Section title="Name">
              <TextInput
                accessibilityLabel="Item name"
                style={styles.input}
                value={name}
                maxLength={60}
                returnKeyType="done"
                onChangeText={(text) => {
                  setName(text);
                  if (text.trim()) edit({ label: text });
                }}
                onBlur={() => {
                  if (!name.trim()) {
                    setName("Untitled item");
                    edit({ label: "Untitled item" });
                  }
                }}
              />
              <Text style={styles.meta}>
                {categoryNames[item.category]} · {origin}
              </Text>
              {sources.length > 0 && (
                <View style={styles.sources}>
                  {sources.map((p) => (
                    <Image key={p.id} source={{ uri: p.url }} style={styles.source} accessibilityLabel={`Source photo: ${p.name}`} />
                  ))}
                </View>
              )}
            </Section>

            <Section title="Size" right={<Text style={type.secondary}>{formatSize(sizeOf(item))}</Text>}>
              <Group>
                <SliderRow
                  label="Overall size"
                  valueText={`${Math.round(uniform * 100)}%`}
                  value={Math.round(uniform * 100)}
                  min={20}
                  max={300}
                  onChange={(v) => updateScale(v / 100)}
                />
                {item.category === "clothing" && (
                  <SliderRow
                    label="Compression"
                    hint="Press folded clothes flatter to make room."
                    valueText={`${Math.round((item.compression ?? 0) * 100)}%`}
                    value={Math.round((item.compression ?? 0) * 100)}
                    min={0}
                    max={40}
                    step={5}
                    onChange={(v) => edit({ compression: v / 100 })}
                  />
                )}
                <ActionRow
                  label="Adjust width, length and height"
                  onPress={() => setAdvanced((v) => !v)}
                  trailing={<Icon name={advanced ? "chevron-up" : "chevron-down"} size={18} color={colors.faint} />}
                />
                {advanced &&
                  ["Width", "Length", "Height"].map((label, index) => (
                    <SliderRow
                      key={label}
                      label={label}
                      valueText={`${Math.round(item.scale[index] * 100)}%`}
                      value={Math.round(item.scale[index] * 100)}
                      min={20}
                      max={300}
                      onChange={(v) => {
                        const scale = [...item.scale] as Vec3;
                        scale[index] = v / 100;
                        edit({ scale });
                      }}
                    />
                  ))}
                {advanced && <Button label="Restore estimated size" kind="quiet" onPress={() => edit({ scale: [1, 1, 1] })} />}
              </Group>
            </Section>

            <Section title="Packing">
              <Group>
                <ToggleRow
                  label="Bring on this trip"
                  hint={item.required ? "Essentials always come along" : undefined}
                  value={item.included}
                  disabled={!!item.required}
                  onChange={(included) => edit({ included })}
                />
                <ToggleRow
                  label="Essential"
                  hint="Suggestions never leave it behind"
                  value={!!item.required}
                  onChange={(required) => edit({ required })}
                />
                <ToggleRow
                  label="Can lie on its side"
                  value={item.orientations.length === 6}
                  onChange={(on) => edit({ orientations: on ? [0, 1, 2, 3, 4, 5] : [0, 1] })}
                />
              </Group>
            </Section>

            <Group>
              <ActionRow
                icon="copy-outline"
                label="Duplicate"
                disabled={items.length >= 80}
                onPress={() => {
                  const id = uid();
                  dispatch({ type: "duplicate", id: item.id, newId: id });
                  onSelect(id);
                }}
              />
              {items.length > 1 && (
                <ActionRow
                  icon="git-merge-outline"
                  label="Merge with another item"
                  hint="For two photos of the same thing"
                  onPress={() => {
                    if (showMerge) setMergeWith("");
                    setMergeOpen(!showMerge);
                  }}
                  trailing={<Icon name={showMerge ? "chevron-up" : "chevron-down"} size={18} color={colors.faint} />}
                />
              )}
              {items.length > 1 && showMerge && (
                <View style={styles.merge}>
                  <Text style={type.secondary}>Keeps this item's size and combines the photos.</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips} keyboardShouldPersistTaps="handled">
                    {items
                      .filter((i) => i.id !== item.id)
                      .map((i) => (
                        <Pressable
                          key={i.id}
                          accessibilityRole="button"
                          accessibilityState={{ selected: mergeWith === i.id }}
                          style={[styles.chip, mergeWith === i.id && styles.chipActive]}
                          onPress={() => setMergeWith(mergeWith === i.id ? "" : i.id)}
                        >
                          <Text style={[styles.chipText, mergeWith === i.id && styles.chipTextActive]} numberOfLines={1}>
                            {i.label}
                          </Text>
                        </Pressable>
                      ))}
                  </ScrollView>
                  <Button
                    label="Merge into this item"
                    size="small"
                    disabled={!mergeWith}
                    onPress={() => {
                      dispatch({ type: "merge", target: item.id, source: mergeWith });
                      setMergeWith("");
                      setMergeOpen(false);
                    }}
                  />
                </View>
              )}
              <ActionRow icon="trash-outline" label="Delete item" destructive onPress={confirmDelete} />
            </Group>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
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
  done: { color: colors.green, fontSize: 16, fontWeight: "700" },
  content: { padding: 16, paddingTop: 4, paddingBottom: 32, gap: 20 },
  preview: { height: 190, borderRadius: radius.md, overflow: "hidden", backgroundColor: colors.canvas },
  previewTag: { position: "absolute", left: 12, bottom: 10, fontSize: 12, color: colors.muted, fontWeight: "600" },
  input: {
    borderRadius: radius.md,
    paddingHorizontal: 14,
    minHeight: 48,
    fontSize: 16,
    color: colors.ink,
    backgroundColor: colors.white,
  },
  meta: { ...type.secondary, paddingHorizontal: 4 },
  sources: { flexDirection: "row", gap: 8, flexWrap: "wrap", paddingHorizontal: 4 },
  source: { width: 52, height: 52, borderRadius: 8 },
  merge: { paddingHorizontal: 14, paddingVertical: 12, gap: 10 },
  chips: { gap: 8 },
  chip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: radius.pill, backgroundColor: colors.soft, maxWidth: 190 },
  chipActive: { backgroundColor: colors.green },
  chipText: { color: colors.ink, fontSize: 14 },
  chipTextActive: { color: colors.white },
});
