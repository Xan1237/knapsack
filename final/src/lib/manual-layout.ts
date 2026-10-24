import {
  type Item,
  type ItemAnchor,
  type Placement,
  type Suitcase,
  type Vec3,
  permutations,
  sizeOf,
} from "./domain";

/** A pointer drop in the open case's Three coordinates, before scene translation. */
export function anchorAtPoint(
  item: Item,
  bag: Suitcase,
  point: Vec3,
  orientation: number,
): ItemAnchor | null {
  if (
    !point.every(Number.isFinite) ||
    !item.orientations.includes(orientation) ||
    !permutations[orientation]
  )
    return null;
  const dimensions = permutations[orientation].map(
    (axis) => sizeOf(item)[axis],
  );
  const cavity = [
    bag.dimensions[0],
    bag.dimensions[1],
    bag.dimensions[2] / (bag.clamshell ? 2 : 1),
  ];
  if (dimensions.some((n, k) => n + bag.clearance * 2 > cavity[k])) return null;
  const compartment = bag.clamshell
    ? point[0] < 0
      ? "lid"
      : "base"
    : undefined;
  const centerX = bag.clamshell
    ? ((compartment === "base" ? 1 : -1) * bag.dimensions[0]) / 200
    : 0;
  const desired = [
    (point[0] - centerX) * 100 + cavity[0] / 2 - dimensions[0] / 2,
    point[2] * 100 + cavity[1] / 2 - dimensions[1] / 2,
    bag.clearance,
  ];
  const position = desired.map((n, k) =>
    Math.max(
      bag.clearance,
      Math.min(
        cavity[k] - bag.clearance - dimensions[k],
        Math.round(n * 100) / 100,
      ),
    ),
  ) as Vec3;
  return { position, orientation, ...(compartment ? { compartment } : {}) };
}

/** Invalidated anchors from older/imported bags fall back to automatic packing. */
export function anchoredPlacement(item: Item, bag: Suitcase): Placement | null {
  const anchor = item.anchor;
  if (
    !anchor ||
    !item.orientations.includes(anchor.orientation) ||
    !permutations[anchor.orientation]
  )
    return null;
  if (
    bag.clamshell
      ? !["base", "lid"].includes(anchor.compartment ?? "")
      : !!anchor.compartment
  )
    return null;
  const dimensions = permutations[anchor.orientation].map(
    (axis) => sizeOf(item)[axis],
  ) as Vec3;
  const cavity = [
    bag.dimensions[0],
    bag.dimensions[1],
    bag.dimensions[2] / (bag.clamshell ? 2 : 1),
  ];
  if (
    Math.abs(anchor.position[2] - bag.clearance) > 1e-5 ||
    anchor.position.some(
      (n, k) =>
        !Number.isFinite(n) ||
        n < bag.clearance - 1e-5 ||
        n + dimensions[k] > cavity[k] - bag.clearance + 1e-5,
    )
  )
    return null;
  return {
    ...anchor,
    position: [...anchor.position],
    dimensions,
    id: item.id,
    order: 1,
  };
}
