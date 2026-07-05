# Agent User Message Template

This file is for agents that need to explain `omo-model` to their users. Copy the matching block and replace the placeholders.

The user-facing blocks are deliberately verbose so weaker or obsolete agents can paste them without inventing missing context.

## Language rule

Before replying, inspect the user's language.

- If the user prompted in English, use the English block.
- If the user prompted in Chinese, use the Chinese block.
- If the user mixed languages, prefer the language used for the direct request.
- Keep commands unchanged unless the shell differs.

## English: before switching

```text
Use this block only when `omo-model` profiles already exist and the user is choosing among them. For installation, detection, or profile customization, use the "English: install interview" block first.

If this task includes installing, detecting, or configuring profiles, I must first ask which existing OpenCode provider/model routes you want as `omo-model` profiles before I run any install, detection, or config command. If you do not choose a subset, I will detect and use every configured provider/model route.

I will switch your OhMyOpenAgent model route with `omo-model`.

First I need to confirm which OpenCode environment you are using:

1. Windows OpenCode: run commands in PowerShell and use `%USERPROFILE%\.config\opencode`.
2. Linux/WSL OpenCode: run commands in the Linux/WSL shell and use `$HOME/.config/opencode`.

I will run:

`omo-model --current`
`omo-model --list`

Then I will switch to the profile you choose with:

`omo-model --use <number>`

After the switch, you must start a new OpenCode session because existing sessions keep the old plugin config in memory.
```

## English: install interview

```text
Before I run install, detection, or config commands for `omo-model`, I need to know which existing OpenCode models you want as switchable profiles.

Please choose one of these options:

1. Tell me the exact provider/model routes you want, such as `provider-id/model-id`.
2. Tell me the provider names you care about, and I will map them to detected models.
3. If you reply with no subset, say to use all detected routes, decline to choose, or otherwise do not name specific routes, I will scan your active OpenCode config and add every configured provider/model route I can detect.

I recommend adding multiple profiles, for example one fast daily model and one stronger reasoning model. I will not print or expose raw baseURL values, API keys, tokens, bearer tokens, authorization headers, secrets, or any credential values.

After you answer, or if you do not choose a subset, I will determine whether your OpenCode is running on Windows or Linux/WSL because the config paths are different.
```

## English: detected models summary

```text
I found these configured OpenCode provider/model routes:

<detected provider/model list>

I did not print API keys or base URLs. If you did not request a subset, I will include all of these as `omo-model` switchable profiles. If you want only some of them, tell me the numbers or routes before I continue.
```

## English: after successful switch

```text
Switched OhMyOpenAgent to profile [N] <profile name>.

New route:
- model: <model>
- variant: <variant>

Backup written to:
<backup path>

Start a new OpenCode session so OhMy reloads the model route. After restart, run:

`omo-model --current`

If LSP/tooling matters for this workspace, also verify with:

`opencode debug lsp diagnostics <source-file> --print-logs --log-level INFO`
```

## English: provider missing

```text
The profile exists, but your active OpenCode config does not contain the provider/model required by that profile:

`<provider/model>`

I did not change your config. Configure that provider first through the OhMyOpenAgent/OpenCode setup flow, then rerun:

`omo-model --use <number>`
```

## English: OhMy missing

```text
`omo-model` did not find an OhMyOpenAgent config in this OS environment.

Install OhMyOpenAgent Ultimate first:

`bunx oh-my-openagent install`

Then start a new OpenCode session and rerun:

`omo-model --current`
```

## Chinese: before switching

```text
只有在 `omo-model` profile 已经存在、用户只是要选择切换时，才使用这一段。如果是安装、检测或自定义 profile，必须先使用下面的 “Chinese: install interview” 段落。

如果这个任务包含安装、检测或配置 profile，我必须先询问你想把哪些现有 OpenCode provider/model 路由加入为 `omo-model` profile，然后才能运行任何安装、检测或配置命令。如果你不指定子集，我会检测并使用所有已经配置好的 provider/model 路由。

我会用 `omo-model` 帮你切换 OhMyOpenAgent 的模型路由。

我会先确认你正在使用哪个 OpenCode 环境：

1. Windows OpenCode：在 PowerShell 里运行命令，配置目录是 `%USERPROFILE%\.config\opencode`。
2. Linux/WSL OpenCode：在 Linux/WSL shell 里运行命令，配置目录是 `$HOME/.config/opencode`。

我会先运行：

`omo-model --current`
`omo-model --list`

然后用下面的命令切换到你选择的 profile：

`omo-model --use <number>`

切换完成后，你需要重新开启一个 OpenCode 会话，因为已经打开的会话仍然会使用旧的插件配置。
```

## Chinese: install interview

```text
在我运行 `omo-model` 的安装、检测或配置命令之前，我需要先确认：你想把哪些已经存在于 OpenCode 配置里的模型加入为可切换的 profile？

请选择一种方式：

1. 直接告诉我完整的 provider/model 路由，例如 `provider-id/model-id`。
2. 告诉我你想使用哪些 provider，我会根据检测到的模型帮你匹配。
3. 如果你回复时不指定子集、要求使用所有检测到的路由、表示不想选择，或者没有说出具体路由，我会扫描当前 OpenCode 配置，并默认把所有已经配置好的 provider/model 路由都加入为可切换 profile。

我建议至少加入多个 profile，例如一个日常快速模型，再加一个更强的推理模型。我不会打印或泄露原始 baseURL、API key、token、bearer token、authorization header、secret 或任何凭据值。

你回答之后，或者如果你不指定子集，我会再判断你的 OpenCode 是运行在 Windows 还是 Linux/WSL，因为它们的配置路径不同。
```

## Chinese: detected models summary

```text
我在 OpenCode 配置里检测到了这些 provider/model 路由：

<detected provider/model list>

我没有打印 API key 或 base URL。如果你没有指定子集，我会默认把这些全部加入为 `omo-model` 可切换 profile。如果你只想加入其中一部分，请在我继续之前告诉我编号或完整路由。
```

## Chinese: after successful switch

```text
已将 OhMyOpenAgent 切换到 profile [N] <profile name>。

新的路由：
- model: <model>
- variant: <variant>

备份文件已写入：
<backup path>

请重新开启一个 OpenCode 会话，让 OhMy 重新加载模型路由。重启后可以运行：

`omo-model --current`

如果这个工作区需要确认 LSP 或工具链状态，也可以运行：

`opencode debug lsp diagnostics <source-file> --print-logs --log-level INFO`
```

## Chinese: provider missing

```text
这个 profile 存在，但你当前的 OpenCode 配置里没有它需要的 provider/model：

`<provider/model>`

我没有修改你的配置。请先通过 OhMyOpenAgent/OpenCode 的安装或配置流程添加这个 provider，然后再运行：

`omo-model --use <number>`
```

## Chinese: OhMy missing

```text
`omo-model` 在当前操作系统环境里没有找到 OhMyOpenAgent 配置。

请先安装 OhMyOpenAgent Ultimate：

`bunx oh-my-openagent install`

然后重新开启 OpenCode 会话，再运行：

`omo-model --current`
```
