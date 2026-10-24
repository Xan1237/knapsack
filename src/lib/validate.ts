import {
  type Item,
  type Plan,
  type Suitcase,
  sizeOf,
  revisionOf,
} from "./domain";

/** Independent checker: does not import the search or its collision/orientation helpers. */
export function validatePlan(
  plan: Plan,
  items: Item[],
  bag: Suitcase,
): { valid: boolean; errors: string[] } {
  const errors: string[] = [],
    seen = new Set<string>(),
    epsilon = 1e-5;
  const orientations = [
    [0, 1, 2],
    [1, 0, 2],
    [0, 2, 1],
    [2, 0, 1],
    [1, 2, 0],
    [2, 1, 0],
  ];
  if (plan.revision !== revisionOf(items, bag)) errors.push("Stale revision");
  if (
    !Number.isFinite(bag.clearance) ||
    bag.clearance < 0 ||
    bag.dimensions.some((n) => !Number.isFinite(n) || n <= bag.clearance * 2)
  )
    errors.push("Invalid suitcase dimensions");
  if (new Set(items.map((i) => i.id)).size !== items.length)
    errors.push("Duplicate inventory identities");
  for (const item of items) {
    if (
      sizeOf(item).some((n) => !Number.isFinite(n) || n <= 0) ||
      !item.orientations.length ||
      item.orientations.some((o) => !Number.isInteger(o) || !orientations[o])
    )
      errors.push(`Invalid item ${item.id}`);
  }
  const included = new Map(
    items.filter((i) => i.included).map((i) => [i.id, i]),
  );
  for (const p of plan.placements) {
    const item = included.get(p.id);
    if (!item || seen.has(p.id)) {
      errors.push(`Unknown or duplicate placement ${p.id}`);
      continue;
    }
    seen.add(p.id);
    if (
      !item.orientations.includes(p.orientation) ||
      !orientations[p.orientation]
    )
      errors.push(`Forbidden orientation ${p.id}`);
    else {
      const d = sizeOf(item),
        rotation = orientations[p.orientation];
      if (
        p.dimensions.some(
          (n, k) =>
            !Number.isFinite(n) ||
            n <= 0 ||
            Math.abs(n - d[rotation[k]]) > epsilon,
        )
      )
        errors.push(`Wrong envelope ${p.id}`);
    }
    if (
      p.position.some(
        (n, k) =>
          !Number.isFinite(n) ||
          n < bag.clearance - epsilon ||
          n + p.dimensions[k] > bag.dimensions[k] - bag.clearance + epsilon,
      )
    )
      errors.push(`Out of bounds ${p.id}`);
    if (!Number.isInteger(p.order) || p.order < 1)
      errors.push(`Invalid sequence ${p.id}`);
  }
  if (
    new Set(plan.placements.map((p) => p.order)).size !== plan.placements.length
  )
    errors.push("Duplicate sequence positions");
  if (plan.placements.some((p) => p.order > plan.placements.length))
    errors.push("Non-contiguous sequence");
  for (let i = 0; i < plan.placements.length; i++)
    for (let j = i + 1; j < plan.placements.length; j++) {
      const a = plan.placements[i],
        b = plan.placements[j];
      const separate = [0, 1, 2].some(
        (k) =>
          a.position[k] + a.dimensions[k] + bag.clearance <=
            b.position[k] + epsilon ||
          b.position[k] + b.dimensions[k] + bag.clearance <=
            a.position[k] + epsilon,
      );
      if (!separate) errors.push(`Overlap ${a.id}/${b.id}`);
    }
  for (const u of plan.unplaced) {
    if (!included.has(u.id) || seen.has(u.id))
      errors.push(`Unknown or duplicate unplaced ${u.id}`);
    seen.add(u.id);
  }
  if (
    seen.size !== included.size ||
    [...included.keys()].some((id) => !seen.has(id))
  )
    errors.push("Incomplete accounting");
  if (plan.outcome === "complete" && plan.unplaced.length)
    errors.push("Incorrect complete outcome");
  return { valid: errors.length === 0, errors };
}
