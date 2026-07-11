export const CLONE_ROOT = "omo-model-clone";
export const CLONE_FORMAT = "omo-model-clone";
export const CLONE_VERSION = 2;

export const CLONE_ARTIFACTS = [
  { candidates: ["opencode.jsonc", "opencode.json"], required: true, role: "opencode-base", root: "config" },
  { candidates: ["oh-my-openagent.jsonc", "oh-my-openagent.json", "oh-my-opencode.jsonc", "oh-my-opencode.json"], required: true, role: "oh-my-config", root: "config" },
  { candidates: ["tui.jsonc", "tui.json"], required: false, role: "opencode-tui", root: "config" },
  { candidates: ["dcp.jsonc", "dcp.json"], required: false, role: "opencode-dcp", root: "config" },
  { candidates: ["omo-model.ps1"], required: true, role: "launcher-powershell", root: "launchers" },
  { candidates: ["omo-model.cmd"], required: true, role: "launcher-command", root: "launchers" },
];

export const HELPER_ASSETS = [
  { archivePath: `${CLONE_ROOT}/SECURITY-WARNING.txt`, role: "security-warning", targetPath: "SECURITY-WARNING.txt", targetRoot: "clone-root" },
  { archivePath: `${CLONE_ROOT}/HANDOFF-ZH-CN.txt`, role: "handoff-zh-cn", targetPath: "HANDOFF-ZH-CN.txt", targetRoot: "clone-root" },
  { archivePath: `${CLONE_ROOT}/MANUAL-INSTALL.md`, role: "manual-install-guide", targetPath: "MANUAL-INSTALL.md", targetRoot: "clone-root" },
];

export function approvedDescriptor(descriptor) {
  if (descriptor.targetRoot === "clone-root") return HELPER_ASSETS.some((asset) => asset.role === descriptor.role && asset.archivePath === descriptor.archivePath && asset.targetPath === descriptor.targetPath);
  return CLONE_ARTIFACTS.some((artifact) => artifact.role === descriptor.role
    && artifact.candidates.includes(descriptor.targetPath)
    && descriptor.targetRoot === (artifact.root === "config" ? "opencode-config" : "local-launcher")
    && descriptor.archivePath === `${CLONE_ROOT}/${artifact.root}/${descriptor.targetPath}`);
}
