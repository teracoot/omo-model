import { createHash } from "node:crypto";
import { approvedDescriptor, CLONE_FORMAT, CLONE_ROOT, CLONE_VERSION } from "./omo-model-clone-contract.js";
import { deriveMetadataFromBuffers } from "./omo-model-clone-files.js";

const KEYS = ["containsSecrets", "createdAt", "encrypted", "entries", "format", "metadata", "source", "version"];
const DESCRIPTOR_KEYS = ["archivePath", "bytes", "role", "sha256", "targetPath", "targetRoot"];

export function buildCloneManifest(files, metadata) {
  return {
    containsSecrets: true,
    createdAt: new Date().toISOString(),
    encrypted: false,
    entries: files.map((file) => ({ archivePath: file.archivePath, bytes: file.data.length, role: file.role, sha256: hash(file.data), targetPath: file.targetPath, targetRoot: file.targetRoot })),
    format: CLONE_FORMAT,
    metadata,
    source: { os: "Windows", platform: "win32" },
    version: CLONE_VERSION,
  };
}

export function validateCloneManifest(manifest, index) {
  if (!record(manifest) || !exactKeys(manifest, KEYS) || manifest.format !== CLONE_FORMAT || manifest.version !== CLONE_VERSION || manifest.containsSecrets !== true || manifest.encrypted !== false) throw new Error("Archive manifest has an unsupported format");
  if (!validTimestamp(manifest.createdAt) || !Array.isArray(manifest.entries) || !validSource(manifest.source) || !validMetadata(manifest.metadata)) throw new Error("Archive manifest is invalid");
  const expected = new Set([`${CLONE_ROOT}/manifest.json`]);
  const roles = new Set();
  for (const descriptor of manifest.entries) {
    if (!validDescriptor(descriptor) || !approvedDescriptor(descriptor)) throw new Error("Archive manifest contains an unapproved entry");
    if (expected.has(descriptor.archivePath) || roles.has(descriptor.role)) throw new Error("Archive manifest contains duplicate paths or roles");
    expected.add(descriptor.archivePath);
    roles.add(descriptor.role);
    const entry = index.get(descriptor.archivePath);
    if (entry === undefined || entry.data.length !== descriptor.bytes || hash(entry.data) !== descriptor.sha256) throw new Error("Archive hash or checksum mismatch");
  }
  for (const role of ["opencode-base", "oh-my-config", "launcher-powershell", "launcher-command", "security-warning", "handoff-zh-cn", "manual-install-guide"]) if (!roles.has(role)) throw new Error("Archive manifest is missing a required role");
  if (expected.size !== index.size || [...index.keys()].some((path) => !expected.has(path))) throw new Error("Archive contains an unmanifested entry or noncanonical layout");
  const canonical = [...expected].sort();
  const actual = [...index.keys()].sort();
  if (canonical.some((path, indexValue) => path !== actual[indexValue])) throw new Error("Archive has a noncanonical layout");
  const byRole = new Map(manifest.entries.map((descriptor) => [descriptor.role, index.get(descriptor.archivePath).data]));
  const derived = deriveMetadataFromBuffers(byRole.get("opencode-base"), byRole.get("oh-my-config"));
  if (JSON.stringify(derived) !== JSON.stringify(manifest.metadata)) throw new Error("Archive manifest metadata does not match payloads");
}

export function parseCloneManifest(entry) {
  try { return JSON.parse(entry.data.toString("utf8")); }
  catch { throw new Error("Archive manifest is invalid JSON"); }
}

export function summarizeClone(manifest) {
  return { entries: manifest.entries.length, format: manifest.format, version: manifest.version };
}

function validDescriptor(value) {
  return record(value) && exactKeys(value, DESCRIPTOR_KEYS)
    && typeof value.archivePath === "string" && typeof value.role === "string" && typeof value.targetPath === "string" && typeof value.targetRoot === "string"
    && Number.isSafeInteger(value.bytes) && value.bytes >= 0 && /^[a-f0-9]{64}$/.test(value.sha256);
}

function validMetadata(value) {
  if (!record(value) || !exactKeys(value, ["agentCount", "agentNames", "categoryCount", "categoryNames", "current", "expectedRoutes", "idaMcpMachinePathWarning"])) return false;
  if (!validNames(value.agentNames) || !validNames(value.categoryNames) || !validRoutes(value.expectedRoutes)) return false;
  return nonnegativeInteger(value.agentCount) && value.agentCount === value.agentNames.length
    && nonnegativeInteger(value.categoryCount) && value.categoryCount === value.categoryNames.length
    && typeof value.idaMcpMachinePathWarning === "boolean" && validCurrent(value.current);
}

function validSource(value) { return record(value) && exactKeys(value, ["os", "platform"]) && value.os === "Windows" && value.platform === "win32"; }
function validCurrent(value) {
  return value === null || (record(value) && exactKeys(value, ["model", "profile", "variant"])
    && validRoute(value.model) && nullableBounded(value.profile) && nullableBounded(value.variant));
}
function validNames(value) { return validSortedUnique(value, (item) => bounded(item, 128)); }
function validRoutes(value) { return validSortedUnique(value, validRoute); }
function validSortedUnique(value, predicate) {
  return Array.isArray(value) && value.every(predicate) && value.every((item, index) => index === 0 || value[index - 1] < item);
}
function validRoute(value) { return bounded(value, 256) && /^[^\s/]+\/[^\s/]+$/.test(value); }
function nullableBounded(value) { return value === null || bounded(value, 128); }
function bounded(value, maximum) { return typeof value === "string" && value.length > 0 && value.length <= maximum; }
function nonnegativeInteger(value) { return Number.isSafeInteger(value) && value >= 0; }
function validTimestamp(value) { return typeof value === "string" && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(value) && new Date(value).toISOString() === value; }
function record(value) { return value !== null && typeof value === "object" && !Array.isArray(value); }
function exactKeys(value, keys) { const actual = Object.keys(value).sort(); const expected = [...keys].sort(); return actual.length === expected.length && actual.every((key, index) => key === expected[index]); }
function hash(value) { return createHash("sha256").update(value).digest("hex"); }
