import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { basename, join, resolve, sep } from "node:path";

export const OH_MY_CONFIG_CANDIDATES = [
  "oh-my-openagent.jsonc",
  "oh-my-openagent.json",
  "oh-my-opencode.jsonc",
  "oh-my-opencode.json",
];

export const OPENCODE_CONFIG_CANDIDATES = ["opencode.jsonc", "opencode.json"];

export function configDirFor(home) {
  return join(home, ".config", "opencode");
}

export function resolveConfig(configDir, candidates, label) {
  for (const candidate of candidates) {
    const file = join(configDir, candidate);
    if (existsSync(file)) return file;
  }

  throw new Error(`Missing ${label}. Checked: ${candidates.join(", ")}`);
}

export function readConfig(file) {
  return parseJsoncBuffer(readFileSync(file));
}

export function parseJsoncBuffer(buffer) {
  return JSON.parse(stripJsonc(Buffer.from(buffer).toString("utf8").replace(/^\uFEFF+/, "")));
}

export function writeConfig(file, value) {
  writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

export function backupConfig(file, backupDir, label) {
  mkdirSync(backupDir, { recursive: true });
  const safeLabel = sanitizeLabel(label);
  const ext = basename(file).endsWith(".jsonc") ? "jsonc" : "json";
  const root = resolve(backupDir);
  const target = resolve(root, `${safeLabel}.${timestamp()}.bak.${ext}`);
  if (target !== root && !target.startsWith(`${root}${sep}`)) throw new Error(`Backup path escaped backup directory: ${target}`);
  copyFileSync(file, target);
  return target;
}

export function isRecord(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

export function recordValues(value) {
  return isRecord(value) ? Object.values(value) : [];
}

export function ensureRecord(obj, key) {
  if (!isRecord(obj[key])) obj[key] = {};
  return obj[key];
}

function stripJsonc(text) {
  let output = "";
  let inString = false;
  let escaped = false;
  let inLineComment = false;
  let inBlockComment = false;

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    const next = text[i + 1];

    if (inLineComment) {
      if (char === "\n") {
        inLineComment = false;
        output += char;
      }
      continue;
    }

    if (inBlockComment) {
      if (char === "*" && next === "/") {
        inBlockComment = false;
        i += 1;
      }
      continue;
    }

    if (inString) {
      output += char;
      if (escaped) escaped = false;
      else if (char === "\\") escaped = true;
      else if (char === "\"") inString = false;
      continue;
    }

    if (char === "\"") {
      inString = true;
      output += char;
      continue;
    }

    if (char === "/" && next === "/") {
      inLineComment = true;
      i += 1;
      continue;
    }

    if (char === "/" && next === "*") {
      inBlockComment = true;
      i += 1;
      continue;
    }

    if (char === "," && isTrailingComma(text, i)) continue;

    output += char;
  }

  return output;
}

function isTrailingComma(text, index) {
  for (let i = index + 1; i < text.length; i += 1) {
    if (/\s/.test(text[i])) continue;
    return text[i] === "}" || text[i] === "]";
  }

  return false;
}

function sanitizeLabel(label) {
  if (!/^[A-Za-z0-9_.-]+$/.test(label)) throw new Error(`Unsafe backup label: ${label}`);
  return label;
}

function timestamp() {
  const d = new Date();
  const pad = (n, width = 2) => String(n).padStart(width, "0");
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}-${pad(d.getMilliseconds(), 3)}`;
}
