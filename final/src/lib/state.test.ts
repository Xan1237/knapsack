import { describe, it, expect } from "vitest";
import { reducer, mergeSuggestions, type InventoryState } from "./state";
import { createItem, sizeOf, type Proposal, type Photo } from "./domain";

const photo: Photo = {
  id: "photo",
  name: "test.jpg",
  url: "data:image/jpeg;base64,AA==",
  requestId: "request-1",
  status: "analyzing",
  accepted: false,
};
const proposal: Proposal = {
  key: "shirt-1",
  label: "Linen shirt",
  category: "clothing",
  color: "#aabbcc",
  appearance: "Folded",
  dimensions: [200, 250, 40],
};
const fresh = (): InventoryState => ({
  items: [],
  photos: [{ ...photo }],
  bagId: "cabin",
  dismissed: [],
  demo: false,
});
const response = {
  type: "analysis" as const,
  id: "photo",
  requestId: "request-1",
  proposals: [proposal],
};
describe("inventory async invariants", () => {
  it("keeps pump and toiletry bottles upright when recognizing a non-water bottle", () => {
    const result = reducer(fresh(), {
      ...response,
      proposals: [
        {
          ...proposal,
          key: "pump",
          category: "bottle",
          label: "Pump cleanser",
          appearance: "A tall soap dispenser with a pump",
        },
      ],
    });
    expect(result.items[0].orientations).toEqual([0, 1]);
  });
  it("suggests similar source-linked items without merging distinct belongings automatically", () => {
    const a = {
      ...createItem("bottle", "foam"),
      label: "Foam cleanser",
      proposalId: "photo-a:bottle",
      sourceIds: ["photo-a"],
      color: "#111111",
    };
    const b = {
      ...createItem("bottle", "liquid"),
      label: "Liquid soap",
      proposalId: "photo-b:bottle",
      sourceIds: ["photo-b"],
      color: "#080808",
    };
    const items = [a, b];
    expect(mergeSuggestions(items)).toHaveLength(1);
    expect(items).toHaveLength(2);
    expect(a.sourceIds).toEqual(["photo-a"]);
    expect(b.sourceIds).toEqual(["photo-b"]);
    expect(mergeSuggestions([a, { ...b, color: "#ffffff" }])).toHaveLength(0);
  });
  it("accepts a result only once and retains sources, stable IDs and user overrides", () => {
    const first = reducer(fresh(), response),
      id = first.items[0].id;
    const edited = reducer(first, {
      type: "edit",
      id,
      patch: { label: "My shirt", scale: [1.7, 1.7, 1.7] },
    });
    const result = reducer(edited, response);
    expect(result.items).toHaveLength(1);
    expect(result.items[0].id).toBe(id);
    expect(result.items[0].sourceIds).toEqual(["photo"]);
    expect(result.items[0].label).toBe("My shirt");
    expect(sizeOf(result.items[0])).toEqual([340, 425, 68]);
  });
  it("ignores late responses for superseded request IDs and missing photos", () => {
    const retried = reducer(fresh(), {
      type: "retry",
      id: "photo",
      requestId: "request-2",
    });
    expect(reducer(retried, response)).toEqual(retried);
    expect(
      reducer(reducer(fresh(), { type: "reset" }), response).items,
    ).toEqual([]);
    expect(
      reducer(retried, {
        type: "failure",
        id: "photo",
        requestId: "request-1",
        error: "late",
      }),
    ).toEqual(retried);
  });
  it("never resurrects a deleted proposal after duplicate response or retry", () => {
    const first = reducer(fresh(), response),
      deleted = reducer(first, { type: "delete", id: first.items[0].id });
    const retry = reducer(
      reducer(deleted, { type: "retry", id: "photo", requestId: "request-2" }),
      { type: "start", id: "photo", requestId: "request-2" },
    );
    expect(
      reducer(retry, { ...response, requestId: "request-2" }).items,
    ).toHaveLength(0);
    expect(deleted.dismissed).toContain("photo:shirt-1");
  });
  it("does not treat multiple views as automatic merges and preserves target edits on explicit merge", () => {
    const p2 = { ...photo, id: "photo-2", requestId: "request-2" };
    const first = reducer({ ...fresh(), photos: [photo, p2] }, response);
    const second = reducer(first, {
      ...response,
      id: "photo-2",
      requestId: "request-2",
    });
    expect(second.items).toHaveLength(2);
    const edited = reducer(second, {
      type: "edit",
      id: second.items[0].id,
      patch: { label: "Custom", scale: [2, 1, 1] },
    });
    const merged = reducer(edited, {
      type: "merge",
      target: edited.items[0].id,
      source: edited.items[1].id,
    });
    expect(merged.items).toHaveLength(1);
    expect(merged.items[0].sourceIds).toEqual(["photo", "photo-2"]);
    expect(merged.items[0].label).toBe("Custom");
    expect(sizeOf(merged.items[0])).toEqual([400, 250, 40]);
  });
  it("duplicates physical items with new identity and independent scales", () => {
    const item = {
      ...createItem("shoes", "a"),
      scale: [2, 1, 1] as [number, number, number],
    };
    const state = { ...fresh(), items: [item] };
    const copied = reducer(state, { type: "duplicate", id: "a", newId: "b" });
    expect(copied.items.map((i) => i.id)).toEqual(["a", "b"]);
    expect(sizeOf(copied.items[1])).toEqual(sizeOf(item));
    const resized = reducer(copied, {
      type: "edit",
      id: "b",
      patch: { scale: [0.5, 0.5, 0.5] },
    });
    expect(sizeOf(resized.items[0])).toEqual(sizeOf(item));
  });
  it("deduplicates repeated keys in a single response and enforces the global cap", () => {
    expect(
      reducer(fresh(), { ...response, proposals: [proposal, proposal] }).items,
    ).toHaveLength(1);
    const full = {
      ...fresh(),
      items: Array.from({ length: 80 }, (_, i) =>
        createItem("other", `i-${i}`),
      ),
    };
    expect(
      reducer(full, { type: "add", category: "bottle" }).items,
    ).toHaveLength(80);
    expect(
      reducer(full, { type: "duplicate", id: "i-0", newId: "x" }).items,
    ).toHaveLength(80);
    expect(reducer(full, response).items).toHaveLength(80);
  });
});
