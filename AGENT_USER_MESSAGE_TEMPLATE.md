# Agent User Message Template

This file is for agents that need to explain `omo-model` to their users. Copy the matching block and replace the placeholders.

The user-facing blocks are deliberately verbose so weaker or obsolete agents can paste them without inventing missing context.

## Language rule

Before replying, inspect the user's language.

- If the user prompted in English, use the English block.
- If the user prompted in Chinese, use the Chinese block.
- If the user mixed languages, prefer the language used for the direct request.
- Keep commands unchanged unless the shell differs.

## English: existing installed profiles only

STOP: Do not use this block for install, detection, setup status checks, or profile customization. Use the install interview first unless route-selection has already been answered, declined, answered with use-all, or already provided by the user, the OS environment has been confirmed, `omo-model` is already installed in that same environment, and the user is choosing among existing profiles.

```text
Use this block only when route-selection has already been handled, the OpenCode OS environment has already been confirmed, `omo-model` is already installed in that same OS environment, profiles already exist, no installation/detection/status check for setup/profile customization is needed, and the user is choosing among those existing profiles. If there is any uncertainty, use the "English: install interview" block first.

If this task includes installing, detecting, or configuring profiles, I must first ask which existing OpenCode provider/model routes you want as `omo-model` profiles before I run any install, detection, or config command. If you do not choose a subset, I will detect and use every configured provider/model route.

I will switch your OpenCode and OhMy model routing with `omo-model`.

First I need to confirm which OpenCode environment you are using:

1. Windows OpenCode: run commands in PowerShell and use `%USERPROFILE%\.config\opencode`.
2. Linux/WSL OpenCode: run commands in the Linux/WSL shell and use `$HOME/.config/opencode`.

I will verify the existing installed profiles with status commands only after the prerequisites above are true:

`[agent runs omo-model --current only after route-selection and OS confirmation are already handled]`
`[agent runs omo-model --list only after route-selection and OS confirmation are already handled]`

Then I will switch to the profile you choose with:

`omo-model --use <number>`

You may keep existing OpenCode processes running. The selector warns about them but continues switching the on-disk configs. Existing processes and sessions keep their loaded routing; start a new OpenCode process and session to use the selected profile. Do not resume a pre-switch subagent `task_id` when you need the new route, because continuation sessions preserve their original model assignment.
```

## English: install interview

```text
Before I run install, detection, or config commands for `omo-model`, I need to know which existing OpenCode models you want as switchable profiles.

Please choose one of these options:

1. Tell me the exact provider/model routes you want, such as `provider-id/model-id`.
2. Tell me the provider names you care about, and I will map them to detected models.
3. If you reply with no subset, say to use all detected routes, decline to choose, or otherwise do not name specific routes, I will scan your active OpenCode config and add every configured provider/model route I can detect.

I recommend adding multiple profiles, for example one fast daily model and one stronger reasoning model. I will not print or expose raw baseURL values, API keys, tokens, bearer tokens, authorization headers, secrets, or any credential values. If I show redacted examples, I will replace whole `baseURL` values with `<redacted-base-url>`, not partial URL fragments.

When I generate `bin/omo-model-profiles.js`, I will start from an empty or fully replaced `profiles` array, include only selected detected routes or all detected routes when no subset is chosen, and omit the cleanup profile unless duplicate/stale OhMy plugin state is explicitly the issue.

After you answer, or if you do not choose a subset, I will determine whether your OpenCode is running on Windows or Linux/WSL because the config paths are different.
```

## English: detected models summary

```text
I found these configured OpenCode provider/model routes:

<detected provider/model list>

I did not print API keys or base URLs. If you already requested a subset, I will include only the matching detected routes. If you did not request a subset before detection, I will include all detected routes as `omo-model` switchable profiles and continue without asking another open-ended model-selection question.
```

## English: after successful switch

```text
Switched OpenCode and OhMy routing to profile [N] <profile name>.

New route:
- model: <model>
- variant: <variant>
- reasoning effort: <effort>

OpenCode backup written to:
<base backup path>

OhMy backup written to:
<OhMy backup path>

Existing OpenCode processes and sessions keep their loaded routing. Start a new OpenCode process and session to use the selected profile. Do not resume a pre-switch subagent `task_id` when you need the new route; start a new delegated task. In the new process, run:

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

Use this block only after the `omo-model` route-selection question has already been asked and handled in the same OS environment where OpenCode runs. If that has not happened, ask the install interview question first and do not run this installer yet. Do not run the installer from Windows for WSL/Linux OpenCode or from WSL/Linux for Windows OpenCode.

Install OhMyOpenAgent Ultimate only after those prerequisites are true:

`[agent runs the OhMyOpenAgent installer only after route-selection and same-OS confirmation]`

Then start a new OpenCode session and rerun the current-profile smoke check only in that same OS environment:

`[agent runs omo-model --current only after restart in the same OS environment]`
```

## Chinese: existing installed profiles only

STOP: 不要把这一段用于安装、检测、设置状态检查或自定义 profile。除非已经处理过路由选择、已经确认 OpenCode 实际运行的操作系统环境、`omo-model` 已经安装在同一个环境里，并且用户只是要在已有 profile 之间切换，否则必须先使用安装访谈段落。

```text
只有在已经处理过路由选择、已经确认 OpenCode 实际运行的操作系统环境、`omo-model` 已经安装在同一个环境里、profile 已经存在、不需要安装、不需要检测、不需要为了设置而运行状态检查、不需要自定义 profile，并且用户只是要选择这些已有 profile 切换时，才使用这一段。如果有任何不确定，必须先使用下面的 “Chinese: install interview” 段落。

如果这个任务包含安装、检测或配置 profile，我必须先询问你想把哪些现有 OpenCode provider/model 路由加入为 `omo-model` profile，然后才能运行任何安装、检测或配置命令。如果你不指定子集，我会检测并使用所有已经配置好的 provider/model 路由。

我会用 `omo-model` 帮你切换 OpenCode 与 OhMy 的模型路由。

我会先确认你正在使用哪个 OpenCode 环境：

1. Windows OpenCode：在 PowerShell 里运行命令，配置目录是 `%USERPROFILE%\.config\opencode`。
2. Linux/WSL OpenCode：在 Linux/WSL shell 里运行命令，配置目录是 `$HOME/.config/opencode`。

只有在以上前提都满足后，我才会用状态命令确认已有 profile：

`[agent 只有在已经处理路由选择并确认 OS 后才运行 omo-model --current]`
`[agent 只有在已经处理路由选择并确认 OS 后才运行 omo-model --list]`

然后用下面的命令切换到你选择的 profile：

`omo-model --use <number>`

你可以保留现有 OpenCode 进程。选择器会显示警告，但仍会继续切换磁盘上的配置。现有进程和会话继续使用已经加载的路由；如需使用新选择的 profile，请启动新的 OpenCode 进程和会话。需要新路由时，不要继续使用切换前的子代理 `task_id`，因为续接会话会保留原来的模型分配。
```

## Chinese: install interview

```text
在我运行 `omo-model` 的安装、检测或配置命令之前，我需要先确认：你想把哪些已经存在于 OpenCode 配置里的模型加入为可切换的 profile？

请选择一种方式：

1. 直接告诉我完整的 provider/model 路由，例如 `provider-id/model-id`。
2. 告诉我你想使用哪些 provider，我会根据检测到的模型帮你匹配。
3. 如果你回复时不指定子集、要求使用所有检测到的路由、表示不想选择，或者没有说出具体路由，我会扫描当前 OpenCode 配置，并默认把所有已经配置好的 provider/model 路由都加入为可切换 profile。

我建议至少加入多个 profile，例如一个日常快速模型，再加一个更强的推理模型。我不会打印或泄露原始 baseURL、API key、token、bearer token、authorization header、secret 或任何凭据值。如果需要展示脱敏示例，我会把整个 `baseURL` 值替换成 `<redacted-base-url>`，不会只隐藏 URL 的一部分。

生成 `bin/omo-model-profiles.js` 时，我会从空的或完全替换后的 `profiles` 数组开始，只加入你选择的已检测路由；如果你没有指定子集，就加入所有检测到的路由。除非明确是在处理重复或过期的 OhMy 插件状态，否则不会保留 cleanup profile。

你回答之后，或者如果你不指定子集，我会再判断你的 OpenCode 是运行在 Windows 还是 Linux/WSL，因为它们的配置路径不同。
```

## Chinese: detected models summary

```text
我在 OpenCode 配置里检测到了这些 provider/model 路由：

<detected provider/model list>

我没有打印 API key 或 base URL。如果你之前已经指定了子集，我只会加入匹配到的检测路由。如果你在检测前没有指定子集，我会默认把所有检测到的路由都加入为 `omo-model` 可切换 profile，并且不会再问第二个开放式模型选择问题。
```

## Chinese: after successful switch

```text
已将 OpenCode 与 OhMy 路由切换到 profile [N] <profile name>。

新的路由：
- model: <model>
- variant: <variant>
- reasoning effort: <effort>

OpenCode 备份文件已写入：
<base backup path>

OhMy 备份文件已写入：
<OhMy backup path>

现有 OpenCode 进程和会话继续使用已经加载的路由。如需使用新选择的 profile，请启动新的 OpenCode 进程和会话。需要新路由时，不要继续使用切换前的子代理 `task_id`；请创建新的委派任务。在新进程中可以运行：

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

只有在已经询问并处理过 `omo-model` 路由选择问题、而且是在 OpenCode 实际运行的同一个操作系统环境里，才使用这一段。如果还没有处理这个问题，必须先使用安装访谈段落，不要先运行安装命令。不要为了 WSL/Linux OpenCode 在 Windows 里运行安装器，也不要为了 Windows OpenCode 在 WSL/Linux 里运行安装器。

只有在这些前提都满足后，才安装 OhMyOpenAgent Ultimate：

`[agent 只有在处理过路由选择并确认同一 OS 环境后才运行 OhMyOpenAgent 安装器]`

然后重新开启 OpenCode 会话，并且只在同一个 OS 环境里重新运行当前 profile 检查：

`[agent 只有在重启后、同一 OS 环境里才运行 omo-model --current]`
```
