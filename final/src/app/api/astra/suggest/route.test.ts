import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { POST } from "./route";
import { suggestPacking } from "@/lib/astra";
import { initialState } from "@/lib/state";
import { revisionOf, suitcases } from "@/lib/domain";

vi.mock("@/lib/astra", () => ({ suggestPacking: vi.fn() }));
beforeEach(() => {
  vi.stubEnv("OPENAI_API_KEY", "synthetic-server-only-test-value");
  vi.mocked(suggestPacking).mockReset();
});
afterEach(() => vi.unstubAllEnvs());
const input = () => ({
  items: initialState().items,
  bag: suitcases[0],
  preference: "Help me pick between items that do not fit.",
});
function request(body = input(), origin = "http://127.0.0.1:3000") {
  return new NextRequest("http://127.0.0.1:3000/api/astra/suggest", {
    method: "POST",
    headers: { origin, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}
it("returns an explicit disconnected state and rejects invalid inventories before calling Astra", async () => {
  vi.stubEnv("OPENAI_API_KEY", "");
  expect((await POST(request())).status).toBe(503);
  vi.stubEnv("OPENAI_API_KEY", "synthetic-server-only-test-value");
  const duplicate = input();
  duplicate.items.push(duplicate.items[0]);
  expect((await POST(request(duplicate))).status).toBe(400);
  expect((await POST(request(input(), "http://other.test"))).status).toBe(403);
  expect(suggestPacking).not.toHaveBeenCalled();
});
it("exposes only the selection contract and keeps credentials out of model arguments and responses", async () => {
  const body = input();
  const advice = {
    summary: "Keep your essentials.",
    keepIds: body.items.map((i) => i.id),
    leaveIds: [],
    revision: revisionOf(body.items, body.bag),
    model: "gpt-6-astra",
    preview: { placed: 9, unplaced: [], valid: true },
    privateProviderPayload: "synthetic-server-only-test-value",
  };
  vi.mocked(suggestPacking).mockResolvedValue(advice);
  const response = await POST(request(body));
  expect(response.status).toBe(200);
  const result = await response.json();
  expect(result.keepIds).toEqual(advice.keepIds);
  expect(JSON.stringify(result)).not.toContain(
    "synthetic-server-only-test-value",
  );
  expect(JSON.stringify(vi.mocked(suggestPacking).mock.calls)).not.toContain(
    "synthetic-server-only-test-value",
  );
  expect(result.privateProviderPayload).toBeUndefined();
});
it("keeps provider failures generic and preserves the submitted inventory", async () => {
  const body = input(),
    original = structuredClone(body);
  vi.mocked(suggestPacking).mockRejectedValue(
    new Error("synthetic-server-only-test-value"),
  );
  const response = await POST(request(body));
  expect(response.status).toBe(502);
  expect(JSON.stringify(await response.json())).not.toContain(
    "synthetic-server-only-test-value",
  );
  expect(body).toEqual(original);
});
