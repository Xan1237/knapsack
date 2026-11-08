import { type ReactNode, useEffect, useRef, useState } from "react";
import {
  Animated,
  Easing,
  KeyboardAvoidingView,
  Modal,
  PanResponder,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors, radius, type } from "../theme";

const useNativeDriver = Platform.OS !== "web";
const closeMs = 180;

/**
 * iOS silently refuses to present a picker, alert, or modal while another is still dismissing.
 * Anything launched from a sheet that also closes it has to go through this.
 */
export function afterSheet(action: () => void) {
  setTimeout(action, closeMs + 170);
}

/** A bottom sheet: dims the screen, slides up, and closes on backdrop tap, back, or dragging down. */
export function Sheet({
  visible,
  title,
  onClose,
  children,
}: {
  visible: boolean;
  title?: string;
  onClose: () => void;
  children: ReactNode;
}) {
  const { height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const [mounted, setMounted] = useState(visible);
  const progress = useRef(new Animated.Value(0)).current;
  const drag = useRef(new Animated.Value(0)).current;
  const close = useRef(onClose);
  close.current = onClose;

  useEffect(() => {
    if (visible) {
      setMounted(true);
      drag.setValue(0);
      Animated.timing(progress, {
        toValue: 1,
        duration: 240,
        easing: Easing.out(Easing.cubic),
        useNativeDriver,
      }).start();
      return;
    }
    Animated.timing(progress, {
      toValue: 0,
      duration: closeMs,
      easing: Easing.in(Easing.cubic),
      useNativeDriver,
    }).start(({ finished }) => {
      if (finished) setMounted(false);
    });
  }, [visible, progress, drag]);

  const responder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, state) => state.dy > 4,
      onPanResponderMove: (_, state) => drag.setValue(Math.max(0, state.dy)),
      onPanResponderRelease: (_, state) => {
        if (state.dy > 80 || state.vy > 1) close.current();
        else Animated.spring(drag, { toValue: 0, useNativeDriver }).start();
      },
      onPanResponderTerminate: () => Animated.spring(drag, { toValue: 0, useNativeDriver }).start(),
    }),
  ).current;

  const translateY = Animated.add(
    progress.interpolate({ inputRange: [0, 1], outputRange: [height, 0] }),
    drag,
  );

  return (
    <Modal
      visible={mounted}
      transparent
      animationType="none"
      statusBarTranslucent
      navigationBarTranslucent
      onRequestClose={onClose}
    >
      {/* Lifts the sheet above the keyboard, so a text field in it stays visible while typing. */}
      <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === "ios" ? "padding" : "height"}>
        <Animated.View style={[styles.backdrop, { opacity: progress }]}>
          <Pressable accessibilityLabel="Dismiss" style={styles.fill} onPress={onClose} />
        </Animated.View>
        <Animated.View
          accessibilityViewIsModal
          style={[
            styles.sheet,
            { maxHeight: height - insets.top - 24, paddingBottom: Math.max(insets.bottom, 12), transform: [{ translateY }] },
          ]}
        >
          <View style={styles.dragArea} {...responder.panHandlers}>
            <View style={styles.grabber} />
            {!!title && <Text style={type.heading}>{title}</Text>}
          </View>
          <ScrollView style={styles.scroll} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
            {children}
          </ScrollView>
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, justifyContent: "flex-end" },
  fill: { flex: 1 },
  backdrop: { ...StyleSheet.absoluteFill, backgroundColor: "rgba(20, 28, 22, 0.42)" },
  sheet: {
    backgroundColor: colors.paper,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    overflow: "hidden",
  },
  dragArea: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 12, gap: 10 },
  grabber: { alignSelf: "center", width: 36, height: 4, borderRadius: 2, backgroundColor: colors.line },
  scroll: { flexGrow: 0 },
  content: { paddingHorizontal: 16, paddingBottom: 12, gap: 14 },
});
