import { chmodSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { z } from "zod";

const emailSchema = z.email().max(254);

export function normalizeWaitlistEmail(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const email = value.trim().toLowerCase();
  return emailSchema.safeParse(email).success ? email : null;
}

export function createWaitlistStore(directory: string) {
  mkdirSync(directory, { recursive: true, mode: 0o700 });
  chmodSync(directory, 0o700);
  const path = join(directory, "waitlist.sqlite");
  const database = new DatabaseSync(path);
  chmodSync(path, 0o600);
  database.exec(`
    PRAGMA journal_mode = WAL;
    PRAGMA synchronous = FULL;
    PRAGMA busy_timeout = 5000;
    CREATE TABLE IF NOT EXISTS signups (
      email TEXT PRIMARY KEY COLLATE NOCASE,
      created_at TEXT NOT NULL
    );
  `);
  const insert = database.prepare(
    "INSERT OR IGNORE INTO signups (email, created_at) VALUES (?, ?)",
  );
  return {
    add(email: string) {
      insert.run(email, new Date().toISOString());
    },
    close() {
      database.close();
    },
  };
}

let store: ReturnType<typeof createWaitlistStore> | undefined;

export function saveWaitlistEmail(email: string) {
  if (!store) {
    const directory = process.env.WAITLIST_DATA_DIR;
    if (!directory && process.env.NODE_ENV === "production") {
      throw new Error("Waitlist storage is not configured");
    }
    store = createWaitlistStore(
      directory || join(tmpdir(), "knapsack-waitlist"),
    );
  }
  store.add(email);
}
