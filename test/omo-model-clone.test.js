import assert from "node:assert/strict";
import { existsSync, mkdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import { createClone, extractClone, inspectClone } from "../bin/omo-model-clone-core.js";
import { readZip } from "../bin/omo-model-pack-zip.js";
import { makeCloneFixture, removeCloneFixture, SECRET } from "./omo-model-clone-fixture.js";

test("Given a synthetic Windows home, create preserves exact active bytes and excludes unrelated files", () => {
  const fixture = makeCloneFixture();
  try {
    createClone({ home: fixture.home, output: fixture.archive });
    mkdirSync(join(fixture.recipient, ".config", "opencode"), { recursive: true });
    const entries = new Map(readZip(readFileSync(fixture.archive)).map((entry) => [entry.path, entry.data]));
    assert.deepEqual(entries.get("omo-model-clone/config/opencode.jsonc"), fixture.base);
    assert.deepEqual(entries.get("omo-model-clone/config/oh-my-openagent.json"), fixture.ohmy);
    assert.equal(entries.get("omo-model-clone/launchers/omo-model.ps1").includes(SECRET), true);
    assert.equal([...entries.keys()].some((path) => /opencode\.json$|backup|package|node_modules/.test(path)), false);
    assert.equal(entries.has("omo-model-clone/SECURITY-WARNING.txt"), true);
    assert.equal(entries.has("omo-model-clone/HANDOFF-ZH-CN.txt"), true);
    assert.equal(entries.has("omo-model-clone/restore-windows.ps1"), true);
  } finally {
    removeCloneFixture(fixture);
  }
});

test("Given an exact clone, inspect verifies a closed manifest and extract writes a canonical review tree", () => {
  const fixture = makeCloneFixture();
  try {
    createClone({ home: fixture.home, output: fixture.archive });
    const summary = inspectClone(fixture.archive);
    assert.equal(summary.format, "omo-model-clone");
    assert.equal(summary.version, 1);
    assert.equal(summary.entries >= 7, true);
    extractClone({ archive: fixture.archive, destination: fixture.extracted, home: fixture.recipient });
    assert.deepEqual(readFileSync(join(fixture.extracted, "config", "opencode.jsonc")), fixture.base);
    assert.equal(existsSync(join(fixture.extracted, "manifest.json")), true);
  } finally {
    removeCloneFixture(fixture);
  }
});

test("Given protected roots, create and extract reject aliases and existing destinations", () => {
  const fixture = makeCloneFixture();
  try {
    createClone({ home: fixture.home, output: fixture.archive });
    mkdirSync(join(fixture.recipient, ".config", "opencode"), { recursive: true });
    assert.throws(() => extractClone({ archive: fixture.archive, destination: join(fixture.recipient, ".config", "opencode", "review"), home: fixture.recipient }), /protected|config/i);
    extractClone({ archive: fixture.archive, destination: fixture.extracted, home: fixture.recipient });
    assert.throws(() => extractClone({ archive: fixture.archive, destination: fixture.extracted, home: fixture.recipient }), /already exists/i);
    assert.throws(() => createClone({ home: fixture.home, output: join(fixture.config, "bad.omo-model-clone.zip") }), /protected|config/i);
  } finally {
    removeCloneFixture(fixture);
  }
});
