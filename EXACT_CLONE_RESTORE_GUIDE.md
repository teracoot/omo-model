# Exact Windows Environment Clone

`omo-model-clone` creates an exact, secret-bearing ZIP for transfer to one trusted friend. It is deliberately **unencrypted** and preserves the selected active files byte for byte, including BOM, CRLF, JSONC comments, credentials, private URLs, and the two `omo-model` launchers. For a credential-free migration template instead, use [the redacted `omo-model-pack` guide](./CONFIG_PACK_RESTORE_GUIDE.md); that contract is unchanged.

Command help is available with either `omo-model-clone --help` or `omo-model-clone -h`; both return before any filesystem access.

## Security boundary

- Windows only. Never point the command at a WSL/Linux home.
- The ZIP contains usable secrets and is not encrypted. Use a trusted transfer channel, keep copies briefly, never upload or paste contents into chat, and securely dispose of archive/review copies after restore.
- `create` requires both `--include-secrets` and `--unencrypted`. `extract` requires both recipient acknowledgements. These flags document intentional owner consent; they do not add encryption.
- CLI output deliberately reveals only format, version, entry count, and security warnings—never homes, filenames, routes, agent/category names, hashes, or values.

Only the first active candidate in each family is included: `opencode.jsonc/json`; `oh-my-openagent.jsonc/json` then `oh-my-opencode.jsonc/json`; optional `tui.jsonc/json` and `dcp.jsonc/json`. Both `.local/bin/omo-model.ps1` and `.cmd` are required. Package metadata, modules, caches, logs, backups, and arbitrary files are excluded.

## Owner: create and inspect

Choose a new output filename outside `.config/opencode` and `.local/bin`. Do not use `$home` in PowerShell because it aliases `$HOME`; use `$sourceHome`.

Installed command:

```powershell
$sourceHome = [Environment]::GetFolderPath('UserProfile')
$archive = Join-Path ([Environment]::GetFolderPath('Desktop')) 'friend.omo-model-clone.zip'
omo-model-clone create --home "$sourceHome" --output "$archive" --include-secrets --unencrypted
omo-model-clone inspect "$archive"
```

Repository checkout, from its root:

```powershell
$sourceHome = [Environment]::GetFolderPath('UserProfile')
$archive = Join-Path ([Environment]::GetFolderPath('Desktop')) 'friend.omo-model-clone.zip'
node .\bin\omo-model-clone.js create --home "$sourceHome" --output "$archive" --include-secrets --unencrypted
node .\bin\omo-model-clone.js inspect "$archive"
```

Transfer only after `inspect` exits `0`. Do not send a failed or modified archive.

## Recipient: inspect, extract, and restore

Use the same installed or checkout lane throughout. Extraction writes only to a new review directory outside active config and launcher roots. It does not install anything.

```powershell
$recipientHome = [Environment]::GetFolderPath('UserProfile')
$archive = Join-Path ([Environment]::GetFolderPath('Desktop')) 'friend.omo-model-clone.zip'
$review = Join-Path ([Environment]::GetFolderPath('Desktop')) 'omo-model-clone-review'
omo-model-clone inspect "$archive"
omo-model-clone extract "$archive" --home "$recipientHome" --to "$review" --acknowledge-secrets --acknowledge-unencrypted
& (Join-Path $review 'restore-windows.ps1') -RecipientHome "$recipientHome" -AcknowledgeSecrets
```

For checkout use, replace the first two commands with `node .\bin\omo-model-clone.js inspect ...` and `node .\bin\omo-model-clone.js extract ...`; the extracted restore command is identical.

The restore script requires real absolute recipient/config/launcher directories and no running OpenCode process. Before writing, it rechecks every extracted payload—including the fixed `validate-clone.mjs` helper—against the manifest byte count and SHA-256 and rejects aliases/reparse paths. The validator independently parses the raw BOM/JSONC OpenCode and OhMy payloads and requires manifest metadata to match their deterministic routes, agents, categories, current selection, and IDA warning. It creates a unique backup outside active config, records every conflicting peer and launcher in `backup-map.tsv`, writes exact files atomically, and removes backed-up peers absent from the clone. Validation runs with `HOME` and `USERPROFILE` set to the recipient: OpenCode config and exact route lines, each exact agent key through `opencode debug agent`, and the restored launcher’s current model/variant/profile when present. Category fidelity is established by the verified payload hash and byte-exact restored OhMy file. It performs no network access, package installation, upload, or backup deletion.

CLI failures intentionally report only the failed command. Detailed archive paths, filenames, routes, homes, hashes, and values are never printed; discard a failed archive and diagnose through trusted local library tests rather than exposing its contents.

## Failure, rollback, and disposal

Any validation failure triggers automatic rollback: backed-up files are restored and destinations recorded as `NEW_FILE` are removed. Environment variables are restored in `finally`; the backup directory is retained. Do not delete it until the owner confirms the restarted setup works.

After success, restart OpenCode. IDA MCP commands often contain sender-specific absolute machine paths; adjust them for the recipient machine or disable that MCP before use. After acceptance, securely dispose of the ZIP and extracted review directory while retaining the rollback backup until no longer needed.

## 简明交接

这是**未加密且包含密钥**的完整 Windows 环境克隆，只能交给可信收件人。先运行 `inspect`，再用两个确认参数 `extract`，关闭所有 OpenCode 进程后运行 `restore-windows.ps1 -AcknowledgeSecrets`。恢复失败会自动回滚；成功后重启 OpenCode，并调整或禁用新机器不适用的 IDA MCP 绝对路径。确认正常后安全销毁 ZIP 和解压目录，暂时保留回滚备份。
