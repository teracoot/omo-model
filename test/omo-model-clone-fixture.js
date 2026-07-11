import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

export const SECRET = "CLONE_SECRET_DO_NOT_PRINT";

export function makeCloneFixture() {
  const root = mkdtempSync(join(tmpdir(), "omo-model-clone-"));
  const home = join(root, "source-home");
  const config = join(home, ".config", "opencode");
  const launchers = join(home, ".local", "bin");
  const archive = join(root, "shared.omo-model-clone.zip");
  const recipient = join(root, "recipient-home");
  const extracted = join(root, "review");
  mkdirSync(config, { recursive: true });
  mkdirSync(launchers, { recursive: true });
  mkdirSync(recipient);
  const base = Buffer.from(`\uFEFF{\r\n // ${SECRET}\r\n "provider":{"demo":{"options":{"apiKey":"${SECRET}","baseURL":"https://secret.invalid/v1"},"models":{"model":{}}}},\r\n "mcp":{"ida":{"command":["C:\\\\Tools\\\\ida.exe"]}}\r\n}\r\n`, "utf8");
  const ohmy = Buffer.from(`{"agents":{"build":{"model":"demo/model","variant":"max"}},"categories":{"deep":{"model":"demo/model"}}}\r\n`, "utf8");
  writeFileSync(join(config, "opencode.jsonc"), base);
  writeFileSync(join(config, "opencode.json"), Buffer.from("LOWER_PRECEDENCE_SECRET"));
  writeFileSync(join(config, "oh-my-openagent.json"), ohmy);
  writeFileSync(join(config, "oh-my-opencode.json"), Buffer.from("LOWER_OHMY"));
  writeFileSync(join(config, "tui.json"), Buffer.from("{\"theme\":\"dark\"}\r\n"));
  writeFileSync(join(config, "backup.log"), Buffer.from(SECRET));
  writeFileSync(join(config, "package.json"), Buffer.from(SECRET));
  writeFileSync(join(launchers, "omo-model.ps1"), Buffer.from(`param([string]$Command)\r\n$token='${SECRET}'\r\nif ($Command -eq '--current') { 'Current OhMy route:'; '  model:   demo/model'; '  variant: max'; '  agents:  1'; '  categories: 1' }\r\n`, "utf8"));
  writeFileSync(join(launchers, "omo-model.cmd"), Buffer.from(`@echo off\r\nrem ${SECRET}\r\n`, "utf8"));
  return { archive, base, config, extracted, home, launchers, ohmy, recipient, root };
}

export function removeCloneFixture(fixture) {
  rmSync(fixture.root, { force: true, recursive: true });
}
