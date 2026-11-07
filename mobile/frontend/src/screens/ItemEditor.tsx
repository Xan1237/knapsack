import { useState, type Dispatch } from "react";
import { Image, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import ItemPreview from "../components/ItemPreview";
import { Button, Card, Check, Eyebrow, Icon, IconButton, Slider } from "../components/ui";
import { type Item, type Photo, type Vec3, categoryNames, uid } from "../domain";
import type { Action } from "../state";
import { colors, serif } from "../theme";

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
  const edit = (patch: Extract<Action, { type: "edit" }>["patch"]) =>
    dispatch({ type: "edit", id: item.id, patch });
  const uniform = Math.cbrt(item.scale.reduce((v, n) => v * n, 1));
  const updateScale = (value: number) =>
    edit({
      scale: item.scale.map((n) => Math.min(5, Math.max(0.1, (n * value) / uniform))) as Vec3,
    });
  const sources = photos.filter((p) => item.sourceIds.includes(p.id) && p.url);
  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={styles.safe}>
        <KeyboardAvoidingView style={styles.safe} behavior={Platform.OS === "ios" ? "padding" : undefined}>
          <View style={styles.heading}>
            <View>
              <Eyebrow>MAKE IT YOURS</Eyebrow>
              <Text style={styles.title}>A better fit.</Text>
            </View>
            <IconButton icon="close" label="Close item editor" onPress={onClose} />
          </View>
          <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
            <View style={styles.preview}>
              {visible && <ItemPreview item={item} background="#eeeae1" />}
              <Text style={styles.previewTag} pointerEvents="none">
                {item.mesh ? "ASTRA-GENERATED 3D" : "ESTIMATED 3D ITEM"}
              </Text>
            </View>
            <Eyebrow>ITEM NAME</Eyebrow>
            <TextInput
              accessibilityLabel="Item name"
              style={styles.input}
              value={name}
              maxLength={60}
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
            <Text style={styles.note}>
              {categoryNames[item.category]} ·{" "}
              {item.sourceIds.length
                ? `${item.sourceIds.length} source photo${item.sourceIds.length === 1 ? "" : "s"}`
                : item.modelUrl
                  ? "3D model asset (shown as a category shape on mobile)"
                  : "Category template"}
            </Text>
            {sources.length > 0 && (
              <View style={styles.sources}>
                {sources.map((p) => (
                  <Image key={p.id} source={{ uri: p.url }} style={styles.source} accessibilityLabel={`Source photo: ${p.name}`} />
                ))}
              </View>
            )}
            <Card>
              <View style={styles.between}>
                <Text style={styles.strong}>Make room for the real thing.</Text>
                <Text style={styles.strong}>{Math.round(uniform * 100)}%</Text>
              </View>
              <Text style={styles.note}>Adjust its size beside your suitcase.</Text>
              <Slider label="Item size" value={Math.round(uniform * 100)} min={20} max={300} onChange={(v) => updateScale(v / 100)} />
            </Card>
            {item.category === "clothing" && (
              <Card>
                <View style={styles.between}>
                  <Text style={styles.strong}>Clothing compression</Text>
                  <Text style={styles.strong}>{Math.round((item.compression ?? 0) * 100)}%</Text>
                </View>
                <Text style={styles.note}>Press folded clothes flatter to make room.</Text>
                <Slider
                  label="Clothing compression"
                  value={Math.round((item.compression ?? 0) * 100)}
                  min={0}
                  max={40}
                  step={5}
                  onChange={(v) => edit({ compression: v / 100 })}
                />
              </Card>
            )}
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ expanded: advanced }}
              style={styles.between}
              onPress={() => setAdvanced((v) => !v)}
            >
              <Text style={styles.strong}>Fine-tune the shape</Text>
              <Icon name={advanced ? "chevron-up" : "chevron-down"} size={18} color={colors.ink} />
            </Pressable>
            {advanced && (
              <Card>
                {["Width", "Length", "Height"].map((label, index) => (
                  <View key={label}>
                    <Text style={styles.note}>
                      {label} · {Math.round(item.scale[index] * 100)}%
                    </Text>
                    <Slider
                      label={`Item ${label.toLowerCase()}`}
                      value={Math.round(item.scale[index] * 100)}
                      min={20}
                      max={300}
                      onChange={(v) => {
                        const scale = [...item.scale] as Vec3;
                        scale[index] = v / 100;
                        edit({ scale });
                      }}
                    />
                  </View>
                ))}
                <Button label="Restore estimated size" kind="quiet" onPress={() => edit({ scale: [1, 1, 1] })} />
              </Card>
            )}
            <Check label="Include in this trip" checked={item.included} disabled={!!item.required} onChange={(included) => edit({ included })} />
            <Check label="Always bring this essential" checked={!!item.required} onChange={(required) => edit({ required })} />
            <Check
              label="Allow tipping on its side"
              checked={item.orientations.length === 6}
              onChange={(on) => edit({ orientations: on ? [0, 1, 2, 3, 4, 5] : [0, 1] })}
            />
            <View style={styles.row}>
              <Button
                label="Duplicate"
                icon="copy-outline"
                style={styles.grow}
                disabled={items.length >= 80}
                onPress={() => {
                  const id = uid();
                  dispatch({ type: "duplicate", id: item.id, newId: id });
                  onSelect(id);
                }}
              />
              <Button
                label="Delete"
                icon="trash-outline"
                style={styles.grow}
                onPress={() => {
                  dispatch({ type: "delete", id: item.id });
                  onClose();
                  onSelect(null);
                }}
              />
            </View>
            {items.length > 1 && (
              <Card>
                <Text style={styles.strong}>Same belonging in two photos?</Text>
                <Text style={styles.note}>
                  Keeps this item's size and combines source photos. Use only for multiple views of one object.
                </Text>
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
                  label="Merge into selected item"
                  disabled={!mergeWith}
                  onPress={() => {
                    dispatch({ type: "merge", target: item.id, source: mergeWith });
                    setMergeWith("");
                  }}
                />
              </Card>
            )}
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.paper },
  heading: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  title: { color: colors.ink, fontFamily: serif, fontSize: 24 },
  content: { padding: 16, paddingTop: 4, gap: 12 },
  preview: { height: 200, borderRadius: 14, overflow: "hidden", backgroundColor: colors.canvas },
  previewTag: { position: "absolute", left: 10, bottom: 8, fontSize: 10, letterSpacing: 1, color: colors.muted, fontWeight: "700" },
  input: {
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    color: colors.ink,
    backgroundColor: colors.white,
  },
  note: { color: colors.muted, fontSize: 12, lineHeight: 17 },
  strong: { color: colors.ink, fontWeight: "600", fontSize: 14, flexShrink: 1 },
  between: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 10, minHeight: 28 },
  sources: { flexDirection: "row", gap: 8, flexWrap: "wrap" },
  source: { width: 48, height: 48, borderRadius: 8 },
  row: { flexDirection: "row", gap: 8 },
  grow: { flex: 1 },
  chips: { gap: 8 },
  chip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 16, backgroundColor: colors.soft, maxWidth: 190 },
  chipActive: { backgroundColor: colors.green },
  chipText: { color: colors.ink, fontSize: 13 },
  chipTextActive: { color: colors.white },
});
