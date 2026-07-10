#!/usr/bin/env node
import { homedir } from "node:os";
import { createPack, extractPack, inspectPack } from "./omo-model-pack-core.js";

function usage() {
  console.log(`omo-model-pack - create a redacted OpenCode and omo-model configuration archive

Usage:
  omo-model-pack create --output <new-pack.zip>
  omo-model-pack inspect <pack.zip>
  omo-model-pack extract <pack.zip> --to <new-directory>
  omo-model-pack --help

The archive is redacted by design: it never includes API keys, tokens,
authorization values, cookies, secrets, passwords, credentials, or URLs.`);
}

function printSummary(label, summary) {
  console.log(`${label}: ${summary.entries.length} redacted artifact(s), format v${summary.version}`);
  for (const entry of summary.entries) console.log(`  ${entry.role}: ${entry.targetRoot}/${entry.targetPath}`);
}

function requireValue(args, option) {
  const index = args.indexOf(option);
  if (index < 0 || index + 1 >= args.length) throw new Error(`Missing value for ${option}`);
  return args[index + 1];
}

function main(args) {
  if (args.length === 0 || args.includes("--help") || args.includes("-h")) {
    usage();
    return;
  }
  if (args[0] === "create") {
    if (args.length !== 3 || args[1] !== "--output") throw new Error("Usage: omo-model-pack create --output <new-pack.zip>");
    printSummary("Created sanitized config pack", createPack({ home: process.env.HOME || homedir(), output: requireValue(args, "--output") }));
    return;
  }
  if (args[0] === "inspect") {
    if (args.length !== 2) throw new Error("Usage: omo-model-pack inspect <pack.zip>");
    printSummary("Verified config pack", inspectPack(args[1]));
    return;
  }
  if (args[0] === "extract") {
    if (args.length !== 4 || args[2] !== "--to") throw new Error("Usage: omo-model-pack extract <pack.zip> --to <new-directory>");
    printSummary("Extracted sanitized config pack", extractPack({ archive: args[1], destination: requireValue(args, "--to"), home: process.env.HOME || homedir() }));
    return;
  }
  throw new Error(`Unknown command '${args[0]}'. Run 'omo-model-pack --help'.`);
}

try {
  main(process.argv.slice(2));
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}
