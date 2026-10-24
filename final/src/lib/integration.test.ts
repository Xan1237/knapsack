import { describe, it, expect } from "vitest";
import { importCollection, bagForState } from "./collection";
import { initialState, reducer } from "./state";
import { createItem, revisionOf, sizeOf, suitcases, type Vec3 } from "./domain";
import { findPackingChoices } from "./choices";
import { pack } from "./packing";
import { validatePlan } from "./validate";

describe("combined inventory contract", () => {
  it("preserves native edits, identities and orientations through repeated exports/imports", () => {
    const source = initialState();
    source.items[0] = {
      ...source.items[0],
      scale: [1.4, 0.7, 1.3],
      orientations: [0, 1],
      required: true,
      modelUrl: "/models/item.gltf",
    };
    const roundTrip = (state: typeof source) =>
      importCollection({
        schemaVersion: 1,
        units: "mm",
        upAxis: "z",
        bag: bagForState(state),
        items: state.items,
        photos: state.photos,
      });
    const first = roundTrip(source),
      second = roundTrip(first);
    expect(first.items.map((i) => i.id)).toEqual(source.items.map((i) => i.id));
    expect(sizeOf(first.items[0])).toEqual(sizeOf(source.items[0]));
    expect(sizeOf(second.items[0])).toEqual(sizeOf(source.items[0]));
    expect(first.items[0].orientations).toEqual([0, 1]);
    expect(first.items[0].modelUrl).toBe("/models/item.gltf");
    expect(bagForState(first).dimensions).toEqual(suitcases[0].dimensions);
  });
  it("converts step2 centimeters/Y-up once and retains upright limitations", () => {
    const state = importCollection({
      schemaVersion: 1,
      bag: {
        id: "small",
        name: "Small bag",
        dimensions: [40, 18, 28],
        clearance: 0.3,
      },
      items: [
        {
          id: "bottle",
          name: "Bottle",
          category: "bottle",
          dimensions: [8, 22, 8],
          color: "#7c9b83",
          allowedPermutations: [
            [0, 1, 2],
            [2, 1, 0],
          ],
          required: true,
          modelUrl: "/models/bottle.gltf",
        },
      ],
    });
    expect(bagForState(state).dimensions).toEqual([400, 280, 180]);
    expect(bagForState(state).clearance).toBe(3);
    expect(sizeOf(state.items[0])).toEqual([80, 80, 220]);
    expect(state.items[0].orientations).toEqual([0, 1]);
    const plan = pack(state.items, bagForState(state));
    expect(plan.unplaced.map((i) => i.id)).toEqual(["bottle"]);
    expect(validatePlan(plan, state.items, bagForState(state)).valid).toBe(
      true,
    );
  });
  it("rejects ambiguous bad identities, invalid rotations and unusable clearance", () => {
    const item = {
      id: "a",
      name: "A",
      category: "other",
      dimensions: [10, 10, 10],
    };
    const bag = { dimensions: [30, 20, 30] };
    expect(() => importCollection({ bag, items: [item, item] })).toThrow();
    expect(() =>
      importCollection({
        bag,
        items: [{ ...item, allowedPermutations: [[0, 0, 1]] }],
      }),
    ).toThrow();
    expect(() =>
      importCollection({ bag: { ...bag, clearance: 20 }, items: [item] }),
    ).toThrow();
  });
  it("protects essentials during individual edits, selections and merges", () => {
    let state = {
      ...initialState(),
      items: [
        createItem("clothing", "essential"),
        createItem("pouch", "optional"),
      ],
    };
    state = reducer(state, {
      type: "edit",
      id: "essential",
      patch: { required: true },
    });
    state = reducer(state, {
      type: "edit",
      id: "essential",
      patch: { included: false },
    });
    expect(state.items[0].included).toBe(true);
    state = reducer(state, { type: "selection", includeIds: [] });
    expect(state.items.map((i) => i.included)).toEqual([true, false]);
    state = reducer(state, {
      type: "merge",
      target: "optional",
      source: "essential",
    });
    expect(state.items[0].required).toBe(true);
    expect(state.items[0].included).toBe(true);
  });
  it("invalidates plan revisions when essential or priority inputs change", () => {
    const item = createItem("other", "a"),
      original = revisionOf([item], suitcases[0]);
    expect(revisionOf([{ ...item, required: true }], suitcases[0])).not.toBe(
      original,
    );
    expect(revisionOf([{ ...item, priority: 5 }], suitcases[0])).not.toBe(
      original,
    );
  });
  it("applies a computed swap deterministically while retaining protected and other packed items", () => {
    const state = initialState(),
      bag = suitcases[1];
    state.items[6] = { ...state.items[6], required: true };
    const original = pack(state.items, bag);
    const wanted = original.unplaced.find(
      (i) => findPackingChoices(state.items, bag, i.id).options.length,
    );
    expect(wanted).toBeDefined();
    const option = findPackingChoices(state.items, bag, wanted!.id).options[0];
    expect(option.removeIds).not.toContain(state.items[6].id);
    const revised = reducer(state, {
      type: "selection",
      includeIds: option.includeIds,
      priorityId: wanted!.id,
    });
    const result = pack(revised.items, bag),
      placed = new Set(result.placements.map((i) => i.id));
    expect(placed.has(wanted!.id)).toBe(true);
    expect(
      original.placements.every(
        (i) => option.removeIds.includes(i.id) || placed.has(i.id),
      ),
    ).toBe(true);
    expect(validatePlan(result, revised.items, bag).valid).toBe(true);
  });
  it("does not offer to discard an oversized essential", () => {
    const item = {
      ...createItem("other", "oversized"),
      estimate: [900, 900, 900] as Vec3,
      required: true,
    };
    expect(findPackingChoices([item], suitcases[1], item.id).options).toEqual(
      [],
    );
  });
});
