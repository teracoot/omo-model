import assert from "node:assert/strict";
import { mkdtempSync, readdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { profiles } from "../bin/omo-model-profiles.js";
import { createAllProfilesFixture, readJson, runCli } from "./omo-model-cli-fixture.js";

const expectedPqapiProfiles = new Map([
  ["www.pqapi.space/gpt-5.6-terra", "GPT-5.6 Terra Max (PQAPI)"],
  ["www.pqapi.space/gpt-5.6-sol", "GPT-5.6 Sol Max (PQAPI)"],
  ["www.pqapi.space/gpt-5.5", "GPT-5.5 XHigh (PQAPI)"],
]);

test("profiles never encode null provider display names", () => {
  for (const profile of profiles) {
    if (Object.hasOwn(profile, "providerName")) assert.equal(typeof profile.providerName, "string", profile.name);
  }
});

test("PQAPI profiles use model-first labels and a neutral provider display name", () => {
  for (const profile of profiles.filter(({ model }) => model.startsWith("www.pqapi.space/"))) {
    assert.equal(profile.name, expectedPqapiProfiles.get(profile.model));
    assert.equal(profile.providerName, "PQAPI");
    assert.equal(profile.modelName, expectedPqapiProfiles.get(profile.model));
  }
});

test("PQAPI(sub2api) profiles mirror every PQAPI model on distinct routes", () => {
  const sourceProfiles = profiles.filter(({ model }) => model.startsWith("www.pqapi.space/"));
  const mirrorProfiles = profiles.filter(({ model }) => model.startsWith("pqapi:sub2api/"));
  assert.equal(mirrorProfiles.length, sourceProfiles.length);

  for (const source of sourceProfiles) {
    const modelId = source.model.slice(source.model.indexOf("/") + 1);
    const mirror = mirrorProfiles.find(({ model }) => model === `pqapi:sub2api/${modelId}`);
    assert.ok(mirror, `Missing PQAPI(sub2api) profile for ${modelId}`);
    assert.equal(mirror.name, source.name.replace(/\(PQAPI\)$/u, "(PQAPI(sub2api))"));
    assert.equal(mirror.providerName, "PQAPI(sub2api)");
    assert.equal(mirror.modelName, source.modelName);
    assert.equal(mirror.variant, source.variant);
    assert.equal(mirror.reasoningEffort, source.reasoningEffort);
    assert.equal(mirror.providerConcurrency, "pqapi:sub2api");
    assert.equal(mirror.modelConcurrency, mirror.model);
  }
});

for (const [index, profile] of profiles.entries()) {
  test(`profile ${index} ${profile.model} hot-swaps every routing layer while OpenCode is running`, () => {
    const root = mkdtempSync(join(tmpdir(), `omo-model-profile-${index}-`));
    try {
      const home = join(root, "home");
      const configDir = createAllProfilesFixture(home);
      const result = runCli({ root, home, args: ["--use", String(index)], processState: "active" });
      assert.equal(result.status, 0, result.stderr);
      assert.match(result.stderr, /Warning: OpenCode is running.*4242/is);
      assert.match(result.stderr, /existing processes.*loaded routing/is);

      const base = readJson(join(configDir, "opencode.jsonc"));
      const ohMy = readJson(join(configDir, "oh-my-openagent.json"));
      const separator = profile.model.indexOf("/");
      const providerId = profile.model.slice(0, separator);
      const modelId = profile.model.slice(separator + 1);
      assert.equal(base.model, profile.model);
      assert.equal(base.small_model, profile.model);
      const expectedProviderName = Object.hasOwn(profile, "providerName") ? profile.providerName : `stale-${providerId}`;
      assert.equal(base.provider[providerId].name, expectedProviderName);
      assert.equal(base.provider[providerId].models[modelId].name, profile.modelName);
      assert.equal(base.agent.build.model, profile.model);
      assert.equal(base.agent.build.variant, profile.variant);
      assert.equal(base.agent.build.reasoningEffort, profile.reasoningEffort ?? undefined);
      assert.equal(base.agent.inherited.model, undefined);
      assert.equal(base.agent.inherited.variant, profile.variant);
      assert.equal(base.agent.inherited.reasoningEffort, profile.reasoningEffort ?? undefined);
      assert.equal(base.agent.metadataOnly.model, undefined);
      for (const target of [...Object.values(ohMy.agents), ...Object.values(ohMy.categories)]) {
        assert.equal(target.model, profile.model);
        assert.equal(target.variant, profile.variant);
        assert.equal(target.reasoningEffort, profile.reasoningEffort ?? undefined);
      }
      assert.deepEqual(ohMy.background_task.providerConcurrency, { [profile.providerConcurrency]: 5 });
      assert.deepEqual(ohMy.background_task.modelConcurrency, { [profile.modelConcurrency]: 5 });

      const current = runCli({ root, home, args: ["--current"] });
      assert.equal(current.status, 0, current.stderr);
      assert.match(current.stdout, new RegExp(`\\[${index}\\] ${escapeRegex(profile.name)}`));
      assert.match(current.stdout, new RegExp(`model:\\s+${escapeRegex(profile.model)}`));
      assert.match(current.stdout, new RegExp(`variant:\\s+${escapeRegex(profile.variant)}`));
      assert.match(current.stdout, new RegExp(`effort:\\s+${escapeRegex(profile.reasoningEffort ?? "<unset>")}`));

      const backups = readdirSync(join(configDir, "profile-backups"));
      assert.equal(backups.some((name) => name.startsWith("opencode.")), true);
      assert.equal(backups.some((name) => name.startsWith("oh-my-openagent.")), true);
    } finally {
      rmSync(root, { force: true, recursive: true });
    }
  });
}

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
