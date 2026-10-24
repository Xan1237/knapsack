import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { harnessDir } from "./lib.mjs";

export async function prepare({
  appDir = process.env.KANE_APP_DIR || "../../final",
  baseUrl = process.env.KANE_BASE_URL || "http://127.0.0.1:3100",
} = {}) {
  const app = path.resolve(harnessDir, appDir);
  const url = new URL(baseUrl);
  if (
    !["http:", "https:"].includes(url.protocol) ||
    url.username ||
    url.password ||
    url.search ||
    url.hash ||
    url.pathname !== "/"
  )
    throw new Error(
      "KANE_BASE_URL must be a plain HTTP(S) origin without credentials, query or path",
    );
  const fixture = path.join(harnessDir, "fixtures", "step2-collection.json");
  await fs.access(fixture);
  const variables = {
    knapsack_base_url: { value: url.origin, secret: false },
    knapsack_collection_fixture: { value: fixture, secret: false },
    trip_preference: {
      value: "Help me pick between items that do not fit.",
      secret: false,
    },
    revision_item_name: { value: "Travel bottle", secret: false },
  };
  const directory = path.join(harnessDir, ".testmuai", "variables");
  await fs.mkdir(directory, { recursive: true });
  await fs.writeFile(
    path.join(directory, "ci.json"),
    JSON.stringify(variables, null, 2) + "\n",
  );
  return { appDir: app, baseUrl: url.origin, variables };
}

if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  const facts = await prepare();
  console.log(`Prepared nonsecret Kane fixtures for ${facts.baseUrl}`);
}
