import Ionicons from "@expo/vector-icons/Ionicons";
import SliderBase from "@react-native-community/slider";
import { Children, type ComponentProps, Fragment, type ReactNode } from "react";
import { Pressable, StyleSheet, Switch, Text, View, type ViewStyle } from "react-native";
import type { Category } from "../domain";
import { colors, radius, type } from "../theme";

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
  size = "regular",
  disabled,
  style,
}: {
  label: string;
  icon?: IconName;
  onPress: () => void;
  kind?: "primary" | "secondary" | "quiet" | "danger";
  size?: "regular" | "small";
  disabled?: boolean;
  style?: ViewStyle;
}) {
  const foreground = kind === "primary" ? colors.white : kind === "danger" ? colors.error : colors.green;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: !!disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        size === "small" && styles.buttonSmall,
        kind === "primary" && styles.primary,
        (kind === "secondary" || kind === "danger") && styles.secondary,
        (pressed || disabled) && { opacity: disabled ? 0.4 : 0.7 },
        style,
      ]}
    >
      {icon && <Ionicons name={icon} size={size === "small" ? 16 : 18} color={foreground} />}
      <Text numberOfLines={1} style={[styles.buttonText, size === "small" && styles.buttonTextSmall, { color: foreground }]}>
        {label}
      </Text>
    </Pressable>
  );
}

/** An icon-only control with a 44 pt target. */
export function IconButton({
  icon,
  label,
  onPress,
  color = colors.ink,
  disabled,
}: {
  icon: IconName;
  label: string;
  onPress: () => void;
  color?: string;
  disabled?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: !!disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [styles.iconButton, pressed && { opacity: 0.55 }, disabled && { opacity: 0.4 }]}
    >
      <Ionicons name={icon} size={22} color={color} />
    </Pressable>
  );
}

/** A titled block of content. */
export function Section({ title, right, children }: { title?: string; right?: ReactNode; children: ReactNode }) {
  return (
    <View style={styles.section}>
      {(title || right) && (
        <View style={styles.sectionHeader}>
          {title && <Text style={type.section}>{title}</Text>}
          {right}
        </View>
      )}
      {children}
    </View>
  );
}

/** A white rounded group of rows with hairlines between them. */
export function Group({ children, style }: { children: ReactNode; style?: ViewStyle }) {
  const rows = Children.toArray(children).filter(Boolean);
  return (
    <View style={[styles.group, style]}>
      {rows.map((row, index) => (
        <Fragment key={index}>
          {index > 0 && <View style={styles.hairline} />}
          {row}
        </Fragment>
      ))}
    </View>
  );
}

export function ToggleRow({
  label,
  hint,
  value,
  disabled,
  onChange,
}: {
  label: string;
  hint?: string;
  value: boolean;
  disabled?: boolean;
  onChange: (next: boolean) => void;
}) {
  return (
    <View style={[styles.row, disabled && { opacity: 0.55 }]}>
      <View style={styles.rowText}>
        <Text style={type.body}>{label}</Text>
        {!!hint && <Text style={type.secondary}>{hint}</Text>}
      </View>
      <Switch
        accessibilityLabel={label}
        value={value}
        disabled={disabled}
        onValueChange={onChange}
        trackColor={{ true: colors.green, false: colors.line }}
        thumbColor={colors.white}
      />
    </View>
  );
}

/** A tappable row with an icon, used for menus and lists of actions. */
export function ActionRow({
  icon,
  label,
  hint,
  onPress,
  disabled,
  destructive,
  trailing,
}: {
  icon?: IconName;
  label: string;
  hint?: string;
  onPress: () => void;
  disabled?: boolean;
  destructive?: boolean;
  trailing?: ReactNode;
}) {
  const color = destructive ? colors.error : colors.green;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: !!disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed && { backgroundColor: colors.paper }, disabled && { opacity: 0.4 }]}
    >
      {icon && (
        <View style={[styles.rowIcon, destructive && { backgroundColor: colors.errorSoft }]}>
          <Ionicons name={icon} size={20} color={color} />
        </View>
      )}
      <View style={styles.rowText}>
        <Text style={[type.bodyStrong, destructive && { color: colors.error }]}>{label}</Text>
        {!!hint && <Text style={type.secondary}>{hint}</Text>}
      </View>
      {trailing}
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

/** A slider with its name and current value on one line above it. */
export function SliderRow({
  label,
  valueText,
  hint,
  ...slider
}: ComponentProps<typeof Slider> & { valueText: string; hint?: string }) {
  return (
    <View style={styles.sliderRow}>
      <View style={styles.between}>
        <Text style={type.body}>{label}</Text>
        <Text style={type.bodyStrong}>{valueText}</Text>
      </View>
      {!!hint && <Text style={type.secondary}>{hint}</Text>}
      <Slider label={label} {...slider} />
    </View>
  );
}

export function Card({ children, style }: { children: ReactNode; style?: ViewStyle }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

/** An inline message for something the person should know or fix. */
export function Banner({ tone = "info", children, action }: { tone?: "info" | "warn" | "error"; children: ReactNode; action?: ReactNode }) {
  const palette = {
    info: { background: colors.soft, foreground: colors.ink, icon: "information-circle-outline" as const },
    warn: { background: colors.warnSoft, foreground: colors.ink, icon: "alert-circle-outline" as const },
    error: { background: colors.errorSoft, foreground: colors.error, icon: "alert-circle-outline" as const },
  }[tone];
  return (
    <View style={[styles.banner, { backgroundColor: palette.background }]}>
      <View style={styles.bannerBody}>
        <Ionicons name={palette.icon} size={18} color={palette.foreground} />
        <Text style={[styles.bannerText, { color: palette.foreground }]}>{children}</Text>
      </View>
      {action}
    </View>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: 48,
    paddingHorizontal: 16,
    borderRadius: radius.md,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  buttonSmall: { minHeight: 38, paddingHorizontal: 12, borderRadius: radius.sm, gap: 6 },
  primary: { backgroundColor: colors.green },
  secondary: { borderWidth: 1, borderColor: colors.line, backgroundColor: colors.white },
  buttonText: { fontSize: 15, fontWeight: "600", flexShrink: 1 },
  buttonTextSmall: { fontSize: 14 },
  iconButton: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
  section: { gap: 8 },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 4,
  },
  group: {
    backgroundColor: colors.white,
    borderRadius: radius.md,
    overflow: "hidden",
  },
  hairline: { height: StyleSheet.hairlineWidth, backgroundColor: colors.line, marginLeft: 14 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    minHeight: 52,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  rowIcon: {
    width: 36,
    height: 36,
    borderRadius: radius.sm,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.soft,
  },
  rowText: { flex: 1, gap: 1 },
  slider: { width: "100%", height: 40 },
  sliderRow: { paddingHorizontal: 14, paddingTop: 12, paddingBottom: 4, gap: 2 },
  between: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 10 },
  card: { backgroundColor: colors.white, borderRadius: radius.md, padding: 14, gap: 8 },
  banner: { borderRadius: radius.md, padding: 12, gap: 10 },
  bannerBody: { flexDirection: "row", gap: 8, alignItems: "flex-start" },
  bannerText: { flex: 1, fontSize: 14, lineHeight: 20 },
});
