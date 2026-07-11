import { existsSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { configDirFor, parseJsoncBuffer } from "./omo-model-config.js";
import { CLONE_ARTIFACTS, CLONE_ROOT, HELPER_ASSETS } from "./omo-model-clone-contract.js";
import { assertExistingChainSafe, assertRegularPath } from "./omo-model-clone-paths.js";

export function collectCloneFiles(home, assets) {
  const roots = { config: resolve(configDirFor(home)), launchers: resolve(home, ".local", "bin") };
  for (const [name, root] of Object.entries(roots)) assertExistingChainSafe(root, `${name} root`);
  const files = CLONE_ARTIFACTS.flatMap((artifact) => collectArtifact(roots[artifact.root], artifact));
  for (const asset of HELPER_ASSETS) files.push({ ...asset, data: assets[asset.targetPath] });
  return files.sort((left, right) => left.archivePath.localeCompare(right.archivePath));
}

export function deriveMetadata(files) {
  return deriveMetadataFromBuffers(
    files.find((entry) => entry.role === "opencode-base")?.data,
    files.find((entry) => entry.role === "oh-my-config")?.data,
  );
}

export function deriveMetadataFromBuffers(openCodeBuffer, ohMyBuffer) {
  const openCode = parseArtifact(openCodeBuffer, "opencode-base");
  const ohMy = parseArtifact(ohMyBuffer, "oh-my-config");
  const routes = [];
  for (const [provider, value] of Object.entries(record(openCode.provider))) {
    for (const model of Object.keys(record(record(value).models))) routes.push(`${provider}/${model}`);
  }
  const agents = Object.keys(record(ohMy.agents));
  const categories = Object.keys(record(ohMy.categories));
  const firstAgent = record(record(ohMy.agents)[agents[0]]);
  return {
    agentCount: agents.length,
    agentNames: agents.sort(),
    categoryCount: categories.length,
    categoryNames: categories.sort(),
    current: typeof firstAgent.model === "string" ? { model: firstAgent.model, profile: stringOrNull(ohMy.profile), variant: stringOrNull(firstAgent.variant) } : null,
    expectedRoutes: routes.sort(),
    idaMcpMachinePathWarning: JSON.stringify(record(openCode.mcp)).toLowerCase().includes("ida"),
  };
}

function collectArtifact(root, artifact) {
  const selected = artifact.candidates.find((name) => existsSync(join(root, name)));
  if (selected === undefined) {
    if (artifact.required) throw new Error(`Missing required clone artifact role '${artifact.role}'`);
    return [];
  }
  const source = join(root, selected);
  assertRegularPath(source, `Artifact '${selected}'`);
  return [{
    archivePath: `${CLONE_ROOT}/${artifact.root}/${selected}`,
    data: readFileSync(source),
    role: artifact.role,
    source,
    targetPath: selected,
    targetRoot: artifact.root === "config" ? "opencode-config" : "local-launcher",
  }];
}

function parseArtifact(buffer, role) {
  try {
    return record(parseJsoncBuffer(buffer));
  } catch {
    throw new Error(`Cannot parse required metadata for role '${role}'`);
  }
}

function record(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value) ? value : {};
}

function stringOrNull(value) {
  return typeof value === "string" ? value : null;
}
