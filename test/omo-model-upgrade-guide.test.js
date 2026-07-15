import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const projectRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const read = (path) => readFileSync(join(projectRoot, path), "utf8");

test("Given an agent upgrading any old GitHub version, when it reads the entry points, then it is routed to the guarded upgrade procedure", () => {
  const readme = read("README.md");
  const guide = read("UPGRADE.md");

  assert.match(readme, /4\. \*\*Upgrade any older GitHub version:\*\*/u);
  assert.match(readme, /\[`UPGRADE\.md`\]\(\.\/UPGRADE\.md\)/u);
  for (const lane of ["GitHub-global", "Linked checkout", "Original Node checkout", "Standalone Windows launcher"]) {
    assert.match(guide, new RegExp(`\\*\\*${lane}:`, "u"));
  }
});

test("Given a customized legacy installation, when an agent follows the upgrade guide, then profiles and active config are protected", () => {
  const guide = read("UPGRADE.md");

  assert.match(guide, /Rebuild `bin\/omo-model-profiles\.js`/u);
  assert.match(guide, /the `\$Profiles` table in a standalone `omo-model\.ps1`/u);
  assert.match(guide, /never writes it/u);
  assert.match(guide, /Do not run `omo-model --use`/u);
  assert.match(guide, /Never place credentials, base URLs, tokens, provider configuration, or private headers/u);
  assert.match(guide, /Do not remove old standalone launchers or checkouts yet/u);
});

test("Given an earliest-version upgrade, when installation completes, then the guide requires precedence checks and read-only verification", () => {
  const guide = read("UPGRADE.md");

  assert.match(guide, /feat\/exact-environment-clone/u);
  assert.match(guide, /npm link/u);
  assert.match(guide, /npm install -g "github:teracoot\/omo-model#feat\/exact-environment-clone"/u);
  assert.match(guide, /The first resolved `omo-model` must be the lane installed/u);
  assert.match(guide, /record the output of `omo-model --current` and `omo-model --list`/u);
  for (const command of ["omo-model --current", "omo-model --list", "omo-model --routes"]) assert.match(guide, new RegExp(command, "u"));
});
