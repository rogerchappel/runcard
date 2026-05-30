# runcard Orchestration

## Factory Goal

Ship `runcard` as an initial public MVP that can generate deterministic run cards without executing arbitrary repository commands.

## Required Gates

- `npm run check`
- `npm test`
- `npm run smoke`
- `npm run package:smoke`
- `npm run release:check`
- `releasebox check .`
- `releasebox notes .`

## Release-Candidate Criteria

- README explains install, usage, verification, and limitations.
- `RELEASE_NOTES.md` summarizes the initial public build.
- Fixture tests cover representative Node, Python, Rust, Go, Make, and shell signals.
- The release-candidate PR includes verification output and a ship/incubate classification.

## Operational Notes

- Scans are read-only until output files are written.
- The CLI writes `RUN_CARD.md` by default and JSON only when `--json` is provided.
- Branch protection should be applied to `main` before pushing a release candidate.
