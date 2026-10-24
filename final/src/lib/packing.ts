import {
  type Item,
  type Plan,
  type Placement,
  type Suitcase,
  type Vec3,
  permutations,
  sizeOf,
  revisionOf,
} from "./domain";

const volume = (d: Vec3) => d[0] * d[1] * d[2];
const overlap = (a: Placement, b: Placement, gap: number) =>
  a.position.every(
    (n, k) =>
      n < b.position[k] + b.dimensions[k] + gap - 1e-6 &&
      b.position[k] < n + a.dimensions[k] + gap - 1e-6,
  );
function supported(p: Placement, placed: Placement[], gap: number): boolean {
  if (Math.abs(p.position[2] - gap) < 1e-6) return true;
  const area = placed.reduce((sum, b) => {
    if (Math.abs(b.position[2] + b.dimensions[2] + gap - p.position[2]) > 1e-5)
      return sum;
    const x = Math.max(
      0,
      Math.min(
        p.position[0] + p.dimensions[0],
        b.position[0] + b.dimensions[0],
      ) - Math.max(p.position[0], b.position[0]),
    );
    const y = Math.max(
      0,
      Math.min(
        p.position[1] + p.dimensions[1],
        b.position[1] + b.dimensions[1],
      ) - Math.max(p.position[1], b.position[1]),
    );
    return sum + x * y;
  }, 0);
  return area >= p.dimensions[0] * p.dimensions[1] * 0.65;
}
/** Deterministic bounded extreme-edge grid search; no claim of global optimality. */
export function pack(items: Item[], bag: Suitcase, budget = 80000): Plan {
  const included = items.filter((i) => i.included),
    gap = bag.clearance;
  const cavity: Vec3 = [
    bag.dimensions[0],
    bag.dimensions[1],
    bag.dimensions[2] / (bag.clamshell ? 2 : 1),
  ];
  const compartments: Placement["compartment"][] = bag.clamshell
    ? ["base", "lid"]
    : [undefined];
  const conflicts: string[] = [];
  for (const i of included) {
    const d = sizeOf(i);
    if (
      d.some((n) => !Number.isFinite(n) || n <= 0) ||
      !i.orientations.length ||
      i.orientations.some((o) => !permutations[o])
    )
      throw new Error("Invalid item dimensions or orientations");
    if (
      !i.orientations.some((o) =>
        permutations[o].every((axis, k) => d[axis] + gap * 2 <= cavity[k]),
      )
    )
      conflicts.push(i.id);
  }
  if (
    cavity.some((n) => !Number.isFinite(n) || n <= gap * 2) ||
    !Number.isFinite(gap) ||
    gap < 0
  )
    throw new Error("Invalid suitcase");
  const volumeConflict =
    included.reduce((v, i) => v + volume(sizeOf(i)), 0) >
    volume(cavity.map((n) => n - gap * 2) as Vec3) * compartments.length;
  const orders = [
    [...included].sort(
      (a, b) =>
        volume(sizeOf(b)) - volume(sizeOf(a)) || a.id.localeCompare(b.id),
    ),
    [...included].sort(
      (a, b) =>
        Math.max(...sizeOf(b)) - Math.max(...sizeOf(a)) ||
        a.id.localeCompare(b.id),
    ),
    [...included].sort(
      (a, b) =>
        a.orientations.length - b.orientations.length ||
        volume(sizeOf(b)) - volume(sizeOf(a)) ||
        a.id.localeCompare(b.id),
    ),
    [...included].sort(
      (a, b) =>
        sizeOf(b)[0] * sizeOf(b)[1] - sizeOf(a)[0] * sizeOf(a)[1] ||
        a.id.localeCompare(b.id),
    ),
  ];
  if (included.some((i) => i.required || (i.priority ?? 3) !== 3)) {
    orders.unshift(
      [...included].sort(
        (a, b) =>
          Number(!!b.required) - Number(!!a.required) ||
          (b.priority ?? 3) - (a.priority ?? 3) ||
          volume(sizeOf(b)) - volume(sizeOf(a)) ||
          a.id.localeCompare(b.id),
      ),
    );
  }
  const quality = (placements: Placement[]) =>
    placements.reduce((score, p) => {
      const item = included.find((i) => i.id === p.id)!;
      return (
        score +
        (item.required ? 1e9 : 0) +
        (item.priority ?? 3) * 1e6 +
        1000 +
        volume(p.dimensions) / 1e9
      );
    }, 0);
  let best: Placement[] = [],
    attempts = 0,
    exhausted = false;
  for (const order of orders) {
    attempts++;
    const placed: Placement[] = [];
    let evaluations = 0;
    for (const item of order) {
      if (conflicts.includes(item.id)) continue;
      const d = sizeOf(item);
      let found: Placement | undefined;
      const sides = [...compartments].sort(
        (a, b) =>
          placed
            .filter((p) => p.compartment === a)
            .reduce((v, p) => v + volume(p.dimensions), 0) -
          placed
            .filter((p) => p.compartment === b)
            .reduce((v, p) => v + volume(p.dimensions), 0),
      );
      search: for (const compartment of sides) {
        const sameSide = placed.filter((p) => p.compartment === compartment);
        const axes = [0, 1, 2].map((k) =>
          [
            ...new Set([
              gap,
              ...sameSide.map((p) => p.position[k] + p.dimensions[k] + gap),
            ]),
          ].sort((a, b) => a - b),
        );
        for (const z of axes[2])
          for (const y of axes[1])
            for (const x of axes[0])
              for (const orientation of item.orientations) {
                if (++evaluations > budget) {
                  exhausted = true;
                  break search;
                }
                const dims = permutations[orientation].map((k) => d[k]) as Vec3;
                const p: Placement = {
                  id: item.id,
                  position: [x, y, z],
                  dimensions: dims,
                  orientation,
                  order: placed.length + 1,
                  ...(compartment ? { compartment } : {}),
                };
                if (
                  p.position.some(
                    (n, k) => n + dims[k] > cavity[k] - gap + 1e-6,
                  )
                )
                  continue;
                if (
                  sameSide.some((b) => overlap(p, b, gap)) ||
                  !supported(p, sameSide, gap)
                )
                  continue;
                found = p;
                break search;
              }
      }
      if (found) placed.push(found);
    }
    if (quality(placed) > quality(best)) best = placed;
    if (best.length === included.length) break;
  }
  const ids = new Set(best.map((p) => p.id));
  return {
    revision: revisionOf(items, bag),
    placements: best,
    unplaced: included
      .filter((i) => !ids.has(i.id))
      .map((i) => ({
        id: i.id,
        reason: conflicts.includes(i.id)
          ? "Too large in every permitted orientation"
          : "No supported space found in the bounded search",
      })),
    outcome:
      best.length === included.length
        ? "complete"
        : conflicts.length || volumeConflict
          ? "constraint-conflict"
          : exhausted
            ? "search-exhausted"
            : "partial",
    conflicts: [...conflicts, ...(volumeConflict ? ["total-volume"] : [])],
    attempts,
    exhausted,
  };
}
