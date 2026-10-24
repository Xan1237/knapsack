import "fake-indexeddb/auto";
import { expect, it } from "vitest";
import { NextRequest } from "next/server";
import { POST as exportPlan } from "@/app/api/packing/export/route";
import { reducer, type InventoryState } from "./state";
import { loadSession, saveSession } from "./persistence";
import { importCollection, bagForState } from "./collection";
import { analysisSchema, packingItems, revisionOf } from "./domain";
import { tetrahedronMesh } from "./test-fixtures/mesh";

it("retains the exact generated topology across analysis, resize, duplicate, storage, export, and import", async () => {
  const proposals = analysisSchema.parse({
    items: [
      {
        key: "bottle",
        label: "Pump bottle",
        category: "bottle",
        color: "#112233",
        appearance: "Pump and nozzle",
        dimensions: [60, 60, 180],
        mesh: tetrahedronMesh,
        meshModel: "gpt-6-astra",
      },
    ],
  }).items;
  let state: InventoryState = {
    items: [],
    photos: [
      {
        id: "source",
        name: "pump.jpg",
        url: "data:image/jpeg;base64,/9j/2Q==",
        status: "analyzing",
        requestId: "request",
        accepted: false,
      },
    ],
    bagId: "cabin",
    dismissed: [],
    demo: false,
  };
  state = reducer(state, {
    type: "analysis",
    id: "source",
    requestId: "request",
    proposals,
  });
  const id = state.items[0].id;
  const solverItems = packingItems(state.items);
  expect(solverItems[0].mesh).toBeUndefined();
  expect(state.items[0].mesh).toEqual(tetrahedronMesh);
  expect(revisionOf(solverItems, bagForState(state))).toBe(
    revisionOf(state.items, bagForState(state)),
  );
  state = reducer(state, {
    type: "edit",
    id,
    patch: { scale: [0.9, 0.9, 0.9], orientations: [0, 1, 2, 3, 4, 5] },
  });
  state = reducer(state, { type: "duplicate", id, newId: "copy" });
  await saveSession(state);
  expect(await loadSession()).toEqual(state);
  const form = new FormData();
  form.set(
    "collection",
    JSON.stringify({
      schemaVersion: 1,
      units: "mm",
      upAxis: "z",
      bag: bagForState(state),
      items: state.items,
      photos: state.photos,
    }),
  );
  const response = await exportPlan(
    new NextRequest("http://127.0.0.1:3000/api/packing/export", {
      method: "POST",
      headers: { Origin: "http://127.0.0.1:3000", Host: "127.0.0.1:3000" },
      body: form,
    }),
  );
  expect(response.status).toBe(200);
  const exported = await response.json();
  expect(exported.plan.placements).toHaveLength(2);
  const imported = importCollection(exported);
  expect(imported.items.map((item) => item.id)).toEqual([id, "copy"]);
  for (const item of imported.items) {
    expect(item.mesh).toEqual(tetrahedronMesh);
    expect(item.meshModel).toBe("gpt-6-astra");
    expect(item.sourceIds).toEqual(["source"]);
  }
  const invalid = structuredClone(exported);
  invalid.items[0].mesh.triangles[0].material = 15;
  expect(() => importCollection(invalid)).toThrow();
});
