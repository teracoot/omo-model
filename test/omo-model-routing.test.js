import assert from "node:assert/strict";
import test from "node:test";
import { applyProfileToRouting } from "../bin/omo-model-routing.js";

test("profile routing rejects null provider display metadata before mutation", () => {
  const base = routingBase();
  const ohMy = routingOhMy();
  const profile = routingProfile({ providerName: null });

  assert.throws(() => applyProfileToRouting(base, ohMy, profile), /Invalid provider display name/u);
  assert.equal(base.model, "demo/original");
  assert.equal(base.provider.demo.name, "Demo");
});

test("profile routing preserves the provider display name when metadata is omitted", () => {
  const base = routingBase();
  const ohMy = routingOhMy();
  const profile = routingProfile({});

  applyProfileToRouting(base, ohMy, profile);
  assert.equal(base.provider.demo.name, "Demo");
  assert.equal(base.model, "demo/target");
});

function routingBase() {
  return {
    model: "demo/original",
    small_model: "demo/original",
    provider: { demo: { name: "Demo", models: { target: { name: "Target" } } } },
    agent: { build: { model: "demo/original", variant: "high", reasoningEffort: "high" } },
  };
}

function routingOhMy() {
  return {
    agents: { build: { model: "demo/original", variant: "high", reasoningEffort: "high" } },
    categories: { quick: { model: "demo/original", variant: "high", reasoningEffort: "high" } },
    background_task: {},
  };
}

function routingProfile(metadata) {
  return {
    name: "Target",
    model: "demo/target",
    modelName: "Target",
    variant: "max",
    reasoningEffort: "max",
    providerConcurrency: "demo",
    modelConcurrency: "demo/target",
    ...metadata,
  };
}
