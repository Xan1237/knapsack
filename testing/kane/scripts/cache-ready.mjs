import fs from "node:fs/promises";
import { recordingFile } from "./lib.mjs";

let approved = false;
try {
  const recordings = JSON.parse(await fs.readFile(recordingFile, "utf8"));
  approved = Object.keys(recordings.tests || {}).length > 0;
} catch {}
if (process.env.GITHUB_OUTPUT)
  await fs.appendFile(process.env.GITHUB_OUTPUT, `approved=${approved}\n`);
console.log(
  approved
    ? "Approved recording entries are available for caching."
    : "No approved recordings to cache.",
);
