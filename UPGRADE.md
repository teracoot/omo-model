# Upgrade omo-model from any GitHub version

This procedure is written for an AI agent upgrading an installation that may be as old as the first GitHub commit. Do not assume the old installation has `--current`, `--routes`, PowerShell launchers, package metadata, or the current profile schema.

The upgrade changes the `omo-model` program only. It must not replace, merge, sanitize, or print the user's active OpenCode or OhMy configuration. In particular, never display or copy `baseURL`, `apiKey`, token, authorization, secret, credential, or private endpoint values.

## Mandatory boundary

1. Ask which existing OpenCode provider/model routes the user wants to keep as profiles. Recommend multiple profiles. If the user does not choose a subset, use every detected route.
2. Confirm whether OpenCode runs on Windows or Linux/WSL. Perform the entire upgrade in that same OS environment and user account.
3. Do not close, kill, launch, or restart OpenCode. Existing processes keep their loaded routing; the user decides whether and when to restart.
4. Do not run `omo-model --use` during the upgrade. Upgrade and read-only validation must not change active routing.
5. Use a new checkout for migration. Do not pull over an unknown or customized old checkout before its profile file is backed up and reviewed.

## 1. Inventory without changing anything

Record the current command resolution and Node/npm environment. A missing command or missing package version is expected for the earliest installations.

When the resolved old command supports them, also record the output of `omo-model --current` and `omo-model --list` so the post-upgrade state can be compared without switching profiles. If either option is unsupported, record that fact and continue.

Windows PowerShell:

```powershell
where.exe omo-model
where.exe node
node --version
npm --version
npm ls -g omo-model --depth=0
Get-Command omo-model -All | Select-Object CommandType, Source, Definition
```

Linux or WSL:

```bash
command -V omo-model || true
command -v node
node --version
npm --version
npm ls -g omo-model --depth=0 || true
```

Classify every discovered installation into one or more lanes:

- **GitHub-global:** npm reports `omo-model` beneath the global npm root.
- **Linked checkout:** the npm entry or resolved command points into a local Git checkout. This is the likely lane when profiles were customized.
- **Original Node checkout:** a checkout contains `bin/omo-model.js` and `bin/omo-model-profiles.js`, possibly without a usable installed command or current package metadata.
- **Standalone Windows launcher:** `%USERPROFILE%\.local\bin\omo-model.ps1` and/or `omo-model.cmd` exists.

If more than one lane exists, treat it as a command-precedence conflict. Preserve each lane first, choose one target lane with the user, and do not delete shadowed copies automatically.

## 2. Back up the program and profile definitions

Create a timestamped directory outside the checkout, `%USERPROFILE%\.config\opencode`, and `$HOME/.config/opencode`. Copy only program/profile artifacts into it:

- every discovered `bin/omo-model-profiles.js`
- every standalone `omo-model.ps1` and `omo-model.cmd`
- `package.json` from each discovered checkout, when present
- the current commit ID and branch from each Git checkout
- the command-resolution and npm inventory from step 1

Do not place active OpenCode configuration or credentials in the Git checkout. Do not commit the backup. Keep it until the upgraded command has passed validation.

## 3. Detect routes safely

Use the active OpenCode config in the confirmed OS account. Prefer an already working `omo-model --routes`. If the old command does not support `--routes`, defer this detection until the new checkout exists in step 4, then run its local command before linking:

Windows PowerShell:

```powershell
node .\bin\omo-model.js --routes
```

Linux or WSL:

```bash
node ./bin/omo-model.js --routes
```

Report only `<provider-id>/<model-id>` route IDs. Never print provider objects, endpoint URLs, headers, or credential values.

## 4. Create a clean current checkout

Until the current release is merged into the default branch, use the explicit current branch. Do not install the unpublished npm package name.

```bash
git clone --branch feat/exact-environment-clone --single-branch https://github.com/teracoot/omo-model.git omo-model-current
cd omo-model-current
node --check bin/omo-model-profiles.js
```

Confirm `package.json` reports the expected version from the repository. At the time this guide was written, that version is `1.2.0`. Do not infer the installed version from an old command that has no version flag.

## 5. Migrate profiles deliberately

Choose exactly one profile strategy:

### Bundled profiles are sufficient

Keep the new checkout's `bin/omo-model-profiles.js` unchanged. Continue only if every profile route the user wants exists in the active OpenCode config.

### The old installation was customized

Treat a backed-up `bin/omo-model-profiles.js` or the `$Profiles` table in a standalone `omo-model.ps1` as reference data, not as a file to copy over the new implementation. Rebuild `bin/omo-model-profiles.js` in the new checkout using the current object shape documented in `README.md`.

- Include only routes detected in step 3.
- Preserve the user's intended names, variants, reasoning efforts, and concurrency routes when they remain valid.
- Add `providerName` and `modelName` only when they are known from the existing profile or active config; never invent provider metadata.
- Omit obsolete cleanup/disable-plugin profiles unless duplicate or stale OhMy plugin state is the explicit current problem.
- Never place credentials, base URLs, tokens, provider configuration, or private headers in the profile file.

Validate the migrated file before installing:

```bash
node --check bin/omo-model-profiles.js
node ./bin/omo-model.js --list
```

`--list` is read-only. Stop if it reports a missing route, invalid profile, unexpected bundled profile, or a different OS account's configuration.

## 6. Install one authoritative command lane

Use `npm link` for a customized checkout:

```bash
npm link
```

Use the explicit GitHub branch only when bundled profiles are sufficient and no local profile customization is needed:

```bash
npm install -g "github:teracoot/omo-model#feat/exact-environment-clone"
```

Do not use `npm install -g omo-model`: the package is not currently published to npm. Do not remove old standalone launchers or checkouts yet.

## 7. Verify command precedence and behavior

Resolve the command again using the step 1 commands. The first resolved `omo-model` must be the lane installed in step 6. If an older standalone launcher or npm binary shadows it, stop and ask the user which copy to retain. Rename or remove an old copy only with explicit user approval and only after its backup exists.

Run read-only validation:

```bash
omo-model --current
omo-model --list
omo-model --routes
```

Confirm:

- the active model, variant, and reasoning effort match the pre-upgrade state
- all desired profiles are present and numbered sequentially
- every profile route exists in `--routes`
- no provider credential or active config field changed during the upgrade

The upgraded program is ready when these checks pass. Existing OpenCode processes still use their already-loaded configuration; a newly started process reads the files then on disk.

## 8. Roll back if validation fails

Do not run a profile switch to test a broken upgrade.

- For a linked checkout, run `npm unlink -g omo-model`, restore/relink the backed-up checkout, and re-run its read-only status command if available.
- For a GitHub-global install, reinstall the exact previously recorded Git commit or restore the backed-up command lane.
- For standalone Windows launchers, restore the backed-up `.ps1` and `.cmd` only after confirming their destination with the user.

Active OpenCode and OhMy configuration should require no rollback because this procedure never writes it. If any config changed, stop: that was outside this upgrade contract. Restore it only from a user-approved pre-existing backup.

## Required agent report

Report:

- detected old installation lane(s)
- backup directory
- selected target lane
- repository branch and commit installed
- package version from the new checkout
- whether custom profiles were rebuilt or bundled profiles retained
- `omo-model --current`, profile count, and route count without secrets
- any old shadowed copy left in place
- that existing OpenCode processes were not restarted
