# runcard

Generate deterministic local run cards for repositories.

`runcard scan` recursively inspects repository files, normalizes the likely install/check/test/build/smoke/package commands, and writes a compact handoff for humans and coding agents. It does not run project commands during a scan.

## Install

After the first npm release is published:

```sh
npm install -g runcard
```

Until then, install from a source checkout (this also supports local development):

```sh
npm ci
npm run build
npm link
node dist/cli.js scan --fixture node-cli --out .tmp/example --json .tmp/example/run-card.json
```

## Use

Scan the current repository and write `RUN_CARD.md`:

```sh
runcard scan
```

Write both markdown and JSON to a chosen output directory:

```sh
runcard scan --root /path/to/repo --out /path/to/repo/.runcard --json /path/to/repo/.runcard/run-card.json
```

Smoke the bundled Node fixture:

```sh
runcard scan --fixture node-cli --out .tmp/smoke --json .tmp/smoke/run-card.json
```

Gate a repository only when explicit test and smoke paths are present:

```sh
runcard scan --root /path/to/repo --fail-on-warnings
```

## What It Detects

- Node: root and nested `package.json` manifests, package manager lockfiles, and npm/pnpm/yarn/bun scripts. Nested package commands include an explicit working directory so they execute from the scanned root.
- Python: `pyproject.toml`, `requirements.txt`, `tox.ini`, `pytest.ini`, `noxfile.py`, ruff and pytest hints.
- Rust: `Cargo.toml`, `Cargo.lock`, `cargo check`, `cargo test`.
- Go: `go.mod`, `go.sum`, `go test ./...`, `go build ./...`.
- Make: public Makefile targets.
- Shell: `.sh` files and scripts under `scripts/`; generated commands quote paths when needed so they remain directly executable.

Commands are ranked into `install`, `check`, `test`, `build`, `smoke`, `package`, `run`, and `other`. Node package scripts are rendered as executable package-manager commands such as `npm test` and `npm run build`; their original bodies remain available as `scriptBody` metadata in JSON. Missing test or smoke paths are flagged with suggestions because those gaps slow down agent handoffs.

For Node repositories, `package.json#packageManager` takes precedence over lockfiles; otherwise the detected lockfile selects the manager, falling back to npm. Install and script commands always use that one manager. A conflicting declaration or additional lockfile produces a `package-manager-conflict` warning naming the stale file.

If a root or nested `package.json` cannot be read or parsed, scanning stops with a non-zero exit. The diagnostic names the repository-relative manifest path and includes the underlying filesystem or JSON parse error so the manifest can be repaired before retrying.

## Verify

```sh
npm run check
npm test
npm run smoke
npm run package:smoke
npm run release:check
```

That release check runs typechecking, fixture-backed tests, the fixture smoke scan, then packs, installs, and executes the CLI from the resulting tarball.

## Limitations

- Detection is static and deterministic; runcard does not execute repository commands while scanning.
- Repository traversal has no depth cap. VCS metadata, dependency/vendor trees, build outputs, and language caches are excluded.
- V1 ranking favors conventional file names and script names over deep framework inspection.
- JSON schema is versioned as `schemaVersion: 2`. Version 2 makes Node script `command` values directly executable and preserves the manifest value in `scriptBody`.

## Documentation

- [Product requirements](docs/PRD.md)
- [Implementation tasks](docs/TASKS.md)
- [Factory orchestration](docs/ORCHESTRATION.md)
- [Machine-readable orchestration](docs/orchestration.json)
- [Agent skill guide](SKILL.md)

## Release readiness

Use [docs/release-readiness.md](docs/release-readiness.md) before opening release PRs or tagging a release.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for contribution expectations. Changes should be small, reviewable, and verified before review.

## Security

See [SECURITY.md](SECURITY.md) for vulnerability reporting guidance.

## License

MIT

## Verification

Run the release-readiness checks before publishing or cutting a PR:

```bash
npm run check
npm run build
npm run test
npm run smoke
npm run package:smoke
npm run release:check
```

Use `npm run package:smoke` to pack the package, install the resulting tarball in an isolated directory, and execute its `runcard` binary.
