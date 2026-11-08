import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { POST } from "./route";

const directory = mkdtempSync(join(tmpdir(), "knapsack-waitlist-route-"));
beforeAll(() => vi.stubEnv("WAITLIST_DATA_DIR", directory));
afterAll(() => {
  vi.unstubAllEnvs();
  rmSync(directory, { recursive: true, force: true });
});

function request(body: string, origin = "https://knapsack.example") {
  return new Request("http://localhost/api/waitlist", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      host: "knapsack.example",
      origin,
      "x-forwarded-proto": "https",
    },
    body,
  });
}

describe("waitlist signup", () => {
  it("saves a valid address once", async () => {
    expect(
      (
        await POST(
          request(JSON.stringify({ email: "  Traveler@Example.com " })),
        )
      ).status,
    ).toBe(200);
    expect(
      (await POST(request(JSON.stringify({ email: "traveler@example.com" }))))
        .status,
    ).toBe(200);
    const database = new DatabaseSync(join(directory, "waitlist.sqlite"), {
      readOnly: true,
    });
    const rows = database.prepare("SELECT email FROM signups").all();
    database.close();
    expect(rows.map((row) => row.email)).toEqual(["traveler@example.com"]);
  });

  it("rejects invalid, oversized, and cross-origin requests", async () => {
    expect(
      (await POST(request(JSON.stringify({ email: "invalid" })))).status,
    ).toBe(400);
    expect(
      (
        await POST(
          request(
            JSON.stringify({ email: "x@example.com", extra: "x".repeat(5000) }),
          ),
        )
      ).status,
    ).toBe(400);
    expect(
      (
        await POST(
          request(
            JSON.stringify({ email: "x@example.com" }),
            "https://elsewhere.example",
          ),
        )
      ).status,
    ).toBe(403);
  });
});
