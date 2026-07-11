# Exact Windows Environment Clone: Manual Placement Only

`omo-model-clone` creates an exact, secret-bearing ZIP for one trusted Windows recipient. It is deliberately **unencrypted** and preserves selected active payloads byte-for-byte, including BOM, CRLF, JSONC comments, credentials, private URLs, and `omo-model` launchers. It is not a redacted migration template: use [the redacted `omo-model-pack` guide](./CONFIG_PACK_RESTORE_GUIDE.md) when secrets and endpoints must not travel.

## Security Boundary

- Windows only. Never use a WSL/Linux home.
- The ZIP contains usable secrets and is not encrypted. Use a trusted transfer channel, do not upload or paste payloads into chat, and securely dispose of temporary copies after the recipient finishes review.
- `create` requires `--include-secrets` and `--unencrypted`; `extract` requires both recipient acknowledgements. The flags record explicit consent and add no encryption.
- CLI output contains only format, version, entry count, and security warnings. It never prints homes, filenames, routes, hashes, or secret values.
- Version 1 archives are unsupported. The owner must generate a new version 2 clone.

Only the first existing candidate in each family is archived: OpenCode base `opencode.jsonc`, then `opencode.json`; OhMy `oh-my-openagent.jsonc`, `oh-my-openagent.json`, `oh-my-opencode.jsonc`, then `oh-my-opencode.json`; optional TUI `tui.jsonc`, then `tui.json`; optional DCP `dcp.jsonc`, then `dcp.json`. Both `.local/bin/omo-model.ps1` and `.cmd` are required. The archive contains only those raw payloads, `SECURITY-WARNING.txt`, `MANUAL-INSTALL.md`, `HANDOFF-ZH-CN.txt`, and its manifest.

## Owner: Create And Inspect

Choose a new output path outside `.config/opencode` and `.local/bin`. In PowerShell, use `$sourceHome`, not `$home`, because PowerShell treats it as `$HOME`.

```powershell
$sourceHome = [Environment]::GetFolderPath('UserProfile')
$archive = Join-Path ([Environment]::GetFolderPath('Desktop')) 'friend.omo-model-clone.zip'
omo-model-clone create --home "$sourceHome" --output "$archive" --include-secrets --unencrypted
omo-model-clone inspect "$archive"
```

From a checkout, replace `omo-model-clone` with `node .\bin\omo-model-clone.js`. Transfer only after `inspect` exits `0`.

## Recipient: Inspect And Extract For Review

Use one command lane throughout. First inspect; then extract only into a new review directory outside active config and launcher roots. Extraction is not installation.

```powershell
$recipientHome = [Environment]::GetFolderPath('UserProfile')
$archive = Join-Path ([Environment]::GetFolderPath('Desktop')) 'friend.omo-model-clone.zip'
$review = Join-Path ([Environment]::GetFolderPath('Desktop')) 'omo-model-clone-review'
omo-model-clone inspect "$archive"
omo-model-clone extract "$archive" --home "$recipientHome" --to "$review" --acknowledge-secrets --acknowledge-unencrypted
```

Follow the extracted `MANUAL-INSTALL.md` exactly. It maps every candidate filename, requires per-file recipient approval and timestamped backups outside active roots, preserves peers, and stops on ambiguity. No payload merge is permitted.

### Required Windows destinations and precedence

Place each approved extracted file at its same-name destination. For the config families, an existing higher-precedence peer can shadow a manually placed lower-precedence file. Preserve all candidate peers by default: never delete or rename them automatically.

| Family | Extracted payload -> manual Windows destination | Precedence, highest first |
| --- | --- | --- |
| OpenCode base | `config/opencode.jsonc` -> `%USERPROFILE%\.config\opencode\opencode.jsonc`; `config/opencode.json` -> `%USERPROFILE%\.config\opencode\opencode.json` | `opencode.jsonc`, `opencode.json` |
| OhMy | `config/oh-my-openagent.jsonc`, `config/oh-my-openagent.json`, `config/oh-my-opencode.jsonc`, or `config/oh-my-opencode.json` -> matching `%USERPROFILE%\.config\opencode\<same-name>` | `oh-my-openagent.jsonc`, `oh-my-openagent.json`, `oh-my-opencode.jsonc`, `oh-my-opencode.json` |
| Optional TUI | `config/tui.jsonc` or `config/tui.json` -> matching `%USERPROFILE%\.config\opencode\<same-name>` | `tui.jsonc`, `tui.json` |
| Optional DCP | `config/dcp.jsonc` or `config/dcp.json` -> matching `%USERPROFILE%\.config\opencode\<same-name>` | `dcp.jsonc`, `dcp.json` |
| PowerShell launcher | `launchers/omo-model.ps1` -> `%USERPROFILE%\.local\bin\omo-model.ps1` | exact filename |
| Command launcher | `launchers/omo-model.cmd` -> `%USERPROFILE%\.local\bin\omo-model.cmd` | exact filename |

For every placement, the recipient explicitly chooses that one file. Before manually replacing it, make a timestamped backup outside active roots and record its destination and backup path, or `NEW_FILE` when no destination existed. Place exact approved files one at a time in this order: OpenCode base, OhMy, optional TUI/DCP, then launchers. Do not merge raw payloads, credentials, or endpoints. Stop on any ambiguity or conflict; an agent unable to reliably make a manual placement must escalate to the recipient user. Keep all backups.

## Process Ownership

An existing OpenCode harness or process retains its old already-loaded config. Any newly launched OpenCode process reads files then on disk. The importing agent must not close, kill, launch, or restart OpenCode. The recipient user alone decides whether and when to do so.

## 简明交接

这是未加密且包含密钥的 Windows 完整克隆。先 `inspect`，再用确认参数 `extract` 到审阅目录。逐个文件取得收件人同意后手动放置，并在活动目录外保留带时间戳的备份；保留现有候选同名文件，遇到优先级或目标冲突立即停止。现有 OpenCode 进程继续使用已加载的旧配置，新启动的进程读取磁盘文件。导入代理不得关闭、终止、启动或重启 OpenCode；是否及何时重启完全由收件人用户决定。
