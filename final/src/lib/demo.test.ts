import { describe, expect, it } from "vitest";
import {
  demoItems,
  itemSchema,
  revisionOf,
  suitcases,
  type Photo,
  type Proposal,
} from "./domain";
import { demoBottleSpace, demoWaterBottle } from "./demo";
import { pack } from "./packing";
import { validatePlan } from "./validate";
import { initialState, reducer } from "./state";

const bag = suitcases[0];
const volume = (dimensions: number[]) => dimensions.reduce((v, n) => v * n, 1);

describe("travel demonstration", () => {
  it("packs nine ordinary travel belongings into over 85% of the unchanged cabin case", () => {
    const items = demoItems();
    const plan = pack(items, bag);
    expect(items).toHaveLength(9);
    items.forEach((item) => {
      expect(itemSchema.safeParse(item).success).toBe(true);
      expect(item.scale).toEqual([1, 1, 1]);
      expect(item.compression ?? 0).toBe(0);
    });
    expect(bag.dimensions).toEqual([340, 500, 210]);
    expect(plan.outcome).toBe("complete");
    expect(plan.unplaced).toEqual([]);
    expect(validatePlan(plan, items, bag)).toEqual({ valid: true, errors: [] });
    const utilization =
      plan.placements.reduce((sum, p) => sum + volume(p.dimensions), 0) /
      volume(bag.dimensions);
    expect(utilization).toBeGreaterThan(0.85);
    expect(utilization).toBeCloseTo(0.8565340336);
    expect(new Set(plan.placements.map((p) => p.compartment)).size).toBe(2);
  });

  it("leaves an independently validated, supported bottle space without moving the demo", () => {
    const items = demoItems();
    const plan = pack(items, bag);
    const original = structuredClone(plan);
    const space = demoBottleSpace(items, bag, plan)!;
    expect(space).not.toBeNull();
    const inventory = [...items, demoWaterBottle()];
    const filled = {
      ...plan,
      revision: revisionOf(inventory, bag),
      placements: [...plan.placements, space],
    };
    expect(validatePlan(filled, inventory, bag)).toEqual({
      valid: true,
      errors: [],
    });
    expect(plan).toEqual(original);
    expect(space.dimensions).toEqual([75, 220, 75]);
    const support = plan.placements.find((p) => p.id === "demo-8")!;
    expect(space.position).toEqual([
      support.position[0],
      support.position[1],
      support.position[2] + support.dimensions[2] + bag.clearance,
    ]);
    expect(
      (support.dimensions[0] * support.dimensions[1]) /
        (space.dimensions[0] * space.dimensions[1]),
    ).toBeGreaterThan(0.65);
  });

  it("packs a recognized water bottle through the normal photo flow at over 89%", () => {
    const photo: Photo = {
      id: "bottle-photo",
      name: "water-bottle.jpg",
      url: "data:image/jpeg;base64,AA==",
      status: "analyzing",
      requestId: "bottle-request",
      accepted: false,
    };
    const initial = { ...initialState(), photos: [photo] };
    const bottle = demoWaterBottle();
    const proposal: Proposal = {
      key: "water-bottle",
      label: bottle.label,
      category: bottle.category,
      color: bottle.color,
      appearance: bottle.appearance,
      dimensions: bottle.dimensions,
    };
    const action = {
      type: "analysis" as const,
      id: photo.id,
      requestId: photo.requestId,
      proposals: [proposal],
    };
    const added = reducer(initial, action);
    const bottleId = `${photo.id}:${proposal.key}`;
    expect(added.items).toHaveLength(10);
    expect(reducer(added, action)).toBe(added);
    const plan = pack(added.items, bag);
    expect(plan.outcome).toBe("complete");
    expect(validatePlan(plan, added.items, bag).valid).toBe(true);
    const placement = plan.placements.find((p) => p.id === bottleId)!;
    expect(placement.dimensions).toEqual([75, 220, 75]);
    expect(added.items.find((item) => item.id === bottleId)?.sourceIds).toEqual(
      [photo.id],
    );
    expect(
      plan.placements.reduce((sum, p) => sum + volume(p.dimensions), 0) /
        volume(bag.dimensions),
    ).toBeGreaterThan(0.89);
    expect(demoBottleSpace(added.items, bag, plan)).toBeNull();
    const removed = reducer(added, { type: "delete", id: bottleId });
    expect(removed.items).toEqual(initial.items);
    expect(
      demoBottleSpace(removed.items, bag, pack(removed.items, bag)),
    ).not.toBeNull();
  });

  it("hides the marker for stale plans or edited layouts that no longer leave room", () => {
    const items = demoItems();
    const plan = pack(items, bag);
    const changed = items.map((item) =>
      item.id === "demo-8"
        ? { ...item, scale: [1, 1, 2] as [number, number, number] }
        : item,
    );
    expect(demoBottleSpace(changed, bag, plan)).toBeNull();
    expect(demoBottleSpace(changed, bag, pack(changed, bag))).toBeNull();
    expect(demoBottleSpace(items, suitcases[1], plan)).toBeNull();
  });
});
