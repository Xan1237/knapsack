import { expect, it } from "vitest";
import { landingPackedCount, landingReadyToClose } from "./landing-timeline";

it("closes as soon as all eight items are packed rather than waiting for another scroll", () => {
  expect(landingPackedCount(0.787)).toBe(7);
  expect(landingReadyToClose(0.787)).toBe(false);
  expect(landingPackedCount(0.788)).toBe(8);
  expect(landingReadyToClose(0.788)).toBe(true);
  expect(landingReadyToClose(1)).toBe(true);
});

it("reopens when scrolling back and keeps the counter bounded", () => {
  expect(landingPackedCount(0)).toBe(0);
  expect(landingPackedCount(2)).toBe(8);
  expect(landingReadyToClose(0.7)).toBe(false);
});
