# omo-model

`omo-model` is a small command line tool for switching an existing OhMyOpenAgent / Oh My OpenCode installation between numbered model-routing profiles.

It is designed for agent operators who already have OpenCode and OhMyOpenAgent installed. It edits the active config under `~/.config/opencode`, updates every OhMy agent and category to the selected model route, writes matching background concurrency settings, creates a timestamped backup, and tells the user to start a new OpenCode session so the route reloads.

This README is intentionally explicit. Some agents installing this for a user will be older models with weak memory and weak config instincts. Follow the steps literally.

## What it changes

`omo-model --use <number>` changes the OhMyOpenAgent config, not the model provider itself.

It updates:

- every entry under `agents`
- every entry under `categories`
- `background_task.providerConcurrency`
- `background_task.modelConcurrency`

It validates first that the target provider and model already exist in the active OpenCode base config. If the provider/model is missing, it stops before writing.

It creates backups under:

```text
~/.config/opencode/profile-backups
```

On Windows this resolves to:

```text
C:\Users\<User>\.config\opencode\profile-backups
```

On Linux or WSL this resolves to:

```text
$HOME/.config/opencode/profile-backups
```

## What it does not do

`omo-model` does not install OpenCode, does not install OhMyOpenAgent, does not create provider credentials, and does not invent provider config. It only switches routes in an already-working setup.

If the user has not installed OhMyOpenAgent yet, do not run the installer immediately. First ask the route-selection question in the next section. After the user answers, declines to choose a subset, or asks to use all detected routes, confirm the OS environment where OpenCode runs, then use the normal installer in that same OS environment.

STOP: Do not run or copy the next command until the route-selection question has been asked and handled and the matching OpenCode OS environment has been confirmed. Do not run it from Windows for WSL/Linux OpenCode or from WSL/Linux for Windows OpenCode. If you have not already asked which existing OpenCode provider/model routes the user wants as `omo-model` profiles, ask that first and stop.

```bash
bunx oh-my-openagent install
```

## First thing agents must ask

Before running install, detection, or config commands, ask the user which existing OpenCode models they want exposed as `omo-model` profiles.

Use this exact question unless the user already answered it:

```text
Which existing OpenCode provider/model routes do you want me to add as omo-model profiles?

I recommend adding multiple profiles so you can switch quickly, for example one fast daily model and one stronger reasoning model.

If you reply with no subset, say to use all detected routes, decline to choose, or otherwise do not name specific routes, I will scan your active OpenCode config and add every configured provider/model route that is already present. I will not print API keys, base URLs, or secrets.
```

If the user answers with specific models, include only those detected models. If the user replies with no subset, says to use all detected routes, declines to choose, or otherwise does not name specific routes, default to every configured provider/model route found in the active OpenCode config. Never invent routes. `omo-model` can only switch to routes that already exist in OpenCode config.

Do this route-selection question first. After the user answers, or after they decline to choose a subset, determine whether OpenCode is running on Windows or Linux/WSL and inspect the matching config directory.

Do not ask a second open-ended model-selection question after detection. If the user did not choose a subset, continue with every detected provider/model route and summarize only the route names.

### How to detect existing models safely

Agents must inspect the config without leaking secrets. Do not paste raw config into chat. Summarize only provider IDs and model IDs.

When reporting detected routes or showing examples, never display raw `baseURL`, `apiKey`, `token`, `bearer`, `authorization`, `secret`, or credential values. Replace the entire value of any credential-like field with a placeholder. Do not show real endpoint hostnames from `baseURL` or credential fields, URL paths, query strings, headers, partial tokens, or partial credential values. Provider IDs may look like hostnames; those are allowed only as part of detected `provider-id/model-id` routes. Show only route IDs and placeholders such as `<redacted-base-url>` and `<redacted-api-key>`.

Run this detection block only after the route-selection question has been handled, and only when OpenCode is confirmed to run in Windows PowerShell. It uses a JSONC-aware parser from this package instead of regex comment stripping, so `https://` strings inside config values do not break detection.

Windows PowerShell:

```powershell
# If omo-model is already installed or linked in this Windows environment:
omo-model --routes

# If using a local checkout before linking:
node .\bin\omo-model.js --routes
```

Run this detection block only after the route-selection question has been handled, and only when OpenCode is confirmed to run in Linux or WSL. It uses a JSONC-aware parser from this package instead of regex comment stripping, so `https://` strings inside config values do not break detection.

Linux or WSL shell:

```bash
# If omo-model is already installed or linked in this Linux/WSL environment:
omo-model --routes

# If using a local checkout before linking:
node ./bin/omo-model.js --routes
```

If JSONC parsing fails because an obsolete model cannot run the command correctly, ask the user to point to the config file, inspect only the `provider` object, and never paste or print that object raw. Before showing any excerpt, remove or replace all secret-looking fields, including `baseURL`, `apiKey`, `token`, `bearer`, `authorization`, `secret`, and credential values.

## Install

STOP: The first action for any install, detection, profile customization, or switch task is to ask which existing OpenCode provider/model routes the user wants as `omo-model` profiles. Do not run `node`, `npm`, `bunx`, `opencode`, `omo-model`, config detection, or status commands until that question has been answered, declined, answered with use all detected routes, or already provided by the user.

Prerequisite: Node.js 18 or newer and npm must be available in the same OS environment where OpenCode runs. Run these checks only after route-selection is handled and only in the confirmed OS environment where OpenCode runs:

```bash
node --version
npm --version
```

Default for agents: if you need to customize `bin/omo-model-profiles.js` from detected routes, use a local checkout, edit that file, validate it, then run `npm link`. Use `npm install -g omo-model` only when the npm package is published and no profile customization is needed. Use `npm install -g github:teracoot/omo-model` only when the bundled profile list is sufficient.

Weak-agent rule: do not run the npm or GitHub global install blocks when user-specific detected profiles are needed. Use the local checkout customization path first, then `npm link`.

When published to npm, install or run it with npm tooling:

Run this block only after the route-selection question has been handled, only in the same OS environment where OpenCode runs, and only when the published package already contains the desired profiles.

```bash
npm install -g omo-model
omo-model --current
```

Install from GitHub before npm publication:

Run this block only after the route-selection question has been handled, only in the same OS environment where OpenCode runs, and only when the bundled profile list is sufficient.

```bash
npm install -g github:teracoot/omo-model
omo-model --current
```

For local checkout usage:

Run this checkout block only after the route-selection question, OS selection, and safe route detection are complete, and only in the same OS environment/account where OpenCode runs.

```bash
git clone https://github.com/teracoot/omo-model.git
cd omo-model
```

STOP before running any validation, link, or status command. Edit `bin/omo-model-profiles.js` now. Start from an empty `profiles` array or replace the bundled array entirely. Include only selected detected routes, or every detected route if no subset was chosen. Omit the cleanup profile unless duplicate/stale OhMy plugin state is specifically the issue. Add no credentials, base URLs, tokens, or provider config fields.

After editing profiles, validate syntax before linking:

```bash
node --check bin/omo-model-profiles.js
```

Inspect `bin/omo-model-profiles.js` directly and confirm the profile list contains only selected detected routes, or every detected route if no subset was chosen. Do not continue if it still shows bundled defaults when user-specific detected profiles are needed, if any unselected route remains, if credentials appear, or if the cleanup profile appears without an explicit stale duplicate plugin-state reason.

Only when OhMyOpenAgent exists in this same OS account, also run:

```bash
node ./bin/omo-model.js --list
```

If `--list` fails only because OhMyOpenAgent is missing in the current OS account, do not treat that as profile-file invalidity. Only after `bin/omo-model-profiles.js` has been edited and validated, link and smoke-check:

```bash
npm link
omo-model --current
```

You can also run it directly from the checkout. Do not run this status command until the route-selection question has been handled, the OpenCode OS environment has been confirmed, and the checkout is in that same OS environment/account:

```bash
node ./bin/omo-model.js --current
```

Agents should prefer the local checkout method when helping a user before npm publication, because it is deterministic and easy to inspect.

## OS and build selection

After the required route-selection question has been handled, determine whether OpenCode is running on Windows or Linux/WSL before installing, linking, detecting routes, or running status commands. Install or link `omo-model` only inside that same OS environment. Do not install/link on Windows until Windows OpenCode is confirmed. Do not install/link in Linux/WSL until Linux/WSL OpenCode is confirmed.

Only run these detection/status commands after the route-selection question has been handled. If the user has not chosen a subset, proceed with the documented default: detect and use every configured provider/model route.

Before install/link, run in the candidate OpenCode environment:

```bash
node -p "process.platform + ' ' + process.arch"
opencode --version
```

After install/link, or when `omo-model` is already available in the same OS environment, smoke-check with:

```bash
omo-model --current
```

### Windows OpenCode

If OpenCode is running from Windows PowerShell, run `omo-model` from Windows PowerShell too.

Use the Windows npm/OpenCode build. After install/link, or when the command is already available, check the commands with:

```powershell
where.exe opencode
where.exe omo-model
omo-model --list
```

The config path is:

```text
%USERPROFILE%\.config\opencode
```

Example switch:

Run this block only after route-selection, OS selection, profile detection/customization, and `omo-model --list` mapping are complete.

```powershell
omo-model --use 0
```

### Linux or WSL OpenCode

If OpenCode is running inside Linux or WSL, run `omo-model` inside that same Linux/WSL shell.

Use the Linux npm/OpenCode build. After install/link, or when the command is already available, check the commands with:

```bash
command -v opencode
command -v omo-model
omo-model --list
```

The config path is:

```text
$HOME/.config/opencode
```

Example switch:

Run this block only after route-selection, OS selection, profile detection/customization, and `omo-model --list` mapping are complete.

```bash
omo-model --use 0
```

Do not mix Windows and WSL configs. A Windows-side switch edits the Windows config. A WSL-side switch edits the WSL/Linux config. Existing OpenCode sessions keep their old route in memory until restarted.

## Config locations agents must check

`omo-model` resolves config from `HOME` and checks these files in this order:

OhMyOpenAgent config candidates:

1. `oh-my-openagent.jsonc`
2. `oh-my-openagent.json`
3. `oh-my-opencode.jsonc`
4. `oh-my-opencode.json`

OpenCode base config candidates:

1. `opencode.jsonc`
2. `opencode.json`

Windows locations:

```text
C:\Users\<User>\.config\opencode\opencode.jsonc
C:\Users\<User>\.config\opencode\opencode.json
C:\Users\<User>\.config\opencode\oh-my-openagent.jsonc
C:\Users\<User>\.config\opencode\oh-my-openagent.json
C:\Users\<User>\.config\opencode\oh-my-opencode.jsonc
C:\Users\<User>\.config\opencode\oh-my-opencode.json
```

Linux or WSL locations:

```text
$HOME/.config/opencode/opencode.jsonc
$HOME/.config/opencode/opencode.json
$HOME/.config/opencode/oh-my-openagent.jsonc
$HOME/.config/opencode/oh-my-openagent.json
$HOME/.config/opencode/oh-my-opencode.jsonc
$HOME/.config/opencode/oh-my-opencode.json
```

Project-local `.opencode` config is not the normal target for this standalone switcher. Run it in the same user account and OS where OpenCode loads OhMyOpenAgent.

## Redacted config examples

Do not copy secrets from these examples. They show shape only. Replace placeholders with real user-owned values only when the user explicitly authorizes provider setup.

Example redacted OpenCode base config:

```jsonc
{
  "plugin": ["oh-my-openagent"],
  "provider": {
    "example-openai-compatible": {
      "npm": "@opencode-ai/openai-compatible",
      "name": "Example OpenAI-compatible provider",
      "options": {
        "baseURL": "https://<redacted-base-url>/v1",
        "apiKey": "<redacted-api-key>"
      },
      "models": {
        "gpt-5.5": {},
        "gpt-5.5-xhigh": {}
      }
    },
    "example-anthropic-compatible": {
      "npm": "@opencode-ai/anthropic-compatible",
      "name": "Example Anthropic-compatible provider",
      "options": {
        "baseURL": "https://<redacted-base-url>",
        "apiKey": "<redacted-api-key>"
      },
      "models": {
        "claude-opus-4-8-max": {}
      }
    }
  }
}
```

Example redacted OhMyOpenAgent config before a switch:

```jsonc
{
  "agents": {
    "primary": {
      "model": "example-openai-compatible/gpt-5.5",
      "variant": "xhigh",
      "reasoningEffort": "xhigh"
    },
    "review": {
      "model": "example-anthropic-compatible/claude-opus-4-8-max",
      "variant": "max"
    }
  },
  "categories": {
    "deep": {
      "model": "example-openai-compatible/gpt-5.5",
      "variant": "xhigh",
      "reasoningEffort": "xhigh"
    }
  },
  "background_task": {
    "providerConcurrency": {
      "example-openai-compatible": 5
    },
    "modelConcurrency": {
      "example-openai-compatible/gpt-5.5": 5
    }
  }
}
```

After `omo-model --use <number>`, all `agents` and `categories` point to the selected profile's model and variant. The backup under `profile-backups` is the rollback path.

## Turn detected routes into profiles

This package ships with a default `bin/omo-model-profiles.js`. When helping a user install their own copy, agents may need to customize this file so the profile list matches the user's existing OpenCode config.

Only add profiles for routes that were detected in `opencode.jsonc` or `opencode.json`. A route has this shape:

```text
<provider-id>/<model-id>
```

For each detected route the user wants, add one object to `profiles`:

```js
{
  name: "Short user-facing profile name",
  model: "<provider-id>/<model-id>",
  variant: "max",
  reasoningEffort: null,
  providerConcurrency: "<provider-id>",
  modelConcurrency: "<provider-id>/<model-id>",
}
```

Use `variant: "xhigh"` and `reasoningEffort: "xhigh"` only when the user explicitly requested xhigh reasoning or the detected provider/model route itself, or a pre-existing detected profile name, clearly contains `xhigh`. Do not invent an xhigh profile name to justify xhigh. For normal max-style routes, use `variant: "max"` and `reasoningEffort: null`.

Example detected routes:

```text
fast-openai/gpt-5.5-mini
reasoning-openai/gpt-5.5-xhigh
anthropic-main/claude-opus-4-8-max
```

Example customized profile entries:

```js
export const profiles = [
  {
    name: "Fast daily model",
    model: "fast-openai/gpt-5.5-mini",
    variant: "max",
    reasoningEffort: null,
    providerConcurrency: "fast-openai",
    modelConcurrency: "fast-openai/gpt-5.5-mini",
  },
  {
    name: "Strong xhigh reasoning",
    model: "reasoning-openai/gpt-5.5-xhigh",
    variant: "xhigh",
    reasoningEffort: "xhigh",
    providerConcurrency: "reasoning-openai",
    modelConcurrency: "reasoning-openai/gpt-5.5-xhigh",
  },
  {
    name: "Claude max",
    model: "anthropic-main/claude-opus-4-8-max",
    variant: "max",
    reasoningEffort: null,
    providerConcurrency: "anthropic-main",
    modelConcurrency: "anthropic-main/claude-opus-4-8-max",
  },
];
```

If the user did not choose a subset, add every detected route as a profile. When generating a user-specific profile list from detected routes, start from an empty `profiles` array or replace the bundled array entirely; do not edit around the bundled defaults. Omit the cleanup profile unless the user specifically has duplicate plugin entries or stale plugin state. When starting from the bundled `bin/omo-model-profiles.js`, delete the cleanup profile object from generated user-specific lists unless stale duplicate plugin state is the explicit target. Do not add API keys, base URLs, tokens, or provider credential fields to `omo-model-profiles.js`; it stores route names only.

## Validation checklist

These validation commands are allowed only after the route-selection question, OS selection, safe route detection, and profile customization steps are complete.

After editing `bin/omo-model-profiles.js`, run:

```bash
node --check bin/omo-model-profiles.js
node ./bin/omo-model.js --list
```

`node --check bin/omo-model-profiles.js` must pass. Then run `node ./bin/omo-model.js --list` if OhMyOpenAgent is installed in this same OS account. If `--list` fails because OhMyOpenAgent is not installed in the current OS account, that does not prove the profile file is invalid.

Package smoke check after install or link:

```bash
omo-model --current
```

If this fails only because OhMyOpenAgent is missing in the current OS account, treat it as an environment/setup prerequisite issue, not proof that `npm install` or `npm link` failed.

For direct checkout usage, this equivalent smoke check is also acceptable:

```bash
node ./bin/omo-model.js --current
```

## Commands

Reference only. Do not run any command in this table before route-selection and OS selection. For install or customization, complete safe detection and profile generation first; for switching, map the requested route to a visible profile number first.

```text
omo-model --list           Show current route and numbered profiles
omo-model -l               Same as --list
omo-model --current        Show current route only
omo-model -c               Same as --current
omo-model --routes         Show configured OpenCode provider/model routes
omo-model --use <number>   Switch all OhMy agents/categories to profile number
omo-model -u <number>      Same as --use
omo-model --help           Show help
```

## Included profiles

The current profile list is:

| Number | Name | Purpose |
| --- | --- | --- |
| `0` | `TSNUI GPT-5.5 xhigh` | Route everything to `ai.tsnui.com/gpt-5.5` with xhigh reasoning. |
| `1` | `Feiyuan GPT-5.5 xhigh` | Route everything to `feiyuan:manual:openai/gpt-5.5-xhigh`. |
| `2` | `PQAPI GPT-5.5 xhigh` | Route everything to `www.pqapi.space/gpt-5.5`. |
| `3` | `Feiyuan Claude Opus 4.8 Max` | Route everything to `feiyuan:manual:anthropic/claude-opus-4-8-max`. |
| `4` | `bxcv.store Claude Fable 5 Max` | Route everything to `bxcv.store/claude-fable-5-max`. |
| `5` | `bxcv.store Claude Opus 4.8 Max` | Route everything to `bxcv.store/claude-opus-4-8-max`. |
| `6` | `Clear duplicate OMO plugin from opencode.json` | Cleanup profile, not a model route. |
| `7` | `opus-free` | Route everything to `opus-free/opus-free`. |

Profile `6` is special. Use it only when the user has duplicate `oh-my-opencode` / `oh-my-openagent` plugin entries or stale `opencode.json` plugin state. It does not switch model routes.

This cleanup profile is part of the package's shipped default list only. When generating a user-specific profile list from detected routes, do not keep or recreate this cleanup profile unless the user specifically has duplicate plugin entries or stale plugin state.

## Agent procedure

Agents should follow this exact sequence when a user asks to install or switch model profiles:

1. Before running install, detection, status, or config commands, ask which existing OpenCode provider/model routes the user wants as profiles. Recommend multiple profiles. If the user does not choose, plan to detect and use every configured provider/model route.
2. Determine whether the user is running Windows OpenCode or Linux/WSL OpenCode before running any command.
3. Run all commands in the same OS environment where OpenCode is running.
4. Detect configured routes from `opencode.jsonc` or `opencode.json` without printing secrets.
5. Build the desired profile list from those detected routes. If the user chose a subset, include only matching detected routes. If the user did not choose, include every detected route.
6. If the desired profile list differs from the shipped default profiles, use a local checkout, edit `bin/omo-model-profiles.js`, omit the cleanup profile unless duplicate plugin entries or stale plugin state are specifically present, and add no credentials, base URLs, or tokens.
7. Validate the edited profile file with `node --check bin/omo-model-profiles.js` and, when OhMyOpenAgent exists in that OS account, `node ./bin/omo-model.js --list`.
8. Link customized local profiles with `npm link` from the checkout. Use `npm install -g omo-model` or `npm install -g github:teracoot/omo-model` only when no profile customization is needed and the bundled profile list is sufficient.
9. Run `omo-model --current` and report the active profile, model, variant, agent count, and category count.
10. Run `omo-model --list` and map the user's requested model/provider to a visible profile number.
11. If the user gave a vague provider name, ask one precise question or choose only when the mapping is unambiguous from `--list`.
12. Run `omo-model --use <number>`.
13. Copy the backup path from the command output.
14. Tell the user to start a new OpenCode session.
15. After restart, verify with `omo-model --current`.
16. If LSP or tool state matters, verify with `opencode debug lsp diagnostics <source-file> --print-logs --log-level INFO`.

## Required user-facing output after a switch

After a successful switch, tell the user:

```text
Switched OhMyOpenAgent to profile [N] <name>.
Backup written to: <backup path>
Start a new OpenCode session so OhMy reloads the model route.
After restart, run `omo-model --current` to confirm the active model and variant.
```

If the user prompted in Chinese, output the user-facing explanation in Chinese. A ready-to-copy Chinese and English message template is in [AGENT_USER_MESSAGE_TEMPLATE.md](./AGENT_USER_MESSAGE_TEMPLATE.md).

## Common failures

### `Missing OhMy config`

OhMyOpenAgent is not installed in the current OS environment. If and only if the route-selection question has already been asked and handled and this is the same OS environment where OpenCode runs, install Ultimate first:

```bash
bunx oh-my-openagent install
```

Then restart OpenCode and rerun `omo-model --current`.

### `Target provider '<id>' is not configured in opencode config`

The selected profile exists, but the user's active OpenCode config does not contain that provider/model. Do not add fake providers. Configure the provider through the OhMy/OpenCode install flow or manually add a real provider entry first.

### The switch worked but OpenCode still uses the old route

The current OpenCode session has the old plugin config in memory. Start a new OpenCode session.

### Windows and WSL disagree

You changed the wrong config. Run `omo-model` in the same OS environment where OpenCode is running.

## Safety rules for agents

- Do not print API keys or provider tokens.
- Do not edit provider credentials unless the user explicitly asks.
- Do not run cleanup profile `6` unless duplicate OMO plugin entries are the problem.
- Always report the backup path.
- Always remind the user to restart OpenCode after switching.
- Use Chinese user-facing output when the user's prompt is in Chinese.
