# runcard Tasks

## MVP Complete

- Implement `runcard scan`.
- Detect Node, Python, Rust, Go, Make, shell scripts, and common lockfiles.
- Rank install, check, test, build, smoke, and package commands.
- Emit `RUN_CARD.md` and optional JSON.
- Flag missing smoke and test paths.
- Add fixture-backed tests for Node and polyglot repositories.
- Document CLI usage, verification, limitations, and release readiness.

## Next

- Add fixture coverage for pnpm, yarn, uv, poetry, and Cargo workspaces.
- Publish a formal JSON schema file once downstream consumers appear.
- Add configurable ignore paths for very large monorepos.
- Add optional framework-specific hints without making scans non-deterministic.
