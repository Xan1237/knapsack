import Ionicons from "@expo/vector-icons/Ionicons";
import SliderBase from "@react-native-community/slider";
import type { ComponentProps, ReactNode } from "react";
import { Pressable, StyleSheet, Text, View, type ViewStyle } from "react-native";
import type { Category } from "../domain";
import { colors } from "../theme";

export type IconName = ComponentProps<typeof Ionicons>["name"];
export const Icon = Ionicons;

const categoryIcons: Record<Category, IconName> = {
  clothing: "shirt-outline",
  shoes: "footsteps-outline",
  bottle: "flask-outline",
  pouch: "bag-handle-outline",
  camera: "camera-outline",
  headphones: "headset-outline",
  book: "book-outline",
  other: "cube-outline",
};
export function CategoryIcon({ category, size = 22, color = colors.ink }: { category: Category; size?: number; color?: string }) {
  return <Ionicons name={categoryIcons[category]} size={size} color={color} />;
}

export function Button({
  label,
  icon,
  onPress,
  kind = "secondary",
  disabled,
  style,
}: {
  label: string;
  icon?: IconName;
  onPress: () => void;
  kind?: "primary" | "secondary" | "quiet";
  disabled?: boolean;
  style?: ViewStyle;
}) {
  const foreground = kind === "primary" ? colors.white : colors.green;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: !!disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        kind === "primary" && styles.primary,
        kind === "secondary" && styles.secondary,
        (pressed || disabled) && { opacity: disabled ? 0.45 : 0.7 },
        style,
      ]}
    >
      {icon && <Ionicons name={icon} size={16} color={foreground} />}
      <Text style={[styles.buttonText, { color: foreground }]}>{label}</Text>
    </Pressable>
  );
}

export function IconButton({
  icon,
  label,
  onPress,
  active,
  disabled,
}: {
  icon: IconName;
  label: string;
  onPress: () => void;
  active?: boolean;
  disabled?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected: !!active, disabled: !!disabled }}
      disabled={disabled}
      hitSlop={6}
      onPress={onPress}
      style={[styles.iconButton, active && styles.iconActive, disabled && { opacity: 0.45 }]}
    >
      <Ionicons name={icon} size={19} color={active ? colors.white : colors.green} />
    </Pressable>
  );
}

export function Check({
  label,
  checked,
  disabled,
  onChange,
}: {
  label: string;
  checked: boolean;
  disabled?: boolean;
  onChange: (next: boolean) => void;
}) {
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked, disabled: !!disabled }}
      disabled={disabled}
      onPress={() => onChange(!checked)}
      style={[styles.check, disabled && { opacity: 0.55 }]}
    >
      <Ionicons name={checked ? "checkbox" : "square-outline"} size={22} color={colors.green} />
      <Text style={styles.checkLabel}>{label}</Text>
    </Pressable>
  );
}

export function Slider({
  label,
  value,
  min,
  max,
  step = 1,
  disabled,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  disabled?: boolean;
  onChange: (next: number) => void;
}) {
  return (
    <SliderBase
      accessibilityLabel={label}
      style={styles.slider}
      value={value}
      minimumValue={min}
      maximumValue={max}
      step={step}
      disabled={disabled}
      minimumTrackTintColor={colors.green}
      maximumTrackTintColor={colors.line}
      thumbTintColor={colors.green}
      onValueChange={onChange}
    />
  );
}

export function Eyebrow({ children }: { children: ReactNode }) {
  return <Text style={styles.eyebrow}>{children}</Text>;
}
export function Card({ children, style }: { children: ReactNode; style?: ViewStyle }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

const styles = StyleSheet.create({
  button: {
    minHeight: 42,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  primary: { backgroundColor: colors.green },
  secondary: { borderWidth: 1, borderColor: colors.line, backgroundColor: colors.white },
  buttonText: { fontSize: 14, fontWeight: "600", flexShrink: 1 },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.line,
  },
  iconActive: { backgroundColor: colors.green, borderColor: colors.green },
  check: { flexDirection: "row", alignItems: "center", gap: 10, minHeight: 44 },
  checkLabel: { color: colors.ink, fontSize: 15, flexShrink: 1 },
  slider: { width: "100%", height: 40 },
  eyebrow: { color: colors.muted, fontSize: 11, fontWeight: "700", letterSpacing: 1.2 },
  card: {
    backgroundColor: colors.white,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.line,
    padding: 14,
    gap: 6,
  },
});
