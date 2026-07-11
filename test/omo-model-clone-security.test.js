import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import test from "node:test";
import { createClone, inspectClone } from "../bin/omo-model-clone-core.js";
import { createZip, readZip } from "../bin/omo-model-pack-zip.js";
import { makeCloneFixture, removeCloneFixture } from "./omo-model-clone-fixture.js";

test("Given manifest tampering or an extra entry, inspect rejects the archive", () => {
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

test("Generated restore script contains acknowledgement backup rollback and validation guards", () => {
  const fixture = makeCloneFixture();
  try {
    createClone({ home: fixture.home, output: fixture.archive });
    const script = readZip(readFileSync(fixture.archive)).find((entry) => entry.path.endsWith("restore-windows.ps1")).data.toString("utf8");
    for (const invariant of ["AcknowledgeSecrets", "backup-map.tsv", "NEW_FILE", "Get-Process", "opencode debug config", "opencode models", "rollback", "IDA", "finally"]) {
      assert.match(script, new RegExp(invariant, "i"));
    }
    assert.doesNotMatch(script, /Invoke-WebRequest|npm install|Remove-Item[^\n]+backup/i);
  } finally {
    removeCloneFixture(fixture);
  }
});

test("Given malformed clone metadata, inspect rejects exact schema count sorting and route violations", () => {
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

test("Given schema-valid metadata unrelated to payloads, inspect rejects semantic drift", () => {
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
