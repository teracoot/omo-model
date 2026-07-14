import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const projectRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const packageJson = JSON.parse(readFileSync(join(projectRoot, "package.json"), "utf8"));
const npmCli = process.env.npm_execpath;
if (!npmCli) throw new Error("Run this check through npm: npm run check:package");

const result = spawnSync(process.execPath, [npmCli, "pack", "--dry-run", "--json"], {
  cwd: projectRoot,
  encoding: "utf8",
});
if (result.error) throw result.error;
if (result.status !== 0) throw new Error(result.stderr || result.stdout || "npm pack --dry-run failed");

const reports = JSON.parse(result.stdout);
if (!Array.isArray(reports) || reports.length !== 1) throw new Error("npm pack did not return exactly one package report");
const report = reports[0];
if (report.name !== packageJson.name || report.version !== packageJson.version) {
  throw new Error(`Packed identity ${report.name}@${report.version} does not match package.json`);
}

const paths = new Set(report.files.map(({ path }) => path));
const requiredPaths = [
  "AGENT_USER_MESSAGE_TEMPLATE.md",
  "CHANGELOG.md",
  "LICENSE",
  "README.md",
  "RELEASING.md",
  "bin/omo-model.cmd",
  "bin/omo-model.js",
  "bin/omo-model.ps1",
  "bin/omo-model-profiles.js",
  "package.json",
];
for (const path of requiredPaths) {
  if (!paths.has(path)) throw new Error(`Package is missing required file: ${path}`);
}

const forbiddenPrefixes = [".github/", "profile-backups/", "scripts/", "test/"];
for (const path of paths) {
  if (forbiddenPrefixes.some((prefix) => path.startsWith(prefix))) throw new Error(`Package contains development-only file: ${path}`);
}

console.log(`Package contents check passed for ${report.name}@${report.version} (${report.entryCount} files).`);
