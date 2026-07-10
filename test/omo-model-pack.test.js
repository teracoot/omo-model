import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { createPack, extractPack, inspectPack } from "../bin/omo-model-pack-core.js";
import { createZip } from "../bin/omo-model-pack-zip.js";

const marker = "CONFIG_PACK_SECRET_MARKER";
const privateUrl = "https://private.example/v1";

function makeFixture() {
  const root = mkdtempSync(join(tmpdir(), "omo-model-pack-"));
  const home = join(root, "home");
  const configDir = join(home, ".config", "opencode");
  const output = join(root, "shared.omo-model-config-pack.zip");
  const extractTo = join(root, "extracted");
  mkdirSync(configDir, { recursive: true });

  writeFileSync(join(configDir, "opencode.jsonc"), `{
    // JSONC comments must be accepted.
    "provider": {
      "demo": {
        "options": {
          "apiKey": "${marker}",
          "baseURL": "${privateUrl}",
          "headers": { "X-Key": "${marker}", "Authorization": "Bearer ${marker}" },
          "unknownValue": "${marker}",
          "unknownNumber": 731,
          "socket": "wss://private.example/socket",
        },
        "models": { "gpt-demo": {} },
      },
    },
  }\n`, "utf8");
  writeFileSync(join(configDir, "oh-my-openagent.json"), JSON.stringify({
    agents: { build: { model: "demo/gpt-demo", token: marker } },
  }, null, 2));
  writeFileSync(join(configDir, "tui.json"), JSON.stringify({ endpoint: `${privateUrl}/tui` }));
  writeFileSync(join(configDir, "opencode.jsonc.bak"), marker);
  writeFileSync(join(configDir, "unrelated.js"), marker);

  return { extractTo, home, output, root };
}

function removeFixture(fixture) {
  rmSync(fixture.root, { force: true, recursive: true });
}

test("creates a sanitized archive and extracts only approved artifacts", () => {
  const fixture = makeFixture();
  try {
    createPack({ home: fixture.home, output: fixture.output });

    const archiveText = readFileSync(fixture.output).toString("utf8");
    assert.equal(archiveText.includes(marker), false);
    assert.equal(archiveText.includes(privateUrl), false);

    const inspection = inspectPack(fixture.output);
    assert.equal(inspection.entries.some((entry) => entry.targetPath === "opencode.jsonc"), true);
    assert.equal(inspection.entries.some((entry) => entry.targetPath === "unrelated.js"), false);
    assert.equal(inspection.entries.some((entry) => entry.targetPath === "opencode.jsonc.bak"), false);

    extractPack({ archive: fixture.output, destination: fixture.extractTo, home: fixture.home });
    const extractedConfig = readFileSync(join(fixture.extractTo, "config", "opencode.jsonc"), "utf8");
    assert.equal(extractedConfig.includes(marker), false);
    assert.equal(extractedConfig.includes(privateUrl), false);
    assert.equal(extractedConfig.includes("731"), false);
    assert.equal(existsSync(join(fixture.extractTo, "config", "unrelated.js")), false);
  } finally {
    removeFixture(fixture);
  }
});

test("rejects manifests that name artifacts outside the fixed allowlist", () => {
  const fixture = makeFixture();
  try {
    const data = Buffer.from("{}\n", "utf8");
    const archivePath = "omo-model-config-pack/config/evil.json";
    const manifest = {
      format: "omo-model-config-pack",
      version: 1,
      entries: [{
        archivePath,
        bytes: data.length,
        redacted: true,
        role: "opencode-base",
        sha256: createHash("sha256").update(data).digest("hex"),
        targetPath: "evil.json",
        targetRoot: "opencode-config",
      }],
    };
    writeFileSync(fixture.output, createZip([
      { data, path: archivePath },
      { data: Buffer.from(`${JSON.stringify(manifest)}\n`, "utf8"), path: "omo-model-config-pack/manifest.json" },
    ]));
    assert.throws(() => inspectPack(fixture.output), /unapproved entry/i);
  } finally {
    removeFixture(fixture);
  }
});

test("rejects duplicate candidate roles and oversized archives", () => {
  const fixture = makeFixture();
  try {
    createPack({ home: fixture.home, output: fixture.output });
    const oversized = join(fixture.root, "oversized.zip");
    writeFileSync(oversized, Buffer.alloc(13 * 1024 * 1024));
    assert.throws(() => inspectPack(oversized), /size limit/i);

    const data = Buffer.from("{}\n", "utf8");
    const entries = ["opencode.jsonc", "opencode.json"].map((targetPath) => ({
      archivePath: `omo-model-config-pack/config/${targetPath}`,
      bytes: data.length,
      redacted: true,
      role: "opencode-base",
      sha256: createHash("sha256").update(data).digest("hex"),
      targetPath,
      targetRoot: "opencode-config",
    }));
    writeFileSync(fixture.output, createZip([
      ...entries.map((entry) => ({ data, path: entry.archivePath })),
      { data: Buffer.from(`${JSON.stringify({ format: "omo-model-config-pack", version: 1, entries })}\n`, "utf8"), path: "omo-model-config-pack/manifest.json" },
    ]));
    assert.throws(() => inspectPack(fixture.output), /duplicate artifact roles/i);
  } finally {
    removeFixture(fixture);
  }
});

test("redacts HTTP scheme-prefixed routes, identifiers, and map keys", () => {
  const fixture = makeFixture();
  try {
    writeFileSync(join(fixture.home, ".config", "opencode", "oh-my-openagent.json"), JSON.stringify({
      provider: {
        demo: {
          models: {
            "gpt-demo": { id: "HtTpS:identifier.invalid" },
          },
        },
        "provider:region": {
          models: { "model:variant": {} },
        },
        "HtTpS:provider.invalid": { models: {} },
      },
      agents: {
        build: { model: "https:example.invalid/model" },
        http: { model: "http:example.invalid/model" },
        mixedHttps: { model: "HtTpS:example.invalid/model" },
        mixedHttp: { model: "hTtP:example.invalid/model" },
        "HtTpS:agent.invalid": { model: "demo/gpt-demo" },
        legitimate: { model: "provider:region/model:variant" },
      },
      background_task: {
        providerConcurrency: { "provider:region": 4, "HtTpS:provider.invalid": 9, "provider/invalid": 10 },
        modelConcurrency: { "provider:region/model:variant": 6, "hTtP:example.invalid/model": 11, "provider-only": 12, model: 13 },
      },
    }), "utf8");
    createPack({ home: fixture.home, output: fixture.output });
    const archiveText = readFileSync(fixture.output, "utf8");
    extractPack({ archive: fixture.output, destination: fixture.extractTo, home: fixture.home });
    const extracted = readFileSync(join(fixture.extractTo, "config", "oh-my-openagent.json"), "utf8");
    const sanitized = JSON.parse(extracted);
    const unsafeValues = [
      "https:example.invalid/model",
      "http:example.invalid/model",
      "HtTpS:example.invalid/model",
      "hTtP:example.invalid/model",
      "HtTpS:identifier.invalid",
      "HtTpS:provider.invalid",
      "HtTpS:agent.invalid",
    ];

    for (const unsafeValue of unsafeValues) {
      assert.equal(archiveText.includes(unsafeValue), false);
      assert.equal(extracted.includes(unsafeValue), false);
    }
    assert.equal(sanitized.agents.build.model, "<redacted-url>");
    assert.equal(sanitized.agents.http.model, "<redacted-url>");
    assert.equal(sanitized.agents.mixedHttps.model, "<redacted-url>");
    assert.equal(sanitized.agents.mixedHttp.model, "<redacted-url>");
    assert.equal(sanitized.provider.demo.models["gpt-demo"].id, "<redacted-url>");
    assert.equal(Object.hasOwn(sanitized.provider, "HtTpS:provider.invalid"), false);
    assert.equal(Object.hasOwn(sanitized.agents, "HtTpS:agent.invalid"), false);
    assert.equal(Object.keys(sanitized.provider).some((key) => key.startsWith("<redacted-key-")), true);
    assert.equal(Object.keys(sanitized.agents).some((key) => key.startsWith("<redacted-key-")), true);
    assert.equal(Object.hasOwn(sanitized.provider, "provider:region"), true);
    assert.equal(Object.hasOwn(sanitized.provider["provider:region"].models, "model:variant"), true);
    assert.equal(sanitized.agents.legitimate.model, "provider:region/model:variant");
    assert.equal(sanitized.background_task.providerConcurrency["provider:region"], 4);
    assert.equal(sanitized.background_task.modelConcurrency["provider:region/model:variant"], 6);
    assert.equal(Object.hasOwn(sanitized.background_task.providerConcurrency, "HtTpS:provider.invalid"), false);
    assert.equal(Object.hasOwn(sanitized.background_task.providerConcurrency, "provider/invalid"), false);
    assert.equal(Object.hasOwn(sanitized.background_task.modelConcurrency, "hTtP:example.invalid/model"), false);
    assert.equal(Object.hasOwn(sanitized.background_task.modelConcurrency, "provider-only"), false);
    assert.equal(Object.hasOwn(sanitized.background_task.modelConcurrency, "model"), false);
  } finally {
    removeFixture(fixture);
  }
});

test("rejects tampered archives and existing extraction destinations", () => {
  const fixture = makeFixture();
  try {
    createPack({ home: fixture.home, output: fixture.output });
    const tampered = Buffer.from(readFileSync(fixture.output));
    const payloadIndex = tampered.indexOf(Buffer.from("gpt-demo", "utf8"));
    assert.notEqual(payloadIndex, -1);
    tampered[payloadIndex] ^= 1;
    writeFileSync(fixture.output, tampered);
    assert.throws(() => inspectPack(fixture.output), /checksum|sha256/i);

    createPack({ home: fixture.home, output: join(fixture.root, "fresh.omo-model-config-pack.zip") });
    const archive = join(fixture.root, "fresh.omo-model-config-pack.zip");
    extractPack({ archive, destination: fixture.extractTo, home: fixture.home });
    assert.throws(() => extractPack({ archive, destination: fixture.extractTo, home: fixture.home }), /already exists/i);
  } finally {
    removeFixture(fixture);
  }
});

test("exports only precedence-selected config candidates and refuses active-config extraction", () => {
  const fixture = makeFixture();
  try {
    writeFileSync(join(fixture.home, ".config", "opencode", "opencode.json"), JSON.stringify({ token: marker }), "utf8");
    createPack({ home: fixture.home, output: fixture.output });
    const inspection = inspectPack(fixture.output);
    assert.equal(inspection.entries.some((entry) => entry.targetPath === "opencode.json"), false);
    assert.throws(() => extractPack({
      archive: fixture.output,
      destination: join(fixture.home, ".config", "opencode", "review"),
      home: fixture.home,
    }), /OpenCode config directory/i);
  } finally {
    removeFixture(fixture);
  }
});
