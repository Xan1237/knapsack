import { createItem, suitcases, type Vec3 } from "../src/lib/domain";
import { pack } from "../src/lib/packing";
import { writeFileSync } from "node:fs";
// Discover reproducible difficult inputs without changing the production solver's search budget.
for (let count = 20; count <= 80; count += 5) {
  for (let variant = 0; variant < 10; variant++) {
    const items = Array.from({ length: count }, (_, index) => {
      const item = createItem("other", `fixture-${index + 1}`);
      const scale = (50 + ((index * 7 + variant * 3) % 16) * 5) / 100;
      return {
        ...item,
        label: `Essential ${String(index + 1).padStart(2, "0")}`,
        scale: [scale, scale, scale] as Vec3,
      };
    });
    const plan = pack(items, suitcases[0]);
    if (plan.outcome === "search-exhausted") {
      writeFileSync(
        "artifacts/exhaustion-fixture.json",
        JSON.stringify(
          {
            bag: "cabin",
            itemCategory: "other",
            count,
            items: items.map((i) => ({
              name: i.label,
              sizePercent: Math.round(i.scale[0] * 100),
            })),
            expected: {
              outcome: plan.outcome,
              placed: plan.placements.length,
              unplaced: plan.unplaced.length,
              conflicts: plan.conflicts,
            },
          },
          null,
          2,
        ) + "\n",
      );
      console.log(
        `Found reproducible exhaustion: ${count} items, ${plan.placements.length} placed; details in artifacts/exhaustion-fixture.json`,
      );
      process.exit(0);
    }
  }
}
console.log(
  "No controlled browser-editable exhaustion fixture found. Direct budget-boundary tests remain authoritative.",
);
