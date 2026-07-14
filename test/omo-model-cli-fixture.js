import { spawnSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { profiles } from "../bin/omo-model-profiles.js";

export const projectRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const cliPath = join(projectRoot, "bin", "omo-model.js");

export function createAllProfilesFixture(home) {
  const configDir = join(home, ".config", "opencode");
  mkdirSync(configDir, { recursive: true });
  const providers = {};
  for (const profile of profiles) {
    const separator = profile.model.indexOf("/");
    const providerId = profile.model.slice(0, separator);
    const modelId = profile.model.slice(separator + 1);
    providers[providerId] ??= { name: `stale-${providerId}`, models: {} };
    providers[providerId].models[modelId] = { name: modelId };
  }

  const initial = profiles[0];
  writeFileSync(
    join(configDir, "opencode.jsonc"),
    JSON.stringify({
      model: initial.model,
      small_model: initial.model,
      agent: {
        build: { description: "preserve build", model: initial.model, variant: initial.variant, reasoningEffort: initial.reasoningEffort },
        inherited: { description: "preserve inherited", variant: initial.variant, reasoningEffort: initial.reasoningEffort },
        metadataOnly: { description: "preserve metadata only" },
      },
      provider: providers,
    }),
  );
  writeFileSync(
    join(configDir, "oh-my-openagent.json"),
    JSON.stringify({
      agents: {
        build: { model: initial.model, variant: initial.variant, reasoningEffort: initial.reasoningEffort },
        "multimodal-looker": { model: initial.model, variant: initial.variant, reasoningEffort: initial.reasoningEffort },
      },
      categories: { quick: { model: initial.model, variant: initial.variant, reasoningEffort: initial.reasoningEffort } },
      background_task: {},
    }),
  );
  return configDir;
}

export function readJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

export function runCli({ root, home, args, processState = "idle" }) {
  const preloadPath = join(root, `${processState}-processes.cjs`);
  installProcessListStub(preloadPath, processState);
  return spawnSync(process.execPath, [cliPath, ...args], {
    cwd: projectRoot,
    encoding: "utf8",
    env: {
      ...process.env,
      HOME: home,
      NODE_OPTIONS: `${process.env.NODE_OPTIONS ?? ""} --require=${preloadPath}`.trim(),
    },
  });
}

function installProcessListStub(preloadPath, processState) {
  const active = processState === "active";
  const failed = processState === "failed";
  const windowsOutput = active ? '"opencode.exe","4242","Console","1","1,024 K"' : "INFO: No tasks are running which match the specified criteria.";
  const unixOutput = active ? " 4242 opencode" : "";
  writeFileSync(
    preloadPath,
    `const childProcess = require("node:child_process");
const { syncBuiltinESMExports } = require("node:module");
const originalSpawnSync = childProcess.spawnSync;
childProcess.spawnSync = function (command, args, options) {
  if (command === "tasklist") return ${failed ? '{ status: 1, stdout: "", stderr: "unavailable" }' : `{ status: 0, stdout: ${JSON.stringify(windowsOutput)}, stderr: "" }`};
  if (command === "ps") return ${failed ? '{ status: 1, stdout: "", stderr: "unavailable" }' : `{ status: 0, stdout: ${JSON.stringify(unixOutput)}, stderr: "" }`};
  return originalSpawnSync.call(this, command, args, options);
};
syncBuiltinESMExports();
`,
    "utf8",
  );
}
