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

If the user has not installed OhMyOpenAgent yet, do not run the installer immediately. First ask the route-selection question in the next section. After the user answers, declines to choose a subset, or asks to use all detected routes, use the normal installer:

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

When reporting detected routes or showing examples, never display raw `baseURL`, `apiKey`, `token`, `bearer`, `authorization`, `secret`, or credential values. Replace the entire value of any credential-like field with a placeholder. Do not show real hostnames, URL paths, query strings, headers, partial tokens, or partial credential values. Show only `provider-id/model-id` routes and placeholders such as `<redacted-base-url>` and `<redacted-api-key>`.

Windows PowerShell:

```powershell
$configDir = Join-Path $env:USERPROFILE ".config\opencode"
$candidates = @("opencode.jsonc", "opencode.json")
$configPath = $candidates | ForEach-Object { Join-Path $configDir $_ } | Where-Object { Test-Path -LiteralPath $_ } | Select-Object -First 1
if (-not $configPath) { throw "No OpenCode config found in $configDir" }
node -e "const fs=require('fs');const p=process.argv[1];const s=fs.readFileSync(p,'utf8').replace(/\/\/.*$/gm,'').replace(/\/\*[\s\S]*?\*\//g,'');const j=JSON.parse(s);for(const [providerId,provider] of Object.entries(j.provider||{})){for(const modelId of Object.keys((provider&&provider.models)||{})){console.log(providerId+'/'+modelId)}}" $configPath
```

Linux or WSL shell:

```bash
config_dir="$HOME/.config/opencode"
config_path=""
for name in opencode.jsonc opencode.json; do
  if [ -f "$config_dir/$name" ]; then config_path="$config_dir/$name"; break; fi
done
test -n "$config_path" || { echo "No OpenCode config found in $config_dir" >&2; exit 1; }
node -e 'const fs=require("fs");const p=process.argv[1];const s=fs.readFileSync(p,"utf8").replace(/\/\/.*$/gm,"").replace(/\/\*[\s\S]*?\*\//g,"");const j=JSON.parse(s);for(const [providerId,provider] of Object.entries(j.provider||{})){for(const modelId of Object.keys((provider&&provider.models)||{})){console.log(providerId+"/"+modelId)}}' "$config_path"
```

If JSONC parsing fails because an obsolete model cannot run the command correctly, ask the user to point to the config file, inspect only the `provider` object, and never paste or print that object raw. Before showing any excerpt, remove or replace all secret-looking fields, including `baseURL`, `apiKey`, `token`, `bearer`, `authorization`, `secret`, and credential values.

## Install

Do not run any command in this section until you have asked which existing OpenCode provider/model routes the user wants as `omo-model` profiles, and the user has answered, declined to choose a subset, asked to use all detected routes, or already provided the routes.

Prerequisite: Node.js 18 or newer and npm must be available in the same OS environment where OpenCode runs. Verify before install or link:

```bash
node --version
npm --version
```

Default for agents: if you need to customize `bin/omo-model-profiles.js` from detected routes, use a local checkout, edit that file, validate it, then run `npm link`. Use `npm install -g omo-model` only when the npm package is published and no profile customization is needed. Use `npm install -g github:teracoot/omo-model` only when the bundled profile list is sufficient.

When published to npm, install or run it with npm tooling:

```bash
npm install -g omo-model
omo-model --current
```

Install from GitHub before npm publication:

```bash
npm install -g github:teracoot/omo-model
omo-model --current
```

For local checkout usage:

```bash
git clone https://github.com/teracoot/omo-model.git
cd omo-model
npm link
omo-model --current
```

You can also run it directly from the checkout:

```bash
node ./bin/omo-model.js --current
```

Agents should prefer the local checkout method when helping a user before npm publication, because it is deterministic and easy to inspect.

## OS and build selection

After asking the required route-selection question, and after installing or linking `omo-model` if the command is not already available, determine where OpenCode is actually running. The config directory is different for Windows and WSL/Linux. Do not run these OS/build commands before that first question.

Only run these detection/status commands after the route-selection question has been handled. If the user has not chosen a subset, proceed with the documented default: detect and use every configured provider/model route.

Run:

```bash
node -p "process.platform + ' ' + process.arch"
opencode --version
omo-model --current
```

### Windows OpenCode

If OpenCode is running from Windows PowerShell, run `omo-model` from Windows PowerShell too.

Use the Windows npm/OpenCode build. Check the commands with:

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

```powershell
omo-model --use 0
```

### Linux or WSL OpenCode

If OpenCode is running inside Linux or WSL, run `omo-model` inside that same Linux/WSL shell.

Use the Linux npm/OpenCode build. Check the commands with:

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

Use `variant: "xhigh"` and `reasoningEffort: "xhigh"` only when the user explicitly requested xhigh reasoning or the detected route/profile name clearly contains `xhigh`. For normal max-style routes, use `variant: "max"` and `reasoningEffort: null`.

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

If the user did not choose a subset, add every detected route as a profile. When generating a user-specific profile list from detected routes, omit the cleanup profile unless the user specifically has duplicate plugin entries or stale plugin state. Do not add API keys, base URLs, tokens, or provider credential fields to `omo-model-profiles.js`; it stores route names only.

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

```text
omo-model --list           Show current route and numbered profiles
omo-model -l               Same as --list
omo-model --current        Show current route only
omo-model -c               Same as --current
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

1. Before running install, detection, or config commands, ask which existing OpenCode provider/model routes the user wants as profiles. Recommend multiple profiles. If the user does not choose, plan to detect and use every configured provider/model route.
2. Determine whether the user is running Windows OpenCode or Linux/WSL OpenCode.
3. Run all commands in the same OS environment where OpenCode is running.
4. Detect configured routes from `opencode.jsonc` or `opencode.json` without printing secrets.
5. If the user chose a subset, include only matching detected routes. If the user did not choose, include every detected route.
6. Install `omo-model` from npm or from `github:teracoot/omo-model`.
7. Run `omo-model --current` and report the active profile, model, variant, agent count, and category count.
8. Run `omo-model --list` and map the user's requested model/provider to a visible profile number.
9. If the user gave a vague provider name, ask one precise question or choose only when the mapping is unambiguous from `--list`.
10. Run `omo-model --use <number>`.
11. Copy the backup path from the command output.
12. Tell the user to start a new OpenCode session.
13. After restart, verify with `omo-model --current`.
14. If LSP or tool state matters, verify with `opencode debug lsp diagnostics <source-file> --print-logs --log-level INFO`.

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

OhMyOpenAgent is not installed in the current OS environment. Install Ultimate first:

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
