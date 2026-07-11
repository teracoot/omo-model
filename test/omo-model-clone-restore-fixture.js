import { spawnSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { createClone, extractClone } from "../bin/omo-model-clone-core.js";

export function prepareRestore(fixture, failures = {}) {
  createClone({ home: fixture.home, output: fixture.archive });
  extractClone({ archive: fixture.archive, destination: fixture.extracted, home: fixture.recipient });
  const config = join(fixture.recipient, ".config", "opencode");
  const launchers = join(fixture.recipient, ".local", "bin");
  const fakeBin = join(fixture.root, "fake-bin");
  mkdirSync(config, { recursive: true });
  mkdirSync(launchers, { recursive: true });
  mkdirSync(fakeBin);
  writeFileSync(join(config, "opencode.json"), "OLD_BASE");
  writeFileSync(join(config, "oh-my-opencode.json"), "OLD_OHMY");
  writeFileSync(join(config, "tui.jsonc"), "OLD_TUI");
  writeFileSync(join(config, "dcp.json"), "OLD_DCP");
  writeFileSync(join(launchers, "omo-model.cmd"), "OLD_CMD");
  writeFileSync(join(fakeBin, "opencode.cmd"), fakeOpenCode(fixture, failures));
  return { config, fakeBin, launchers };
}

export function runRestore(fixture, fakeBin) {
  const env = { ...process.env, HOME: "C:\\caller-home", USERPROFILE: "C:\\caller-profile", PATH: `${fakeBin};${process.env.PATH}` };
  const wrapper = join(fixture.root, "run-restore-test.ps1");
  writeFileSync(wrapper, `function Get-Process { param([string]$Name,[string]$ErrorAction) if ($Name -ne 'opencode') { Microsoft.PowerShell.Management\\Get-Process -Name $Name -ErrorAction $ErrorAction } }\r\n& ${quote(join(fixture.extracted, "restore-windows.ps1"))} -RecipientHome ${quote(fixture.recipient)} -AcknowledgeSecrets\r\n`);
  return spawnSync("powershell", ["-NoProfile", "-ExecutionPolicy", "Bypass", "-File", wrapper], { encoding: "utf8", env });
}

function quote(value) {
  return `'${value.replaceAll("'", "''")}'`;
}

export function readProbe(fixture) {
  return readFileSync(join(fixture.root, "probe.tsv"), "utf8").trim().split(/\r?\n/).map((line) => {
    const [HOME, USERPROFILE, ...args] = line.split("\t");
    return { HOME, USERPROFILE, args: args.filter(Boolean) };
  });
}

function fakeOpenCode(fixture, failures) {
  const models = failures.models ? "exit /b 9" : "echo demo/model& exit /b 0";
  const agent = failures.agent ? "exit /b 8" : "if \"%3\"==\"build\" exit /b 0";
  const probe = join(fixture.root, "probe.tsv");
  return `@echo off\r\n>>"${probe}" echo %HOME%\t%USERPROFILE%\t%1\t%2\t%3\r\nif "%1 %2"=="debug config" exit /b 0\r\nif "%1"=="models" (${models})\r\nif "%1 %2"=="debug agent" (${agent})\r\nif "%1 %2"=="agent list" (echo Sisyphus - ultraworker ^(primary^)& echo build ^(subagent^)& exit /b 0)\r\nexit /b 1\r\n`;
}
