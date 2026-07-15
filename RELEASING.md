# Releasing

`package.json` is the authoritative project version. Releases use Semantic Versioning:

- **PATCH** for backward-compatible fixes.
- **MINOR** for backward-compatible features or behavior additions.
- **MAJOR** for incompatible CLI, config, archive, runtime, or supported-platform changes.

The npm package is not currently published. A release tag creates a verified `.tgz` workflow artifact only; it does not publish to npm or create a GitHub release.

## Prepare a release

1. Choose the SemVer increment from the rules above.
2. Run `npm version <major|minor|patch> --no-git-tag-version`.
3. Move the relevant entries from `Unreleased` into `## [X.Y.Z] - YYYY-MM-DD` in `CHANGELOG.md`.
4. Run `npm run check`.
5. On Windows with the target OpenCode version installed locally, run `npm run check:local-release`. This must switch every profile, validate the merged config, and start a fresh OpenCode server after each switch.
6. Review `npm pack --dry-run --json` and confirm that no tests, CI files, scripts, backups, credentials, or generated archives are included.
7. Commit only when explicitly authorized. Do not publish, tag, or push as part of local validation.

## Create an artifact

After the release commit is reviewed and pushing is explicitly authorized:

```text
git tag vX.Y.Z
git push origin vX.Y.Z
```

The `Release artifact` workflow requires the tag to exactly match `package.json`. It first runs the complete suite on Windows, including the real PowerShell all-profile matrix, then repeats the portable checks on Linux, builds the npm tarball, and uploads it as a 30-day workflow artifact. Publishing to npm remains a separate, intentionally manual future decision.
