# Redacted OpenCode Configuration Packs

`omo-model-pack` creates a standard ZIP archive containing a **sanitized migration template** for the active OpenCode and OhMy configuration files. It is designed to be sent to another person or agent without sharing credentials.

## Security boundary

The packer deliberately redacts API keys, access tokens, authorization and bearer values, cookies, credentials, passwords, private keys, client secrets, session values, base URLs, and every `http://` or `https://` string. It has no option to include secrets.

Treat the resulting archive as a configuration shape and routing template, **not** as a working credential backup. A recipient must obtain provider credentials and endpoint information through their own approved setup process.

The packer checks these file names in this exact order and exports only the first existing file from each row:

| Config family | Required? | Precedence, first to last |
| --- | --- | --- |
| OpenCode base | Yes | `opencode.jsonc`, `opencode.json` |
| OhMy routing | Yes | `oh-my-openagent.jsonc`, `oh-my-openagent.json`, `oh-my-opencode.jsonc`, `oh-my-opencode.json` |
| OpenCode TUI | No | `tui.jsonc`, `tui.json` |
| DCP | No | `dcp.jsonc`, `dcp.json` |

“Active artifact” means the first existing file in one row. The packer excludes lower-precedence peers, backups, logs, `node_modules`, arbitrary scripts, plugin files, package metadata, launchers, and unrelated files. It never changes active OpenCode configuration, creates profile backups, or calls `omo-model --use`.

The sanitizer keeps safe template information such as provider/model route IDs, reasoning variants, numeric model limits, and numeric concurrency settings. It removes or replaces credentials, URLs, unknown values, and unsafe keys. Do not expect every source key or value to survive, and do not require one exact placeholder spelling.

## Create a pack

Use the checklist literally:

1. Confirm whether OpenCode runs on Windows or Linux/WSL. Do not mix their home directories.
2. Identify the exact home directory containing `.config/opencode`. Pass that directory with `--home`; do not change the shell's `HOME` variable.
3. Choose either the **installed command** lane or the **repository checkout** lane below. Do not mix lanes.
4. Choose a new `.zip` path whose parent directory already exists and which is outside the source home’s `.config/opencode` directory.
5. Run `create`. Exit code `0` means success; any nonzero exit means stop.
6. Confirm the printed `Source home:` is exactly the home selected in step 2. If it differs, discard the ZIP and stop.
7. Run `inspect` using the matching lane. Exit code `0` means the archive is internally consistent.

`--home` is the source operating-system home, not the `.config/opencode` directory itself. For a synthetic test fixture, pass the exact synthetic home supplied by the test owner. Never fall back to a real user home when a fixture path was supplied.

**Windows PowerShell warning:** variable names are case-insensitive. `$home` and `$HOME` are the same built-in variable. Never assign either name in a script or test. Use the exact variable names `$sourceHome` for export and `$recipientHome` for import, as shown below, and pass them with `--home`.

### Windows PowerShell

Installed command lane:

```powershell
$sourceHome = [Environment]::GetFolderPath('UserProfile')
$pack = Join-Path ([Environment]::GetFolderPath('Desktop')) 'my-opencode.omo-model-config-pack.zip'
omo-model-pack create --home "$sourceHome" --output "$pack"
omo-model-pack inspect "$pack"
```

Repository checkout lane, run from the repository root:

```powershell
$sourceHome = [Environment]::GetFolderPath('UserProfile')
$pack = Join-Path ([Environment]::GetFolderPath('Desktop')) 'my-opencode.omo-model-config-pack.zip'
node .\bin\omo-model-pack.js create --home "$sourceHome" --output "$pack"
node .\bin\omo-model-pack.js inspect "$pack"
```

### Linux or WSL

Installed command lane:

```bash
source_home="$HOME"
pack="$HOME/Desktop/my-opencode.omo-model-config-pack.zip"
omo-model-pack create --home "$source_home" --output "$pack"
omo-model-pack inspect "$pack"
```

Repository checkout lane, run from the repository root:

```bash
source_home="$HOME"
pack="$HOME/Desktop/my-opencode.omo-model-config-pack.zip"
node ./bin/omo-model-pack.js create --home "$source_home" --output "$pack"
node ./bin/omo-model-pack.js inspect "$pack"
```

Successful `create` and `inspect` output must list logical roles and target paths only. A normal pack contains required roles `opencode-base` and `oh-my-config`, plus optional `opencode-tui` and `opencode-dcp`. Send that ZIP file to the recipient through a trusted channel. Do not send `.config/opencode` directly.

## Inspect before extracting

An agent receiving a pack must inspect it before extracting or copying anything. Inspection verifies internal consistency: the manifest, file hashes, archive paths, entry count, and archive size limits without writing files. It does **not** authenticate the sender; obtain the archive through a trusted channel.

Installed command:

```bash
omo-model-pack inspect my-opencode.omo-model-config-pack.zip
```

Repository checkout, run from the repository root:

```bash
node ./bin/omo-model-pack.js inspect my-opencode.omo-model-config-pack.zip
```

The output shows only logical artifact roles and target paths such as `opencode-config/opencode.jsonc`. These are installation targets, not physical ZIP names. Physical ZIP entries live under `omo-model-config-pack/config/`, and the manifest is `omo-model-config-pack/manifest.json`. The command must never show raw config values, API credentials, or endpoints.

## Extract into a new temporary directory

Extraction refuses to overwrite an existing destination. Choose a new directory whose parent already exists, outside the active config directory. Pass the recipient operating-system home with `--home`; this lets the packer reject protected recipient paths. `inspect` does not use `--home`.

### Windows PowerShell

Installed command lane:

```powershell
$recipientHome = [Environment]::GetFolderPath('UserProfile')
$review = Join-Path ([Environment]::GetFolderPath('Desktop')) 'opencode-pack-review'
omo-model-pack extract .\my-opencode.omo-model-config-pack.zip --home "$recipientHome" --to "$review"
```

Repository checkout lane, run from the repository root:

```powershell
$recipientHome = [Environment]::GetFolderPath('UserProfile')
$review = Join-Path ([Environment]::GetFolderPath('Desktop')) 'opencode-pack-review'
node .\bin\omo-model-pack.js extract .\my-opencode.omo-model-config-pack.zip --home "$recipientHome" --to "$review"
```

### Linux or WSL

Installed command lane:

```bash
recipient_home="$HOME"
review="$HOME/Desktop/opencode-pack-review"
omo-model-pack extract ./my-opencode.omo-model-config-pack.zip --home "$recipient_home" --to "$review"
```

Repository checkout lane, run from the repository root:

```bash
recipient_home="$HOME"
review="$HOME/Desktop/opencode-pack-review"
node ./bin/omo-model-pack.js extract ./my-opencode.omo-model-config-pack.zip --home "$recipient_home" --to "$review"
```

The extracted layout is:

```text
opencode-pack-review/
  manifest.json
  config/
```

## Manual installation procedure for another agent

There is intentionally no automatic import command. A generic automatic merge cannot know which recipient credentials, endpoints, plugins, paths, or routes are authorized. Follow these phases literally.

### Phase A — review only, no approval required

1. Confirm the operating system where the recipient’s OpenCode runs. Never mix Windows and WSL/Linux homes.
2. Run `inspect`, then extract into a new review directory using one complete installed or checkout command lane above.
3. Read `manifest.json` and compare the extracted templates with the recipient config locally. Never paste either config into chat.
4. Make a merge plan with one row per artifact: pack role, extracted filename, recipient destination, keys proposed for import, recipient keys that must stay unchanged, and blockers.
5. Stop and show the owner only route IDs, filenames, and the merge plan. Do not create backups or modify active config yet.

### Phase B — obtain exact approval

The owner must approve all three items before any write:

1. The exact destination files.
2. The exact keys/routes to import.
3. Whether each destination is a merge or a replacement. Default to **merge**. Replacement is forbidden unless the owner explicitly says “replace” for that exact file.

If approval is incomplete, stop. Approval to inspect or extract is not approval to install.

### Phase C — create rollback backups

Back up only the approved destination files, before changing any of them. The backup directory must be outside the active config root. Keep a `backup-map.tsv` that maps each destination to its backup. If a destination does not exist, record `NEW_FILE` so rollback knows to remove it.

Windows PowerShell:

```powershell
$recipientHome = [Environment]::GetFolderPath('UserProfile')
$configRoot = Join-Path $recipientHome '.config\opencode'
$stamp = Get-Date -Format 'yyyyMMdd-HHmmss-fff'
$backupRoot = Join-Path $recipientHome ".config\opencode-import-backups\$stamp"
New-Item -ItemType Directory -Path $backupRoot -Force | Out-Null

# Replace this example list with only the exact destination files the owner approved.
$destinations = @(
  (Join-Path $configRoot 'opencode.jsonc'),
  (Join-Path $configRoot 'oh-my-openagent.json')
)

foreach ($destination in $destinations) {
  if (Test-Path -LiteralPath $destination -PathType Leaf) {
    $backup = Join-Path $backupRoot ([IO.Path]::GetFileName($destination))
    Copy-Item -LiteralPath $destination -Destination $backup
    "$destination`t$backup" | Add-Content -LiteralPath (Join-Path $backupRoot 'backup-map.tsv')
  } else {
    "$destination`tNEW_FILE" | Add-Content -LiteralPath (Join-Path $backupRoot 'backup-map.tsv')
  }
}
```

Linux or WSL:

```bash
recipient_home="$HOME"
config_root="$recipient_home/.config/opencode"
stamp="$(date +%Y%m%d-%H%M%S)"
backup_root="$recipient_home/.config/opencode-import-backups/$stamp"
mkdir -p "$backup_root"

# Replace this example list with only the exact destination files the owner approved.
destinations=("$config_root/opencode.jsonc" "$config_root/oh-my-openagent.json")
for destination in "${destinations[@]}"; do
  if [ -f "$destination" ]; then
    backup="$backup_root/$(basename "$destination")"
    cp -- "$destination" "$backup"
    printf '%s\t%s\n' "$destination" "$backup" >> "$backup_root/backup-map.tsv"
  else
    printf '%s\tNEW_FILE\n' "$destination" >> "$backup_root/backup-map.tsv"
  fi
done
```

### Phase D — merge approved template fields

Apply these rules in order:

1. Use the recipient’s currently active filename for each family according to the precedence table above. Do not create a higher-precedence peer accidentally. If the recipient has no file for a family, ask the owner which filename to create.
2. Never copy a key named like `<redacted-key-N>` or a value beginning with `<redacted-`. Never copy sender credentials, provider URLs, authorization headers, plugin paths, MCP settings, shell paths, LSP paths, or other machine-specific values.
3. **OpenCode base:** preserve the recipient’s `options`, `apiKey`, `baseURL`, `headers`, `plugin`, `mcp`, `shell`, `lsp`, and path settings. Import only owner-approved provider/model structure. A provider route is unusable until the recipient configures its own credential and endpoint through an authorized provider setup workflow.
4. **OhMy routing:** import only owner-approved `agents`, `categories`, reasoning variants, and numeric concurrency entries. Before importing a route, confirm that exact `provider/model` route exists in the recipient OpenCode base config.
5. **TUI and DCP:** skip by default because they are machine-specific. Merge only exact keys the owner separately approved.
6. Preserve JSONC comments when editing an existing `.jsonc` file. Do not convert a recipient `.jsonc` file to `.json` merely because the pack used `.json`.
7. Full-file replacement remains forbidden unless the owner approved replacement for that exact destination after reviewing the redacted template and supplying every required recipient-owned value.
8. If you cannot perform a field-level merge while preserving every unapproved recipient field, stop and ask for a more capable operator. Never replace the whole file as a shortcut.

### Phase E — validate, restart, or roll back

After the approved edits, but before declaring success:

1. Search the destination files locally for `<redacted-`. Report only filenames and counts. If any placeholder remains, validation fails.
2. Run `opencode debug config` with its output suppressed. A nonzero exit means validation fails. Use `opencode debug config *> $null` in Windows PowerShell or `opencode debug config >/dev/null` in Linux/WSL.
3. Run `opencode models` and confirm every newly approved route is present.
4. Run `opencode agent list` when agent/category routing changed.
5. Restart OpenCode because config-time files are loaded at startup.
6. If `omo-model` is installed, run `omo-model --current` as a read-only route check. Never run `omo-model --use <number>` unless the owner separately requests a route change.

If any validation step fails, close OpenCode and roll back immediately using `backup-map.tsv`:

1. For each `destination<TAB>backup` row, copy the backup over the destination.
2. For each `destination<TAB>NEW_FILE` row, remove only that newly created destination.
3. Before launching the UI, run `opencode debug config` with output suppressed and run `opencode models`. If either fails, stop and keep the backups.
4. Restart OpenCode only after those checks pass.
5. After restart, repeat any applicable `opencode agent list` and `omo-model --current` checks.
6. Keep the backup directory until the owner confirms the recovered setup works. Never delete backups merely because rollback succeeded.

Windows PowerShell rollback, after setting `$backupRoot` to the exact Phase C directory:

```powershell
$map = Join-Path $backupRoot 'backup-map.tsv'
foreach ($row in Get-Content -LiteralPath $map) {
  $destination, $backup = $row -split "`t", 2
  if ($backup -eq 'NEW_FILE') {
    if (Test-Path -LiteralPath $destination -PathType Leaf) {
      Remove-Item -LiteralPath $destination
    }
  } else {
    Copy-Item -LiteralPath $backup -Destination $destination -Force
  }
}
opencode debug config *> $null
if ($LASTEXITCODE -ne 0) { throw 'Rollback validation failed' }
opencode models
```

Linux or WSL rollback, after setting `backup_root` to the exact Phase C directory:

```bash
while IFS=$'\t' read -r destination backup; do
  if [ "$backup" = "NEW_FILE" ]; then
    rm -f -- "$destination"
  else
    cp -- "$backup" "$destination"
  fi
done < "$backup_root/backup-map.tsv"
opencode debug config >/dev/null
opencode models
```

After either rollback block succeeds, restart OpenCode and repeat any applicable `opencode agent list` and `omo-model --current` checks.

## Required agent behavior

- Never request an unredacted archive as a shortcut for credentials.
- Never paste extracted raw configuration into chat.
- Never blindly overwrite a recipient's active config.
- Never modify provider credentials, endpoints, or model routes unless the recipient explicitly directs that change.
- If a required config file is missing, stop and ask the recipient where OpenCode runs instead of guessing a cross-platform location.

## Troubleshooting

| Situation | Safe response |
| --- | --- |
| `Output archive already exists` | Pick a new filename; do not overwrite an existing shared pack. |
| `Missing an active OpenCode configuration file` | Run the command in the OS account that owns the active OpenCode install. |
| `Missing an active OhMy configuration file` | The packer requires a real OhMy configuration; install/configure OhMy separately before packaging. |
| `Archive checksum mismatch` | Discard the archive and request a newly generated pack. Do not extract it. |
| A redacted placeholder appears in a provider block | Supply the recipient's own authorized credential or endpoint through their provider setup workflow. |
