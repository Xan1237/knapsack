import { useState, type Dispatch } from "react";
import { ActivityIndicator, Image, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Button, Card, CategoryIcon, Eyebrow, Icon, IconButton } from "../components/ui";
import { type Item, type Plan, categories, categoryNames, uid } from "../domain";
import { type Action, type InventoryState, mergeSuggestions } from "../state";
import { colors, serif } from "../theme";

type Props = {
  state: InventoryState;
  current: Plan | null;
  canSave: boolean;
  ready: boolean;
  dispatch: Dispatch<Action>;
  onOpen: (id: string) => void;
  addPhotos: (source: "camera" | "library") => void;
  samplePhoto: () => void;
  importFile: () => void;
  savePlan: () => void;
  loadDemo: () => void;
  reviewMerge: (a: string, b: string) => void;
};

function itemStatus(item: Item, current: Plan | null) {
  if (!item.included) return { icon: "remove" as const, color: colors.muted, label: "Excluded" };
  if (current && !current.placements.some((p) => p.id === item.id))
    return { icon: "alert" as const, color: colors.orange, label: "Unplaced" };
  return { icon: "checkmark" as const, color: colors.green, label: "Included" };
}

export default function BelongingsTab(p: Props) {
  const { state, current, dispatch } = p;
  const [addOpen, setAddOpen] = useState(false);
  const included = state.items.filter((i) => i.included).length;
  const photosFull = !p.ready || state.photos.length >= 12;
  const full = state.items.length >= 80;
  return (
    <ScrollView contentContainerStyle={styles.content}>
      <View style={styles.heading}>
        <View>
          <Eyebrow>THE ESSENTIALS</Eyebrow>
          <Text style={styles.title}>Your belongings</Text>
        </View>
        <IconButton
          icon="add"
          label="Add item"
          disabled={full}
          active={addOpen}
          onPress={() => setAddOpen((v) => !v)}
        />
      </View>
      {addOpen && (
        <Card>
          <Text style={styles.strong}>Add an item manually</Text>
          <View style={styles.grid}>
            {categories.map((c) => (
              <Pressable
                key={c}
                accessibilityRole="button"
                accessibilityLabel={`Add ${categoryNames[c]}`}
                style={styles.gridItem}
                onPress={() => {
                  const id = uid();
                  dispatch({ type: "add", category: c, id });
                  setAddOpen(false);
                  p.onOpen(id);
                }}
              >
                <CategoryIcon category={c} size={20} color={colors.green} />
                <Text style={styles.gridLabel}>{categoryNames[c]}</Text>
              </Pressable>
            ))}
          </View>
        </Card>
      )}
      <View style={styles.row}>
        <Button label="Take a photo" icon="camera-outline" kind="primary" style={styles.grow} disabled={photosFull} onPress={() => p.addPhotos("camera")} />
        <Button label="Choose photos" icon="images-outline" style={styles.grow} disabled={photosFull} onPress={() => p.addPhotos("library")} />
      </View>
      <Button label="Try a sample photo" icon="sparkles-outline" kind="quiet" disabled={photosFull} onPress={p.samplePhoto} />
      <Text style={styles.note}>
        Photos go through your Knapsack server to OpenAI for analysis and stay on this phone. No app
        server storage. Sizes are estimates.
      </Text>
      {state.photos.length > 0 && (
        <Card>
          {state.photos.map((photo) => (
            <View key={photo.id} style={styles.photoRow}>
              {photo.url ? <Image source={{ uri: photo.url }} style={styles.photo} /> : <View style={styles.photo} />}
              <View style={styles.grow}>
                <Text style={styles.strong} numberOfLines={1}>
                  {photo.name}
                </Text>
                <Text style={[styles.note, photo.status === "error" && styles.error]}>
                  {photo.status === "analyzing"
                    ? "Astra is creating your 3D meshes…"
                    : photo.status === "queued"
                      ? "Queued for analysis"
                      : photo.status === "done"
                        ? "3D mesh ready"
                        : photo.error}
                </Text>
              </View>
              {photo.status === "analyzing" || photo.status === "queued" ? (
                <ActivityIndicator size="small" color={colors.green} />
              ) : photo.status === "error" && !photo.accepted && photo.url ? (
                <Button
                  label="Retry"
                  onPress={() => dispatch({ type: "retry", id: photo.id, requestId: uid() })}
                />
              ) : photo.status === "done" ? (
                <Icon name="checkmark" size={18} color={colors.green} />
              ) : null}
            </View>
          ))}
        </Card>
      )}
      <View style={styles.inventoryLabel}>
        <Eyebrow>{state.demo ? "DEMO INVENTORY" : "YOUR INVENTORY"}</Eyebrow>
        <Eyebrow>{included} INCLUDED</Eyebrow>
      </View>
      {state.items.map((item) => {
        const status = itemStatus(item, current);
        const photo = state.photos.find((x) => item.sourceIds.includes(x.id) && x.url);
        return (
          <View key={item.id} style={[styles.item, !item.included && styles.excluded]}>
            <Pressable
              accessibilityRole="checkbox"
              accessibilityLabel={`Include ${item.label}`}
              accessibilityState={{ checked: item.included, disabled: !!item.required }}
              disabled={!!item.required}
              hitSlop={8}
              onPress={() => dispatch({ type: "edit", id: item.id, patch: { included: !item.included } })}
            >
              <Icon
                name={item.included ? "checkbox" : "square-outline"}
                size={24}
                color={item.required ? colors.muted : colors.green}
              />
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Edit ${item.label}`}
              style={styles.itemMain}
              onPress={() => p.onOpen(item.id)}
            >
              <View style={[styles.thumb, { backgroundColor: `${item.color}45` }]}>
                {photo ? (
                  <Image source={{ uri: photo.url }} style={styles.thumbImage} />
                ) : (
                  <CategoryIcon category={item.category} color={colors.ink} />
                )}
              </View>
              <View style={styles.grow}>
                <Text style={styles.strong} numberOfLines={1}>
                  {item.label}
                </Text>
                <Text style={styles.note} numberOfLines={1}>
                  {item.demo ? "Demo · " : item.mesh ? "Astra 3D · " : ""}
                  {categoryNames[item.category]}
                  {item.edited ? " · adjusted" : ""}
                </Text>
              </View>
              <View accessibilityLabel={status.label}>
                <Icon name={status.icon} size={18} color={status.color} />
              </View>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`${item.required ? "Unpin" : "Pin"} ${item.label} as essential`}
              hitSlop={8}
              onPress={() => dispatch({ type: "edit", id: item.id, patch: { required: !item.required } })}
            >
              <Icon
                name={item.required ? "lock-closed" : "lock-open-outline"}
                size={20}
                color={item.required ? colors.orange : colors.muted}
              />
            </Pressable>
          </View>
        );
      })}
      {state.items.length === 0 && (
        <Card style={styles.emptyCard}>
          <Text style={styles.title}>Pack a possibility.</Text>
          <Text style={styles.note}>Add photos or choose a category to begin.</Text>
          <Button label="Add an item" icon="add" onPress={() => setAddOpen(true)} />
        </Card>
      )}
      {full && <Text style={styles.note}>80-item limit reached. Remove an item to add another.</Text>}
      {mergeSuggestions(state.items).map(([a, b]) => (
        <Card key={`${a.id}-${b.id}`}>
          <Text style={styles.strong}>Multiple views?</Text>
          <Text style={styles.note}>
            Two photos suggest "{a.label}". Keep both for separate belongings, or review a merge.
          </Text>
          <Button label="Review suggested merge" onPress={() => p.reviewMerge(a.id, b.id)} />
        </Card>
      ))}
      <View style={styles.row}>
        <Button label="Import" icon="download-outline" style={styles.grow} onPress={p.importFile} />
        <Button label="Save plan" icon="share-outline" style={styles.grow} disabled={!p.canSave} onPress={p.savePlan} />
      </View>
      <Button label="Load demo" icon="arrow-forward" kind="quiet" onPress={p.loadDemo} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, gap: 12 },
  heading: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  title: { color: colors.ink, fontFamily: serif, fontSize: 24 },
  strong: { color: colors.ink, fontWeight: "600", fontSize: 14 },
  note: { color: colors.muted, fontSize: 12, lineHeight: 17 },
  error: { color: colors.error },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  gridItem: {
    width: "23%",
    flexGrow: 1,
    minHeight: 60,
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    borderRadius: 10,
    backgroundColor: colors.soft,
  },
  gridLabel: { color: colors.ink, fontSize: 11 },
  row: { flexDirection: "row", gap: 8 },
  grow: { flex: 1 },
  photoRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 4 },
  photo: { width: 36, height: 36, borderRadius: 6, backgroundColor: colors.soft },
  inventoryLabel: { flexDirection: "row", justifyContent: "space-between", marginTop: 6 },
  item: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 10,
    backgroundColor: colors.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.line,
  },
  excluded: { opacity: 0.55 },
  itemMain: { flex: 1, flexDirection: "row", alignItems: "center", gap: 10 },
  thumb: {
    width: 42,
    height: 42,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  thumbImage: { width: 42, height: 42 },
  emptyCard: { alignItems: "center" },
});
