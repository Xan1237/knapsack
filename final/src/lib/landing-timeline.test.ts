import { expect, it } from "vitest";
import {
  landingClosure,
  landingPackedCount,
  landingReadyToClose,
} from "./landing-timeline";

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

it("opens from closed on the first scroll and closes again only after packing", () => {
  expect(landingClosure(0)).toBe(1);
  expect(landingClosure(0.06)).toBeCloseTo(0.5);
  expect(landingClosure(0.12)).toBe(0);
  expect(landingClosure(0.787)).toBe(0);
  expect(landingClosure(0.788)).toBe(1);
  expect(landingClosure(0.5)).toBe(0);
});
