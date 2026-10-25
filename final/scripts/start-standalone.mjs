import { spawn } from "node:child_process";
import { cpSync, existsSync } from "node:fs";
import { join } from "node:path";
import { loadEnvFile } from "node:process";

const appDir = process.cwd();
const buildDir = join(appDir, ".next");
const standaloneDir = join(buildDir, "standalone");
const server = join(standaloneDir, "server.js");

if (!existsSync(server)) {
  console.error("No standalone build found. Run npm run build first.");
  process.exit(1);
}

if (existsSync(join(appDir, ".env.local"))) {
  loadEnvFile(join(appDir, ".env.local"));
}

cpSync(join(buildDir, "static"), join(standaloneDir, ".next", "static"), {
  recursive: true,
});
if (existsSync(join(appDir, "public"))) {
  cpSync(join(appDir, "public"), join(standaloneDir, "public"), {
    recursive: true,
  });
}

const child = spawn(process.execPath, [server], {
  cwd: standaloneDir,
  env: {
    ...process.env,
    HOSTNAME: process.env.HOSTNAME || "127.0.0.1",
    PORT: process.env.PORT || "3000",
  },
  stdio: "inherit",
});

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, () => child.kill(signal));
}
child.on("error", (error) => {
  console.error(error);
  process.exitCode = 1;
});
child.on("exit", (code, signal) => {
  process.exitCode = code ?? (signal ? 1 : 0);
});
