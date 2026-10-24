import { beforeEach, afterEach, it, expect, vi } from "vitest";
import { NextRequest } from "next/server";
import { POST } from "./route";
import { analyzePhoto } from "@/lib/vision";
vi.mock("@/lib/vision", () => ({ analyzePhoto: vi.fn() }));
beforeEach(() => {
  vi.stubEnv("OPENAI_API_KEY", "test-only-placeholder");
  vi.mocked(analyzePhoto).mockReset();
});
afterEach(() => vi.unstubAllEnvs());
function request(
  type = "image/jpeg",
  bytes: Uint8Array<ArrayBuffer> = new Uint8Array([255, 216, 255, 217]),
  origin = "http://localhost:3000",
) {
  const form = new FormData();
  form.append("photo", new File([bytes], "fixture.jpg", { type }));
  return new NextRequest("http://localhost:3000/api/analyze", {
    method: "POST",
    headers: { origin, "content-length": "1024" },
    body: form,
  });
}
it("reports missing server credentials without demo substitution", async () => {
  vi.stubEnv("OPENAI_API_KEY", "");
  const response = await POST(request());
  expect(response.status).toBe(503);
  expect((await response.json()).error).toContain("not configured");
  expect(analyzePhoto).not.toHaveBeenCalled();
});
it("rejects oversized, unsupported, forged and cross-origin uploads before provider calls", async () => {
  const oversized = new NextRequest("http://localhost:3000/api/analyze", {
    method: "POST",
    headers: { "content-length": String(7 * 1024 * 1024) },
  });
  expect((await POST(oversized)).status).toBe(413);
  expect((await POST(request("text/plain"))).status).toBe(400);
  expect(
    (await POST(request("image/jpeg", new Uint8Array([1, 2, 3])))).status,
  ).toBe(400);
  expect(
    (await POST(request("image/jpeg", undefined, "http://other.test"))).status,
  ).toBe(403);
  expect(analyzePhoto).not.toHaveBeenCalled();
});
it("returns real adapter output and never logs or exposes provider errors", async () => {
  vi.mocked(analyzePhoto).mockResolvedValue({ items: [] });
  expect((await POST(request())).status).toBe(200);
  expect(analyzePhoto).toHaveBeenCalledWith("data:image/jpeg;base64,/9j/2Q==");
  vi.mocked(analyzePhoto).mockRejectedValue(
    new Error("Sensitive provider payload test"),
  );
  const response = await POST(request());
  expect(response.status).toBe(502);
  expect(JSON.stringify(await response.json())).not.toContain("Sensitive");
});
it("bounds server analysis concurrency to two and releases slots on completion", async () => {
  const resolves: Array<(value: { items: [] }) => void> = [];
  vi.mocked(analyzePhoto).mockImplementation(
    () => new Promise((resolve) => resolves.push(resolve)),
  );
  const a = POST(request()),
    b = POST(request());
  await vi.waitFor(() => expect(resolves).toHaveLength(2));
  expect((await POST(request())).status).toBe(429);
  resolves.forEach((resolve) => resolve({ items: [] }));
  expect((await a).status).toBe(200);
  expect((await b).status).toBe(200);
  vi.mocked(analyzePhoto).mockResolvedValue({ items: [] });
  expect((await POST(request())).status).toBe(200);
});
