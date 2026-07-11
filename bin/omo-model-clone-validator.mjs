#!/usr/bin/env node
import { readFileSync } from "node:fs";
import { join } from "node:path";

function stripJsonc(text) {
  let output = "";
  let string = false;
  let escaped = false;
  let line = false;
  let block = false;
  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const next = text[index + 1];
    if (line) { if (char === "\n") { line = false; output += char; } continue; }
    if (block) { if (char === "*" && next === "/") { block = false; index += 1; } continue; }
    if (string) {
      output += char;
      if (escaped) escaped = false;
      else if (char === "\\") escaped = true;
      else if (char === "\"") string = false;
      continue;
    }
    if (char === "\"") { string = true; output += char; continue; }
    if (char === "/" && next === "/") { line = true; index += 1; continue; }
    if (char === "/" && next === "*") { block = true; index += 1; continue; }
    if (char === "," && trailing(text, index)) continue;
    output += char;
  }
  return output;
}

function trailing(text, index) {
  for (let cursor = index + 1; cursor < text.length; cursor += 1) {
    if (/\s/.test(text[cursor])) continue;
    return text[cursor] === "}" || text[cursor] === "]";
  }
  return false;
}

function parse(buffer) {
  return JSON.parse(stripJsonc(Buffer.from(buffer).toString("utf8").replace(/^\uFEFF+/, "")));
}

function record(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value) ? value : {};
}

function nullable(value) {
  return typeof value === "string" ? value : null;
}

function derive(openCodeBuffer, ohMyBuffer) {
  const openCode = record(parse(openCodeBuffer));
  const ohMy = record(parse(ohMyBuffer));
  const routes = [];
  for (const [provider, value] of Object.entries(record(openCode.provider))) {
    for (const model of Object.keys(record(record(value).models))) routes.push(`${provider}/${model}`);
  }
  const agents = Object.keys(record(ohMy.agents));
  const categories = Object.keys(record(ohMy.categories));
  const first = record(record(ohMy.agents)[agents[0]]);
  return {
    agentCount: agents.length,
    agentNames: agents.sort(),
    categoryCount: categories.length,
    categoryNames: categories.sort(),
    current: typeof first.model === "string" ? { model: first.model, profile: nullable(ohMy.profile), variant: nullable(first.variant) } : null,
    expectedRoutes: routes.sort(),
    idaMcpMachinePathWarning: JSON.stringify(record(openCode.mcp)).toLowerCase().includes("ida"),
  };
}

function validateMetadata(value) {
  const keys = ["agentCount", "agentNames", "categoryCount", "categoryNames", "current", "expectedRoutes", "idaMcpMachinePathWarning"];
  if (!record(value) || JSON.stringify(Object.keys(value).sort()) !== JSON.stringify(keys.sort())) return false;
  if (!Number.isSafeInteger(value.agentCount) || value.agentCount < 0 || value.agentCount !== value.agentNames?.length) return false;
  if (!Number.isSafeInteger(value.categoryCount) || value.categoryCount < 0 || value.categoryCount !== value.categoryNames?.length) return false;
  if (typeof value.idaMcpMachinePathWarning !== "boolean") return false;
  return value.current === null || (record(value.current) && Object.keys(value.current).sort().join() === "model,profile,variant" && typeof value.current.model === "string");
}

try {
  const root = process.argv[2];
  if (typeof root !== "string") throw new Error("invalid");
  const manifest = JSON.parse(readFileSync(join(root, "manifest.json"), "utf8"));
  if (!validateMetadata(manifest.metadata) || !Array.isArray(manifest.entries)) throw new Error("invalid");
  const roles = new Map(manifest.entries.map((entry) => [entry.role, entry]));
  const openCode = roles.get("opencode-base");
  const ohMy = roles.get("oh-my-config");
  if (openCode === undefined || ohMy === undefined) throw new Error("invalid");
  const actual = derive(readFileSync(join(root, ...openCode.archivePath.split("/").slice(1))), readFileSync(join(root, ...ohMy.archivePath.split("/").slice(1))));
  if (JSON.stringify(actual) !== JSON.stringify(manifest.metadata)) throw new Error("invalid");
} catch {
  console.error("Clone validation failed");
  process.exit(1);
}
