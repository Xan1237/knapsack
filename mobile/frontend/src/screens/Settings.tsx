import { Modal, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ActionRow, Group, Icon, IconButton, Section } from "../components/ui";
import { colors, radius, type } from "../theme";

/** Account details, where the trip is saved, and signing out. */
export default function Settings({
  visible,
  email,
  storageStatus,
  syncStatus,
  onSignOut,
  onClose,
}: {
  visible: boolean;
  email: string;
  storageStatus: string;
  syncStatus: string;
  onSignOut: () => void;
  onClose: () => void;
}) {
  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={styles.safe}>
        <View style={styles.header}>
          <Text style={type.heading}>Settings</Text>
          <IconButton icon="close" label="Close settings" onPress={onClose} />
        </View>
        <ScrollView contentContainerStyle={styles.content}>
          <Section title="Account">
            <Group>
              <View style={styles.account}>
                <View style={styles.avatar}>
                  <Icon name="person-outline" size={20} color={colors.green} />
                </View>
                <View style={styles.grow}>
                  <Text style={type.secondary}>Signed in as</Text>
                  <Text style={type.bodyStrong} numberOfLines={1}>
                    {email || "Your account"}
                  </Text>
                </View>
              </View>
            </Group>
          </Section>

          <Section title="Your trip">
            <Group>
              <View style={styles.status}>
                <Icon name="phone-portrait-outline" size={18} color={colors.muted} />
                <Text style={[type.body, styles.grow]}>{storageStatus}</Text>
              </View>
              <View style={styles.status}>
                <Icon name="cloud-outline" size={18} color={colors.muted} />
                <Text style={[type.body, styles.grow]}>{syncStatus || "Connecting to your account…"}</Text>
              </View>
            </Group>
            <Text style={styles.note}>Photo files stay on the phone that took them. Everything else follows your account.</Text>
          </Section>

          <Group>
            <ActionRow icon="log-out-outline" label="Sign out" destructive onPress={onSignOut} />
          </Group>
        </ScrollView>
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
  content: { padding: 16, paddingTop: 8, paddingBottom: 32, gap: 20 },
  grow: { flex: 1 },
  account: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 14, paddingVertical: 12 },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: radius.pill,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.soft,
  },
  status: { flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 14, minHeight: 48 },
  note: { ...type.secondary, paddingHorizontal: 4, paddingTop: 6 },
});
