import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { profiles } from "../bin/omo-model-profiles.js";
import { createAllProfilesFixture, readJson, runCli } from "./omo-model-cli-fixture.js";

test("selecting Free ChatGPT does not leave paid routes in OpenCode defaults or base agents", () => {
  const root = mkdtempSync(join(tmpdir(), "omo-model-cli-"));
  try {
    const home = join(root, "home");
    const configDir = join(home, ".config", "opencode");
    mkdirSync(configDir, { recursive: true });

    const paidRoute = "www.pqapi.space/gpt-5.5";
    const freeProfileIndex = profiles.findIndex((profile) => profile.name === "Free ChatGPT");
    assert.notEqual(freeProfileIndex, -1, "Free ChatGPT profile is missing");
    const freeProfile = profiles[freeProfileIndex];

    writeFileSync(
      join(configDir, "opencode.jsonc"),
      JSON.stringify({
        model: paidRoute,
        small_model: paidRoute,
        agent: {
          build: { description: "preserve build", model: paidRoute, variant: "xhigh", reasoningEffort: "xhigh" },
          plan: { description: "preserve plan", model: paidRoute, variant: "xhigh", reasoningEffort: "xhigh" },
          inherited: { description: "preserve inherited", variant: "xhigh", reasoningEffort: "xhigh" },
        },
        provider: {
          "gpt-free": { models: { "gpt-5.6-sol": {} } },
          "www.pqapi.space": { models: { "gpt-5.5": {} } },
        },
      }),
    );
    writeFileSync(
      join(configDir, "oh-my-openagent.json"),
      JSON.stringify({
        agents: {
          build: { model: paidRoute, variant: "xhigh" },
          "multimodal-looker": { model: paidRoute, variant: "xhigh" },
        },
        categories: { quick: { model: paidRoute, variant: "xhigh" } },
        background_task: {},
      }),
    );

    const result = runCli({ root, home, args: ["--use", String(freeProfileIndex)] });
    assert.equal(result.status, 0, result.stderr);

    const base = JSON.parse(readFileSync(join(configDir, "opencode.jsonc"), "utf8"));
    const ohMy = JSON.parse(readFileSync(join(configDir, "oh-my-openagent.json"), "utf8"));
    assert.equal(base.model, freeProfile.model, "omo-model left the paid route in top-level model");
    assert.equal(base.small_model, freeProfile.model, "omo-model left the paid route in top-level small_model");
    for (const agentName of ["build", "plan"]) {
      assert.equal(base.agent[agentName].model, freeProfile.model, `omo-model left the paid route in base agent '${agentName}'`);
      assert.equal(base.agent[agentName].variant, freeProfile.variant, `omo-model left the old variant in base agent '${agentName}'`);
      assert.equal(base.agent[agentName].reasoningEffort, freeProfile.reasoningEffort, `omo-model left the old reasoning effort in base agent '${agentName}'`);
    }
    assert.equal(base.agent.inherited.model, undefined, "omo-model should not create a redundant override for an inherited base agent");
    assert.equal(base.agent.inherited.variant, freeProfile.variant, "omo-model left the old variant in an inherited base agent");
    assert.equal(base.agent.inherited.reasoningEffort, freeProfile.reasoningEffort, "omo-model left the old reasoning effort in an inherited base agent");
    assert.equal(base.agent.build.description, "preserve build");
    assert.equal(base.agent.plan.description, "preserve plan");

    for (const target of [...Object.values(ohMy.agents), ...Object.values(ohMy.categories)]) {
      assert.equal(target.model, freeProfile.model);
      assert.equal(target.variant, freeProfile.variant);
    }
    assert.deepEqual(ohMy.background_task.providerConcurrency, { [freeProfile.providerConcurrency]: 5 });
    assert.deepEqual(ohMy.background_task.modelConcurrency, { [freeProfile.modelConcurrency]: 5 });

    const backups = readdirSync(join(configDir, "profile-backups"));
    assert.equal(backups.some((name) => name.startsWith("opencode.")), true, "base OpenCode config was not backed up");
    assert.equal(backups.some((name) => name.startsWith("oh-my-openagent.")), true, "OhMy config was not backed up");
  } finally {
    rmSync(root, { force: true, recursive: true });
  }
});

test("profile switching warns and hot-swaps routing while OpenCode is running", () => {
  const root = mkdtempSync(join(tmpdir(), "omo-model-cli-active-"));
  try {
    const home = join(root, "home");
    const configDir = join(home, ".config", "opencode");
    mkdirSync(configDir, { recursive: true });

    const oldRoute = "www.pqapi.space/gpt-5.5";
    const freeProfileIndex = profiles.findIndex((profile) => profile.name === "Free ChatGPT");
    assert.notEqual(freeProfileIndex, -1, "Free ChatGPT profile is missing");
    const basePath = join(configDir, "opencode.jsonc");
    const ohMyPath = join(configDir, "oh-my-openagent.json");
    writeFileSync(
      basePath,
      JSON.stringify({
        model: oldRoute,
        provider: {
          "gpt-free": { models: { "gpt-5.6-sol": {} } },
          "www.pqapi.space": { models: { "gpt-5.5": {} } },
        },
      }),
    );
    writeFileSync(
      ohMyPath,
      JSON.stringify({
        agents: { build: { model: oldRoute, variant: "xhigh" } },
        categories: { quick: { model: oldRoute, variant: "xhigh" } },
      }),
    );
    const result = runCli({ root, home, args: ["--use", String(freeProfileIndex)], processState: "active" });
    assert.equal(result.status, 0, result.stderr);
    assert.match(result.stderr, /Warning: OpenCode.*running/i);
    assert.match(result.stderr, /4242/);
    assert.equal(JSON.parse(readFileSync(basePath, "utf8")).model, profiles[freeProfileIndex].model);
    assert.equal(JSON.parse(readFileSync(ohMyPath, "utf8")).agents.build.model, profiles[freeProfileIndex].model);
  } finally {
    rmSync(root, { force: true, recursive: true });
  }
});

test("profile switching remains available when process discovery fails", () => {
  const root = mkdtempSync(join(tmpdir(), "omo-model-cli-process-check-"));
  try {
    const home = join(root, "home");
    const configDir = createAllProfilesFixture(home);
    const profileIndex = profiles.findIndex((profile) => profile.name === "Free ChatGPT");
    assert.notEqual(profileIndex, -1, "Free ChatGPT profile is missing");

    const result = runCli({ root, home, args: ["--use", String(profileIndex)], processState: "failed" });
    assert.equal(result.status, 0, result.stderr);
    assert.match(result.stderr, /Warning: Could not check for running OpenCode processes/i);
    assert.match(result.stderr, /process discovery is advisory/i);
    assert.equal(readJson(join(configDir, "opencode.jsonc")).model, profiles[profileIndex].model);
  } finally {
    rmSync(root, { force: true, recursive: true });
  }
});

test("current reports mixed routing when OpenCode defaults and OhMy disagree", () => {
  const root = mkdtempSync(join(tmpdir(), "omo-model-cli-current-"));
  try {
    const home = join(root, "home");
    const configDir = join(home, ".config", "opencode");
    mkdirSync(configDir, { recursive: true });

    const paidRoute = "www.pqapi.space/gpt-5.5";
    const freeRoute = "gpt-free/gpt-5.6-sol";
    writeFileSync(
      join(configDir, "opencode.jsonc"),
      JSON.stringify({
        model: paidRoute,
        small_model: paidRoute,
        agent: { inherited: { variant: "xhigh" } },
      }),
    );
    writeFileSync(
      join(configDir, "oh-my-openagent.json"),
      JSON.stringify({
        agents: { build: { model: freeRoute, variant: "max" } },
        categories: { quick: { model: freeRoute, variant: "max" } },
      }),
    );

    const result = runCli({ root, home, args: ["--current"] });
    assert.equal(result.status, 0, result.stderr);
    assert.match(result.stdout, /model:\s+<mixed>/);
    assert.match(result.stdout, /variant:\s+<mixed>/);
    assert.doesNotMatch(result.stdout, profileLinePattern("Free ChatGPT"));
  } finally {
    rmSync(root, { force: true, recursive: true });
  }
});

test("current reports mixed reasoning effort when model and variant agree", () => {
  const root = mkdtempSync(join(tmpdir(), "omo-model-cli-effort-"));
  try {
    const home = join(root, "home");
    const configDir = join(home, ".config", "opencode");
    mkdirSync(configDir, { recursive: true });

    const freeRoute = "gpt-free/gpt-5.6-sol";
    writeFileSync(
      join(configDir, "opencode.jsonc"),
      JSON.stringify({
        model: freeRoute,
        small_model: freeRoute,
        agent: { inherited: { variant: "max", reasoningEffort: "xhigh" } },
      }),
    );
    writeFileSync(
      join(configDir, "oh-my-openagent.json"),
      JSON.stringify({
        agents: { build: { model: freeRoute, variant: "max", reasoningEffort: "max" } },
        categories: { quick: { model: freeRoute, variant: "max", reasoningEffort: "max" } },
      }),
    );

    const result = runCli({ root, home, args: ["--current"] });
    assert.equal(result.status, 0, result.stderr);
    assert.match(result.stdout, /model:\s+gpt-free\/gpt-5\.6-sol/);
    assert.match(result.stdout, /variant:\s+max/);
    assert.match(result.stdout, /effort:\s+<mixed>/);
    assert.doesNotMatch(result.stdout, profileLinePattern("Free ChatGPT"));
  } finally {
    rmSync(root, { force: true, recursive: true });
  }
});

test("current reports mixed reasoning effort when one routing layer omits it", () => {
  const root = mkdtempSync(join(tmpdir(), "omo-model-cli-missing-effort-"));
  try {
    const home = join(root, "home");
    const configDir = join(home, ".config", "opencode");
    mkdirSync(configDir, { recursive: true });

    const freeRoute = "gpt-free/gpt-5.6-sol";
    writeFileSync(
      join(configDir, "opencode.jsonc"),
      JSON.stringify({
        model: freeRoute,
        small_model: freeRoute,
        agent: { inherited: { variant: "max", reasoningEffort: "max" } },
      }),
    );
    writeFileSync(
      join(configDir, "oh-my-openagent.json"),
      JSON.stringify({
        agents: { build: { model: freeRoute, variant: "max" } },
        categories: { quick: { model: freeRoute, variant: "max", reasoningEffort: "max" } },
      }),
    );

    const result = runCli({ root, home, args: ["--current"] });
    assert.equal(result.status, 0, result.stderr);
    assert.match(result.stdout, /effort:\s+<mixed>/);
    assert.doesNotMatch(result.stdout, profileLinePattern("Free ChatGPT"));
  } finally {
    rmSync(root, { force: true, recursive: true });
  }
});

function profileLinePattern(name) {
  const index = profiles.findIndex((profile) => profile.name === name);
  assert.notEqual(index, -1, `${name} profile is missing`);
  return new RegExp(`\\[${index}\\]\\s+${name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`);
}
