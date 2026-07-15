import { ensureRecord, isRecord, recordValues } from "./omo-model-config.js";

export function summarizeRouting(base, ohMy) {
  const agents = recordValues(ohMy.agents);
  const categories = recordValues(ohMy.categories);
  const baseAgents = recordValues(base.agent).filter(isRecord);
  const baseRoutingAgents = baseAgents.filter(hasRoutingOverride);
  const ohMyTargets = [...agents, ...categories];
  const models = unique([
    routingValue(base, "model"),
    routingValue(base, "small_model"),
    ...baseRoutingAgents.flatMap((target) => typeof target.model === "string" ? [target.model] : []),
    ...ohMyTargets.map((target) => routingValue(target, "model")),
  ]);
  const variants = unique([
    ...baseRoutingAgents.map((target) => routingValue(target, "variant")),
    ...ohMyTargets.map((target) => routingValue(target, "variant")),
  ]);
  const efforts = unique([
    ...baseRoutingAgents.map((target) => routingValue(target, "reasoningEffort")),
    ...ohMyTargets.map((target) => routingValue(target, "reasoningEffort")),
  ]);

  return {
    model: models.length === 1 ? models[0] : models.length === 0 ? "<unset>" : "<mixed>",
    variant: variants.length === 1 ? variants[0] : variants.length === 0 ? "<unset>" : "<mixed>",
    effort: efforts.length === 1 ? efforts[0] : efforts.length === 0 ? "<unset>" : "<mixed>",
    agentCount: agents.length,
    categoryCount: categories.length,
  };
}

export function applyProfileToRouting(base, ohMy, profile) {
  const { model, provider } = routeForProfile(base, profile);
  const hasProviderName = Object.hasOwn(profile, "providerName");
  const hasModelName = Object.hasOwn(profile, "modelName");
  if (hasProviderName && typeof profile.providerName !== "string") throw new Error(`Invalid provider display name for profile '${profile.name}'`);
  if (hasModelName && typeof profile.modelName !== "string") throw new Error(`Invalid model display name for profile '${profile.name}'`);

  base.model = profile.model;
  base.small_model = profile.model;
  if (hasProviderName) provider.name = profile.providerName;
  if (hasModelName) model.name = profile.modelName;
  for (const target of recordValues(base.agent)) {
    if (!isRecord(target)) continue;
    const hasModel = typeof target.model === "string";
    if (!hasRoutingOverride(target)) continue;
    if (hasModel) target.model = profile.model;
    target.variant = profile.variant;
    if (profile.reasoningEffort === null || profile.reasoningEffort === undefined) delete target.reasoningEffort;
    else target.reasoningEffort = profile.reasoningEffort;
  }

  for (const target of [...recordValues(ohMy.agents), ...recordValues(ohMy.categories)]) {
    if (!isRecord(target)) throw new Error("OhMy agents/categories must contain objects");
    target.model = profile.model;
    target.variant = profile.variant;
    if (profile.reasoningEffort === null || profile.reasoningEffort === undefined) delete target.reasoningEffort;
    else target.reasoningEffort = profile.reasoningEffort;
  }

  ensureRecord(ohMy, "background_task");
  ohMy.background_task.providerConcurrency = { [profile.providerConcurrency]: 5 };
  ohMy.background_task.modelConcurrency = { [profile.modelConcurrency]: 5 };
}

export function assertProfileApplied(base, ohMy, profile) {
  const summary = summarizeRouting(base, ohMy);
  const expectedEffort = profile.reasoningEffort ?? "<unset>";
  if (summary.model !== profile.model || summary.variant !== profile.variant || summary.effort !== expectedEffort) {
    throw new Error(`Routing verification failed for profile '${profile.name}'`);
  }
  const { model, provider } = routeForProfile(base, profile);
  if (Object.hasOwn(profile, "providerName") && provider.name !== profile.providerName) {
    throw new Error(`Provider display-name verification failed for profile '${profile.name}'`);
  }
  if (Object.hasOwn(profile, "modelName") && model.name !== profile.modelName) {
    throw new Error(`Model display-name verification failed for profile '${profile.name}'`);
  }
}

function routeForProfile(base, profile) {
  const separator = profile.model.indexOf("/");
  if (separator < 1 || separator === profile.model.length - 1) throw new Error(`Invalid model route: ${profile.model}`);
  const providerId = profile.model.slice(0, separator);
  const modelId = profile.model.slice(separator + 1);
  const provider = base.provider?.[providerId];
  if (!isRecord(provider)) throw new Error(`Target provider '${providerId}' is not configured in opencode config`);
  const model = provider.models?.[modelId];
  if (!isRecord(model)) throw new Error(`Target model '${profile.model}' is not configured in opencode config`);
  return { model, provider };
}

function hasRoutingOverride(target) {
  return typeof target.model === "string" || typeof target.variant === "string" || typeof target.reasoningEffort === "string";
}

function routingValue(target, key) {
  return typeof target?.[key] === "string" ? target[key] : "<unset>";
}

function unique(items) {
  return [...new Set(items.filter((item) => item !== undefined && item !== null))].sort();
}
