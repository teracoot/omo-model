import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import test from "node:test";
import { makeCloneFixture, removeCloneFixture, SECRET } from "./omo-model-clone-fixture.js";
import { createClone } from "../bin/omo-model-clone-core.js";
import { createZip, readZip } from "../bin/omo-model-pack-zip.js";

const windowsOnly = { skip: process.platform !== "win32" };

function run(args) {
  return spawnSync(process.execPath, ["bin/omo-model-clone.js", ...args], { cwd: new URL("..", import.meta.url), encoding: "utf8" });
}

test("Given exact acknowledgement flags, CLI creates inspects and extracts without leaking sensitive metadata", windowsOnly, () => {
  const fixture = makeCloneFixture();
  try {
    const create = run(["create", "--home", fixture.home, "--output", fixture.archive, "--include-secrets", "--unencrypted"]);
    assert.equal(create.status, 0, create.stderr);
    assert.equal(create.stdout.includes(SECRET), false);
    assert.equal(create.stdout.includes(fixture.home), false);
    assert.equal(create.stdout.includes("demo/model"), false);
    const inspect = run(["inspect", fixture.archive]);
    assert.equal(inspect.status, 0, inspect.stderr);
    assert.match(inspect.stdout, /UNENCRYPTED|SECRET/i);
    const extract = run(["extract", fixture.archive, "--home", fixture.recipient, "--to", fixture.extracted, "--acknowledge-secrets", "--acknowledge-unencrypted"]);
    assert.equal(extract.status, 0, extract.stderr);
    assert.equal(readFileSync(`${fixture.extracted}/config/opencode.jsonc`).includes(SECRET), true);
  } finally {
    removeCloneFixture(fixture);
  }
});

test("Given incomplete or malformed arguments, CLI rejects before source access", () => {
  assert.notEqual(run(["create", "--home", "Z:\\does-not-exist", "--output", "x.omo-model-clone.zip"]).status, 0);
  assert.notEqual(run(["create", "--home", "Z:\\does-not-exist", "--home", "Z:\\other", "--output", "x.omo-model-clone.zip", "--include-secrets", "--unencrypted"]).status, 0);
  assert.notEqual(run(["inspect", "missing.zip", "--unknown"]).status, 0);
  assert.notEqual(run(["extract", "missing.zip", "--home", "Z:\\x", "--to", "Z:\\y", "--acknowledge-secrets"]).status, 0);
});

test("Given either help spelling, CLI exits successfully before filesystem access", () => {
  for (const flag of ["--help", "-h"]) {
    const result = run([flag]);
    assert.equal(result.status, 0, result.stderr);
    assert.match(result.stdout, /omo-model-clone/);
    assert.match(result.stdout, /MANUAL_INSTALL|manual/i);
    assert.doesNotMatch(result.stdout, /restore/i);
  }
});

test("Given internal archive and path failures, CLI stderr reveals no sensitive context", windowsOnly, () => {
  const fixture = makeCloneFixture();
  try {
    createClone({ home: fixture.home, output: fixture.archive });
    const corrupted = Buffer.from(readFileSync(fixture.archive));
    corrupted[corrupted.indexOf(fixture.base)] ^= 1;
    writeFileSync(fixture.archive, corrupted);
    assertGenericFailure(run(["inspect", fixture.archive]), fixture);

    const extraArchive = `${fixture.root}\\extra.omo-model-clone.zip`;
    const entries = readZip(createValidArchive(fixture));
    writeFileSync(extraArchive, createZip([...entries, { path: "omo-model-clone/opencode.jsonc", data: Buffer.from(SECRET) }]));
    assertGenericFailure(run(["inspect", extraArchive]), fixture);

    const missingHome = `${fixture.root}\\private-source`;
    assertGenericFailure(run(["create", "--home", missingHome, "--output", `${fixture.root}\\new.omo-model-clone.zip`, "--include-secrets", "--unencrypted"]), fixture);
    mkdirSync(`${fixture.recipient}\\.config\\opencode`, { recursive: true });
    assertGenericFailure(run(["extract", extraArchive, "--home", fixture.recipient, "--to", `${fixture.recipient}\\.config\\opencode\\review`, "--acknowledge-secrets", "--acknowledge-unencrypted"]), fixture);
  } finally { removeCloneFixture(fixture); }
});

function createValidArchive(fixture) {
  const path = `${fixture.root}\\valid.omo-model-clone.zip`;
  createClone({ home: fixture.home, output: path });
  return readFileSync(path);
}

function assertGenericFailure(result, fixture) {
  assert.notEqual(result.status, 0);
  for (const forbidden of [fixture.root, fixture.home, "opencode.jsonc", "demo/model", SECRET]) assert.equal(result.stderr.includes(forbidden), false, result.stderr);
}
