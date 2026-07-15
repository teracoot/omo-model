# Changelog

All notable changes to `omo-model` are documented here. This project follows [Semantic Versioning](https://semver.org/).

## [Unreleased]

## [1.2.0] - 2026-07-15

### Added

- A `PQAPI(sub2api)` provider mirror and three matching `omo-model` profiles for Terra Max, Sol Max, and GPT-5.5 XHigh.
- An AI-agent upgrade entry point and guarded migration procedure for every prior GitHub installation shape, including the original Node checkout, GitHub-global installs, customized linked checkouts, and standalone Windows launchers.
- A mandatory local release gate that switches every profile and starts a fresh installed OpenCode server after each switch.

### Fixed

- TSNUI profile switches no longer serialize an invalid `null` provider display name under stricter OpenCode schema validation.

## [1.1.0] - 2026-07-14

### Added

- Atomic OpenCode and OhMy routing updates with dual backups and rollback on write failure.
- Advisory hot-swap warnings so new OpenCode processes can use a new profile while existing sessions keep their loaded routes.
- Canonical provider and model display metadata, including distinct PQAPI Terra and Sol names.
- Exhaustive isolated profile matrices for the Node and standalone Windows PowerShell selectors.
- Multi-platform CI, package-content checks, and tag-to-version release validation.

### Changed

- `--current` now reports the merged model, variant, and reasoning effort across OpenCode and OhMy routing layers.
- PQAPI profile labels now use model-first names such as `GPT-5.6 Sol Max (PQAPI)`.

### Fixed

- Stale top-level and base-agent routes left behind by profile switches.
- The PQAPI Sol display mismatch that combined a Terra provider label with the Sol model label.
