import { NextRequest } from "next/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { proxy } from "./proxy";

afterEach(() => vi.unstubAllEnvs());

describe("waitlist-only deployment", () => {
  it("sends packing visitors to the waitlist and hides app APIs", async () => {
    vi.stubEnv("WAITLIST_ONLY", "true");
    const pack = proxy(new NextRequest("https://knapsack.example/pack"));
    expect(pack.status).toBe(307);
    expect(pack.headers.get("location")).toBe(
      "https://knapsack.example/#waitlist",
    );
    expect(
      proxy(new NextRequest("https://knapsack.example/api/analyze")).status,
    ).toBe(404);
  });

  it("keeps the app available for local development", () => {
    vi.stubEnv("WAITLIST_ONLY", "false");
    expect(
      proxy(new NextRequest("http://localhost/pack")).headers.get(
        "x-middleware-next",
      ),
    ).toBe("1");
  });
});
