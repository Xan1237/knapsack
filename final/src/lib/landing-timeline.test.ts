import { expect, it } from "vitest";
import {
  LANDING_ITEM_COUNT,
  landingItemProgress,
  landingPackedCount,
  landingPackingProgress,
} from "./landing-timeline";

it("starts empty and counts each essential only when its arrival finishes", () => {
  expect(landingPackedCount(0)).toBe(0);
  expect(landingPackedCount(0.199)).toBe(0);
  for (let count = 1; count <= LANDING_ITEM_COUNT; count++) {
    const progress = 0.1 + count * 0.1;
    expect(landingPackedCount(progress)).toBe(count);
    expect(landingItemProgress(progress, count - 1)).toBe(1);
    if (count < LANDING_ITEM_COUNT)
      expect(landingItemProgress(progress, count)).toBe(0);
  }
  expect(landingPackingProgress(0.9)).toBe(1);
  expect(landingPackedCount(1)).toBe(8);
});

it("moves only one essential at a time and keeps earlier items in place", () => {
  for (let step = 0; step <= 1000; step++) {
    const progress = step / 1000;
    const arrivals = Array.from({ length: LANDING_ITEM_COUNT }, (_, index) =>
      landingItemProgress(progress, index),
    );
    expect(
      arrivals.filter((amount) => amount > 0 && amount < 1).length,
    ).toBeLessThanOrEqual(1);
    arrivals.forEach((amount, index) => {
      if (amount > 0 && index > 0) expect(arrivals[index - 1]).toBe(1);
    });
  }
});

it("reverses predictably on scroll back and clamps outside the story", () => {
  expect(landingItemProgress(0.35, 0)).toBe(1);
  expect(landingItemProgress(0.35, 2)).toBeCloseTo(0.5);
  expect(landingItemProgress(0.35, 3)).toBe(0);
  expect(landingPackedCount(0.35)).toBe(2);
  expect(landingPackingProgress(-1)).toBe(0);
  expect(landingPackingProgress(2)).toBe(1);
});
