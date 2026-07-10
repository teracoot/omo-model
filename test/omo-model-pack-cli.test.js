import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import test from "node:test";

const marker = "CLI_SECRET_MARKER";

test("CLI uses an explicit source home and supports checkout commands", () => {
  const root = mkdtempSync(join(tmpdir(), "omo-model-pack-cli-"));
  try {
    const home = join(root, "home");
    const config = join(home, ".config", "opencode");
    const archive = join(root, "shared.zip");
    const extracted = join(root, "review");
    mkdirSync(config, { recursive: true });
    writeFileSync(join(config, "opencode.json"), JSON.stringify({ provider: { demo: { options: { apiKey: marker }, models: { model: {} } } } }));
    writeFileSync(join(config, "oh-my-openagent.json"), JSON.stringify({ agents: { build: { model: "demo/model", token: marker } } }));

    const create = run(["create", "--home", home, "--output", archive]);
    assert.equal(create.status, 0, create.stderr);
    assert.match(create.stdout, new RegExp(`Source home: ${escapeRegex(resolve(home))}`));
    assert.equal(readFileSync(archive).includes(marker), false);

    const inspect = run(["inspect", archive]);
    assert.equal(inspect.status, 0, inspect.stderr);
    assert.match(inspect.stdout, /Verified config pack/);

    const extract = run(["extract", archive, "--home", home, "--to", extracted]);
    assert.equal(extract.status, 0, extract.stderr);
    assert.equal(readFileSync(join(extracted, "config", "opencode.json"), "utf8").includes(marker), false);
  } finally {
    rmSync(root, { force: true, recursive: true });
  }
});

test("CLI rejects missing, duplicate, and unknown options", () => {
  assert.notEqual(run(["create", "--output"]).status, 0);
  assert.notEqual(run(["create", "--output", "first.zip", "--output", "second.zip"]).status, 0);
  assert.notEqual(run(["inspect", "pack.zip", "--home", "home"]).status, 0);
});

function run(args) {
  return spawnSync(process.execPath, ["bin/omo-model-pack.js", ...args], {
    cwd: new URL("..", import.meta.url),
    encoding: "utf8",
  });
}

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
