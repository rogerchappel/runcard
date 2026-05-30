# Release Notes

## runcard 0.1.0

Initial public build of `runcard`, a deterministic CLI that scans a repository and writes a compact run card for maintainers, contributors, and coding agents.

### Added

- `runcard scan` CLI with `--root`, `--fixture`, `--out`, and `--json` options.
- Static detection for Node, Python, Rust, Go, Make, shell scripts, and common lockfiles.
- Command ranking for install, check, test, build, smoke, package, run, and other commands.
- Markdown `RUN_CARD.md` rendering and optional JSON output with `schemaVersion: 1`.
- Warnings for missing test and smoke paths.
- Fixture-backed tests covering Node CLI and polyglot repository signals.
- Release-readiness docs and orchestration metadata.

### Verification

- `npm run check`
- `npm test`
- `npm run smoke`
- `npm run package:smoke`
- `npm run release:check`
- `releasebox check .`
- `releasebox notes .`

### Limitations

- Scans are static and do not execute detected commands.
- V1 ranking is based on conventional files, target names, and script names.
- JSON output is versioned but still early.

### Classification

Ship candidate for initial public MVP.
