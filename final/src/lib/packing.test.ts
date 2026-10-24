import { describe, it, expect } from "vitest";
import { Box3, Vector3 } from "three";
import {
  createItem,
  demoItems,
  sizeOf,
  suitcases,
  revisionOf,
  planIsCurrent,
  type Vec3,
  type Item,
  type Suitcase,
  permutations,
} from "./domain";
import { pack } from "./packing";
import { validatePlan } from "./validate";
import { itemQuaternion } from "./render-transform";

const item = (
  id: string,
  dimensions: Vec3,
  orientations = [0, 1, 2, 3, 4, 5],
): Item => ({
  ...createItem("other", id),
  dimensions,
  estimate: dimensions,
  orientations,
});
const bag = (dimensions: Vec3, clearance = 0): Suitcase => ({
  id: "test",
  name: "Test",
  subtitle: "",
  dimensions,
  clearance,
});
describe("packing contract", () => {
  it("packs the reproducible sample completely and deterministically", () => {
    const a = pack(demoItems(), suitcases[0]),
      b = pack(demoItems(), suitcases[0]);
    expect(a).toEqual(b);
    expect(a.outcome).toBe("complete");
    expect(a.placements).toHaveLength(9);
    expect(validatePlan(a, demoItems(), suitcases[0])).toEqual({
      valid: true,
      errors: [],
    });
  });
  it("rotates a tall envelope when only a sideways orientation fits", () => {
    const items = [item("rotate", [30, 20, 60])],
      b = bag([60, 30, 20]);
    const p = pack(items, b);
    expect(p.outcome).toBe("complete");
    expect(p.placements[0].orientation).not.toBe(0);
    expect(p.placements[0].dimensions).toEqual([60, 30, 20]);
    expect(validatePlan(p, items, b).valid).toBe(true);
  });
  it("does not tip an item when only upright orientations are permitted", () => {
    const items = [item("upright", [30, 20, 60], [0, 1])],
      b = bag([60, 30, 20]);
    const p = pack(items, b);
    expect(p.outcome).toBe("constraint-conflict");
    expect(p.unplaced[0].id).toBe("upright");
  });
  it("accepts exact wall clearance and rejects a fraction less than required", () => {
    const items = [item("fit", [100, 100, 100])];
    expect(pack(items, bag([106, 106, 106], 3)).outcome).toBe("complete");
    expect(pack(items, bag([105.99, 106, 106], 3)).outcome).toBe(
      "constraint-conflict",
    );
  });
  it("keeps required inter-item clearance for a tight side-by-side fit", () => {
    const items = [item("a", [100, 100, 100]), item("b", [100, 100, 100])],
      b = bag([209, 106, 106], 3);
    const p = pack(items, b);
    expect(p.outcome).toBe("complete");
    expect(validatePlan(p, items, b).valid).toBe(true);
    const [a, c] = p.placements;
    expect(Math.abs(a.position[0] - c.position[0])).toBe(103);
    expect(pack(items, bag([208.9, 106, 106], 3)).unplaced).toHaveLength(1);
  });
  it("accounts for oversized items, excluded items and volume conflicts honestly", () => {
    const items = [
        item("normal", [50, 50, 50]),
        item("huge", [600, 600, 600]),
        { ...item("excluded", [900, 900, 900]), included: false },
      ],
      b = bag([100, 100, 100]);
    const p = pack(items, b);
    expect(p.placements.map((p) => p.id)).toEqual(["normal"]);
    expect(p.unplaced.map((u) => u.id)).toEqual(["huge"]);
    expect(p.conflicts).toContain("huge");
    expect(validatePlan(p, items, b).valid).toBe(true);
    const v = pack([item("a", [80, 80, 80]), item("b", [80, 80, 80])], b);
    expect(v.conflicts).toContain("total-volume");
  });
  it("reports a bounded search limit without claiming impossibility", () => {
    const items = [item("a", [10, 10, 10])],
      b = bag([100, 100, 100]);
    const p = pack(items, b, 0);
    expect(p.outcome).toBe("search-exhausted");
    expect(p.conflicts).toEqual([]);
    expect(p.unplaced).toHaveLength(1);
    expect(validatePlan(p, items, b).valid).toBe(true);
  });
  it("reproduces exhaustion through editable inventory sizes with the production budget", () => {
    const items = Array.from({ length: 30 }, (_, index) => {
      const i = createItem("other", `fixture-${index + 1}`);
      const s = (50 + ((index * 7) % 16) * 5) / 100;
      return { ...i, scale: [s, s, s] as Vec3 };
    });
    // Preserve the original single-cavity exhaustion regression separately.
    const originalBag = { ...suitcases[0], clamshell: false };
    const result = pack(items, originalBag);
    expect(result.outcome).toBe("search-exhausted");
    expect(result.conflicts).toEqual([]);
    expect(validatePlan(result, items, originalBag).valid).toBe(true);
  });
  it("identifies a partial supported layout without pretending the heuristic proved a conflict", () => {
    const items = [item("a", [60, 60, 60]), item("b", [60, 60, 60])],
      b = bag([100, 100, 100]);
    const p = pack(items, b);
    expect(p.outcome).toBe("partial");
    expect(p.unplaced).toHaveLength(1);
    expect(p.conflicts).toEqual([]);
    expect(validatePlan(p, items, b).valid).toBe(true);
  });
  it("rejects malformed numerical inputs", () => {
    for (const value of [0, -1, NaN, Infinity])
      expect(() =>
        pack([item("bad", [value, 10, 10])], bag([100, 100, 100])),
      ).toThrow();
    expect(() =>
      pack([item("bad", [10, 10, 10], [8])], bag([100, 100, 100])),
    ).toThrow();
  });
  it("detects overlap, tampered rotations, missing identities, duplicates and stale bags independently", () => {
    const items = [item("a", [10, 20, 30]), item("b", [10, 20, 30])],
      b = bag([100, 100, 100]),
      p = pack(items, b);
    const mutate = (fn: (p: ReturnType<typeof pack>) => void) => {
      const c = structuredClone(p);
      fn(c);
      expect(validatePlan(c, items, b).valid).toBe(false);
    };
    mutate((c) => {
      c.placements[1].position = [...c.placements[0].position];
    });
    mutate((c) => {
      c.placements[0].orientation = 4;
    });
    mutate((c) => {
      c.placements.pop();
    });
    mutate((c) => {
      c.placements.push(c.placements[0]);
    });
    mutate((c) => {
      c.placements[0].position[0] = -1;
    });
    mutate((c) => {
      c.placements[0].dimensions[1] = NaN;
    });
    mutate((c) => {
      c.placements[0].order = 999;
    });
    expect(validatePlan(p, items, { ...b, clearance: 2 }).valid).toBe(false);
  });
  it("covers every input in the revision and rejects late results", () => {
    const items = [item("a", [10, 20, 30])],
      b = bag([100, 100, 100]),
      p = pack(items, b);
    expect(planIsCurrent(p, items, b)).toBe(true);
    for (const changed of [
      [{ ...items[0], scale: [2, 1, 1] as Vec3 }],
      [{ ...items[0], included: false }],
      [{ ...items[0], orientations: [1] }],
    ])
      expect(planIsCurrent(p, changed, b)).toBe(false);
    expect(planIsCurrent(p, items, { ...b, id: "new" })).toBe(false);
    expect(planIsCurrent(p, items, { ...b, dimensions: [101, 100, 100] })).toBe(
      false,
    );
    expect(
      revisionOf([{ ...items[0], label: "renamed", color: "#ffffff" }], b),
    ).toBe(p.revision);
  });
  it("keeps renderer transforms in the independently validated envelope for every orientation and scale", () => {
    const original = item("asymmetric", [70, 130, 210]);
    original.scale = [1.7, 0.6, 1.2];
    const d = sizeOf(original);
    for (let rotation = 0; rotation < 6; rotation++) {
      const q = itemQuaternion(rotation),
        bounds = new Box3();
      for (const x of [-0.5, 0.5])
        for (const y of [-0.5, 0.5])
          for (const z of [-0.5, 0.5])
            bounds.expandByPoint(
              new Vector3(x * d[0], y * d[2], z * d[1]).applyQuaternion(q),
            );
      const extent = bounds.getSize(new Vector3()),
        expected = permutations[rotation].map((k) => d[k]);
      expect(extent.x).toBeCloseTo(expected[0]);
      expect(extent.y).toBeCloseTo(expected[2]);
      expect(extent.z).toBeCloseTo(expected[1]);
      expect(q.length()).toBeCloseTo(1);
    }
  });
  it("validates adversarial deterministic inventories over varied bags", () => {
    let seed = 2410;
    const random = () => {
      seed = (seed * 1664525 + 1013904223) >>> 0;
      return seed / 2 ** 32;
    };
    for (let run = 0; run < 40; run++) {
      const items = Array.from(
        { length: 3 + Math.floor(random() * 10) },
        (_, i) =>
          item(
            `i-${i}`,
            [
              20 + Math.floor(random() * 200),
              20 + Math.floor(random() * 270),
              20 + Math.floor(random() * 150),
            ],
            random() > 0.5 ? [0, 1] : [0, 1, 2, 3, 4, 5],
          ),
      );
      const b = suitcases[run % 3],
        p = pack(items, b, 15000);
      expect(validatePlan(p, items, b), `inventory ${run}`).toEqual({
        valid: true,
        errors: [],
      });
      expect(
        new Set([
          ...p.placements.map((p) => p.id),
          ...p.unplaced.map((p) => p.id),
        ]).size,
      ).toBe(items.length);
    }
  });
});
