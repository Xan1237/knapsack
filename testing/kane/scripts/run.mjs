import fs from "node:fs/promises";
import path from "node:path";
import net from "node:net";
import { spawn } from "node:child_process";
import { parseArgs } from "node:util";
import { setTimeout as delay } from "node:timers/promises";
import {
  checkRecordings,
  harnessDir,
  loadManifest,
  memberBudget,
  parseEvents,
  redactWith,
  resultsDir,
  saveRecordings,
  selectSuite,
  summarize,
  testsDir,
} from "./lib.mjs";
import { prepare } from "./prepare.mjs";
import { writeReport } from "./report.mjs";

const { values } = parseArgs({
  options: {
    suite: { type: "string", default: process.env.KANE_SUITE || "smoke" },
    mode: { type: "string", default: process.env.KANE_MODE || "check" },
    "app-dir": {
      type: "string",
      default: process.env.KANE_APP_DIR || "../../final",
    },
    "base-url": {
      type: "string",
      default: process.env.KANE_BASE_URL || "http://127.0.0.1:3100",
    },
    "start-server": { type: "boolean", default: false },
    headless: { type: "boolean", default: !!process.env.CI },
    parallel: { type: "string" },
    timeout: { type: "string" },
  },
});
if (!["check", "record"].includes(values.mode))
  throw new Error("Mode must be check or record");

const manifest = await loadManifest();
const selected = selectSuite(manifest, values.suite);
const parallel = Number(values.parallel || manifest.parallel);
const timeout = Number(
  values.timeout ||
    (values.mode === "record"
      ? 2400
      : manifest.suites[values.suite].timeoutSeconds),
);
if (
  !Number.isInteger(parallel) ||
  parallel < 1 ||
  parallel > 4 ||
  !Number.isInteger(timeout) ||
  timeout < 1 ||
  timeout > 3600
)
  throw new Error("Parallelism must be 1–4 and timeout must be 1–3600 seconds");

const redact = redactWith([
  process.env.LT_ACCESS_KEY,
  process.env.OPENAI_API_KEY,
  process.env.GITHUB_TOKEN,
  process.env.GH_TOKEN,
]);
await fs.mkdir(resultsDir, { recursive: true });
const startedAt = Date.now();
const allEvents = [];
let server;
let cli;
let interrupted = false;
let timedOut = false;
let hardStop;
let summary;
const overdue = new Set();
const memberTimers =
  values.mode === "check"
    ? memberBudget(30000, (file) => {
        overdue.add(file);
        timedOut = true;
        interrupted = true;
        stopProcess(cli, true);
      })
    : null;

function stopProcess(child, force = false) {
  if (!child || child.exitCode !== null) return;
  if (process.platform === "win32" && force) {
    const kill = spawn("taskkill", ["/PID", String(child.pid), "/T", "/F"], {
      stdio: "ignore",
      windowsHide: true,
    });
    kill.on("error", () => child.kill());
  } else {
    try {
      if (process.platform !== "win32")
        process.kill(-child.pid, force ? "SIGKILL" : "SIGINT");
      else child.kill(force ? "SIGKILL" : "SIGINT");
    } catch {}
  }
}

function interrupt() {
  interrupted = true;
  stopProcess(cli, process.platform === "win32");
  if (!hardStop)
    hardStop = setTimeout(() => stopProcess(cli, true), 15000).unref();
}
process.on("SIGINT", interrupt);
process.on("SIGTERM", interrupt);

async function runKane(args, logName) {
  const logFile = path.join(resultsDir, logName);
  await fs.writeFile(logFile, "");
  function sink(file, progress = false) {
    let pending = "",
      text = "",
      writes = Promise.resolve();
    const append = (line) => {
      const safe = redact(line);
      text += safe;
      writes = writes.then(() => fs.appendFile(file, safe));
      if (progress) {
        try {
          const event = JSON.parse(safe);
          memberTimers?.observe(event);
          if (
            /^testrun_(?:authored_)?member_(?:start|end)$/.test(
              event.type || "",
            )
          )
            console.log(
              `Kane ${event.status || "started"}: ${path.basename(String(event.path).replaceAll("\\", "/"))}`,
            );
        } catch {}
      }
    };
    return {
      push(chunk) {
        pending += chunk;
        let end;
        while ((end = pending.indexOf("\n")) >= 0) {
          append(pending.slice(0, end + 1));
          pending = pending.slice(end + 1);
        }
      },
      async finish() {
        if (pending) append(pending);
        await writes;
        return text;
      },
    };
  }
  const stdout = sink(logFile, !logName.startsWith("preflight"));
  const stderr = sink(path.join(resultsDir, "kane-stderr.log"));
  const entry = path.join(
    harnessDir,
    "node_modules",
    "@testmuai",
    "kane-cli",
    "bin",
    "kane-cli.cjs",
  );
  cli = spawn(process.execPath, [entry, ...args], {
    cwd: harnessDir,
    env: { ...process.env, KANE_CLI_USER_AGENT: "codex" },
    stdio: ["ignore", "pipe", "pipe"],
    windowsHide: values.headless,
    detached: process.platform !== "win32",
  });
  cli.stdout.setEncoding("utf8");
  cli.stderr.setEncoding("utf8");
  cli.stdout.on("data", (chunk) => stdout.push(chunk));
  cli.stderr.on("data", (chunk) => stderr.push(chunk));
  const timer = setTimeout(
    () => {
      timedOut = true;
      interrupt();
    },
    Math.max(1, timeout * 1000 - (Date.now() - startedAt)),
  ).unref();
  try {
    const code = await new Promise((resolve, reject) => {
      cli.once("error", reject);
      cli.once("close", (code, signal) =>
        resolve(signal || code === null ? 3 : code),
      );
    });
    // Reconstruct complete lines before redaction, including values split across chunks.
    const safeStdout = await stdout.finish();
    await stderr.finish();
    return { code, events: parseEvents(safeStdout) };
  } finally {
    clearTimeout(timer);
    cli = undefined;
  }
}

async function startServer(appDir, baseUrl) {
  const target = new URL(baseUrl);
  if (
    target.protocol !== "http:" ||
    !["127.0.0.1", "localhost"].includes(target.hostname)
  )
    throw new Error("Managed servers require a local HTTP base URL");
  const port = Number(target.port || 80);
  const occupied = await new Promise((resolve) => {
    const socket = net.connect({ port, host: target.hostname });
    socket.once("connect", () => {
      socket.destroy();
      resolve(true);
    });
    socket.once("error", () => resolve(false));
  });
  if (occupied)
    throw new Error(
      `Port ${port} is already in use. Choose another base URL or omit --start-server.`,
    );
  const env = {
    ...process.env,
    NODE_ENV: "production",
    NEXT_TELEMETRY_DISABLED: "1",
  };
  for (const key of [
    "LT_USERNAME",
    "LT_ACCESS_KEY",
    "GITHUB_TOKEN",
    "GH_TOKEN",
    "ACTIONS_RUNTIME_TOKEN",
  ])
    delete env[key];
  if (!selected.some((test) => test.live)) delete env.OPENAI_API_KEY;
  server = spawn(
    process.execPath,
    [
      path.join(appDir, "node_modules", "next", "dist", "bin", "next"),
      "start",
      "--hostname",
      "127.0.0.1",
      "--port",
      String(port),
    ],
    {
      cwd: appDir,
      env,
      stdio: ["ignore", "pipe", "pipe"],
      windowsHide: true,
      detached: process.platform !== "win32",
    },
  );
  server.on("error", () => {});
  for (const stream of [server.stdout, server.stderr])
    stream.on("data", (data) => {
      fs.appendFile(
        path.join(resultsDir, "server.log"),
        redact(data.toString()),
      ).catch(() => {});
    });
  const until = Date.now() + 45000;
  while (Date.now() < until && !interrupted) {
    if (server.exitCode !== null)
      throw new Error(
        "Application server exited before becoming ready; see server.log",
      );
    try {
      if (
        (await fetch(baseUrl + "/pack", { signal: AbortSignal.timeout(1500) }))
          .status === 200
      )
        return;
    } catch {}
    await delay(250);
  }
  throw new Error("Application server did not become ready within 45 seconds");
}

try {
  const facts = await prepare({
    appDir: values["app-dir"],
    baseUrl: values["base-url"],
  });
  const hasUsername = !!process.env.LT_USERNAME;
  const hasKey = !!process.env.LT_ACCESS_KEY;
  if (hasUsername !== hasKey || (process.env.CI && !hasKey))
    throw new Error(
      "CI requires both LT_USERNAME and LT_ACCESS_KEY repository secrets",
    );
  if (
    process.env.CI &&
    selected.some((test) => test.live) &&
    !process.env.OPENAI_API_KEY
  )
    throw new Error(
      "This live suite requires the server-only OPENAI_API_KEY repository secret",
    );
  if (values.mode === "check")
    await checkRecordings(selected, manifest.cliVersion);
  if (values["start-server"]) await startServer(facts.appDir, facts.baseUrl);
  else if (
    (
      await fetch(facts.baseUrl + "/pack", {
        signal: AbortSignal.timeout(5000),
      })
    ).status !== 200
  )
    throw new Error("The application /pack route is not ready");
  if (selected.some((test) => test.live)) {
    const status = await fetch(facts.baseUrl + "/api/astra/status", {
      signal: AbortSignal.timeout(5000),
    });
    if (!status.ok || !(await status.json()).configured)
      throw new Error("The application server has no live AI configuration");
  }

  const args = [
    "testrun",
    "run",
    ...selected.map((test) => path.join(testsDir, test.file)),
    "--agent",
    "--parallel",
    String(parallel),
    "--name",
    `knapsack-${values.suite}-${values.mode}`,
    "--on-failure",
    values.mode === "check" ? "fail-fast" : "continue",
  ];
  if (values.mode === "check") args.push("--no-adaptive-heal");
  if (values.headless) args.push("--headless");
  if (hasKey)
    args.push(
      "--username",
      process.env.LT_USERNAME,
      "--access-key",
      process.env.LT_ACCESS_KEY,
    );
  console.log(
    `Kane ${values.suite}: ${selected.length} tests, ${parallel} isolated workers, ${values.mode} mode, ${timeout}s limit`,
  );
  const preflight = await runKane([...args, "--dry-run"], "preflight.ndjson");
  if (
    preflight.code ||
    preflight.events.some(
      (event) =>
        event.type === "warning" && event.code === "unresolved_variables",
    ) ||
    !preflight.events.some(
      (event) => event.type === "testrun_plan" && event.valid,
    )
  )
    throw new Error(
      "Kane preflight failed or variables are unresolved; see preflight.ndjson",
    );
  if (interrupted) throw new Error("Interrupted before browser execution");
  const result = await runKane(args, "kane.ndjson");
  allEvents.push(...result.events);
  summary = summarize(allEvents, selected, {
    exitCode: result.code,
    interrupted,
    durationSeconds: (Date.now() - startedAt) / 1000,
  });
  if (values.mode === "check") {
    for (const test of summary.tests) {
      if (overdue.has(test.file) || test.durationSeconds > 30) {
        test.status = "failed";
        test.failure = {
          message: "Exceeded the 30-second per-test check limit",
        };
        summary.status = "failed";
        summary.exitCode = 1;
      }
    }
    summary.totals = {
      tests: summary.tests.length,
      passed: summary.tests.filter((test) => test.status === "passed").length,
      failed: summary.tests.filter((test) =>
        ["failed", "broken"].includes(test.status),
      ).length,
      interrupted: summary.tests.filter((test) => test.status === "interrupted")
        .length,
      skipped: summary.tests.filter((test) => test.status === "skipped").length,
    };
  }
  if (server && server.exitCode !== null) {
    summary.status = "failed";
    summary.exitCode = 1;
    summary.error = "Application server exited during the test run";
  }
  if (values.mode === "record") {
    const approved = selected.filter(
      (test) =>
        summary.tests.find((result) => result.id === test.id)?.status ===
        "passed",
    );
    await saveRecordings(approved, manifest.cliVersion, {
      removeIds: selected
        .filter((test) => !approved.includes(test))
        .map((test) => test.id),
    });
    summary.approvedRecordings = approved.map((test) => test.id);
  }
} catch (error) {
  summary = summarize(allEvents, selected, {
    exitCode: 2,
    interrupted,
    durationSeconds: (Date.now() - startedAt) / 1000,
  });
  summary.error = redact(error.message);
} finally {
  memberTimers?.close();
  stopProcess(cli, true);
  stopProcess(server, true);
  clearTimeout(hardStop);
  process.off("SIGINT", interrupt);
  process.off("SIGTERM", interrupt);
}

summary.suite = values.suite;
summary.mode = values.mode;
summary.recordedAt = new Date().toISOString();
summary.applicationRef = process.env.KANE_APPLICATION_REF || "";
summary.timedOut = timedOut;
summary.perTestLimitSeconds = values.mode === "check" ? 30 : null;
await writeReport(summary);
console.log(
  `Kane ${summary.status}: ${summary.totals.passed}/${summary.totals.tests} passed`,
);
if (summary.error) console.error(summary.error);
process.exitCode = summary.exitCode;
