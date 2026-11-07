import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import * as api from "../api";
import { Banner, Button, Card, Group, Icon, Section } from "../components/ui";
import type { AstraAdvice, Item, PackingChoice, Suitcase } from "../domain";
import { colors, radius, type } from "../theme";

type Props = {
  open: boolean;
  wantedId: string | null;
  items: Item[];
  bag: Suitcase;
  revision: string;
  onClose: () => void;
  onApply: (includeIds: string[], priorityId?: string) => void;
  onLargerBag: () => void;
};

/** Make-room swaps for an unplaced item, or Astra's trip advice; both apply only on request. */
export default function Assistant({ open, wantedId, items, bag, revision, onClose, onApply, onLargerBag }: Props) {
  const [preference, setPreference] = useState("");
  const [adviceState, setAdviceState] = useState<AstraAdvice | null>(null);
  const [errorState, setErrorState] = useState<{ revision: string; message: string } | null>(null);
  const [askingRevision, setAskingRevision] = useState<string | null>(null);
  const [connected, setConnected] = useState<boolean | null>(null);
  const [choicesState, setChoicesState] = useState<{
    revision: string;
    wantedId: string;
    options: PackingChoice[];
    error?: string;
  } | null>(null);
  const request = useRef<AbortController | null>(null);
  const visible = open || !!wantedId;
  const wanted = items.find((i) => i.id === wantedId);
  const advice = adviceState?.revision === revision ? adviceState : null;
  const error = errorState?.revision === revision ? errorState.message : "";
  const asking = askingRevision === revision;
  const choices =
    choicesState?.revision === revision && choicesState.wantedId === wantedId ? choicesState : null;

  useEffect(() => {
    if (!open) return;
    const abort = new AbortController();
    api
      .astraStatus(abort.signal)
      .then((data) => setConnected(data.configured))
      .catch(() => {});
    return () => abort.abort();
  }, [open]);

  useEffect(() => () => request.current?.abort(), [revision, open]);

  useEffect(() => {
    if (!wantedId) return;
    const abort = new AbortController();
    api
      .packingChoices(items, bag, wantedId, revision, abort.signal)
      .then((data) => setChoicesState({ revision: data.revision, wantedId, options: data.options }))
      .catch((e) => {
        if (!abort.signal.aborted)
          setChoicesState({ revision, wantedId, options: [], error: e.message });
      });
    return () => abort.abort();
    // `revision` covers every packing input in items and bag.
  }, [wantedId, revision]);

  async function ask() {
    request.current?.abort();
    const abort = new AbortController();
    request.current = abort;
    setAskingRevision(revision);
    setErrorState(null);
    setAdviceState(null);
    try {
      const data = await api.askAstra(items, bag, preference, revision, abort.signal);
      if (!abort.signal.aborted) {
        setAdviceState(data);
        setConnected(true);
      }
    } catch (e) {
      if (!abort.signal.aborted)
        setErrorState({
          revision,
          message: e instanceof Error ? e.message : "Astra is unavailable. Please try again.",
        });
    } finally {
      if (request.current === abort) setAskingRevision(null);
    }
  }

  const name = (id: string) => items.find((i) => i.id === id)?.label || id;
  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={styles.safe}>
        <KeyboardAvoidingView style={styles.safe} behavior={Platform.OS === "ios" ? "padding" : undefined}>
          <View style={styles.header}>
            <Text style={type.heading}>{wanted ? "Make room" : "Ask Astra"}</Text>
            <Pressable accessibilityRole="button" accessibilityLabel="Close" hitSlop={12} onPress={onClose} style={styles.close}>
              <Icon name="close" size={24} color={colors.ink} />
            </Pressable>
          </View>
          <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
            {wanted ? (
              <>
                <View style={styles.intro}>
                  <Text style={type.title}>{wanted.label}</Text>
                  <Text style={styles.body}>Choose what stays home to fit it. Your essentials stay packed.</Text>
                </View>
                {!choices && (
                  <View style={styles.loading}>
                    <ActivityIndicator color={colors.green} />
                    <Text style={styles.body}>Looking for swaps…</Text>
                  </View>
                )}
                {!!choices?.error && <Banner tone="error">{choices.error}</Banner>}
                {choices && !choices.options.length && !choices.error && (
                  <Banner>
                    No simple swap found. Try a larger bag or unpin something you could leave behind. Another arrangement may still be possible.
                  </Banner>
                )}
                {choices?.options.map((option) => (
                  <Card key={option.removeIds.join(",")}>
                    <Text style={type.bodyStrong}>Leave behind {option.removeIds.map(name).join(" + ")}</Text>
                    <Text style={type.secondary}>
                      {option.placed} items fit
                      {option.unplaced ? ` · ${option.unplaced} still need room` : ""}
                    </Text>
                    <Button label="Choose this swap" kind="primary" size="small" style={styles.cardAction} onPress={() => onApply(option.includeIds, wanted.id)} />
                  </Card>
                ))}
                {choices && (
                  <Section title="Other options">
                    {bag.id !== "checked" && <Button label="Switch to the checked bag" onPress={onLargerBag} />}
                    {!wanted.required && (
                      <Button
                        label="Leave this item out"
                        onPress={() => onApply(items.filter((i) => i.included && i.id !== wanted.id).map((i) => i.id))}
                      />
                    )}
                  </Section>
                )}
              </>
            ) : (
              <>
                <View style={styles.intro}>
                  <Text style={type.title}>What's the trip?</Text>
                  <Text style={styles.body}>Astra suggests what to bring. Nothing changes until you apply it.</Text>
                </View>
                <TextInput
                  accessibilityLabel="Trip preference"
                  style={styles.input}
                  value={preference}
                  editable={!asking}
                  multiline
                  maxLength={1500}
                  placeholder="A weekend of city walks, a camera, and one nice dinner…"
                  placeholderTextColor={colors.faint}
                  onChangeText={(text) => {
                    setPreference(text);
                    setAdviceState(null);
                  }}
                />
                <Button
                  label={asking ? "Thinking…" : "Get suggestions"}
                  icon="sparkles"
                  kind="primary"
                  disabled={asking || !items.some((i) => i.included)}
                  onPress={ask}
                />
                {connected === false && !error && (
                  <Banner>Astra isn't connected yet. Packing and swaps still work without it.</Banner>
                )}
                {!!error && <Banner tone="error">{error}</Banner>}
                {adviceState && !advice && (
                  <Banner>Your items changed. Ask again for a suggestion that matches your latest list.</Banner>
                )}
                {advice && (
                  <>
                    <Text style={styles.summary}>{advice.summary}</Text>
                    <Section title={`Bring · ${advice.keepIds.length}`}>
                      <Group>
                        {advice.keepIds.map((id) => (
                          <View key={id} style={styles.listRow}>
                            <View style={[styles.dot, { backgroundColor: items.find((i) => i.id === id)?.color }]} />
                            <Text style={[type.body, styles.grow]} numberOfLines={1}>
                              {name(id)}
                            </Text>
                            {items.find((i) => i.id === id)?.required && (
                              <Icon name="lock-closed" size={14} color={colors.warn} accessibilityLabel="Essential" />
                            )}
                          </View>
                        ))}
                      </Group>
                    </Section>
                    <Section title={`Leave behind · ${advice.leaveIds.length}`}>
                      <Group>
                        {advice.leaveIds.length ? (
                          advice.leaveIds.map((id) => (
                            <View key={id} style={styles.listRow}>
                              <Text style={[styles.body, styles.grow]} numberOfLines={1}>
                                {name(id)}
                              </Text>
                            </View>
                          ))
                        ) : (
                          <View style={styles.listRow}>
                            <Text style={styles.body}>Nothing this time</Text>
                          </View>
                        )}
                      </Group>
                    </Section>
                    <Banner tone={advice.preview.unplaced.length ? "warn" : "info"}>
                      {advice.preview.placed} of {advice.keepIds.length} chosen items fit
                      {advice.preview.unplaced.length ? ` · ${advice.preview.unplaced.length} still need room` : ""}
                    </Banner>
                    <View style={styles.actions}>
                      <Button label="Apply suggestion" icon="checkmark" kind="primary" onPress={() => onApply(advice.keepIds)} />
                      <Button label="Keep my list" onPress={onClose} />
                    </View>
                  </>
                )}
                {!advice && <Text style={type.secondary}>Essentials are always kept. The packing engine checks every suggestion.</Text>}
              </>
            )}
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
    paddingLeft: 16,
    paddingRight: 6,
    minHeight: 52,
  },
  close: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
  content: { padding: 16, paddingTop: 8, paddingBottom: 32, gap: 16 },
  intro: { gap: 6 },
  grow: { flex: 1 },
  body: { color: colors.muted, fontSize: 15, lineHeight: 21, flexShrink: 1 },
  summary: { ...type.body },
  loading: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 8 },
  cardAction: { marginTop: 4 },
  input: {
    minHeight: 110,
    textAlignVertical: "top",
    borderRadius: radius.md,
    padding: 14,
    fontSize: 16,
    lineHeight: 22,
    color: colors.ink,
    backgroundColor: colors.white,
  },
  listRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 14, minHeight: 44 },
  dot: { width: 12, height: 12, borderRadius: 6 },
  actions: { gap: 8 },
});
