import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync, rmSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import test from "node:test";
import { profiles } from "../bin/omo-model-profiles.js";
import { createAllProfilesFixture, projectRoot, readJson } from "./omo-model-cli-fixture.js";

const selectorPath = join(projectRoot, "bin", "omo-model.ps1");
const commandWrapperPath = join(projectRoot, "bin", "omo-model.cmd");
const windowsOnly = { skip: process.platform !== "win32" };

test("PowerShell selector hot-swaps every canonical profile when OpenCode is running", windowsOnly, () => {
  const root = mkdtempSync(join(tmpdir(), "omo-model-powershell-"));
  try {
    const home = join(root, "home");
    const configDir = createAllProfilesFixture(home);
    assert.equal(existsSync(selectorPath), true, "versioned PowerShell selector is missing");

    for (const [index, profile] of profiles.entries()) {
      const result = runPowerShell(home, ["--use", String(index)], true);
      assert.equal(result.status, 0, result.stderr || result.stdout);
      assert.match(`${result.stdout}\n${result.stderr}`, /OpenCode is running.*4242/is);

      const base = readJson(join(configDir, "opencode.jsonc"));
      const ohMy = readJson(join(configDir, "oh-my-openagent.json"));
      const separator = profile.model.indexOf("/");
      const providerId = profile.model.slice(0, separator);
      const modelId = profile.model.slice(separator + 1);
      assert.equal(base.model, profile.model);
      assert.equal(base.small_model, profile.model);
      assert.equal(base.provider[providerId].name, profile.providerName);
      assert.equal(base.provider[providerId].models[modelId].name, profile.modelName);
      assert.equal(base.agent.build.model, profile.model);
      assert.equal(base.agent.build.variant, profile.variant);
      assert.equal(base.agent.build.reasoningEffort, profile.reasoningEffort ?? undefined);
      assert.equal(base.agent.inherited.model, undefined);
      assert.equal(base.agent.inherited.variant, profile.variant);
      assert.equal(base.agent.inherited.reasoningEffort, profile.reasoningEffort ?? undefined);
      for (const target of [...Object.values(ohMy.agents), ...Object.values(ohMy.categories)]) {
        assert.equal(target.model, profile.model);
        assert.equal(target.variant, profile.variant);
        assert.equal(target.reasoningEffort, profile.reasoningEffort ?? undefined);
      }
      assert.deepEqual(ohMy.background_task.providerConcurrency, { [profile.providerConcurrency]: 5 });
      assert.deepEqual(ohMy.background_task.modelConcurrency, { [profile.modelConcurrency]: 5 });

      const current = runPowerShell(home, ["--current"], false);
      assert.equal(current.status, 0, current.stderr || current.stdout);
      assert.match(current.stdout, new RegExp(`\\[${index}\\] ${escapeRegex(profile.name)}`));
      assert.match(current.stdout, new RegExp(`model:\\s+${escapeRegex(profile.model)}`));
      assert.match(current.stdout, new RegExp(`variant:\\s+${escapeRegex(profile.variant)}`));
      assert.match(current.stdout, new RegExp(`effort:\\s+${escapeRegex(profile.reasoningEffort ?? "<unset>")}`));
    }

    const backups = readdirSync(join(configDir, "profile-backups"));
    assert.equal(backups.filter((name) => name.startsWith("opencode.")).length, profiles.length);
    assert.equal(backups.filter((name) => name.startsWith("oh-my-openagent.")).length, profiles.length);
  } finally {
    rmSync(root, { force: true, recursive: true });
  }
});

test("Windows command wrapper launches the adjacent PowerShell selector", windowsOnly, () => {
  assert.equal(existsSync(commandWrapperPath), true, "versioned command wrapper is missing");
  assert.match(readFileSync(commandWrapperPath, "utf8"), /%~dp0omo-model\.ps1/iu);
});

function runPowerShell(home, args, activeOpenCode) {
  const escapedPath = selectorPath.replaceAll("'", "''");
  const processStub = activeOpenCode
    ? "function global:Get-Process { [pscustomobject]@{ Id = 4242 } }; "
    : "";
  const invocation = args.map((arg) => `'${arg.replaceAll("'", "''")}'`).join(" ");
  const command = `$ErrorActionPreference = 'Stop'; ${processStub}& '${escapedPath}' ${invocation}`;
  return spawnSync("powershell.exe", ["-NoLogo", "-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass", "-Command", command], {
    cwd: projectRoot,
    encoding: "utf8",
    env: { ...process.env, HOME: home, USERPROFILE: home },
  });
}

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
