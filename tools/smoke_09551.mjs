import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const smokeFile = path.join(here, "smoke_boot_096.mjs");
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
const timeoutMs = Math.min(Number(process.env.CHERRIFT_SMOKE_TIMEOUT_MS) || 120000, 180000);

async function runCase(name, index) {
  const label = `${index + 1}/${cases.length} ${name}`;
  const startedAt = Date.now();

  console.log(`[smoke] START ${label}`);

  await new Promise((resolve, reject) => {
    let settled = false;

    const child = spawn(process.execPath, [smokeFile, `--case=${name}`], {
      cwd:path.resolve(here, ".."),
      env:process.env,
      stdio:["ignore", "inherit", "inherit"]
    });

    const finish = error => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      clearInterval(heartbeat);
      if (error) reject(error);
      else resolve();
    };

    const heartbeat = setInterval(() => {
      const seconds = Math.round((Date.now() - startedAt) / 1000);
      console.log(`[smoke] RUN   ${label} · ${seconds}s`);
    }, 15000);

    const timeout = setTimeout(() => {
      child.kill("SIGTERM");
      setTimeout(() => child.kill("SIGKILL"), 1500).unref?.();
      finish(
        new Error(
          `[smoke] TIMEOUT ${label} after ${Math.round(timeoutMs / 1000)}s`
        )
      );
    }, timeoutMs);

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

console.log(`[smoke] All ${cases.length} selected CHERRIFT boot smoke case(s) passed.`);
