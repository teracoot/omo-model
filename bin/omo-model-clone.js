#!/usr/bin/env node
import { isAbsolute } from "node:path";
import { createClone, extractClone, inspectClone } from "./omo-model-clone-core.js";

const SPECS = {
  create: { booleans: ["--include-secrets", "--unencrypted"], positionals: 0, values: ["--home", "--output"] },
  extract: { booleans: ["--acknowledge-secrets", "--acknowledge-unencrypted"], positionals: 1, values: ["--home", "--to"] },
  inspect: { booleans: [], positionals: 1, values: [] },
};

function main(args) {
  if (args.length === 1 && ["--help", "-h"].includes(args[0])) return usage();
  const command = args[0];
  const spec = SPECS[command];
  if (spec === undefined) throw new Error("Usage error: expected create, inspect, or extract");
  const parsed = parse(args.slice(1), spec);
  if (process.platform !== "win32") throw new Error("omo-model-clone supports Windows only");
  if (command === "create") {
    requireAbsolute(parsed.values["--home"], "Source home");
    requireFlags(parsed, spec);
    return print("Created", createClone({ home: parsed.values["--home"], output: parsed.values["--output"] }));
  }
  if (command === "inspect") return print("Verified", inspectClone(parsed.positionals[0]));
  requireAbsolute(parsed.values["--home"], "Recipient home");
  requireFlags(parsed, spec);
  return print("Extracted", extractClone({ archive: parsed.positionals[0], destination: parsed.values["--to"], home: parsed.values["--home"] }));
}

function parse(args, spec) {
  const parsed = { flags: new Set(), positionals: [], values: {} };
  for (let index = 0; index < args.length; index += 1) {
    const value = args[index];
    if (!value.startsWith("--")) { parsed.positionals.push(value); continue; }
    if (spec.booleans.includes(value)) {
      if (parsed.flags.has(value)) throw new Error(`Duplicate option '${value}'`);
      parsed.flags.add(value); continue;
    }
    if (!spec.values.includes(value)) throw new Error(`Unknown option '${value}'`);
    if (Object.hasOwn(parsed.values, value)) throw new Error(`Duplicate option '${value}'`);
    const next = args[index + 1];
    if (next === undefined || next.startsWith("--")) throw new Error(`Missing value for ${value}`);
    parsed.values[value] = next; index += 1;
  }
  if (parsed.positionals.length !== spec.positionals) throw new Error("Invalid positional arguments");
  for (const option of spec.values) if (!Object.hasOwn(parsed.values, option)) throw new Error(`Missing required option '${option}'`);
  return parsed;
}

function requireFlags(parsed, spec) { for (const flag of spec.booleans) if (!parsed.flags.has(flag)) throw new Error(`Missing required acknowledgement '${flag}'`); }
function requireAbsolute(value, label) { if (!isAbsolute(value)) throw new Error(`${label} must be absolute`); }
function print(action, summary) { console.log(`SECURITY WARNING: UNENCRYPTED archive intentionally contains SECRETS.\n${action} ${summary.format} v${summary.version}; ${summary.entries} entries.`); }
function usage() { console.log("omo-model-clone create|inspect|extract: see EXACT_CLONE_MANUAL_INSTALL_GUIDE.md. Archives are intentionally UNENCRYPTED and contain SECRETS; placement is manual only."); }

const argumentsList = process.argv.slice(2);
try { main(argumentsList); }
catch {
  const command = ["create", "inspect", "extract"].includes(argumentsList[0]) ? argumentsList[0] : "command";
  console.error(`omo-model-clone ${command} failed safely`);
  process.exit(1);
}
