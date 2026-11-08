import { type Dispatch, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { afterSheet, Sheet } from "../components/Sheet";
import SuitcaseView from "../components/SuitcaseView";
import { Banner, Button, Group, Icon, Section, Slider } from "../components/ui";
import { type Item, type Placement, type Plan, type Suitcase, type Vec3, formatSize, sizeOf } from "../domain";
import type { Action, InventoryState } from "../state";
import { colors, radius, shadow, type } from "../theme";

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
  step: number;
  maxStep: number;
  playing: boolean;
  dispatch: Dispatch<Action>;
  setLayer: (n: number) => void;
  /** The open tool panel, controlled by the bottom bar. */
  tool: "steps" | "layers" | null;
  setPlayback: (p: Playback) => void;
  setSelected: (id: string | null) => void;
  openEditor: (id: string) => void;
  retryPacking: () => void;
  dropItem: (item: Item, point: Vec3, orientation: number) => boolean;
  askAstra: () => void;
  makeRoom: (id: string) => void;
  addItems: () => void;
};

// The gesture hint only needs to be seen once per launch, not on every return to this tab.
let hintDismissed = false;

export default function SuitcaseTab(p: Props) {
  const { state, bag, plan, current, busy, revision, step, maxStep, playing, dispatch } = p;
  const { tool } = p;
  const [fitOpen, setFitOpen] = useState(false);
  const [hintVisible, setHintVisible] = useState(!hintDismissed);
  const included = state.items.filter((i) => i.included);
  const packedSteps = plan?.placements.length ?? 0;
  const showAll = () => p.setPlayback({ revision, step: packedSteps, playing: false });
  const usedVolume = current
    ? current.placements.reduce((sum, x) => sum + x.dimensions.reduce((v, n) => v * n, 1), 0)
    : 0;
  const fill = Math.round((usedVolume / bag.dimensions.reduce((v, n) => v * n, 1)) * 100);
  const overflowCount = current?.unplaced.length ?? 0;
  const aside = included.filter((i) => i.aside);
  const empty = included.length === 0;
  const stepsReady = !!current && !!maxStep;
  const anchored = state.items.some((i) => i.anchor || i.aside);

  const noun = (n: number) => `${n} item${n === 1 ? "" : "s"}`;
  const title = p.packingError
    ? "Can't update the layout"
    : empty
      ? "Nothing to pack yet"
      : !current
        ? "Updating layout…"
        : current.outcome === "complete"
          ? "Everything fits"
          : current.outcome === "constraint-conflict"
            ? "Too much for this bag"
            : `${noun(overflowCount)} ${overflowCount === 1 ? "doesn't" : "don't"} fit`;
  const subtitle = p.packingError
    ? "Check your connection, then retry"
    : empty
      ? "Add a few items to get started"
      : !current
        ? `${noun(included.length)} to pack`
        : `${current.placements.length} of ${included.length} packed${aside.length ? ` · ${aside.length} set aside` : ""} · ${fill}% full`;
  const tone = p.packingError ? colors.error : !current || empty ? colors.faint : overflowCount ? colors.warn : colors.green;
  const stepText = !stepsReady
    ? "Waiting for a layout"
    : step === maxStep
      ? bag.clamshell
        ? "Suitcase closed"
        : "Fully packed"
      : bag.clamshell && step === maxStep - 1
        ? "All packed, ready to close"
        : step === 0
          ? "Empty suitcase"
          : `Step ${step} of ${maxStep}`;


  return (
    <View style={styles.root}>
      <View
        style={styles.canvas}
        onTouchStart={() => {
          hintDismissed = true;
          if (hintVisible) setHintVisible(false);
        }}
      >
        <SuitcaseView
          items={state.items}
          bag={bag}
          plan={plan}
          selected={p.selected}
          layer={p.layer}
          step={step}
          exploded={false}
          view="perspective"
          resetKey={0}
          reservedSpace={p.reservedSpace}
          canDrag={!!current && !playing && step <= packedSteps}
          onSelect={p.setSelected}
          onDrop={p.dropItem}
        />


        <View style={styles.floating} pointerEvents="box-none">
          {hintVisible && !tool && !p.active && !empty && !p.packingError && (
            <Text style={styles.hint} pointerEvents="none">
              Drag an item to move it · Drag elsewhere to rotate · Pinch to zoom
            </Text>
          )}

          {empty && !p.packingError && (
            <View style={[styles.floatCard, styles.emptyCard]}>
              <View style={styles.grow}>
                <Text style={type.bodyStrong}>What's coming with you?</Text>
                <Text style={type.secondary}>Add your things to see how they fit.</Text>
              </View>
              <Button label="Add items" icon="add" kind="primary" size="small" onPress={p.addItems} />
            </View>
          )}

          {!!p.packingError && (
            <Banner tone="error" action={<Button label="Retry" size="small" onPress={p.retryPacking} />}>
              {p.packingError}
            </Banner>
          )}

          {p.active && (
            <View style={[styles.floatCard, styles.selection]}>
              <View style={[styles.swatch, { backgroundColor: p.active.color }]} />
              <View style={styles.grow}>
                <Text style={type.bodyStrong} numberOfLines={1}>
                  {p.active.label}
                </Text>
                <Text style={type.secondary} numberOfLines={1}>
                  {formatSize(sizeOf(p.active))}
                </Text>
              </View>
              <Button label="Edit" size="small" onPress={() => p.openEditor(p.active!.id)} />
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Clear selection"
                hitSlop={10}
                onPress={() => p.setSelected(null)}
              >
                <Icon name="close" size={20} color={colors.muted} />
              </Pressable>
            </View>
          )}

          {tool === "steps" && (
            <View style={[styles.floatCard, styles.toolPanel]}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={playing ? "Pause packing playback" : "Play packing order"}
                disabled={!stepsReady}
                onPress={() => {
                  p.setLayer(100);
                  p.setPlayback({ revision, step: playing ? step : 0, playing: !playing });
                }}
                style={[styles.play, !stepsReady && { opacity: 0.4 }]}
              >
                <Icon name={playing ? "pause" : "play"} size={20} color={colors.white} />
              </Pressable>
              <View style={styles.grow}>
                <Text style={type.bodyStrong}>{stepText}</Text>
                <Slider
                  label="Packing step"
                  value={step}
                  min={0}
                  max={Math.max(1, maxStep)}
                  disabled={!stepsReady}
                  onChange={(value) => {
                    p.setLayer(100);
                    p.setPlayback({ revision, step: value, playing: false });
                  }}
                />
              </View>
            </View>
          )}

          {tool === "layers" && (
            <View style={[styles.floatCard, styles.layerPanel]}>
              <Text style={type.bodyStrong}>{p.layer === 100 ? "All layers showing" : "Hiding the top layers"}</Text>
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
            </View>
          )}
        </View>
      </View>

      <View style={styles.panel}>
        <View style={styles.summary}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`${title}. ${subtitle}. Show details`}
            disabled={empty}
            onPress={() => setFitOpen(true)}
            style={({ pressed }) => [styles.summaryText, pressed && { opacity: 0.6 }]}
          >
            <View style={styles.titleRow}>
              {busy ? (
                <ActivityIndicator size="small" color={colors.green} style={styles.spinner} />
              ) : (
                <View style={[styles.dot, { backgroundColor: tone }]} />
              )}
              <Text style={styles.summaryTitle} numberOfLines={1}>
                {title}
              </Text>
              {!empty && <Icon name="chevron-forward" size={16} color={colors.faint} />}
            </View>
            <Text style={type.secondary} numberOfLines={1}>
              {subtitle}
            </Text>
          </Pressable>
          <Button label="Ask Astra" icon="sparkles" kind="primary" size="small" onPress={p.askAstra} />
        </View>

      </View>

      <Sheet visible={fitOpen} title={title} onClose={() => setFitOpen(false)}>
        {current && (
          <View style={styles.stats}>
            <View style={styles.stat}>
              <Text style={styles.statValue}>
                {current.placements.length}/{included.length}
              </Text>
              <Text style={type.secondary}>Packed</Text>
            </View>
            <View style={styles.stat}>
              <Text style={styles.statValue}>{fill}%</Text>
              <Text style={type.secondary}>Full</Text>
            </View>
            {bag.clamshell && (
              <>
                <View style={styles.stat}>
                  <Text style={styles.statValue}>{current.placements.filter((x) => x.compartment === "base").length}</Text>
                  <Text style={type.secondary}>Main side</Text>
                </View>
                <View style={styles.stat}>
                  <Text style={styles.statValue}>{current.placements.filter((x) => x.compartment === "lid").length}</Text>
                  <Text style={type.secondary}>Lid side</Text>
                </View>
              </>
            )}
          </View>
        )}

        {current && current.unplaced.length > 0 && (
          <Section title="Didn't fit">
            <Group>
              {current.unplaced.map((u) => {
                const item = state.items.find((i) => i.id === u.id);
                return (
                  <View key={u.id} style={styles.unplaced}>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={`Select ${item?.label}`}
                      onPress={() => {
                        p.setSelected(u.id);
                        setFitOpen(false);
                      }}
                    >
                      <Text style={type.bodyStrong}>{item?.label}</Text>
                      <Text style={type.secondary}>{u.reason}</Text>
                    </Pressable>
                    <View style={styles.row}>
                      <Button
                        label="Make room"
                        size="small"
                        style={styles.grow}
                        onPress={() => {
                          setFitOpen(false);
                          afterSheet(() => p.makeRoom(u.id));
                        }}
                      />
                      {!item?.required && (
                        <Button
                          label="Leave out"
                          size="small"
                          style={styles.grow}
                          onPress={() => dispatch({ type: "edit", id: u.id, patch: { included: false } })}
                        />
                      )}
                    </View>
                  </View>
                );
              })}
            </Group>
            <Text style={type.secondary}>
              {current.outcome === "constraint-conflict"
                ? "These can't all fit by size alone. Try a larger bag or smaller items."
                : "The search couldn't find space for everything, but that doesn't prove it's impossible."}
            </Text>
          </Section>
        )}

        {aside.length > 0 && (
          <Section title="Set aside">
            <Group>
              {aside.map((item) => (
                <View key={item.id} style={[styles.unplaced, styles.row]}>
                  <Pressable
                    style={styles.grow}
                    accessibilityRole="button"
                    accessibilityLabel={`Select ${item.label}`}
                    onPress={() => {
                      p.setSelected(item.id);
                      setFitOpen(false);
                    }}
                  >
                    <Text style={type.bodyStrong}>{item.label}</Text>
                    <Text style={type.secondary}>You moved this out of the case</Text>
                  </Pressable>
                  <Button
                    label="Pack it"
                    size="small"
                    onPress={() => dispatch({ type: "aside", id: item.id, aside: false })}
                  />
                </View>
              ))}
            </Group>
          </Section>
        )}

        {p.reservedSpace && (
          <Banner>The outlined box is room saved for your water bottle. Add a photo of it when you're ready.</Banner>
        )}

        {anchored && (
          <Button
            label="Auto arrange everything"
            onPress={() => {
              dispatch({ type: "auto-layout" });
              setFitOpen(false);
            }}
          />
        )}

        <Text style={type.secondary}>
          This is an estimate. It treats the bag as a simple box and doesn't account for how fabric squashes or how
          items go in.
          {current
            ? ` Checked across ${current.attempts} packing order${current.attempts === 1 ? "" : "s"} with ${bag.clearance} mm of clearance.`
            : ""}
        </Text>
      </Sheet>
    </View>
  );
}

const panelOverlap = 16;

const styles = StyleSheet.create({
  root: { flex: 1 },
  canvas: { flex: 1, backgroundColor: colors.canvas, overflow: "hidden" },
  emptyCard: { flexDirection: "row", alignItems: "center", gap: 12, padding: 12 },
  floating: { position: "absolute", left: 12, right: 12, bottom: panelOverlap + 10, gap: 8 },
  hint: { color: colors.muted, fontSize: 13, textAlign: "center" },
  floatCard: { backgroundColor: colors.white, borderRadius: radius.md, ...shadow },
  selection: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 10, paddingHorizontal: 12 },
  swatch: { width: 32, height: 32, borderRadius: 8 },
  toolPanel: { flexDirection: "row", alignItems: "center", gap: 12, padding: 12, paddingBottom: 6 },
  layerPanel: { padding: 12, paddingBottom: 6 },
  play: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.green,
  },
  panel: {
    marginTop: -panelOverlap,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 6,
    gap: 8,
    backgroundColor: colors.white,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
  },
  summary: { flexDirection: "row", alignItems: "center", gap: 12, minHeight: 44 },
  summaryText: { flex: 1, gap: 1 },
  titleRow: { flexDirection: "row", alignItems: "center", gap: 7 },
  dot: { width: 9, height: 9, borderRadius: 5 },
  spinner: { width: 14, height: 14, transform: [{ scale: 0.7 }] },
  summaryTitle: { ...type.heading, flexShrink: 1 },
  grow: { flex: 1 },
  row: { flexDirection: "row", gap: 8 },
  stats: { flexDirection: "row", gap: 8 },
  stat: { flex: 1, backgroundColor: colors.white, borderRadius: radius.md, padding: 12, gap: 2 },
  statValue: { color: colors.ink, fontSize: 18, fontWeight: "700" },
  unplaced: { gap: 10, padding: 14 },
});
