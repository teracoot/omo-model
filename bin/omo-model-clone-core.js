import { randomUUID } from "node:crypto";
import { mkdirSync, readFileSync, renameSync, rmSync, statSync, writeFileSync } from "node:fs";
import { basename, dirname, join, resolve } from "node:path";
import { cloneAssets } from "./omo-model-clone-assets.js";
import { CLONE_ROOT } from "./omo-model-clone-contract.js";
import { collectCloneFiles, deriveMetadata } from "./omo-model-clone-files.js";
import { buildCloneManifest, parseCloneManifest, summarizeClone, validateCloneManifest } from "./omo-model-clone-manifest.js";
import { assertAbsoluteHome, assertOutsideProtected, assertRegularPath, canonicalNewPath } from "./omo-model-clone-paths.js";
import { createZip, readZip } from "./omo-model-pack-zip.js";

const MAX_ARCHIVE_BYTES = 12 * 1024 * 1024;

export function createClone({ home, output }) {
  requireWindows();
  const sourceHome = assertAbsoluteHome(home, "Source");
  const outputPath = resolveCloneOutput(output);
  assertOutsideProtected(outputPath, sourceHome, "Output archive");
  const files = collectCloneFiles(sourceHome, cloneAssets);
  const manifest = buildCloneManifest(files, deriveMetadata(files));
  const entries = files.map((file) => ({ data: file.data, path: file.archivePath }));
  entries.push({ data: Buffer.from(`${JSON.stringify(manifest, null, 2)}\n`, "utf8"), path: `${CLONE_ROOT}/manifest.json` });
  writeNewArchive(outputPath, createZip(entries.sort((left, right) => left.path.localeCompare(right.path))));
  return summarizeClone(manifest);
}

export function inspectClone(archive) {
  const { index, manifest } = verifiedArchive(archive);
  validateCloneManifest(manifest, index);
  return summarizeClone(manifest);
}

export function extractClone({ archive, destination, home }) {
  requireWindows();
  const recipientHome = assertAbsoluteHome(home, "Recipient");
  const target = canonicalNewPath(destination, "Extraction destination");
  assertOutsideProtected(target, recipientHome, "Extraction destination");
  const { index, manifest } = verifiedArchive(archive);
  validateCloneManifest(manifest, index);
  const temporary = join(dirname(target), `.${basename(target)}.${randomUUID()}.tmp`);
  mkdirSync(temporary);
  try {
    for (const entry of index.values()) {
      const relative = entry.path.slice(`${CLONE_ROOT}/`.length);
      const output = resolve(temporary, relative);
      if (!output.startsWith(`${temporary}\\`) && !output.startsWith(`${temporary}/`)) throw new Error("Archive extraction escaped destination");
      mkdirSync(dirname(output), { recursive: true });
      writeFileSync(output, entry.data);
    }
    renameSync(temporary, target);
  } catch (error) { rmSync(temporary, { force: true, recursive: true }); throw error; }
  return summarizeClone(manifest);
}

function verifiedArchive(archive) {
  assertRegularPath(archive, "Archive");
  if (statSync(archive).size > MAX_ARCHIVE_BYTES) throw new Error("Archive exceeds the size limit");
  const entries = readZip(readFileSync(archive));
  const index = new Map(entries.map((entry) => [entry.path, entry]));
  const manifestEntry = index.get(`${CLONE_ROOT}/manifest.json`);
  if (manifestEntry === undefined) throw new Error("Archive manifest is missing");
  return { index, manifest: parseCloneManifest(manifestEntry) };
}

function resolveCloneOutput(output) {
  if (typeof output !== "string" || !output.endsWith(".omo-model-clone.zip")) throw new Error("Output must be a new .omo-model-clone.zip file");
  return canonicalNewPath(output, "Output archive");
}

function writeNewArchive(output, data) {
  const temporary = join(dirname(output), `.${basename(output)}.${randomUUID()}.tmp`);
  writeFileSync(temporary, data, { flag: "wx" });
  renameSync(temporary, output);
}

function requireWindows() { if (process.platform !== "win32") throw new Error("omo-model-clone supports Windows only"); }
