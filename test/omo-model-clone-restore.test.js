import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import { createZip, readZip } from "../bin/omo-model-pack-zip.js";
import { makeCloneFixture, removeCloneFixture } from "./omo-model-clone-fixture.js";
import { prepareRestore, readProbe, runRestore } from "./omo-model-clone-restore-fixture.js";

test("Given a synthetic recipient, restore targets it exactly and removes absent optional peers", () => {
  const fixture = makeCloneFixture();
  try {
    const roots = prepareRestore(fixture);
    const result = runRestore(fixture, roots.fakeBin);
    assert.equal(result.status, 0, result.stderr);
    assert.deepEqual(readFileSync(join(roots.config, "opencode.jsonc")), fixture.base);
    assert.deepEqual(readFileSync(join(roots.config, "oh-my-openagent.json")), fixture.ohmy);
    assert.equal(existsSync(join(roots.config, "opencode.json")), false);
    assert.equal(existsSync(join(roots.config, "dcp.json")), false);
    const calls = readProbe(fixture);
    assert.deepEqual(calls.map((call) => call.args), [["debug", "config"], ["models"], ["debug", "agent", "build"]]);
    assert.equal(calls.every((call) => call.HOME === fixture.recipient && call.USERPROFILE === fixture.recipient), true);
    assert.equal(readFileSync(join(roots.launchers, "omo-model.ps1"), "utf8").includes("CLONE_SECRET"), true);
    const backupParent = join(fixture.recipient, ".omo-model-clone-backups");
    assert.equal(existsSync(backupParent), true);
    const maps = findFiles(backupParent, "backup-map.tsv");
    assert.equal(maps.length, 1);
    const map = readFileSync(maps[0], "utf8");
    assert.match(map, /opencode\.jsonc\tNEW_FILE/);
    assert.match(map, /dcp\.json\t/);
  } finally { removeCloneFixture(fixture); }
});

test("Given changed extracted payload, restore rejects it before changing recipient files", () => {
  const fixture = makeCloneFixture();
  try {
    const roots = prepareRestore(fixture);
    writeFileSync(join(fixture.extracted, "config", "opencode.jsonc"), "TAMPERED");
    const result = runRestore(fixture, roots.fakeBin);
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /byte count|hash mismatch/i);
    assert.equal(readFileSync(join(roots.config, "opencode.json"), "utf8"), "OLD_BASE");
    assert.equal(existsSync(join(roots.config, "opencode.jsonc")), false);
    assert.equal(existsSync(join(fixture.recipient, ".omo-model-clone-backups")), false);
  } finally { removeCloneFixture(fixture); }
});

test("Given schema-valid metadata drift, restore rejects before backup or recipient writes", () => {
  const fixture = makeCloneFixture();
  try {
    const roots = prepareRestore(fixture);
    const manifestPath = join(fixture.extracted, "manifest.json");
    const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
    manifest.metadata = { agentCount: 0, agentNames: [], categoryCount: 0, categoryNames: [], current: null, expectedRoutes: [], idaMcpMachinePathWarning: false };
    writeFileSync(manifestPath, `${JSON.stringify(manifest)}\n`);
    const result = runRestore(fixture, roots.fakeBin);
    assert.notEqual(result.status, 0);
    assert.equal(readFileSync(join(roots.config, "opencode.json"), "utf8"), "OLD_BASE");
    assert.equal(existsSync(join(roots.config, "opencode.jsonc")), false);
    assert.equal(existsSync(join(fixture.recipient, ".omo-model-clone-backups")), false);
  } finally { removeCloneFixture(fixture); }
});

function findFiles(root, name) {
  const found = [];
  for (const entry of readdirSync(root, { withFileTypes: true })) {
    const path = join(root, entry.name);
    if (entry.isDirectory()) found.push(...findFiles(path, name));
    else if (entry.isFile() && entry.name === name) found.push(path);
  }
  return found;
}

test("Given forced route validation failure, restore rolls back old peers and removes new files", () => {
  const fixture = makeCloneFixture();
  try {
    const roots = prepareRestore(fixture, { models: true });
    const result = runRestore(fixture, roots.fakeBin);
    assert.notEqual(result.status, 0);
    assert.equal(readFileSync(join(roots.config, "opencode.json"), "utf8"), "OLD_BASE");
    assert.equal(readFileSync(join(roots.config, "oh-my-opencode.json"), "utf8"), "OLD_OHMY");
    assert.equal(readFileSync(join(roots.config, "dcp.json"), "utf8"), "OLD_DCP");
    assert.equal(existsSync(join(roots.config, "opencode.jsonc")), false);
    assert.equal(existsSync(join(roots.config, "oh-my-openagent.json")), false);
    assert.equal(existsSync(join(roots.launchers, "omo-model.ps1")), false);
    assert.equal(readFileSync(join(roots.launchers, "omo-model.cmd"), "utf8"), "OLD_CMD");
  } finally { removeCloneFixture(fixture); }
});

test("Given one agent debug failure, restore rolls back every changed destination", () => {
  const fixture = makeCloneFixture();
  try {
    const roots = prepareRestore(fixture, { agent: true });
    const result = runRestore(fixture, roots.fakeBin);
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /agent validation|expected agent/i);
    assert.equal(readFileSync(join(roots.config, "opencode.json"), "utf8"), "OLD_BASE");
    assert.equal(readFileSync(join(roots.config, "oh-my-opencode.json"), "utf8"), "OLD_OHMY");
    assert.equal(existsSync(join(roots.config, "opencode.jsonc")), false);
    assert.equal(existsSync(join(roots.config, "oh-my-openagent.json")), false);
    assert.equal(existsSync(join(roots.launchers, "omo-model.ps1")), false);
    assert.equal(readFileSync(join(roots.launchers, "omo-model.cmd"), "utf8"), "OLD_CMD");
  } finally { removeCloneFixture(fixture); }
});
