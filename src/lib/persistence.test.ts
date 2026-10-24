import "fake-indexeddb/auto";
import { beforeEach, describe, it, expect } from "vitest";
import { openDB } from "idb";
import { saveSession, loadSession } from "./persistence";
import { initialState, reducer } from "./state";

beforeEach(async () => {
  const db = await openDB("knapsack-local", 1, {
    upgrade(db) {
      db.createObjectStore("session");
      db.createObjectStore("photos");
    },
  });
  await db.clear("session");
  await db.clear("photos");
});
describe("local session persistence", () => {
  it("round-trips visual overrides, source photos and suitcase choice", async () => {
    const state = initialState();
    state.items[0].scale = [1.3, 0.7, 1.1];
    state.items[0].sourceIds = ["photo"];
    state.bagId = "checked";
    state.photos = [
      {
        id: "photo",
        name: "shirt.jpg",
        url: "data:image/jpeg;base64,AA==",
        status: "done",
        accepted: true,
        requestId: "r",
      },
    ];
    await saveSession(state);
    expect(await loadSession()).toEqual(state);
  });
  it("turns interrupted analysis into a retryable error", async () => {
    const state = initialState();
    state.photos = [
      {
        id: "photo",
        name: "shirt.png",
        url: "data:image/png;base64,AA==",
        status: "analyzing",
        accepted: false,
        requestId: "r",
      },
    ];
    await saveSession(state);
    const result = await loadSession();
    expect(result?.photos[0].status).toBe("error");
    expect(result?.photos[0].error).toContain("interrupted");
  });
  it("clears photo bytes and inventory on reset", async () => {
    const state = initialState();
    state.photos = [
      {
        id: "photo",
        name: "shirt.jpg",
        url: "data:image/jpeg;base64,AA==",
        status: "done",
        accepted: true,
        requestId: "r",
      },
    ];
    await saveSession(state);
    await saveSession(reducer(state, { type: "reset" }));
    const restored = await loadSession(),
      db = await openDB("knapsack-local", 1);
    expect(restored?.photos).toEqual([]);
    expect(restored?.items).toEqual([]);
    expect(await db.count("photos")).toBe(0);
  });
  it("rejects malformed or duplicate persisted inventory without using it", async () => {
    await saveSession(initialState());
    const db = await openDB("knapsack-local", 1),
      raw = await db.get("session", "current");
    raw.items.push(raw.items[0]);
    await db.put("session", raw, "current");
    expect(loadSession()).rejects.toThrow();
    raw.items[0].scale = [Infinity, 1, 1];
    await db.put("session", raw, "current");
    await expect(loadSession()).rejects.toThrow();
  });
});
