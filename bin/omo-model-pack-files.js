import { existsSync, lstatSync } from "node:fs";
import { join, resolve, sep } from "node:path";
import { OH_MY_CONFIG_CANDIDATES, OPENCODE_CONFIG_CANDIDATES, configDirFor, readConfig } from "./omo-model-config.js";
import { sanitizeConfig } from "./omo-model-pack-redact.js";

const ARTIFACTS = [
  { candidates: OPENCODE_CONFIG_CANDIDATES, required: true, role: "opencode-base" },
  { candidates: OH_MY_CONFIG_CANDIDATES, required: true, role: "oh-my-config" },
  { candidates: ["tui.jsonc", "tui.json"], required: false, role: "opencode-tui" },
  { candidates: ["dcp.jsonc", "dcp.json"], required: false, role: "opencode-dcp" },
];

export function collectPackFiles(home) {
  const configRoot = resolve(configDirFor(home));
  return ARTIFACTS.flatMap((artifact) => collectArtifact(configRoot, artifact)).sort((left, right) => left.archivePath.localeCompare(right.archivePath));
}

export function isApprovedArtifact(descriptor) {
  return ARTIFACTS.some((artifact) => artifact.role === descriptor.role && artifact.candidates.includes(descriptor.targetPath))
    && descriptor.targetRoot === "opencode-config"
    && descriptor.archivePath === `omo-model-config-pack/config/${descriptor.targetPath}`;
}

function collectArtifact(configRoot, artifact) {
  const name = selectCandidate(configRoot, artifact.candidates);
  if (name === null) {
    if (artifact.required) throw new Error(`Missing an active ${artifact.role === "opencode-base" ? "OpenCode" : "OhMy"} configuration file`);
    return [];
  }
  const source = allowedChild(configRoot, name);
  assertRegularFile(source, name);
  let parsed;
  try {
    parsed = readConfig(source);
  } catch {
    throw new Error(`Cannot safely parse configuration artifact '${name}'`);
  }
  return [{
    archivePath: `omo-model-config-pack/config/${name}`,
    data: Buffer.from(`${JSON.stringify(sanitizeConfig(parsed), null, 2)}\n`, "utf8"),
    role: artifact.role,
    targetPath: name,
    targetRoot: "opencode-config",
  }];
}

function selectCandidate(root, candidates) {
  for (const candidate of candidates) {
    const source = allowedChild(root, candidate);
    if (existsSync(source)) return candidate;
  }
  return null;
}

function allowedChild(root, name) {
  const target = resolve(root, name);
  if (!target.startsWith(`${root}${sep}`)) throw new Error(`Unsafe artifact path '${name}'`);
  return target;
}

function assertRegularFile(file, name) {
  const info = lstatSync(file);
  if (info.isSymbolicLink() || !info.isFile()) throw new Error(`Artifact '${name}' must be a regular file`);
}
