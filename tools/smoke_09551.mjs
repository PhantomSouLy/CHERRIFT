import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const smokeFile = path.join(here, "smoke.mjs");
const allCases = ["desktop", "short-desktop", "phone-portrait", "phone-landscape", "returning-session"];
const requested = process.argv.find(argument => argument.startsWith("--case="))?.slice(7);
const cases = requested ? [requested] : allCases;
const concurrency = requested ? 1 : Math.min(2, cases.length);
const active = new Set();
let cursor = 0;
let failed = false;

function runCase(name, index) {
  return new Promise((resolve, reject) => {
    const label = `${index + 1}/${cases.length} ${name}`;
    console.log(`[smoke] START ${label}`);
    const child = spawn(process.execPath, [smokeFile, `--case=${name}`], {
      cwd:path.resolve(here, ".."),
      env:process.env,
      stdio:["ignore", "pipe", "pipe"]
    });
    active.add(child);

    let stdout = "";
    let stderr = "";
    child.stdout.on("data", chunk => { stdout += chunk; process.stdout.write(chunk); });
    child.stderr.on("data", chunk => { stderr += chunk; process.stderr.write(chunk); });

    const timeout = setTimeout(() => {
      const error = new Error(`[smoke] TIMEOUT ${label} after 120s`);
      child.kill("SIGTERM");
      setTimeout(() => child.kill("SIGKILL"), 1000).unref?.();
      reject(error);
    }, 120000);
    timeout.unref?.();

    child.once("error", error => {
      clearTimeout(timeout);
      active.delete(child);
      reject(error);
    });
    child.once("exit", (code, signal) => {
      clearTimeout(timeout);
      active.delete(child);
      if (code === 0) {
        console.log(`[smoke] PASS  ${label}`);
        resolve({ name, stdout });
        return;
      }
      const detail = stderr.trim() || stdout.trim() || `exit=${code} signal=${signal || "none"}`;
      reject(new Error(`[smoke] FAIL ${label}\n${detail}`));
    });
  });
}

async function worker() {
  while (!failed) {
    const index = cursor++;
    if (index >= cases.length) return;
    try {
      await runCase(cases[index], index);
    } catch (error) {
      failed = true;
      throw error;
    }
  }
}

try {
  await Promise.all(Array.from({ length:concurrency }, () => worker()));
  console.log(`[smoke] All ${cases.length} CHERRIFT smoke case(s) passed.`);
} catch (error) {
  for (const child of active) child.kill("SIGTERM");
  throw error;
}
