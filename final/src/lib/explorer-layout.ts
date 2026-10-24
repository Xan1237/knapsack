import { type Item, type Suitcase, type Vec3, sizeOf } from "./domain";

export type ExplorerBounds = { min: Vec3; max: Vec3 };

/** Give each overflow item its own floor space beyond both open suitcase halves. */
export function explorerLayout(items: Item[], bag: Suitcase) {
  const width = bag.dimensions[0] / 100;
  const length = bag.dimensions[1] / 100;
  const right = bag.clamshell ? width : width / 2;
  const start = right + 0.8;
  const gap = 0.45;
  const sizes = items.map((item) => sizeOf(item).map((n) => n / 100) as Vec3);
  const rowWidth = Math.max(4, width * 1.25, ...sizes.map((d) => d[0]));
  const bounds: ExplorerBounds = {
    min: [-right - 0.5, -0.45, -length / 2 - 0.7],
    max: [right + 0.5, bag.dimensions[2] / 100 + 0.7, length / 2 + 0.7],
  };
  let x = start,
    z = -length / 2,
    rowDepth = 0;
  const overflow = items.map((item, index) => {
    const d = sizes[index];
    if (x > start && x + d[0] > start + rowWidth) {
      x = start;
      z += rowDepth + gap;
      rowDepth = 0;
    }
    const position: Vec3 = [x + d[0] / 2, d[2] / 2, z + d[1] / 2];
    bounds.max[0] = Math.max(bounds.max[0], x + d[0] + gap);
    bounds.max[1] = Math.max(bounds.max[1], d[2] + gap);
    bounds.max[2] = Math.max(bounds.max[2], z + d[1] + gap);
    x += d[0] + gap;
    rowDepth = Math.max(rowDepth, d[1]);
    return { id: item.id, position, dimensions: d };
  });
  return { overflow, bounds };
}
