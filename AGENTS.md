# Mandatory Cross-Repository Release Gate

This gate applies to every version-bearing commit or push for either repository:

- `teracoot/omo-model`
- `teracoot/opencode-ohmy-updater`

An agent must not commit or push a new version until every step below passes. Unit tests, schema inspection, or a dry run alone are not sufficient.

## 1. Test the changed repository

- Run its complete local test, syntax, package, and release checks.
- Test with Windows PowerShell 5.1 and the current PowerShell release when PowerShell is involved.
- For the updater, run a real registry-backed upgrade twice against the same disposable npm global prefix and verify both installed package versions and command shims.

## 2. Prepare an isolated full-profile home

- Use a new disposable Windows user-home directory outside the active OpenCode config and launcher roots.
- Populate it with a known-valid OpenCode and OhMy configuration containing every route referenced by the candidate `omo-model` profile list.
- Never commit or print copied credentials, endpoints, headers, or configuration payloads.
- Run the candidate `omo-model` implementation, not an older command found earlier on `PATH`.

## 3. Switch every omo-model profile

- Enumerate the candidate profile numbers from `omo-model --list`.
- Run `omo-model --use <number>` once for every profile in the disposable home.
- After each switch, verify the reported model, variant, and reasoning effort match that profile.
- Fail the gate if a switch writes an invalid schema value, including `null` where OpenCode accepts only a string or an omitted field.

## 4. Start OpenCode after every switch

After each profile switch, start a fresh OpenCode process against the same disposable home:

1. Run `opencode debug config` and require exit code 0.
2. Launch `opencode` as a new process and confirm it reaches its normal interactive ready state without `Configuration is invalid` or another startup failure.
3. Exit that test process cleanly before switching to the next profile.

Checking only the already-running OpenCode process is invalid because it retains its previously loaded configuration.

## 5. Clean up and record evidence

- Remove the disposable home, npm prefix, test processes, and temporary logs.
- Confirm both repositories contain only intended source, test, and documentation changes and no secrets or generated archives.
- Record the tested commit, package versions, profile count, result for every profile, and fresh OpenCode startup result.
- If any step is skipped, unavailable, or fails, the version commit and push are blocked.
