import { it, expect } from "vitest";
import { readFile, writeFile } from "node:fs/promises";
import { analysisSchema, suitcases, type Proposal, type Photo } from "./domain";
import { reducer, type InventoryState } from "./state";
import { pack } from "./packing";
import { validatePlan } from "./validate";
import { meshGeometry } from "./mesh-geometry";

it("recognizes two real endpoint uploads and produces a validated, editable source-linked plan", async () => {
  const baseUrl = process.env.KNAPSACK_BASE_URL || "http://127.0.0.1:3000";
  const specs = [
    { file: "pump-bottle.jpg", type: "image/jpeg" },
    { file: "water-bottle.png", type: "image/png" },
  ];
  const results = await Promise.all(
    specs.map(async (spec, index) => {
      const bytes = await readFile(
          new URL(`../../public/fixtures/${spec.file}`, import.meta.url),
        ),
        form = new FormData();
      form.append("photo", new Blob([bytes], { type: spec.type }), spec.file);
      const response = await fetch(`${baseUrl}/api/analyze`, {
        method: "POST",
        body: form,
      });
      expect(response.status).toBe(200);
      const result = analysisSchema.parse(await response.json());
      expect(result.items).toHaveLength(1);
      expect(result.items[0].category).toBe("bottle");
      expect(result.items[0].label.toLowerCase()).toContain("bottle");
      expect(result.items[0].meshModel).toBe("gpt-6-astra");
      expect(result.items[0].mesh).toBeDefined();
      const geometry = meshGeometry(result.items[0].mesh!);
      expect(geometry.getIndex()!.count).toBeGreaterThan(0);
      geometry.dispose();
      return {
        id: `live-photo-${index}`,
        file: spec.file,
        proposals: result.items,
      };
    }),
  );
  const photos: Photo[] = results.map((r) => ({
    id: r.id,
    name: r.file,
    url: "fixture-only",
    status: "analyzing",
    requestId: r.id,
    accepted: false,
  }));
  let state: InventoryState = {
    items: [],
    photos,
    bagId: "cabin",
    dismissed: [],
    demo: false,
  };
  for (const result of results)
    state = reducer(state, {
      type: "analysis",
      id: result.id,
      requestId: result.id,
      proposals: result.proposals as Proposal[],
    });
  expect(state.items).toHaveLength(2);
  expect(state.items[0].sourceIds).not.toEqual(state.items[1].sourceIds);
  for (const item of state.items)
    state = reducer(state, {
      type: "edit",
      id: item.id,
      patch: { orientations: [0, 1, 2, 3, 4, 5], required: true },
    });
  state = reducer(state, {
    type: "edit",
    id: state.items[0].id,
    patch: { scale: [0.9, 0.9, 0.9] },
  });
  const plan = pack(state.items, suitcases[0]),
    validation = validatePlan(plan, state.items, suitcases[0]);
  expect(validation.valid).toBe(true);
  expect(plan.outcome).toBe("complete");
  const adviceResponse = await fetch(`${baseUrl}/api/astra/suggest`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      items: state.items,
      bag: suitcases[0],
      preference: "Bring both essential bottles for a weekend away.",
    }),
  });
  expect(adviceResponse.status).toBe(200);
  const advice = await adviceResponse.json();
  expect(advice.model).toBe("gpt-6-astra");
  expect(advice.keepIds.sort()).toEqual(
    state.items.map((item) => item.id).sort(),
  );
  expect(advice.preview.valid).toBe(true);
  await writeFile(
    "artifacts/astra-mesh-live.json",
    JSON.stringify(
      {
        kind: "genuine-live-astra-mesh-to-state-to-plan-and-advice",
        browserVerified: false,
        timestamp: new Date().toISOString(),
        fixtures: results.map((r) => ({
          file: r.file,
          proposals: r.proposals.map((item) => ({
            label: item.label,
            category: item.category,
            dimensions: item.dimensions,
            model: item.meshModel,
            vertices: item.mesh!.vertices.length,
            triangles: item.mesh!.triangles.length,
            materials: item.mesh!.materials.length,
          })),
        })),
        corrections:
          "Pinned both bottles as essential, allowed tipping, and visually reduced the first to 90 percent",
        items: state.items.length,
        placed: plan.placements.length,
        validation,
        outcome: plan.outcome,
        advice: {
          model: advice.model,
          kept: advice.keepIds.length,
          left: advice.leaveIds.length,
          preview: advice.preview,
        },
      },
      null,
      2,
    ) + "\n",
  );
});
