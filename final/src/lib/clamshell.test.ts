import { describe, expect, it } from "vitest";
import { Matrix4, Vector3 } from "three";
import {
  type Item,
  type Suitcase,
  createItem,
  demoItems,
  suitcases,
} from "./domain";
import { pack } from "./packing";
import { validatePlan } from "./validate";
import { clamshellPose } from "./render-transform";
import { parsePackingInput } from "./packing-input";
import { importCollection } from "./collection";

const suitcase: Suitcase = {
  id: "two-halves",
  name: "Two halves",
  subtitle: "",
  dimensions: [100, 100, 100],
  clearance: 2,
  clamshell: true,
};
const item = (id: string, height = 40): Item => ({
  ...createItem("other", id),
  estimate: [80, 80, height],
  dimensions: [80, 80, height],
  orientations: [0, 1],
});

describe("two usable suitcase compartments", () => {
  it("rejects clearance that consumes the entire usable depth of either half", () => {
    const bag = {
      ...suitcase,
      dimensions: [100, 100, 10] as [number, number, number],
      clearance: 3,
    };
    expect(() => pack([], bag)).toThrow();
    expect(() => parsePackingInput({ items: [], bag })).toThrow();
    expect(() =>
      importCollection({ items: [], bag, units: "mm", upAxis: "z" }),
    ).toThrow();
  });
  it("packs both halves independently instead of placing the second item on the first", () => {
    const items = [item("a"), item("b")],
      plan = pack(items, suitcase);
    expect(plan.outcome).toBe("complete");
    expect(new Set(plan.placements.map((p) => p.compartment))).toEqual(
      new Set(["base", "lid"]),
    );
    expect(plan.placements[0].position).toEqual(plan.placements[1].position);
    expect(validatePlan(plan, items, suitcase).valid).toBe(true);
    const overlap = structuredClone(plan);
    overlap.placements[1].compartment = overlap.placements[0].compartment;
    expect(validatePlan(overlap, items, suitcase).valid).toBe(false);
  });
  it("does not pretend the total closed depth is available inside either half", () => {
    const items = [item("too-tall", 60)];
    const plan = pack(items, suitcase);
    expect(plan.outcome).toBe("constraint-conflict");
    expect(plan.unplaced.map((i) => i.id)).toEqual(["too-tall"]);
    expect(pack(items, { ...suitcase, clamshell: false }).outcome).toBe(
      "complete",
    );
  });
  it("rejects missing compartments and stale layouts from the old cavity shape", () => {
    const items = [item("a")],
      plan = pack(items, suitcase);
    const invalid = structuredClone(plan);
    delete invalid.placements[0].compartment;
    expect(validatePlan(invalid, items, suitcase).valid).toBe(false);
    expect(
      validatePlan(plan, items, { ...suitcase, clamshell: false }).valid,
    ).toBe(false);
  });
  it("packs the folded demo into both halves and accounts for every item", () => {
    const items = demoItems(),
      plan = pack(items, suitcases[0]);
    expect(plan.placements).toHaveLength(items.length);
    expect(new Set(plan.placements.map((p) => p.compartment)).size).toBe(2);
    expect(validatePlan(plan, items, suitcases[0]).valid).toBe(true);
    for (const p of plan.placements)
      expect(p.position[2] + p.dimensions[2]).toBeLessThanOrEqual(
        suitcases[0].dimensions[2] / 2 - suitcases[0].clearance,
      );
  });
  it("moves the lid through the hinge and closes both interiors into the original dimensions", () => {
    const bag = suitcases[0],
      plan = pack(demoItems(), bag),
      [w, l, totalDepth] = bag.dimensions,
      h = totalDepth / 2;
    expect(clamshellPose(w, h, 0).lidAngle).toBeCloseTo(0);
    expect(clamshellPose(w, h, 0.5).lidAngle).toBe(-Math.PI / 2);
    const pose = clamshellPose(w, h, 1);
    const lidMatrix = new Matrix4()
      .makeTranslation(pose.rootX + pose.hinge[0], pose.hinge[1], 0)
      .multiply(new Matrix4().makeRotationZ(pose.lidAngle))
      .multiply(new Matrix4().makeTranslation(...pose.lidOrigin));
    for (const p of plan.placements) {
      const [x, y, z] = p.position,
        [dx, dy, dz] = p.dimensions;
      for (const a of [0, 1])
        for (const b of [0, 1])
          for (const c of [0, 1]) {
            const corner = new Vector3(
              x + a * dx - w / 2,
              z + c * dz,
              y + b * dy - l / 2,
            );
            if (p.compartment === "lid") corner.applyMatrix4(lidMatrix);
            expect(Math.abs(corner.x)).toBeLessThanOrEqual(w / 2 + 1e-5);
            expect(Math.abs(corner.z)).toBeLessThanOrEqual(l / 2 + 1e-5);
            expect(corner.y).toBeGreaterThanOrEqual(
              (p.compartment === "lid" ? h : 0) - 1e-5,
            );
            expect(corner.y).toBeLessThanOrEqual(
              (p.compartment === "lid" ? totalDepth : h) + 1e-5,
            );
          }
    }
  });
});
