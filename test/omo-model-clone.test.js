import assert from "node:assert/strict";
import { existsSync, mkdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import { createClone, extractClone, inspectClone } from "../bin/omo-model-clone-core.js";
import { readZip } from "../bin/omo-model-pack-zip.js";
import { makeCloneFixture, removeCloneFixture, SECRET } from "./omo-model-clone-fixture.js";

const windowsOnly = { skip: process.platform !== "win32" };

test("Given a synthetic Windows home, create preserves exact raw payloads and only static root assets", windowsOnly, () => {
  const fixture = makeCloneFixture();
  try {
    createClone({ home: fixture.home, output: fixture.archive });
    mkdirSync(join(fixture.recipient, ".config", "opencode"), { recursive: true });
    const entries = new Map(readZip(readFileSync(fixture.archive)).map((entry) => [entry.path, entry.data]));
    assert.deepEqual(entries.get("omo-model-clone/config/opencode.jsonc"), fixture.base);
    assert.deepEqual(entries.get("omo-model-clone/config/oh-my-openagent.json"), fixture.ohmy);
    assert.equal(entries.get("omo-model-clone/launchers/omo-model.ps1").includes(SECRET), true);
    assert.equal([...entries.keys()].some((path) => /opencode\.json$|backup|package|node_modules/.test(path)), false);
    const rootAssets = [...entries.keys()].filter((path) => path.startsWith("omo-model-clone/") && !path.includes("/config/") && !path.includes("/launchers/") && !path.endsWith("/manifest.json"));
    assert.deepEqual(rootAssets.sort(), [
      "omo-model-clone/HANDOFF-ZH-CN.txt",
      "omo-model-clone/MANUAL-INSTALL.md",
      "omo-model-clone/SECURITY-WARNING.txt",
    ]);
    assert.equal(rootAssets.some((path) => /\.(?:cmd|exe|js|mjs|ps1)$/i.test(path)), false);
  } finally {
    removeCloneFixture(fixture);
  }
});

test("Given a v2 exact clone, inspect verifies a closed manifest and extract writes only a review tree", windowsOnly, () => {
  const fixture = makeCloneFixture();
  try {
    createClone({ home: fixture.home, output: fixture.archive });
    const summary = inspectClone(fixture.archive);
    assert.equal(summary.format, "omo-model-clone");
    assert.equal(summary.version, 2);
    assert.equal(summary.entries >= 7, true);
    extractClone({ archive: fixture.archive, destination: fixture.extracted, home: fixture.recipient });
    assert.deepEqual(readFileSync(join(fixture.extracted, "config", "opencode.jsonc")), fixture.base);
    assert.equal(existsSync(join(fixture.extracted, "manifest.json")), true);
    assert.equal(existsSync(join(fixture.recipient, ".config", "opencode")), false);
    assert.equal(existsSync(join(fixture.recipient, ".local", "bin")), false);
  } finally {
    removeCloneFixture(fixture);
  }
});

test("Given protected roots, create and extract reject aliases and existing destinations", windowsOnly, () => {
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
