import { expect, it } from "vitest";
import { createItem, sizeOf, suitcases, type Item, type Vec3 } from "./domain";
import { explorerLayout } from "./explorer-layout";
import { pack } from "./packing";

function checkClearFloor(items: Item[], clamshell: boolean) {
  const bag = { ...suitcases[0], clamshell };
  const { overflow, bounds } = explorerLayout(items, bag);
  const rightWall = bag.dimensions[0] / (clamshell ? 100 : 200);
  expect(overflow.map((p) => p.id)).toEqual(items.map((i) => i.id));
  for (const item of overflow) {
    expect(item.position[0] - item.dimensions[0] / 2).toBeGreaterThan(
      rightWall + 0.5,
    );
    expect(item.position[1] - item.dimensions[2] / 2).toBeCloseTo(0);
    const extents = [
      item.dimensions[0],
      item.dimensions[2],
      item.dimensions[1],
    ];
    item.position.forEach((n, k) => {
      expect(n - extents[k] / 2).toBeGreaterThanOrEqual(bounds.min[k] - 1e-6);
      expect(n + extents[k] / 2).toBeLessThanOrEqual(bounds.max[k] + 1e-6);
    });
  }
  for (let i = 0; i < overflow.length; i++)
    for (let j = i + 1; j < overflow.length; j++) {
      const a = overflow[i],
        b = overflow[j];
      const separateX =
        Math.abs(a.position[0] - b.position[0]) >=
        (a.dimensions[0] + b.dimensions[0]) / 2 + 0.44;
      const separateZ =
        Math.abs(a.position[2] - b.position[2]) >=
        (a.dimensions[1] + b.dimensions[1]) / 2 + 0.44;
      expect(separateX || separateZ).toBe(true);
    }
  return overflow;
}

it("puts oversized solver overflow outside both open halves using its full scaled size", () => {
  const item = {
    ...createItem("other", "oversized"),
    scale: [4, 4, 4] as Vec3,
  };
  const plan = pack([item], suitcases[0]);
  expect(plan.unplaced.map((u) => u.id)).toEqual([item.id]);
  const [placed] = checkClearFloor([item], true);
  expect(placed.dimensions).toEqual(sizeOf(item).map((n) => n / 100));
});

it("finds separate floor space for 80 mixed-size items in clamshell and legacy explorers", () => {
  const items = Array.from({ length: 80 }, (_, index) => ({
    ...createItem(index % 2 ? "clothing" : "shoes", `overflow-${index}`),
    scale: [0.2 + (index % 5), 0.3 + (index % 4), 1] as Vec3,
    compression: index % 2 ? 0.4 : 0,
  }));
  checkClearFloor(items, true);
  checkClearFloor(items, false);
  expect(explorerLayout(items, suitcases[0])).toEqual(
    explorerLayout(items, suitcases[0]),
  );
});

it("keeps suitcase bounds without inventing overflow when everything fits", () => {
  const result = explorerLayout([], suitcases[0]);
  expect(result.overflow).toEqual([]);
  expect(result.bounds.min[0]).toBeLessThan(-suitcases[0].dimensions[0] / 100);
  expect(result.bounds.max[0]).toBeGreaterThan(
    suitcases[0].dimensions[0] / 100,
  );
});
