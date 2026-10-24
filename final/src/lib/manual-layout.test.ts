import { describe, expect, it } from "vitest";
import {
  createItem,
  itemSchema,
  revisionOf,
  sizeOf,
  type Item,
  type Suitcase,
  type Vec3,
} from "./domain";
import { anchorAtPoint } from "./manual-layout";
import { pack } from "./packing";
import { validatePlan } from "./validate";
import { reducer, type InventoryState } from "./state";
import { importCollection } from "./collection";

const bag: Suitcase = {
  id: "test",
  name: "Test case",
  subtitle: "",
  dimensions: [120, 50, 30],
  clearance: 2,
};
const block = (id: string, dimensions: Vec3): Item => ({
  ...createItem("other", id),
  estimate: dimensions,
  dimensions,
  orientations: [0],
});
const stateOf = (items: Item[]): InventoryState => ({
  items,
  photos: [],
  bagId: "cabin",
  dismissed: [],
  demo: false,
});

describe("moving belongings", () => {
  it("reserves the drop location and moves neighbors into supported spaces on both sides", () => {
    const items = [
      block("moved", [30, 40, 20]),
      block("large", [40, 40, 20]),
      block("small", [35, 40, 20]),
    ];
    const before = pack(items, bag);
    const anchor = anchorAtPoint(items[0], bag, [0, 0, -0.03], 0)!;
    expect(anchor.position).toEqual([45, 2, 2]);
    const moved = reducer(stateOf(items), {
      type: "move",
      id: "moved",
      anchor,
    }).items;
    const after = pack(moved, bag);
    expect(after.outcome).toBe("complete");
    expect(after.placements.find((p) => p.id === "moved")?.position).toEqual(
      anchor.position,
    );
    expect(
      after.placements.find((p) => p.id === "small")?.position,
    ).not.toEqual(before.placements.find((p) => p.id === "small")?.position);
    expect(after.placements.find((p) => p.id === "small")?.position[0]).toBe(
      77,
    );
    expect(validatePlan(after, moved, bag)).toEqual({
      valid: true,
      errors: [],
    });
    expect(after.revision).not.toBe(before.revision);
  });
  it("moves across the seam and clamps drops to wall clearance in either compartment", () => {
    const clamshell = {
      ...bag,
      dimensions: [120, 100, 60] as Vec3,
      clamshell: true,
    };
    const item = block("moved", [30, 40, 20]);
    for (const x of [-100, 100]) {
      const anchor = anchorAtPoint(item, clamshell, [x, 0, 100], 0)!;
      expect(anchor.compartment).toBe(x < 0 ? "lid" : "base");
      expect(anchor.position).toEqual([x < 0 ? 2 : 88, 58, 2]);
      const items = [{ ...item, anchor }];
      const result = pack(items, clamshell);
      expect(result.placements[0].compartment).toBe(anchor.compartment);
      expect(validatePlan(result, items, clamshell).valid).toBe(true);
    }
    expect(anchorAtPoint(item, clamshell, [NaN, 0, 0], 0)).toBeNull();
    expect(anchorAtPoint(item, clamshell, [0, 0, 0], 3)).toBeNull();
  });
  it("releases the previous anchor when another item moves and clears anchors on bag or size changes", () => {
    const items = [block("a", [30, 40, 20]), block("b", [30, 40, 20])];
    const anchor = anchorAtPoint(items[0], bag, [0, 0, 0], 0)!;
    const first = reducer(stateOf(items), { type: "move", id: "a", anchor });
    const second = reducer(first, { type: "move", id: "b", anchor });
    expect(second.items.map((i) => !!i.anchor)).toEqual([false, true]);
    expect(
      reducer(second, { type: "auto-layout" }).items.every((i) => !i.anchor),
    ).toBe(true);
    expect(
      reducer(second, { type: "bag", id: "personal" }).items.every(
        (i) => !i.anchor,
      ),
    ).toBe(true);
    expect(
      reducer(second, { type: "edit", id: "b", patch: { scale: [2, 1, 1] } })
        .items[1].anchor,
    ).toBeUndefined();
    const obsolete = [
      { ...items[0], anchor: { ...anchor, position: [999, 2, 2] as Vec3 } },
    ];
    expect(validatePlan(pack(obsolete, bag), obsolete, bag).valid).toBe(true);
  });
});

describe("clothing compression", () => {
  it("reduces only cloth thickness, allowing a tight fit while keeping the plan envelope exact", () => {
    const shirt = {
      ...block("shirt", [100, 40, 40]),
      category: "clothing" as const,
    };
    expect(pack([shirt], bag).outcome).toBe("constraint-conflict");
    const compressed = { ...shirt, compression: 0.4 };
    expect(sizeOf(compressed)).toEqual([100, 40, 24]);
    const result = pack([compressed], bag);
    expect(result.outcome).toBe("complete");
    expect(validatePlan(result, [compressed], bag).valid).toBe(true);
    expect(sizeOf({ ...compressed, category: "camera" })).toEqual([
      100, 40, 40,
    ]);
    expect(itemSchema.safeParse({ ...shirt, compression: 0.41 }).success).toBe(
      false,
    );
    expect(revisionOf([compressed], bag)).not.toBe(revisionOf([shirt], bag));
  });
  it("round-trips compression and manual placement and duplicates the compressed size exactly once", () => {
    const shirt = { ...createItem("clothing", "shirt"), compression: 0.35 };
    const anchor = anchorAtPoint(
      shirt,
      { ...bag, dimensions: [340, 500, 210] },
      [0, 0, 0],
      0,
    )!;
    const original = { ...shirt, anchor };
    const restored = importCollection({
      units: "mm",
      upAxis: "z",
      items: [original],
    });
    expect(restored.items[0].anchor).toEqual(anchor);
    expect(restored.items[0].compression).toBe(0.35);
    const copy = reducer(stateOf([original]), {
      type: "duplicate",
      id: original.id,
      newId: "copy",
    }).items[1];
    expect(sizeOf(copy)).toEqual(sizeOf(original));
    expect(copy.anchor).toBeUndefined();
  });
});
