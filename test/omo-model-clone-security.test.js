import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import test from "node:test";
import { createClone, extractClone, inspectClone } from "../bin/omo-model-clone-core.js";
import { createZip, readZip } from "../bin/omo-model-pack-zip.js";
import { makeCloneFixture, removeCloneFixture } from "./omo-model-clone-fixture.js";

const windowsOnly = { skip: process.platform !== "win32" };

test("Given manifest tampering or an extra entry, inspect rejects the archive", windowsOnly, () => {
  const fixture = makeCloneFixture();
  try {
    createClone({ home: fixture.home, output: fixture.archive });
    const entries = readZip(readFileSync(fixture.archive));
    const manifestEntry = entries.find((entry) => entry.path.endsWith("/manifest.json"));
    const manifest = JSON.parse(manifestEntry.data.toString("utf8"));
    manifest.entries[0].sha256 = createHash("sha256").update("tampered").digest("hex");
    const changed = entries.map((entry) => entry === manifestEntry ? { ...entry, data: Buffer.from(`${JSON.stringify(manifest)}\n`) } : entry);
    writeFileSync(fixture.archive, createZip(changed));
    assert.throws(() => inspectClone(fixture.archive), /hash|checksum/i);
    const extra = [...entries, { path: "omo-model-clone/extra.txt", data: Buffer.from("extra") }];
    writeFileSync(fixture.archive, createZip(extra));
    assert.throws(() => inspectClone(fixture.archive), /unmanifested|layout/i);
  } finally {
    removeCloneFixture(fixture);
  }
});

test("Given a legacy v1 manifest, inspect rejects it as unsupported", windowsOnly, () => {
  const fixture = makeCloneFixture();
  try {
    createClone({ home: fixture.home, output: fixture.archive });
    const entries = readZip(readFileSync(fixture.archive));
    const manifestEntry = entries.find((entry) => entry.path.endsWith("/manifest.json"));
    const manifest = JSON.parse(manifestEntry.data.toString("utf8"));
    manifest.version = 1;
    manifestEntry.data = Buffer.from(`${JSON.stringify(manifest)}\n`);
    writeFileSync(fixture.archive, createZip(entries));
    assert.throws(() => inspectClone(fixture.archive), /unsupported format/i);
    assert.throws(() => extractClone({ archive: fixture.archive, destination: fixture.extracted, home: fixture.recipient }), /unsupported format/i);
  } finally { removeCloneFixture(fixture); }
});

test("Manual guides specify mappings, backups, peer preservation, and restart discretion", () => {
  const sources = [
    readFileSync(new URL("../EXACT_CLONE_MANUAL_INSTALL_GUIDE.md", import.meta.url), "utf8"),
    readFileSync(new URL("../bin/omo-model-clone-assets.js", import.meta.url), "utf8"),
  ].join("\n");
  for (const target of ["opencode.jsonc", "oh-my-openagent.jsonc", "tui.jsonc", "dcp.jsonc", "omo-model.ps1", "omo-model.cmd"]) assert.match(sources, new RegExp(target.replace(".", "\\.")));
  for (const phrase of ["timestamped backup", "preserved by default", "recipient user alone decides"]) assert.match(sources, new RegExp(phrase, "i"));
});

test("Clone feature sources and assets contain no automatic helper commands", () => {
  const files = ["omo-model-clone-assets.js", "omo-model-clone-contract.js", "omo-model-clone-core.js", "omo-model-clone-files.js", "omo-model-clone-manifest.js", "omo-model-clone-paths.js"];
  const source = files.map((file) => readFileSync(new URL(`../bin/${file}`, import.meta.url), "utf8")).join("\n");
  for (const forbidden of ["Copy-Item", "Move-Item", "Remove-Item", "Start-Process", "Get-Process", "validate-clone", "restore-windows"]) assert.equal(source.includes(forbidden), false, forbidden);
});

test("Given malformed clone metadata, inspect rejects exact schema count sorting and route violations", windowsOnly, () => {
  const fixture = makeCloneFixture();
  try {
    createClone({ home: fixture.home, output: fixture.archive });
    const original = readZip(readFileSync(fixture.archive));
    for (const mutate of [
      (metadata) => { metadata.agentCount += 1; },
      (metadata) => { metadata.agentNames = ["z", "a"]; metadata.agentCount = 2; },
      (metadata) => { metadata.categoryNames = ["deep", "deep"]; metadata.categoryCount = 2; },
      (metadata) => { metadata.expectedRoutes = ["invalid-route"]; },
      (metadata) => { metadata.current = { model: 7, profile: null, variant: null }; },
    ]) {
      const entries = original.map((entry) => ({ ...entry, data: Buffer.from(entry.data) }));
      const manifestEntry = entries.find((entry) => entry.path.endsWith("/manifest.json"));
      const manifest = JSON.parse(manifestEntry.data.toString("utf8"));
      mutate(manifest.metadata);
      manifestEntry.data = Buffer.from(`${JSON.stringify(manifest)}\n`);
      writeFileSync(fixture.archive, createZip(entries));
      assert.throws(() => inspectClone(fixture.archive), /manifest.*invalid/i);
    }
  } finally {
    removeCloneFixture(fixture);
  }
});

test("Given schema-valid metadata unrelated to payloads, inspect rejects semantic drift", windowsOnly, () => {
  const fixture = makeCloneFixture();
  try {
    createClone({ home: fixture.home, output: fixture.archive });
    const entries = readZip(readFileSync(fixture.archive));
    const manifestEntry = entries.find((entry) => entry.path.endsWith("/manifest.json"));
    const manifest = JSON.parse(manifestEntry.data.toString("utf8"));
    manifest.metadata = { agentCount: 0, agentNames: [], categoryCount: 0, categoryNames: [], current: null, expectedRoutes: [], idaMcpMachinePathWarning: false };
    manifestEntry.data = Buffer.from(`${JSON.stringify(manifest)}\n`);
    writeFileSync(fixture.archive, createZip(entries));
    assert.throws(() => inspectClone(fixture.archive), /metadata|manifest/i);
  } finally { removeCloneFixture(fixture); }
});
