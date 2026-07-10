import { createHash, randomUUID } from "node:crypto";
import { existsSync, lstatSync, mkdirSync, readFileSync, realpathSync, renameSync, rmSync, statSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { basename, dirname, isAbsolute, join, relative, resolve, sep } from "node:path";
import { configDirFor } from "./omo-model-config.js";
import { collectPackFiles, isApprovedArtifact } from "./omo-model-pack-files.js";
import { createZip, readZip } from "./omo-model-pack-zip.js";

const ARCHIVE_ROOT = "omo-model-config-pack";
const FORMAT = "omo-model-config-pack";
const VERSION = 1;
const MAX_ARCHIVE_BYTES = 12 * 1024 * 1024;

export function createPack({ home, output }) {
  const outputPath = resolveOutput(output, home);
  const files = collectPackFiles(home);
  const entries = files.map((file) => ({ data: file.data, path: file.archivePath }));
  const manifest = buildManifest(files);
  entries.push({ data: Buffer.from(`${JSON.stringify(manifest, null, 2)}\n`, "utf8"), path: `${ARCHIVE_ROOT}/manifest.json` });
  writeArchive(outputPath, createZip(entries));
  return summarize(manifest);
}

export function inspectPack(archive) {
  const entries = readZip(readArchive(archive));
  const index = new Map(entries.map((entry) => [entry.path, entry]));
  const manifestEntry = index.get(`${ARCHIVE_ROOT}/manifest.json`);
  if (manifestEntry === undefined) throw new Error("Archive manifest is missing");
  let manifest;
  try {
    manifest = JSON.parse(manifestEntry.data.toString("utf8"));
  } catch {
    throw new Error("Archive manifest is invalid JSON");
  }
  validateManifest(manifest, index);
  return summarize(manifest);
}

export function extractPack({ archive, destination, home = homedir() }) {
  const entries = readZip(readArchive(archive));
  const index = new Map(entries.map((entry) => [entry.path, entry]));
  const manifestEntry = index.get(`${ARCHIVE_ROOT}/manifest.json`);
  if (manifestEntry === undefined) throw new Error("Archive manifest is missing");
  const manifest = parseManifest(manifestEntry);
  validateManifest(manifest, index);
  const target = resolveCanonicalDestination(destination);
  if (existsSync(target)) throw new Error("Extraction destination already exists");
  if (isAtOrInside(canonicalPath(configDirFor(home)), target)) throw new Error("Extraction destination cannot be inside the OpenCode config directory");
  if (isAtOrInside(canonicalPath(join(home, ".local", "bin")), target)) throw new Error("Extraction destination cannot be inside the local launcher directory");
  const temporary = join(dirname(target), `.${basename(target)}.${randomUUID()}.tmp`);
  mkdirSync(temporary);
  try {
    writeFileSync(join(temporary, "manifest.json"), manifestEntry.data);
    for (const descriptor of manifest.entries) {
      const entry = index.get(descriptor.archivePath);
      const relativePath = descriptor.archivePath.slice(`${ARCHIVE_ROOT}/`.length);
      const output = safeExtractPath(temporary, relativePath);
      mkdirSync(dirname(output), { recursive: true });
      writeFileSync(output, entry.data);
    }
    renameSync(temporary, target);
  } catch (error) {
    rmSync(temporary, { force: true, recursive: true });
    throw error;
  }
  return summarize(manifest);
}

function buildManifest(files) {
  return {
    createdAt: new Date().toISOString(),
    entries: files.map((file) => ({
      archivePath: file.archivePath,
      bytes: file.data.length,
      redacted: true,
      role: file.role,
      sha256: hash(file.data),
      targetPath: file.targetPath,
      targetRoot: file.targetRoot,
    })),
    format: FORMAT,
    redaction: { policy: "credential-and-url-redaction-v1", secretsIncluded: false },
    sourcePlatform: process.platform,
    version: VERSION,
  };
}

function validateManifest(manifest, index) {
  if (!isRecord(manifest) || manifest.format !== FORMAT || manifest.version !== VERSION || !Array.isArray(manifest.entries)) {
    throw new Error("Archive manifest has an unsupported format");
  }
  const expected = new Set([`${ARCHIVE_ROOT}/manifest.json`]);
  const roles = new Set();
  for (const descriptor of manifest.entries) {
    if (!isDescriptor(descriptor) || !isApprovedArtifact(descriptor)) throw new Error("Archive manifest contains an unapproved entry");
    if (expected.has(descriptor.archivePath)) throw new Error("Archive manifest contains duplicate entries");
    if (roles.has(descriptor.role)) throw new Error("Archive manifest contains duplicate artifact roles");
    expected.add(descriptor.archivePath);
    roles.add(descriptor.role);
    const entry = index.get(descriptor.archivePath);
    if (entry === undefined || entry.data.length !== descriptor.bytes || hash(entry.data) !== descriptor.sha256) {
      throw new Error(`Archive checksum mismatch for '${descriptor.targetPath}'`);
    }
  }
  if (expected.size !== index.size || [...index.keys()].some((path) => !expected.has(path))) throw new Error("Archive contains unmanifested entries");
  if (!manifest.entries.some((entry) => entry.role === "opencode-base") || !manifest.entries.some((entry) => entry.role === "oh-my-config")) {
    throw new Error("Archive manifest is missing required configuration artifacts");
  }
}

function isDescriptor(value) {
  if (!isRecord(value) || value.redacted !== true) return false;
  if (typeof value.archivePath !== "string" || typeof value.targetPath !== "string" || typeof value.role !== "string") return false;
  if (value.targetRoot !== "opencode-config") return false;
  if (!value.archivePath.startsWith(`${ARCHIVE_ROOT}/`) || value.targetPath.includes("/") || value.targetPath.includes("\\")) return false;
  return typeof value.bytes === "number" && Number.isSafeInteger(value.bytes) && value.bytes >= 0 && /^[a-f0-9]{64}$/.test(value.sha256);
}

function parseManifest(entry) {
  try {
    return JSON.parse(entry.data.toString("utf8"));
  } catch {
    throw new Error("Archive manifest is invalid JSON");
  }
}

function resolveOutput(output, home) {
  if (typeof output !== "string" || !output.endsWith(".zip")) throw new Error("Output must be a new .zip file");
  const target = canonicalPath(output);
  if (existsSync(target)) throw new Error("Output archive already exists");
  if (isAtOrInside(canonicalPath(configDirFor(home)), target)) throw new Error("Output archive cannot be placed inside the OpenCode config directory");
  return target;
}

function readArchive(archive) {
  const info = lstatSync(archive);
  if (info.isSymbolicLink() || !info.isFile()) throw new Error("Archive must be a regular file");
  if (info.size > MAX_ARCHIVE_BYTES) throw new Error("Archive exceeds the size limit");
  return readFileSync(archive);
}

function resolveCanonicalDestination(destination) {
  const lexical = resolve(destination);
  const parent = dirname(lexical);
  if (!existsSync(parent)) throw new Error("Extraction destination parent directory must already exist");
  const info = statSync(parent);
  if (!info.isDirectory()) throw new Error("Extraction destination parent must be a directory");
  return canonicalPath(lexical);
}

function canonicalPath(path) {
  const lexical = resolve(path);
  const suffix = [];
  let existing = lexical;
  while (!existsSync(existing)) {
    const parent = dirname(existing);
    if (parent === existing) throw new Error(`Cannot resolve path '${lexical}'`);
    suffix.unshift(basename(existing));
    existing = parent;
  }
  return resolve(realpathSync.native(existing), ...suffix);
}

function writeArchive(output, data) {
  mkdirSync(dirname(output), { recursive: true });
  const temporary = join(dirname(output), `.${basename(output)}.${randomUUID()}.tmp`);
  writeFileSync(temporary, data);
  renameSync(temporary, output);
}

function safeExtractPath(root, archivePath) {
  const target = resolve(root, archivePath);
  if (!isInside(root, target)) throw new Error("Archive extraction path escapes its destination");
  return target;
}

function isInside(root, target) {
  const path = relative(root, target);
  return path.length > 0 && !path.startsWith(`..${sep}`) && path !== ".." && !isAbsolute(path);
}

function isAtOrInside(root, target) {
  const normalizedRoot = comparablePath(root);
  const normalizedTarget = comparablePath(target);
  return normalizedRoot === normalizedTarget || isInside(normalizedRoot, normalizedTarget);
}

function comparablePath(path) {
  return process.platform === "win32" ? path.toLowerCase() : path;
}

function hash(value) {
  return createHash("sha256").update(value).digest("hex");
}

function summarize(manifest) {
  return { createdAt: manifest.createdAt, entries: manifest.entries.map(({ role, targetPath, targetRoot }) => ({ role, targetPath, targetRoot })), version: manifest.version };
}

function isRecord(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}
