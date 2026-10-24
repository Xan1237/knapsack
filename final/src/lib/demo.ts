import {
  type Item,
  type Placement,
  type Plan,
  type Suitcase,
  createItem,
  permutations,
  planIsCurrent,
  revisionOf,
  sizeOf,
  type Vec3,
} from "./domain";
import { demoBottleDimensions, demoBottleId } from "./demo-fixtures";
import { validatePlan } from "./validate";

export function demoWaterBottle(): Item {
  return {
    ...createItem("bottle", demoBottleId),
    demo: true,
    label: "500 ml water bottle",
    appearance: "Reusable blue water bottle, lying on its side",
    color: "#91b6c2",
    dimensions: [...demoBottleDimensions],
    estimate: [...demoBottleDimensions],
    orientations: [2],
  };
}

/** Only show a reservation that really fits beside the currently packed belongings. */
export function demoBottleSpace(
  items: Item[],
  bag: Suitcase,
  plan: Plan | null,
): Placement | null {
  if (
    !plan ||
    !planIsCurrent(plan, items, bag) ||
    plan.outcome !== "complete" ||
    !bag.clamshell ||
    bag.id !== "cabin" ||
    items.some((item) => item.id === demoBottleId)
  )
    return null;
  const bank = items.find((item) => item.id === "demo-8" && item.demo);
  const support = bank && plan.placements.find((p) => p.id === bank.id);
  if (!support) return null;
  const bottle = demoWaterBottle();
  const dimensions = permutations[2].map((k) => sizeOf(bottle)[k]) as Vec3;
  if (
    Math.min(support.dimensions[0], dimensions[0]) *
      Math.min(support.dimensions[1], dimensions[1]) <
    dimensions[0] * dimensions[1] * 0.65
  )
    return null;
  const placement: Placement = {
    id: bottle.id,
    position: [
      support.position[0],
      support.position[1],
      support.position[2] + support.dimensions[2] + bag.clearance,
    ],
    dimensions,
    orientation: 2,
    order: plan.placements.length + 1,
    compartment: support.compartment,
  };
  const inventory = [...items, bottle];
  const candidate = {
    ...plan,
    revision: revisionOf(inventory, bag),
    placements: [...plan.placements, placement],
  };
  return validatePlan(candidate, inventory, bag).valid ? placement : null;
}
