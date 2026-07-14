# runcard Skill

Use this skill when an agent needs to discover how to install, check, test, build, smoke, or package an unfamiliar repository without guessing.

## Inputs

- A local repository path.
- Optional output directory for `RUN_CARD.md` and JSON.
- Optional fixture name when validating runcard itself.

## Workflow

1. Scan the repository with `runcard scan --root <repo> --out <repo>/.runcard --json <repo>/.runcard/run-card.json`.
2. Read the generated `RUN_CARD.md` before running any project commands.
3. Prefer high-confidence commands in install, check, test, build, smoke, and package order.
4. Use `--fail-on-warnings` in CI or release gates when missing test or smoke paths should block handoff.
5. Include the run card path in PR or handoff notes.

## Side Effects

- Scans read repository metadata and scripts.
- Scans write markdown and optional JSON only to requested output paths.
- runcard does not execute detected project commands.

## Approval Boundaries

Ask before running commands listed in a generated run card if they install dependencies, write files, publish artifacts, or contact external services. Treat suggestions as a starting point for verification, not proof that commands are safe.

## Verification

Run:

```bash
npm run check
npm test
npm run smoke
npm run package:smoke
```

## Examples

```bash
runcard scan
runcard scan --root . --out .runcard --json .runcard/run-card.json
runcard scan --fixture node-cli --out .tmp/smoke --json .tmp/smoke/run-card.json
```
