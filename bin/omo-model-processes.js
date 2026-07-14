import { spawnSync } from "node:child_process";

export function warnIfOpenCodeRunning() {
  let processIds;
  try {
    processIds = findOpenCodeProcessIds();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.warn(`Warning: ${message} The switch will continue because process discovery is advisory.`);
    return;
  }
  if (processIds.length === 0) return;

  console.warn(
    `Warning: OpenCode is running (PID${processIds.length === 1 ? "" : "s"}: ${processIds.join(", ")}). The switch will continue. Existing processes and sessions keep their loaded routing; start a new OpenCode process to use the selected profile.`,
  );
}

function findOpenCodeProcessIds() {
  const query = process.platform === "win32"
    ? { command: "tasklist", args: ["/FI", "IMAGENAME eq opencode.exe", "/FO", "CSV", "/NH"] }
    : { command: "ps", args: ["-eo", "pid=,comm="] };
  const result = spawnSync(query.command, query.args, { encoding: "utf8", windowsHide: true });
  if (result.error) throw new Error(`Could not check for running OpenCode processes: ${result.error.message}`);
  if (result.status !== 0) throw new Error(`Could not check for running OpenCode processes (exit ${result.status}).`);

  const processIds = process.platform === "win32"
    ? [...result.stdout.matchAll(/^"opencode(?:\.exe)?","(\d+)"/gim)].map((match) => Number.parseInt(match[1], 10))
    : result.stdout
      .split(/\r?\n/u)
      .map((line) => line.match(/^\s*(\d+)\s+(\S+)\s*$/u))
      .filter((match) => match?.[2]?.toLowerCase().replace(/\.exe$/u, "") === "opencode")
      .map((match) => Number.parseInt(match[1], 10));

  return [...new Set(processIds)].sort((left, right) => left - right);
}
