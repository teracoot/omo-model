import assert from "node:assert/strict";
import { existsSync, mkdirSync, mkdtempSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { createPack, extractPack } from "../bin/omo-model-pack-core.js";

function makeFixture() {
  const root = mkdtempSync(join(tmpdir(), "omo-model-pack-paths-"));
  const home = join(root, "home");
  const config = join(home, ".config", "opencode");
  mkdirSync(config, { recursive: true });
  writeFileSync(join(config, "opencode.json"), JSON.stringify({ provider: { demo: { models: { model: {} } } } }));
  writeFileSync(join(config, "oh-my-openagent.json"), JSON.stringify({ agents: { build: { model: "demo/model" } } }));
  return { config, home, root };
}

test("creation refuses a junction alias into active config", { skip: process.platform !== "win32" }, () => {
  const fixture = makeFixture();
  try {
    const alias = join(fixture.root, "config-alias");
    symlinkSync(fixture.config, alias, "junction");
    assert.throws(
      () => createPack({ home: fixture.home, output: join(alias, "shared.zip") }),
      /inside the OpenCode config directory/i,
    );
    assert.equal(existsSync(join(fixture.config, "shared.zip")), false);
  } finally {
    rmSync(fixture.root, { force: true, recursive: true });
  }
});

test("extraction refuses a protected launcher path through a junctioned parent", { skip: process.platform !== "win32" }, () => {
  const fixture = makeFixture();
  try {
    const archive = join(fixture.root, "shared.zip");
    createPack({ home: fixture.home, output: archive });
    const launcherParent = join(fixture.root, "launcher-parent");
    mkdirSync(launcherParent);
    symlinkSync(launcherParent, join(fixture.home, ".local"), "junction");
    const destination = join(launcherParent, "bin");
    assert.throws(
      () => extractPack({ archive, destination, home: fixture.home }),
      /inside the local launcher directory/i,
    );
    assert.equal(existsSync(destination), false);
  } finally {
    rmSync(fixture.root, { force: true, recursive: true });
  }
});
