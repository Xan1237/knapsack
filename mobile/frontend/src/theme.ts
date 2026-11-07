import { Platform } from "react-native";

export const colors = {
  ink: "#1f2b22",
  muted: "#5c665c",
  faint: "#98a095",
  line: "#e5e6dd",
  paper: "#f6f6f1",
  green: "#3f5b3f",
  soft: "#e9eee4",
  warn: "#a9552b",
  warnSoft: "#f9ece3",
  /** Matches the 3D scene's background, so the scene sits flush with its container. */
  canvas: "#eeeae1",
  error: "#a3392a",
  errorSoft: "#fae9e5",
  white: "#ffffff",
};

export const radius = { sm: 10, md: 14, lg: 20, pill: 999 };

export const shadow = { boxShadow: "0px 2px 10px rgba(31, 43, 34, 0.14)" };

export const serif = Platform.select({ ios: "Georgia", android: "serif", default: "Georgia" });

export const type = {
  title: { color: colors.ink, fontSize: 22, fontWeight: "700" as const, letterSpacing: -0.3 },
  heading: { color: colors.ink, fontSize: 17, fontWeight: "700" as const },
  body: { color: colors.ink, fontSize: 15, lineHeight: 21 },
  bodyStrong: { color: colors.ink, fontSize: 15, lineHeight: 21, fontWeight: "600" as const },
  secondary: { color: colors.muted, fontSize: 13, lineHeight: 18 },
  section: { color: colors.muted, fontSize: 13, fontWeight: "600" as const },
};
