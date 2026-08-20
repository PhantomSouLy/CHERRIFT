import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const smokeFile = path.join(here, "smoke.mjs");
const allCases = [
  "desktop",
  "short-desktop",
  "phone-portrait",
  "phone-landscape",
  "returning-session"
];

const requested = process.argv
  .find(argument => argument.startsWith("--case="))
  ?.slice(7);

if (requested && !allCases.includes(requested)) {
  throw new Error(
    `[smoke] Unknown case "${requested}". Expected one of: ${allCases.join(", ")}`
  );
}

const cases = requested ? [requested] : allCases;
const configuredTimeout = Number(process.env.CHERRIFT_SMOKE_TIMEOUT_MS);
const caseTimeoutMs = Number.isFinite(configuredTimeout) && configuredTimeout >= 30000
  ? configuredTimeout
  : 480000;
const heartbeatMs = 30000;

function runCase(name, index) {
  return new Promise((resolve, reject) => {
    const label = `${index + 1}/${cases.length} ${name}`;
    const startedAt = Date.now();
    let settled = false;
    let forceKillTimer = null;

    console.log(`[smoke] START ${label}`);
    console.log(
      `[smoke] LIMIT ${label} ${Math.round(caseTimeoutMs / 1000)}s`
    );

    const child = spawn(process.execPath, [smokeFile, `--case=${name}`], {
      cwd: path.resolve(here, ".."),
      env: process.env,
      stdio: ["ignore", "inherit", "inherit"]
    });

    const finish = (error = null) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      clearInterval(heartbeat);
      if (forceKillTimer) clearTimeout(forceKillTimer);

      if (error) {
        reject(error);
        return;
      }

      const seconds = ((Date.now() - startedAt) / 1000).toFixed(1);
      console.log(`[smoke] PASS  ${label} in ${seconds}s`);
      resolve();
    };

    const heartbeat = setInterval(() => {
      const seconds = Math.round((Date.now() - startedAt) / 1000);
      console.log(`[smoke] RUN   ${label} · ${seconds}s`);
    }, heartbeatMs);

    const timeout = setTimeout(() => {
      const seconds = Math.round((Date.now() - startedAt) / 1000);
      console.error(`[smoke] TIMEOUT ${label} after ${seconds}s`);
      child.kill("SIGTERM");
      forceKillTimer = setTimeout(() => {
        if (!child.killed) child.kill("SIGKILL");
      }, 2000);
      forceKillTimer.unref?.();

      finish(
        new Error(
          `[smoke] TIMEOUT ${label} after ${Math.round(caseTimeoutMs / 1000)}s`
        )
      );
    }, caseTimeoutMs);

    child.once("error", error => {
      finish(new Error(`[smoke] FAILED TO START ${label}: ${error.message}`));
    });

    child.once("exit", (code, signal) => {
      if (settled) return;

      if (code === 0) {
        finish();
        return;
      }

      finish(
        new Error(
          `[smoke] FAIL ${label} · exit=${code ?? "null"} · signal=${signal || "none"}`
        )
      );
    });
  });
}

for (let index = 0; index < cases.length; index += 1) {
  await runCase(cases[index], index);
}

console.log(`[smoke] All ${cases.length} selected CHERRIFT smoke case(s) passed.`);
