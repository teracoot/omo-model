import assert from "node:assert/strict";
import { spawn, spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { profiles } from "../bin/omo-model-profiles.js";
import { createAllProfilesFixture, projectRoot } from "../test/omo-model-cli-fixture.js";

if (process.platform !== "win32") throw new Error("The local release gate requires Windows and a locally installed OpenCode");

const selector = join(projectRoot, "bin", "omo-model.ps1");
const opencode = process.env.OPENCODE_BIN ?? resolveInstalledOpenCode();
const root = mkdtempSync(join(tmpdir(), "omo-model-local-release-"));
const home = join(root, "home");
const configDir = createAllProfilesFixture(home);
const env = { ...process.env, HOME: home, USERPROFILE: home };

try {
  for (const [index, profile] of profiles.entries()) {
    run("powershell.exe", ["-NoLogo", "-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass", "-File", selector, "--use", String(index)]);
    const config = JSON.parse(readFileSync(join(configDir, "opencode.jsonc"), "utf8"));
    for (const [providerId, provider] of Object.entries(config.provider)) {
      assert.ok(provider.name === undefined || typeof provider.name === "string", `${providerId}.name must be a string or omitted`);
    }
    run(opencode, ["debug", "config"]);
    await assertFreshServerStart(index, profile.name);
    console.log(`Profile ${index}/${profiles.length - 1} passed: ${profile.name}`);
  }
} finally {
  rmSync(root, { force: true, recursive: true });
}

console.log(`Local release gate passed for ${profiles.length} profiles with fresh OpenCode startup after every switch.`);

function run(command, args) {
  const result = spawnSync(command, args, { cwd: projectRoot, encoding: "utf8", env, windowsHide: true });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`${command} ${args.join(" ")} failed:\n${result.stderr || result.stdout}`);
}

async function assertFreshServerStart(index, profileName) {
  const child = spawn(opencode, ["serve", "--hostname", "127.0.0.1", "--port", "0", "--print-logs"], {
    cwd: projectRoot,
    env,
    windowsHide: true,
  });
  let output = "";
  child.stdout.on("data", (chunk) => { output += chunk; });
  child.stderr.on("data", (chunk) => { output += chunk; });

  try {
    await waitUntilReady(child, () => output);
    assert.match(output, /opencode server listening on http:\/\/127\.0\.0\.1:\d+/u, `Profile ${index} ${profileName} did not reach ready state`);
  } finally {
    const stopped = spawnSync("taskkill.exe", ["/PID", String(child.pid), "/T", "/F"], { encoding: "utf8", windowsHide: true });
    if (stopped.status !== 0) throw new Error(`Failed to stop OpenCode PID ${child.pid}:\n${stopped.stderr || stopped.stdout}`);
    await new Promise((resolve) => child.once("exit", resolve));
  }
}

function resolveInstalledOpenCode() {
  const npmRoot = spawnSync("cmd.exe", ["/d", "/s", "/c", "npm.cmd root -g"], { encoding: "utf8", windowsHide: true });
  if (npmRoot.error) throw npmRoot.error;
  if (npmRoot.status !== 0) throw new Error(`npm root -g failed:\n${npmRoot.stderr || npmRoot.stdout}`);
  const candidate = join(npmRoot.stdout.trim(), "opencode-ai", "bin", "opencode.exe");
  if (!existsSync(candidate)) throw new Error(`Installed OpenCode binary was not found: ${candidate}`);
  return candidate;
}

function waitUntilReady(child, output) {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error(`OpenCode startup timed out:\n${output()}`)), 20_000);
    const interval = setInterval(() => {
      if (/opencode server listening on http:\/\/127\.0\.0\.1:\d+/u.test(output())) {
        clearTimeout(timeout);
        clearInterval(interval);
        resolve();
      }
    }, 50);
    child.once("exit", (code) => {
      clearTimeout(timeout);
      clearInterval(interval);
      reject(new Error(`OpenCode exited before ready state with code ${code}:\n${output()}`));
    });
  });
}
