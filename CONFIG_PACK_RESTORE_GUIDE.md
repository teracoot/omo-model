# Redacted OpenCode Configuration Packs

`omo-model-pack` creates a standard ZIP archive containing a **sanitized migration template** for the active OpenCode and OhMy configuration files. It is designed to be sent to another person or agent without sharing credentials.

## Security boundary

The packer deliberately redacts API keys, access tokens, authorization and bearer values, cookies, credentials, passwords, private keys, client secrets, session values, base URLs, and every `http://` or `https://` string. It has no option to include secrets.

Treat the resulting archive as a configuration shape and routing template, **not** as a working credential backup. A recipient must obtain provider credentials and endpoint information through their own approved setup process.

The packer includes only known active artifacts when they exist:

- `opencode.jsonc` and `opencode.json`
- `oh-my-openagent.jsonc`, `oh-my-openagent.json`, `oh-my-opencode.jsonc`, and `oh-my-opencode.json`
- `tui.jsonc`, `tui.json`, `dcp.jsonc`, and `dcp.json`

For each config family, it exports only the active file selected by the same precedence order used by `omo-model`; it does not bundle inactive `.json`/`.jsonc` peers. It excludes backups, logs, `node_modules`, arbitrary scripts, plugins, package metadata, launchers, and unrelated files. It never changes active OpenCode configuration, creates profile backups, or calls `omo-model --use`.

## Create a pack

Run the command in the same operating-system account where OpenCode is configured. The output path must be a new `.zip` file outside `~/.config/opencode`.

### Windows PowerShell

```powershell
omo-model-pack create --output "$HOME\Desktop\my-opencode.omo-model-config-pack.zip"
```

From a repository checkout instead:

```powershell
node .\bin\omo-model-pack.js create --output "$HOME\Desktop\my-opencode.omo-model-config-pack.zip"
```

### Linux or WSL

```bash
omo-model-pack create --output "$HOME/Desktop/my-opencode.omo-model-config-pack.zip"
```

From a repository checkout instead:

```bash
node ./bin/omo-model-pack.js create --output "$HOME/Desktop/my-opencode.omo-model-config-pack.zip"
```

Send that ZIP file to the recipient. Do not send `~/.config/opencode` directly.

## Inspect before extracting

An agent receiving a pack must inspect it before extracting or copying anything. Inspection verifies internal consistency: the manifest, file hashes, archive paths, entry count, and archive size limits without writing files. It does **not** authenticate the sender; obtain the archive through a trusted channel.

```bash
omo-model-pack inspect my-opencode.omo-model-config-pack.zip
```

The output shows only logical artifact roles and target paths. It must never show raw config values, API credentials, or endpoints.

## Extract into a new temporary directory

Extraction refuses to overwrite an existing destination. Choose a new directory whose parent already exists, outside the active config directory.

### Windows PowerShell

```powershell
omo-model-pack extract .\my-opencode.omo-model-config-pack.zip --to "$HOME\Desktop\opencode-pack-review"
```

### Linux or WSL

```bash
omo-model-pack extract ./my-opencode.omo-model-config-pack.zip --to "$HOME/Desktop/opencode-pack-review"
```

The extracted layout is:

```text
opencode-pack-review/
  manifest.json
  config/
```

## Manual installation procedure for another agent

Do **not** automatically copy extracted files into a live configuration directory. Follow these steps only after the owner explicitly approves the exact files to merge or replace.

1. Confirm the target operating system where OpenCode actually runs. Do not mix Windows and WSL/Linux homes.
2. Inspect `manifest.json` and the extracted files. Confirm that they are redacted templates and that the intended provider/model routes are appropriate.
3. Back up each destination file before an approved merge or replacement. Use a timestamped copy in a directory outside the active config root.
4. Merge the exported structure with the recipient's existing config. Preserve the recipient's current credentials, provider URLs, local plugin paths, and machine-specific settings. Never copy a `<redacted-secret>` or `<redacted-url>` placeholder into a working provider configuration.
5. Copy a config artifact only after approval into the platform's active config root:
   - Windows: `%USERPROFILE%\.config\opencode`
   - Linux or WSL: `$HOME/.config/opencode`
6. Install or update `omo-model` separately from the trusted repository/package source if the recipient needs its launcher; the pack intentionally never includes executable launcher files.
7. Restart OpenCode after any config-time file change. OpenCode reads configuration at startup.
8. After the user has completed the authorized setup, run only a read-only check such as `omo-model --current`. Do not run `omo-model --use <number>` unless the user separately asks to change the active route.

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
