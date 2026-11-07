import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, KeyboardAvoidingView, Modal, Platform, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import * as api from "../api";
import { Button, Card, Eyebrow, Icon, IconButton } from "../components/ui";
import type { AstraAdvice, Item, PackingChoice, Suitcase } from "../domain";
import { colors, serif } from "../theme";

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
          <View style={styles.close}>
            <IconButton icon="close" label="Close packing assistant" onPress={onClose} />
          </View>
          <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
            {wanted ? (
              <>
                <Eyebrow>A LITTLE GIVE AND TAKE</Eyebrow>
                <Text style={styles.title}>
                  Make room for <Text style={styles.italic}>{wanted.label.toLowerCase()}.</Text>
                </Text>
                <Text style={styles.body}>
                  Choose what stays home. These swaps protect your essentials and keep the rest of your packed items in the bag.
                </Text>
                {!choices && (
                  <View style={styles.loading}>
                    <ActivityIndicator color={colors.green} />
                    <Text style={styles.body}>Looking for a little breathing room…</Text>
                  </View>
                )}
                {!!choices?.error && <Text style={styles.error}>{choices.error}</Text>}
                {choices && !choices.options.length && !choices.error && (
                  <Text style={styles.body}>
                    No simple swap was found while protecting your essentials. Try a larger bag or unpin an item you can leave behind. This search does not prove that another arrangement is impossible.
                  </Text>
                )}
                {choices?.options.map((option, index) => (
                  <Card key={option.removeIds.join(",")}>
                    <Eyebrow>OPTION {index + 1}</Eyebrow>
                    <Text style={styles.strong}>
                      Leave {option.removeIds.map((id) => name(id).toLowerCase()).join(" + ")} behind
                    </Text>
                    <Text style={styles.body}>
                      {option.placed} items fit after this swap
                      {option.unplaced ? ` · ${option.unplaced} still need room` : ""}
                    </Text>
                    <Button
                      label="Choose this swap"
                      icon="arrow-forward"
                      kind="primary"
                      onPress={() => onApply(option.includeIds, wanted.id)}
                    />
                  </Card>
                ))}
                <Button label="Choose the checked bag" onPress={onLargerBag} />
                {!wanted.required && (
                  <Button
                    label="Leave this item out"
                    onPress={() => onApply(items.filter((i) => i.included && i.id !== wanted.id).map((i) => i.id))}
                  />
                )}
              </>
            ) : (
              <>
                <Eyebrow>A LITTLE HELP FROM ASTRA</Eyebrow>
                <Text style={styles.title}>
                  Pack for <Text style={styles.italic}>your kind</Text> of getaway.
                </Text>
                <Text style={styles.body}>Your plans set the priorities. You get the final say.</Text>
                <Eyebrow>WHAT'S ON THE ITINERARY?</Eyebrow>
                <TextInput
                  accessibilityLabel="Trip preference"
                  style={styles.input}
                  value={preference}
                  editable={!asking}
                  multiline
                  maxLength={1500}
                  placeholder="A weekend of city walks, a camera, and one nice dinner…"
                  placeholderTextColor={colors.muted}
                  onChangeText={(text) => {
                    setPreference(text);
                    setAdviceState(null);
                  }}
                />
                <Button
                  label={asking ? "Thinking it through…" : "Ask Astra"}
                  icon="sparkles-outline"
                  kind="primary"
                  disabled={asking || !items.some((i) => i.included)}
                  onPress={ask}
                />
                {connected === false && !error && (
                  <Text style={styles.body}>
                    Astra isn't connected yet. The packing controls and item swaps are ready to use.
                  </Text>
                )}
                {!!error && <Text style={styles.error}>{error}</Text>}
                {adviceState && !advice && (
                  <Text style={styles.body}>
                    Your belongings changed. Ask Astra again for a suggestion that matches your latest list.
                  </Text>
                )}
                {advice && (
                  <Card>
                    <Eyebrow>ASTRA'S SUGGESTION</Eyebrow>
                    <Text style={styles.body}>{advice.summary}</Text>
                    <Text style={styles.strong}>Bring along · {advice.keepIds.length}</Text>
                    {advice.keepIds.map((id) => (
                      <View key={id} style={styles.listRow}>
                        <View style={[styles.dot, { backgroundColor: items.find((i) => i.id === id)?.color }]} />
                        <Text style={styles.body}>{name(id)}</Text>
                        {items.find((i) => i.id === id)?.required && (
                          <Icon name="lock-closed" size={12} color={colors.orange} accessibilityLabel="Essential" />
                        )}
                      </View>
                    ))}
                    <Text style={styles.strong}>Leave behind · {advice.leaveIds.length}</Text>
                    {advice.leaveIds.length ? (
                      advice.leaveIds.map((id) => (
                        <Text key={id} style={styles.body}>
                          {name(id)}
                        </Text>
                      ))
                    ) : (
                      <Text style={styles.body}>Nothing this time.</Text>
                    )}
                    <Text style={styles.strong}>
                      Fit preview: {advice.preview.placed} of {advice.keepIds.length} chosen items packed
                      {advice.preview.unplaced.length
                        ? ` · ${advice.preview.unplaced.length} still need room`
                        : " · all chosen items fit"}
                      .
                    </Text>
                    <Button label="Apply selection" icon="checkmark" kind="primary" onPress={() => onApply(advice.keepIds)} />
                    <Button label="Keep my current list" onPress={onClose} />
                  </Card>
                )}
                <Text style={styles.footnote}>
                  Your essentials stay protected. Fit is checked by the packing engine.
                </Text>
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
  close: { alignItems: "flex-end", paddingHorizontal: 16, paddingTop: 10 },
  content: { padding: 20, paddingTop: 4, gap: 12 },
  title: { color: colors.ink, fontFamily: serif, fontSize: 30, lineHeight: 36 },
  italic: { fontStyle: "italic", color: colors.green },
  body: { color: colors.muted, fontSize: 14, lineHeight: 20, flexShrink: 1 },
  strong: { color: colors.ink, fontSize: 15, fontWeight: "600" },
  error: { color: colors.error, fontSize: 14, lineHeight: 20 },
  loading: { flexDirection: "row", alignItems: "center", gap: 10 },
  input: {
    minHeight: 90,
    textAlignVertical: "top",
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 10,
    padding: 12,
    fontSize: 15,
    color: colors.ink,
    backgroundColor: colors.white,
  },
  listRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  dot: { width: 10, height: 10, borderRadius: 5 },
  footnote: { color: colors.muted, fontSize: 12, lineHeight: 17 },
});
