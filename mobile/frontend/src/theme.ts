import { Platform } from "react-native";

export const colors = {
  ink: "#293a2d",
  muted: "#7c8176",
  line: "#dedfd4",
  paper: "#f8f8f2",
  green: "#415c40",
  soft: "#eef0e6",
  orange: "#c4774f",
  canvas: "#eeeae1",
  error: "#a3492e",
  white: "#ffffff",
};
export const serif = Platform.select({ ios: "Georgia", android: "serif", default: "Georgia" });
