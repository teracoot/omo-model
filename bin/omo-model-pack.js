#!/usr/bin/env node
import { homedir } from "node:os";
import { resolve } from "node:path";
import { createPack, extractPack, inspectPack } from "./omo-model-pack-core.js";

function usage() {
  console.log(`omo-model-pack - create a redacted OpenCode and omo-model configuration archive

Usage:
  omo-model-pack create --output <new-pack.zip> [--home <source-home>]
  omo-model-pack inspect <pack.zip>
  omo-model-pack extract <pack.zip> --to <new-directory> [--home <recipient-home>]
  omo-model-pack --help

The archive is redacted by design: it never includes API keys, tokens,
authorization values, cookies, secrets, passwords, credentials, or URLs.`);
}

function printSummary(label, summary) {
  console.log(`${label}: ${summary.entries.length} redacted artifact(s), format v${summary.version}`);
  for (const entry of summary.entries) console.log(`  ${entry.role}: ${entry.targetRoot}/${entry.targetPath}`);
}

function parseArguments(args, allowedOptions) {
  const options = {};
  const positionals = [];
  for (let index = 0; index < args.length; index += 1) {
    const argument = args[index];
    if (!argument.startsWith("--")) {
      positionals.push(argument);
      continue;
    }
    if (!allowedOptions.includes(argument)) throw new Error(`Unknown option '${argument}'`);
    if (Object.hasOwn(options, argument)) throw new Error(`Duplicate option '${argument}'`);
    if (index + 1 >= args.length || args[index + 1].startsWith("--")) throw new Error(`Missing value for ${argument}`);
    options[argument] = args[index + 1];
    index += 1;
  }
  return { options, positionals };
}

function selectedHome(options) {
  return resolve(options["--home"] ?? process.env.HOME ?? homedir());
}

function main(args) {
  if (args.length === 0 || args.includes("--help") || args.includes("-h")) {
    usage();
    return;
  }
  if (args[0] === "create") {
    const { options, positionals } = parseArguments(args.slice(1), ["--output", "--home"]);
    if (positionals.length !== 0 || options["--output"] === undefined) throw new Error("Usage: omo-model-pack create --output <new-pack.zip> [--home <source-home>]");
    const home = selectedHome(options);
    console.log(`Source home: ${home}`);
    printSummary("Created sanitized config pack", createPack({ home, output: options["--output"] }));
    return;
  }
  if (args[0] === "inspect") {
    const { options, positionals } = parseArguments(args.slice(1), []);
    if (Object.keys(options).length !== 0 || positionals.length !== 1) throw new Error("Usage: omo-model-pack inspect <pack.zip>");
    printSummary("Verified config pack", inspectPack(positionals[0]));
    return;
  }
  if (args[0] === "extract") {
    const { options, positionals } = parseArguments(args.slice(1), ["--to", "--home"]);
    if (positionals.length !== 1 || options["--to"] === undefined) throw new Error("Usage: omo-model-pack extract <pack.zip> --to <new-directory> [--home <recipient-home>]");
    printSummary("Extracted sanitized config pack", extractPack({ archive: positionals[0], destination: options["--to"], home: selectedHome(options) }));
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
