import { mkdtempSync, rmSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { afterEach, describe, expect, it } from "vitest";
import { createWaitlistStore, normalizeWaitlistEmail } from "./waitlist";

const directories: string[] = [];
afterEach(() => {
  for (const directory of directories.splice(0))
    rmSync(directory, { recursive: true, force: true });
});

describe("waitlist", () => {
  it("validates and normalizes addresses", () => {
    expect(normalizeWaitlistEmail("  Traveler@Example.com  ")).toBe(
      "traveler@example.com",
    );
    expect(normalizeWaitlistEmail("not an email")).toBeNull();
    expect(normalizeWaitlistEmail({ email: "x@example.com" })).toBeNull();
  });

  it("persists signups and ignores duplicates across restarts", () => {
    const directory = mkdtempSync(join(tmpdir(), "knapsack-waitlist-test-"));
    directories.push(directory);
    const first = createWaitlistStore(directory);
    first.add("traveler@example.com");
    first.close();
    const second = createWaitlistStore(directory);
    second.add("TRAVELER@example.com");
    second.add("other@example.com");
    second.close();
    const database = new DatabaseSync(join(directory, "waitlist.sqlite"), {
      readOnly: true,
    });
    const rows = database
      .prepare("SELECT email FROM signups ORDER BY email")
      .all();
    database.close();
    expect(rows.map((row) => row.email)).toEqual([
      "other@example.com",
      "traveler@example.com",
    ]);
    expect(statSync(join(directory, "waitlist.sqlite")).mode & 0o777).toBe(
      0o600,
    );
    expect(statSync(directory).mode & 0o777).toBe(0o700);
  });
});
