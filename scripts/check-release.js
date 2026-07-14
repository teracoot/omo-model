import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const packageJson = JSON.parse(readFileSync(join(projectRoot, "package.json"), "utf8"));
const changelog = readFileSync(join(projectRoot, "CHANGELOG.md"), "utf8");
const semverPattern = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$/u;

if (!semverPattern.test(packageJson.version)) throw new Error(`package.json has an invalid semantic version: ${packageJson.version}`);
if (!changelog.includes(`## [${packageJson.version}] - `)) {
  throw new Error(`CHANGELOG.md has no release heading for ${packageJson.version}`);
}

const tag = process.argv[2];
if (tag !== undefined && tag !== `v${packageJson.version}`) {
  throw new Error(`Release tag ${tag} does not match package version v${packageJson.version}`);
}

console.log(`Release metadata check passed for v${packageJson.version}${tag === undefined ? "" : ` (${tag})`}.`);
