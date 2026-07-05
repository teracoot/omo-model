#!/usr/bin/env node
import { existsSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import {
  OH_MY_CONFIG_CANDIDATES,
  OPENCODE_CONFIG_CANDIDATES,
  backupConfig,
  configDirFor,
  ensureRecord,
  isRecord,
  readConfig,
  recordValues,
  resolveConfig,
  writeConfig,
} from "./omo-model-config.js";
import { profiles } from "./omo-model-profiles.js";

const home = process.env.HOME || homedir();
const configDir = configDirFor(home);
const backupDir = join(configDir, "profile-backups");

function usage() {
  console.log(`omo-model - switch OhMyOpenAgent model routing profiles

Usage:
  omo-model --list           Show current route and numbered profiles
  omo-model -l               Same as --list
  omo-model --current        Show current route only
  omo-model -c               Same as --current
  omo-model --use <number>   Switch all OhMy agents/categories to profile number
  omo-model -u <number>      Same as --use
  omo-model --help           Show help

Examples:
  omo-model --list
  omo-model --use 0
  omo-model -u 3

Note: start a new OpenCode session after switching so OhMy reloads the config.`);
}

function profileIndexFor(model, variant) {
  const index = profiles.findIndex((profile) => profile.model === model && profile.variant === variant);
  return index >= 0 ? index : null;
}

function unique(items) {
  return [...new Set(items.filter((item) => item !== undefined && item !== null))].sort();
}

function currentSummary() {
  const cfg = readConfig(resolveOhMyConfig());
  const agents = recordValues(cfg.agents);
  const categories = recordValues(cfg.categories);
  const agentModels = unique(agents.map((item) => item.model));
  const agentVariants = unique(agents.map((item) => item.variant));
  const categoryModels = unique(categories.map((item) => item.model));
  const categoryVariants = unique(categories.map((item) => item.variant));
  const allModels = unique([...agentModels, ...categoryModels]);
  const allVariants = unique([...agentVariants, ...categoryVariants]);
  const model = allModels.length === 1 ? allModels[0] : allModels.length === 0 ? "<unset>" : "<mixed>";
  const variant = allVariants.length === 1 ? allVariants[0] : allVariants.length === 0 ? "<unset>" : "<mixed>";

  return {
    model,
    variant,
    profileIndex: profileIndexFor(model, variant),
    agentCount: agents.length,
    categoryCount: categories.length,
  };
}

function showCurrent() {
  const summary = currentSummary();
  console.log("Current OhMy route:");
  if (summary.profileIndex !== null) console.log(`  [${summary.profileIndex}] ${profiles[summary.profileIndex].name}`);
  else console.log("  [custom/mixed]");
  console.log(`  model:   ${summary.model}`);
  console.log(`  variant: ${summary.variant}`);
  console.log(`  agents:  ${summary.agentCount}`);
  console.log(`  categories: ${summary.categoryCount}`);
}

function showList() {
  showCurrent();
  const summary = currentSummary();
  console.log("\nAvailable profiles:");
  profiles.forEach((profile, index) => {
    const marker = summary.profileIndex === index ? "  (current)" : "";
    console.log(`  [${index}] ${profile.name}${marker}`);
    console.log(`      model:   ${profile.model}`);
    console.log(`      variant: ${profile.variant}`);
  });
}

function cleanBasePlugins(base, removeAllOmo) {
  if (!Array.isArray(base.plugin)) return false;
  const hasOpenAgent = base.plugin.includes("oh-my-openagent");
  let keptOmo = false;
  const next = [];

  for (const item of base.plugin) {
    if (!isOmoPlugin(item)) {
      next.push(item);
      continue;
    }

    if (removeAllOmo || keptOmo) continue;
    if (hasOpenAgent && item !== "oh-my-openagent") continue;
    next.push(item);
    keptOmo = true;
  }

  const changed = base.plugin.length !== next.length || base.plugin.some((item, index) => item !== next[index]);
  base.plugin = next;
  return changed;
}

function splitProviderModel(model) {
  const idx = model.indexOf("/");
  if (idx < 0) throw new Error(`Invalid model route: ${model}`);
  return [model.slice(0, idx), model.slice(idx + 1)];
}

function switchProfile(index) {
  if (!Number.isInteger(index) || index < 0 || index >= profiles.length) {
    throw new Error(`Invalid profile number: ${index}. Run 'omo-model --list' to see valid numbers.`);
  }

  const profile = profiles[index];

  if (profile.disableOhMyPlugin) {
    const { path: baseConfigPath, removeAllOmo } = resolveBaseCleanupConfig();
    const base = readConfig(baseConfigPath);
    const baseCleanupChanged = cleanBasePlugins(base, removeAllOmo);
    const backupPath = baseCleanupChanged ? backupConfig(baseConfigPath, backupDir, "opencode.disable-ohmy-plugin") : null;
    if (baseCleanupChanged) writeConfig(baseConfigPath, base);
    console.log(`Applied profile [${index}] ${profile.name}`);
    console.log(baseCleanupChanged ? "  cleaned duplicate OMO plugin entries from opencode config" : "  no duplicate OMO plugin entries found in opencode config");
    if (backupPath !== null) console.log(`Backup: ${backupPath}`);
    console.log("Start a new OpenCode session so OpenCode reloads plugins.");
    return;
  }

  const baseConfigPath = resolveBaseConfig();
  const base = readConfig(baseConfigPath);
  const configPath = resolveOhMyConfig();
  const cfg = readConfig(configPath);
  const [providerId, modelId] = splitProviderModel(profile.model);
  if (!isRecord(base.provider?.[providerId])) throw new Error(`Target provider '${providerId}' is not configured in opencode config`);
  if (!isRecord(base.provider[providerId].models?.[modelId])) throw new Error(`Target model '${profile.model}' is not configured in opencode config`);
  if (!isRecord(cfg.agents)) throw new Error(`OhMy config has no 'agents' object: ${configPath}`);
  if (!isRecord(cfg.categories)) throw new Error(`OhMy config has no 'categories' object: ${configPath}`);

  ensureRecord(cfg, "background_task");
  const backupPath = backupConfig(configPath, backupDir, "oh-my-openagent");

  for (const target of [...Object.values(cfg.agents), ...Object.values(cfg.categories)]) {
    if (!isRecord(target)) throw new Error("OhMy agents/categories must contain objects");
    target.model = profile.model;
    target.variant = profile.variant;
    if (profile.reasoningEffort === null || profile.reasoningEffort === undefined) delete target.reasoningEffort;
    else target.reasoningEffort = profile.reasoningEffort;
  }

  cfg.background_task.providerConcurrency = { [profile.providerConcurrency]: 5 };
  cfg.background_task.modelConcurrency = { [profile.modelConcurrency]: 5 };

  writeConfig(configPath, cfg);

  const verify = readConfig(configPath);
  for (const [name, target] of Object.entries(verify.agents || {})) {
    if (target.model !== profile.model || target.variant !== profile.variant) throw new Error(`Verification failed for agent '${name}'`);
  }
  for (const [name, target] of Object.entries(verify.categories || {})) {
    if (target.model !== profile.model || target.variant !== profile.variant) throw new Error(`Verification failed for category '${name}'`);
  }

  console.log(`Switched OhMy route to [${index}] ${profile.name}`);
  console.log(`  model:   ${profile.model}`);
  console.log(`  variant: ${profile.variant}`);
  console.log(`Backup: ${backupPath}`);
  console.log("Start a new OpenCode session so OhMy reloads this config.");
}

function resolveOhMyConfig() {
  return resolveConfig(configDir, OH_MY_CONFIG_CANDIDATES, "OhMy config");
}

function resolveBaseConfig() {
  return resolveConfig(configDir, OPENCODE_CONFIG_CANDIDATES, "OpenCode config");
}

function resolveBaseCleanupConfig() {
  const jsonConfig = join(configDir, "opencode.json");
  const jsoncConfig = join(configDir, "opencode.jsonc");
  if (existsSync(jsonConfig) && existsSync(jsoncConfig) && hasOmoPlugin(readConfig(jsoncConfig))) {
    return { path: jsonConfig, removeAllOmo: true };
  }
  return { path: resolveBaseConfig(), removeAllOmo: false };
}

function hasOmoPlugin(config) {
  return Array.isArray(config.plugin) && config.plugin.some(isOmoPlugin);
}

function isOmoPlugin(value) {
  return value === "oh-my-opencode" || value === "oh-my-openagent";
}

function parseProfileArg(value) {
  if (!/^(0|[1-9]\d*)$/.test(value)) throw new Error(`Profile number must be an integer: ${value}`);
  return Number.parseInt(value, 10);
}

function main(args) {
  if (args.length === 0 || ["--help", "-h"].includes(args[0])) usage();
  else if (["--list", "-l"].includes(args[0])) showList();
  else if (["--current", "-c"].includes(args[0])) showCurrent();
  else if (["--use", "-u"].includes(args[0])) {
    if (args.length < 2) throw new Error("Missing profile number after --use/-u");
    switchProfile(parseProfileArg(args[1]));
  } else throw new Error(`Unknown argument: ${args[0]}. Run 'omo-model --help'.`);
}

try {
  main(process.argv.slice(2));
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}
