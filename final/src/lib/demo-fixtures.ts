import type { Category, Vec3 } from "./domain";

/** Folded, full-size travel belongings for the weekender's two 105 mm-deep halves. */
export const travelDemoSpecs: [Category, string, Vec3, string][] = [
  ["clothing", "Sage linen shirt", [256, 300, 48], "#adbd98"],
  ["clothing", "Cream knit", [334, 211, 99], "#e7d8bd"],
  ["clothing", "Jeans & chinos", [256, 191, 99], "#729098"],
  ["clothing", "Terracotta tee", [256, 300, 48], "#c98f75"],
  ["shoes", "Left sneaker", [110, 280, 99], "#e5d9c6"],
  ["shoes", "Right sneaker", [110, 280, 99], "#e5d9c6"],
  ["pouch", "Socks & underwear cube", [108, 280, 99], "#a7b5a1"],
  ["pouch", "Wash bag", [75, 271, 99], "#bf8969"],
  ["other", "Power bank", [75, 180, 21], "#887f9f"],
];

export const demoBottleId = "demo-water-bottle";
export const demoBottleDimensions: Vec3 = [75, 75, 220];
