# runcard

Generate deterministic local run cards for repositories.

`runcard scan` inspects repository files, normalizes the likely install/check/test/build/smoke/package commands, and writes a compact handoff for humans and coding agents. It does not run project commands during a scan.

## Install

```sh
npm install -g runcard
```

For local development in this repository:

```sh
npm ci
npm run build
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

## What It Detects

- Node: `package.json`, package manager lockfiles, npm/pnpm/yarn/bun scripts.
- Python: `pyproject.toml`, `requirements.txt`, `tox.ini`, `pytest.ini`, `noxfile.py`, ruff and pytest hints.
- Rust: `Cargo.toml`, `Cargo.lock`, `cargo check`, `cargo test`.
- Go: `go.mod`, `go.sum`, `go test ./...`, `go build ./...`.
- Make: public Makefile targets.
- Shell: `.sh` files and scripts under `scripts/`.

Commands are ranked into `install`, `check`, `test`, `build`, `smoke`, `package`, `run`, and `other`. Missing test or smoke paths are flagged with suggestions because those gaps slow down agent handoffs.

## Verify

```sh
npm run check
npm test
npm run smoke
npm run package:smoke
npm run release:check
```

That release check runs typechecking, fixture-backed tests, the fixture smoke scan, and `npm pack --dry-run`.

## Limitations

- Detection is static and deterministic; runcard does not execute repository commands while scanning.
- V1 ranking favors conventional file names and script names over deep framework inspection.
- JSON schema is versioned as `schemaVersion: 1`, but should be treated as early until the first stable release.

## Documentation

- [Product requirements](docs/PRD.md)
- [Implementation tasks](docs/TASKS.md)
- [Factory orchestration](docs/ORCHESTRATION.md)
- [Machine-readable orchestration](docs/orchestration.json)

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for contribution expectations. Changes should be small, reviewable, and verified before review.

## Security

See [SECURITY.md](SECURITY.md) for vulnerability reporting guidance.

## License

MIT
