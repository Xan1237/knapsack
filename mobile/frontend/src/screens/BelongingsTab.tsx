import { useState, type Dispatch } from "react";
import { ActivityIndicator, Image, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { afterSheet, Sheet } from "../components/Sheet";
import { ActionRow, Banner, Button, CategoryIcon, Group, Icon, Section } from "../components/ui";
import { type Item, type Photo, type Plan, categories, categoryNames, formatSize, sizeOf, uid } from "../domain";
import { type Action, type InventoryState, mergeSuggestions } from "../state";
import { colors, radius, shadow, type } from "../theme";

type Props = {
  state: InventoryState;
  current: Plan | null;
  ready: boolean;
  addOpen: boolean;
  setAddOpen: (open: boolean) => void;
  dispatch: Dispatch<Action>;
  onOpen: (id: string) => void;
  addPhotos: (source: "camera" | "library") => void;
  samplePhoto: () => void;
  loadDemo: () => void;
  reviewMerge: (a: string, b: string) => void;
};

function ItemRow({
  item,
  photo,
  current,
  dispatch,
  onOpen,
}: {
  item: Item;
  photo?: Photo;
  current: Plan | null;
  dispatch: Dispatch<Action>;
  onOpen: (id: string) => void;
}) {
  const unplaced = item.included && !!current && !current.placements.some((p) => p.id === item.id);
  const detail = !item.included
    ? "Staying home"
    : item.aside
      ? "Beside the suitcase"
      : unplaced
      ? "Doesn't fit yet"
      : `${item.mesh ? "Astra 3D · " : ""}${formatSize(sizeOf(item))}`;
  return (
    <View style={styles.item}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Edit ${item.label}`}
        style={({ pressed }) => [styles.itemMain, !item.included && styles.excluded, pressed && { opacity: 0.6 }]}
        onPress={() => onOpen(item.id)}
      >
        <View style={[styles.thumb, { backgroundColor: `${item.color}45` }]}>
          {photo ? (
            <Image source={{ uri: photo.url }} style={styles.thumbImage} />
          ) : (
            <CategoryIcon category={item.category} color={colors.ink} />
          )}
        </View>
        <View style={styles.grow}>
          <Text style={type.bodyStrong} numberOfLines={1}>
            {item.label}
          </Text>
          <Text style={[type.secondary, unplaced && styles.warn]} numberOfLines={1}>
            {detail}
          </Text>
        </View>
      </Pressable>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${item.required ? "Unpin" : "Pin"} ${item.label} as essential`}
        accessibilityState={{ selected: !!item.required }}
        style={styles.itemControl}
        onPress={() => dispatch({ type: "edit", id: item.id, patch: { required: !item.required } })}
      >
        <Icon
          name={item.required ? "lock-closed" : "lock-open-outline"}
          size={19}
          color={item.required ? colors.warn : colors.faint}
        />
      </Pressable>
      <Pressable
        accessibilityRole="checkbox"
        accessibilityLabel={`Include ${item.label}`}
        accessibilityState={{ checked: item.included, disabled: !!item.required }}
        disabled={!!item.required}
        style={styles.itemControl}
        onPress={() => dispatch({ type: "edit", id: item.id, patch: { included: !item.included } })}
      >
        <Icon
          name={item.included ? "checkmark-circle" : "ellipse-outline"}
          size={26}
          color={!item.included ? colors.faint : item.required ? colors.faint : colors.green}
        />
      </Pressable>
    </View>
  );
}

function PhotoRow({ photo, dispatch }: { photo: Photo; dispatch: Dispatch<Action> }) {
  const pending = photo.status === "analyzing" || photo.status === "queued";
  return (
    <View style={styles.photoRow}>
      {photo.url ? <Image source={{ uri: photo.url }} style={styles.photo} /> : <View style={styles.photo} />}
      <View style={styles.grow}>
        <Text style={type.body} numberOfLines={1}>
          {photo.name}
        </Text>
        <Text style={[type.secondary, photo.status === "error" && styles.error]}>
          {photo.status === "analyzing"
            ? "Creating a 3D model…"
            : photo.status === "queued"
              ? "Waiting in line"
              : photo.status === "done"
                ? "Added to your items"
                : photo.error}
        </Text>
      </View>
      {pending ? (
        <ActivityIndicator size="small" color={colors.green} />
      ) : photo.status === "error" && !photo.accepted && photo.url ? (
        <Button label="Retry" size="small" onPress={() => dispatch({ type: "retry", id: photo.id, requestId: uid() })} />
      ) : photo.status === "done" ? (
        <Icon name="checkmark-circle" size={20} color={colors.green} />
      ) : null}
    </View>
  );
}

export default function BelongingsTab(p: Props) {
  const { state, current, dispatch, addOpen, setAddOpen } = p;
  const [showDone, setShowDone] = useState(false);
  const photosFull = !p.ready || state.photos.length >= 12;
  const full = state.items.length >= 80;
  const activePhotos = state.photos.filter((x) => x.status !== "done");
  const donePhotos = state.photos.filter((x) => x.status === "done");
  const merges = mergeSuggestions(state.items);

  function launch(action: () => void) {
    setAddOpen(false);
    afterSheet(action);
  }

  return (
    <View style={styles.root}>
      <ScrollView contentContainerStyle={styles.content}>
        {activePhotos.length > 0 && (
          <Section title="Photos">
            <Group>
              {activePhotos.map((photo) => (
                <PhotoRow key={photo.id} photo={photo} dispatch={dispatch} />
              ))}
            </Group>
          </Section>
        )}

        {merges.map(([a, b]) => (
          <Banner
            key={`${a.id}-${b.id}`}
            action={<Button label="Review merge" size="small" onPress={() => p.reviewMerge(a.id, b.id)} />}
          >
            Two photos look like the same "{a.label}". Merge them if they show one item.
          </Banner>
        ))}

        {state.items.length > 0 ? (
          <Section title={state.demo ? "Demo trip" : undefined}>
            <Group>
              {state.items.map((item) => (
                <ItemRow
                  key={item.id}
                  item={item}
                  photo={state.photos.find((x) => item.sourceIds.includes(x.id) && x.url)}
                  current={current}
                  dispatch={dispatch}
                  onOpen={p.onOpen}
                />
              ))}
            </Group>
            <Text style={styles.legend}>Tap the lock to always bring an item. Tap the circle to leave it home.</Text>
          </Section>
        ) : (
          <View style={styles.empty}>
            <View style={styles.emptyIcon}>
              <Icon name="bag-handle-outline" size={28} color={colors.green} />
            </View>
            <Text style={type.heading}>No items yet</Text>
            <Text style={[type.secondary, styles.center]}>Take a photo of something you're bringing, or add it by type.</Text>
            <Button label="Add your first item" icon="add" kind="primary" style={styles.emptyButton} onPress={() => setAddOpen(true)} />
            <Button label="Or load the demo trip" kind="quiet" onPress={p.loadDemo} />
          </View>
        )}

        {donePhotos.length > 0 && (
          <Section>
            <Group>
              <ActionRow
                label={`${donePhotos.length} photo${donePhotos.length === 1 ? "" : "s"} analyzed`}
                onPress={() => setShowDone((v) => !v)}
                trailing={<Icon name={showDone ? "chevron-up" : "chevron-down"} size={18} color={colors.faint} />}
              />
              {showDone && donePhotos.map((photo) => <PhotoRow key={photo.id} photo={photo} dispatch={dispatch} />)}
            </Group>
          </Section>
        )}

        {full && <Text style={styles.legend}>You've hit the 80-item limit. Remove an item to add another.</Text>}
      </ScrollView>

      {state.items.length > 0 && (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Add item"
          style={({ pressed }) => [styles.fab, pressed && { opacity: 0.85 }]}
          onPress={() => setAddOpen(true)}
        >
          <Icon name="add" size={22} color={colors.white} />
          <Text style={styles.fabText}>Add</Text>
        </Pressable>
      )}

      <Sheet visible={addOpen} title="Add an item" onClose={() => setAddOpen(false)}>
        <Group>
          <ActionRow
            icon="camera-outline"
            label="Take a photo"
            hint="Astra turns it into a 3D item"
            disabled={photosFull}
            onPress={() => launch(() => p.addPhotos("camera"))}
          />
          <ActionRow
            icon="images-outline"
            label="Choose from your photos"
            disabled={photosFull}
            onPress={() => launch(() => p.addPhotos("library"))}
          />
          <ActionRow
            icon="sparkles-outline"
            label="Try a sample photo"
            disabled={photosFull}
            onPress={() => launch(p.samplePhoto)}
          />
        </Group>
        {state.photos.length >= 12 && <Text style={type.secondary}>You've reached the limit of 12 photos.</Text>}
        <Section title="Or add by type">
          <View style={styles.grid}>
            {categories.map((c) => (
              <Pressable
                key={c}
                accessibilityRole="button"
                accessibilityLabel={`Add ${categoryNames[c]}`}
                accessibilityState={{ disabled: full }}
                disabled={full}
                style={({ pressed }) => [styles.gridItem, (pressed || full) && { opacity: 0.5 }]}
                onPress={() => {
                  const id = uid();
                  dispatch({ type: "add", category: c, id });
                  launch(() => p.onOpen(id));
                }}
              >
                <CategoryIcon category={c} size={24} color={colors.green} />
                <Text style={styles.gridLabel} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.85}>
                  {categoryNames[c]}
                </Text>
              </Pressable>
            ))}
          </View>
        </Section>
        <Text style={type.secondary}>
          Photos stay on this phone and go through your Knapsack server to OpenAI for analysis. Sizes are estimates.
        </Text>
      </Sheet>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { padding: 16, paddingBottom: 96, gap: 16 },
  grow: { flex: 1 },
  center: { textAlign: "center" },
  warn: { color: colors.warn, fontWeight: "600" },
  error: { color: colors.error },
  legend: { ...type.secondary, paddingHorizontal: 4 },
  item: { flexDirection: "row", alignItems: "center", paddingLeft: 12, paddingRight: 4, minHeight: 64 },
  itemMain: { flex: 1, flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 10 },
  itemControl: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
  excluded: { opacity: 0.5 },
  thumb: {
    width: 44,
    height: 44,
    borderRadius: radius.sm,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  thumbImage: { width: 44, height: 44 },
  photoRow: { flexDirection: "row", alignItems: "center", gap: 12, padding: 12 },
  photo: { width: 40, height: 40, borderRadius: 8, backgroundColor: colors.soft },
  empty: { alignItems: "center", gap: 6, paddingTop: 72, paddingHorizontal: 16 },
  emptyIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.soft,
    marginBottom: 10,
  },
  emptyButton: { alignSelf: "stretch", marginTop: 16 },
  fab: {
    position: "absolute",
    right: 16,
    bottom: 16,
    height: 52,
    paddingLeft: 16,
    paddingRight: 20,
    borderRadius: radius.pill,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: colors.green,
    ...shadow,
  },
  fabText: { color: colors.white, fontSize: 16, fontWeight: "700" },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  gridItem: {
    width: "22%",
    flexGrow: 1,
    height: 76,
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    borderRadius: radius.md,
    backgroundColor: colors.white,
  },
  gridLabel: { color: colors.ink, fontSize: 12, fontWeight: "500" },
});
