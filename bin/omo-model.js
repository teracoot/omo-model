#!/usr/bin/env node
import { existsSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import {
  OH_MY_CONFIG_CANDIDATES,
  OPENCODE_CONFIG_CANDIDATES,
  backupConfig,
  configDirFor,
  isRecord,
  readConfig,
  resolveConfig,
  writeConfig,
  writeConfigTransaction,
} from "./omo-model-config.js";
import { warnIfOpenCodeRunning } from "./omo-model-processes.js";
import { profiles } from "./omo-model-profiles.js";
import { applyProfileToRouting, assertProfileApplied, summarizeRouting } from "./omo-model-routing.js";

const home = process.env.HOME || homedir();
const configDir = configDirFor(home);
const backupDir = join(configDir, "profile-backups");

function usage() {
  console.log(`omo-model - switch OpenCode and OhMy model routing profiles

Usage:
  omo-model --list           Show current route and numbered profiles
  omo-model -l               Same as --list
  omo-model --current        Show merged OpenCode and OhMy routing state
  omo-model -c               Same as --current
  omo-model --routes         Show configured OpenCode provider/model routes
  omo-model --use <number>   Switch OpenCode and OhMy routing to profile number
  omo-model -u <number>      Same as --use
  omo-model --help           Show help

Examples:
  omo-model --list
  omo-model --use 0
  omo-model -u 3

Note: switching while OpenCode is running is supported. Existing processes and sessions keep their loaded routing; start a new OpenCode process to use the selected profile.`);
}

function profileIndexFor(model, variant, effort) {
  const index = profiles.findIndex(
    (profile) => profile.model === model && profile.variant === variant && (profile.reasoningEffort ?? "<unset>") === effort,
  );
  return index >= 0 ? index : null;
}

function currentSummary() {
  const base = readConfig(resolveBaseConfig());
  const cfg = readConfig(resolveOhMyConfig());
  const summary = summarizeRouting(base, cfg);

  return {
    ...summary,
    profileIndex: profileIndexFor(summary.model, summary.variant, summary.effort),
  };
}

function showCurrent() {
  const summary = currentSummary();
  console.log("Current routing state:");
  if (summary.profileIndex !== null) console.log(`  [${summary.profileIndex}] ${profiles[summary.profileIndex].name}`);
  else console.log("  [custom/mixed]");
  console.log(`  model:   ${summary.model}`);
  console.log(`  variant: ${summary.variant}`);
  console.log(`  effort:  ${summary.effort}`);
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

function showRoutes() {
  const base = readConfig(resolveBaseConfig());
  const routes = [];
  if (isRecord(base.provider)) {
    for (const [providerId, provider] of Object.entries(base.provider)) {
      if (!isRecord(provider) || !isRecord(provider.models)) continue;
      for (const modelId of Object.keys(provider.models)) routes.push(`${providerId}/${modelId}`);
    }
  }
  routes.sort();
  for (const route of routes) console.log(route);
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
  warnIfOpenCodeRunning();

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

  applyProfileToRouting(base, cfg, profile);
  assertProfileApplied(base, cfg, profile);
  const baseBackupPath = backupConfig(baseConfigPath, backupDir, "opencode");
  const ohMyBackupPath = backupConfig(configPath, backupDir, "oh-my-openagent");
  writeConfigTransaction([
    { file: baseConfigPath, value: base },
    { file: configPath, value: cfg },
  ]);

  console.log(`Switched OpenCode and OhMy routing to [${index}] ${profile.name}`);
  console.log(`  model:   ${profile.model}`);
  console.log(`  variant: ${profile.variant}`);
  console.log(`OpenCode backup: ${baseBackupPath}`);
  console.log(`OhMy backup: ${ohMyBackupPath}`);
  console.log("Existing OpenCode processes and sessions keep their loaded routing. Start a new OpenCode process to use this profile.");
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
  else if (args[0] === "--routes") showRoutes();
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
