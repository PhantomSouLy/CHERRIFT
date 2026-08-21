import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const smokeFile = path.join(here, "smoke_boot_096.mjs");

const allCases = [
  "desktop",
  "wide-desktop",
  "short-desktop",
  "phone-portrait",
  "phone-landscape",
  "returning-session",
  "auth-timeout",
  "cloud-timeout"
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
const timeoutMs =
  Number.isFinite(configuredTimeout) && configuredTimeout >= 30000
    ? Math.min(configuredTimeout, 120000)
    : 120000;

function killProcess(child) {
  if (!child || child.exitCode !== null || child.signalCode !== null) return;
  try { child.kill("SIGTERM"); } catch (_) {}
  const hardKill = setTimeout(() => {
    if (child.exitCode === null && child.signalCode === null) {
      try { child.kill("SIGKILL"); } catch (_) {}
    }
  }, 1500);
  hardKill.unref?.();
}

async function runCase(name, index) {
  const label = `${index + 1}/${cases.length} ${name}`;
  const startedAt = Date.now();

  console.log(`[smoke] START ${label}`);
  console.log(`[smoke] LIMIT ${label} ${Math.round(timeoutMs / 1000)}s`);

  await new Promise((resolve, reject) => {
    let settled = false;

    const child = spawn(process.execPath, [smokeFile, `--case=${name}`], {
      cwd: path.resolve(here, ".."),
      env: {
        ...process.env,
        CHERRIFT_BOOT_SMOKE: "1"
      },
      stdio: ["ignore", "inherit", "inherit"]
    });

    const heartbeat = setInterval(() => {
      const seconds = Math.round((Date.now() - startedAt) / 1000);
      console.log(`[smoke] RUN   ${label} · ${seconds}s`);
    }, 15000);

    const timeout = setTimeout(() => {
      const seconds = Math.round((Date.now() - startedAt) / 1000);
      console.error(`[smoke] WATCHDOG ${label} after ${seconds}s`);
      killProcess(child);
      finish(
        new Error(
          `[smoke] TIMEOUT ${label} after ${Math.round(timeoutMs / 1000)}s`
        )
      );
    }, timeoutMs);

    function finish(error = null) {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      clearInterval(heartbeat);
      if (error) reject(error);
      else resolve();
    }

    child.once("error", error => {
      finish(
        new Error(`[smoke] FAILED TO START ${label}: ${error.message}`)
      );
    });

    child.once("exit", (code, signal) => {
      if (settled) return;

      if (code === 0) {
        const seconds = ((Date.now() - startedAt) / 1000).toFixed(1);
        console.log(`[smoke] PASS  ${label} in ${seconds}s`);
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

console.log(
  `[smoke] All ${cases.length} selected CHERRIFT boot smoke case(s) passed.`
);
