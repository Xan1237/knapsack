import type { Dispatch, SetStateAction } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import SuitcaseView from "../components/SuitcaseView";
import { Button, Card, Icon, IconButton, Slider } from "../components/ui";
import { type Item, type Placement, type Plan, type Suitcase, type Vec3, suitcases } from "../domain";
import type { Action, InventoryState } from "../state";
import { colors, serif } from "../theme";

type Playback = { revision: string; step: number; playing: boolean };
type Props = {
  state: InventoryState;
  bag: Suitcase;
  revision: string;
  plan: Plan | null;
  current: Plan | null;
  busy: boolean;
  packingError: string;
  reservedSpace: Placement | null;
  selected: string | null;
  active: Item | null;
  layer: number;
  exploded: boolean;
  resetKey: number;
  view: "perspective" | "top";
  moveMode: boolean;
  step: number;
  maxStep: number;
  playing: boolean;
  dispatch: Dispatch<Action>;
  setLayer: (n: number) => void;
  setExploded: Dispatch<SetStateAction<boolean>>;
  setPlayback: (p: Playback) => void;
  setMoveMode: Dispatch<SetStateAction<boolean>>;
  setView: (v: "perspective" | "top") => void;
  bumpReset: () => void;
  setSelected: (id: string | null) => void;
  openEditor: (id: string) => void;
  retryPacking: () => void;
  dropItem: (item: Item, point: Vec3, orientation: number) => boolean;
  askAstra: () => void;
  makeRoom: (id: string) => void;
};

export default function SuitcaseTab(p: Props) {
  const { height } = useWindowDimensions();
  const { state, bag, plan, current, busy, revision, step, maxStep, playing, dispatch } = p;
  const included = state.items.filter((i) => i.included);
  const packedSteps = plan?.placements.length ?? 0;
  const showAll = () => p.setPlayback({ revision, step: packedSteps, playing: false });
  const usedVolume = current
    ? current.placements.reduce((sum, x) => sum + x.dimensions.reduce((v, n) => v * n, 1), 0)
    : 0;
  const fill = Math.round((usedVolume / bag.dimensions.reduce((v, n) => v * n, 1)) * 1000) / 10;
  const title = p.packingError
    ? "Layout needs attention"
    : busy
      ? "Finding a little room…"
      : included.length === 0
        ? "Your next trip starts here"
        : current?.outcome === "complete"
          ? "Everything has its place"
          : current?.outcome === "constraint-conflict"
            ? "A little too much for this bag"
            : current?.outcome === "search-exhausted"
              ? "Search limit reached"
              : "Some things need more room";
  const bags = state.customBag ? [...suitcases, state.customBag] : suitcases;
  const stepText =
    step === maxStep && maxStep > 0
      ? bag.clamshell
        ? "Final step · suitcase closed"
        : "The full picture"
      : bag.clamshell && step === maxStep - 1
        ? "Both halves packed · ready to close"
        : `Step ${step} of ${maxStep}`;
  const overflowCount = current?.unplaced.length ?? 0;

  return (
    <View style={styles.root}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.bagScroll} contentContainerStyle={styles.bags}>
        {bags.map((b) => (
          <Pressable
            key={b.id}
            accessibilityRole="button"
            accessibilityState={{ selected: b.id === bag.id }}
            onPress={() => dispatch({ type: "bag", id: b.id })}
            style={[styles.bag, b.id === bag.id && styles.bagActive]}
          >
            <Text style={[styles.bagName, b.id === bag.id && styles.bagNameActive]}>{b.name}</Text>
            <Text style={[styles.bagSub, b.id === bag.id && styles.bagSubActive]}>{b.subtitle}</Text>
          </Pressable>
        ))}
      </ScrollView>
      <View style={[styles.canvas, { height: Math.round(height * 0.38) }]}>
        <SuitcaseView
          items={state.items}
          bag={bag}
          plan={plan}
          selected={p.selected}
          layer={p.layer}
          step={step}
          exploded={p.exploded}
          view={p.view}
          resetKey={p.resetKey}
          reservedSpace={p.reservedSpace}
          moveMode={p.moveMode && !!current && !playing && !p.exploded && step <= packedSteps}
          onSelect={p.setSelected}
          onDrop={p.dropItem}
        />
        <View style={styles.sceneControls}>
          <IconButton
            icon="refresh"
            label="Reset view"
            onPress={() => {
              p.setView("perspective");
              p.bumpReset();
            }}
          />
          <IconButton
            icon="expand-outline"
            label="Exploded view"
            active={p.exploded}
            onPress={() => {
              p.setExploded((v) => !v);
              showAll();
            }}
          />
          <IconButton
            icon="scan-outline"
            label={p.view === "top" ? "Perspective view" : "Top view"}
            active={p.view === "top"}
            onPress={() => {
              p.setView(p.view === "top" ? "perspective" : "top");
              p.bumpReset();
            }}
          />
        </View>
        <Text style={styles.caption} pointerEvents="none">
          {p.moveMode ? "Drag items to move · Drop to repack" : "Drag to orbit · Pinch to zoom · Tap to select"}
        </Text>
        {overflowCount > 0 && (
          <Text style={styles.overflowTag} pointerEvents="none">
            Outside the suitcase · {overflowCount} items
          </Text>
        )}
        {busy && (
          <View style={styles.busy} pointerEvents="none">
            <ActivityIndicator size="small" color={colors.green} />
            <Text style={styles.busyText}>Updating layout…</Text>
          </View>
        )}
        {state.items.length === 0 && (
          <View style={styles.empty} pointerEvents="none">
            <Text style={styles.emptyTitle}>What's coming with you?</Text>
            <Text style={styles.emptyBody}>Your suitcase is ready when you are.</Text>
          </View>
        )}
      </View>
      <ScrollView contentContainerStyle={styles.panel}>
        {p.active && (
          <Card style={styles.selection}>
            <Text style={styles.selectionName} numberOfLines={1}>
              {p.active.label}
            </Text>
            <Button label="Edit" icon="create-outline" onPress={() => p.openEditor(p.active!.id)} />
          </Card>
        )}
        <Card>
          <Text style={styles.planTitle}>{title}</Text>
          <Text style={[styles.planBody, !!p.packingError && styles.error]}>
            {p.packingError ||
              (!included.length
                ? "Add a few belongings and make it yours."
                : busy
                  ? "Your latest edits are being packed. The scene shows a size preview."
                  : `${current?.placements.length ?? 0} of ${included.length} included items packed · ${fill}% of interior volume`)}
          </Text>
          {!!p.packingError && <Button label="Retry packing" onPress={p.retryPacking} />}
        </Card>
        <View style={styles.row}>
          <Button
            label="Ask Astra"
            icon="sparkles-outline"
            kind="primary"
            style={styles.grow}
            onPress={p.askAstra}
          />
          <Button
            label={p.moveMode ? "Finish moving" : "Move items"}
            icon="move-outline"
            style={styles.grow}
            onPress={() => {
              p.setMoveMode((v) => !v);
              p.setExploded(false);
              p.setLayer(100);
              showAll();
            }}
          />
        </View>
        {state.items.some((i) => i.anchor) && (
          <Button label="Auto arrange" onPress={() => dispatch({ type: "auto-layout" })} />
        )}
        {p.reservedSpace && (
          <Card>
            <Text style={styles.planTitle}>Saved a little room for your bottle.</Text>
            <Text style={styles.planBody}>Add a photo of your water bottle when you're ready.</Text>
          </Card>
        )}
        {current && current.unplaced.length > 0 && (
          <Card>
            <Text style={styles.planTitle}>Beside the suitcase · {current.unplaced.length} unplaced</Text>
            {current.unplaced.map((u) => {
              const item = state.items.find((i) => i.id === u.id);
              return (
                <View key={u.id} style={styles.unplaced}>
                  <Pressable onPress={() => p.setSelected(u.id)}>
                    <Text style={styles.unplacedName}>{item?.label}</Text>
                    <Text style={styles.planBody}>{u.reason}</Text>
                  </Pressable>
                  <View style={styles.row}>
                    <Button label="Make room" icon="arrow-forward" style={styles.grow} onPress={() => p.makeRoom(u.id)} />
                    {!item?.required && (
                      <Button
                        label="Leave out"
                        style={styles.grow}
                        onPress={() => dispatch({ type: "edit", id: u.id, patch: { included: false } })}
                      />
                    )}
                  </View>
                </View>
              );
            })}
            <Text style={styles.planBody}>
              {current.outcome === "constraint-conflict"
                ? "A direct envelope or volume check found a constraint conflict. Try a larger suitcase or smaller items."
                : "The bounded search did not find space for everything. This does not prove packing is impossible."}
            </Text>
          </Card>
        )}
        {bag.clamshell && (
          <Card>
            <Text style={styles.planBody}>
              Main compartment · {current ? current.placements.filter((x) => x.compartment === "base").length : "—"} items
              {"\n"}Lid compartment · {current ? current.placements.filter((x) => x.compartment === "lid").length : "—"} items
            </Text>
            <Button
              label={step === maxStep ? "Open suitcase" : "Close suitcase"}
              disabled={!current}
              onPress={() => {
                p.setExploded(false);
                p.setLayer(100);
                p.setPlayback({ revision, step: step === maxStep ? packedSteps : maxStep, playing: false });
              }}
            />
          </Card>
        )}
        <Card>
          <View style={styles.playHeader}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={playing ? "Pause packing playback" : "Play packing order"}
              disabled={!current || !maxStep}
              onPress={() => {
                p.setLayer(100);
                p.setExploded(false);
                p.setPlayback({ revision, step: playing ? step : 0, playing: !playing });
              }}
              style={[styles.play, (!current || !maxStep) && styles.disabled]}
            >
              <Icon name={playing ? "pause" : "play"} size={18} color={colors.white} />
            </Pressable>
            <View style={styles.grow}>
              <Text style={styles.unplacedName}>Packing, one step at a time.</Text>
              <Text style={styles.planBody}>{stepText}</Text>
            </View>
          </View>
          <Slider
            label="Packing step"
            value={step}
            min={0}
            max={Math.max(1, maxStep)}
            disabled={!current || !maxStep}
            onChange={(value) => {
              p.setLayer(100);
              p.setPlayback({ revision, step: value, playing: false });
            }}
          />
        </Card>
        <Card>
          <Text style={styles.unplacedName}>
            Peek inside · {p.layer === 100 ? "All layers" : "Lower layers"}
          </Text>
          <Slider
            label="Visible layers"
            value={p.layer}
            min={0}
            max={100}
            onChange={(value) => {
              p.setLayer(value);
              showAll();
            }}
          />
          <Button
            label="Show all"
            kind="quiet"
            onPress={() => {
              p.setLayer(100);
              p.setExploded(false);
              showAll();
            }}
          />
        </Card>
        <Text style={styles.footnote}>
          Rectangular interior and conservative envelopes. This estimates fit; it does not establish
          insertion feasibility or cloth behavior.
          {current ? ` Checked independently · ${current.attempts} search orders · ${bag.clearance} mm clearance.` : ""}
        </Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  bagScroll: { flexGrow: 0, flexShrink: 0 },
  bags: { paddingHorizontal: 16, paddingBottom: 8, gap: 8 },
  bag: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.white,
  },
  bagActive: { backgroundColor: colors.green, borderColor: colors.green },
  bagName: { color: colors.ink, fontSize: 13, fontWeight: "600" },
  bagNameActive: { color: colors.white },
  bagSub: { color: colors.muted, fontSize: 11 },
  bagSubActive: { color: colors.soft },
  canvas: { backgroundColor: colors.canvas, overflow: "hidden" },
  sceneControls: { position: "absolute", top: 10, right: 10, gap: 8 },
  caption: {
    position: "absolute",
    bottom: 8,
    left: 12,
    color: colors.muted,
    fontSize: 12,
  },
  overflowTag: {
    position: "absolute",
    top: 12,
    left: 12,
    color: colors.ink,
    fontSize: 12,
    backgroundColor: colors.white,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    overflow: "hidden",
  },
  busy: {
    position: "absolute",
    bottom: 30,
    left: 12,
    flexDirection: "row",
    gap: 6,
    alignItems: "center",
  },
  busyText: { color: colors.ink, fontSize: 12 },
  empty: { position: "absolute", top: 18, left: 16, right: 64 },
  emptyTitle: { fontFamily: serif, fontSize: 20, color: colors.ink },
  emptyBody: { color: colors.muted, fontSize: 13 },
  panel: { padding: 16, gap: 12 },
  selection: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10 },
  selectionName: { color: colors.ink, fontWeight: "700", fontSize: 15, flex: 1 },
  planTitle: { color: colors.ink, fontFamily: serif, fontSize: 18 },
  planBody: { color: colors.muted, fontSize: 13, lineHeight: 19 },
  error: { color: colors.error },
  row: { flexDirection: "row", gap: 8 },
  grow: { flex: 1 },
  unplaced: { gap: 8, paddingVertical: 8, borderTopWidth: 1, borderTopColor: colors.line },
  unplacedName: { color: colors.ink, fontSize: 14, fontWeight: "600" },
  playHeader: { flexDirection: "row", alignItems: "center", gap: 12 },
  play: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.green,
  },
  disabled: { opacity: 0.45 },
  footnote: { color: colors.muted, fontSize: 12, lineHeight: 17 },
});
