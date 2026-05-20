# runcard PRD

Status: in-progress

## Summary

`runcard` generates a compact local run card for a repository: detected package
manager, scripts, likely checks, smoke commands, and a markdown handoff that
agents can execute without guessing.

## Source Attribution

Inspired by local developer command-center research and agent-readiness
workflows that emphasize making repository operations explicit. This project is
a small CLI focused on deterministic run instructions, not a full dashboard.

## Problem

Agents and new contributors waste time inferring how to test, build, and smoke
a project. Repos already contain clues in package files, lockfiles, Makefiles,
and scripts, but those clues need to be normalized into one reliable run card.

## Target Users

- Maintainers onboarding agents or contributors.
- Developers preparing repos for automated coding agents.
- CI authors documenting local verification paths.

## V1 Scope

- `runcard scan`
- Detect Node, Python, Rust, Go, Make, shell scripts, and common lockfiles.
- Rank likely commands for install, check, test, build, smoke, and package.
- Emit `RUN_CARD.md` and optional JSON.
- Flag missing smoke/test paths with friendly suggestions.
- Fixture-backed tests for representative repos.

## Non-Goals

- Running arbitrary commands by default.
- Cloud CI integration.
- Replacing full agent-readiness scanners.

## Success Criteria

- `runcard scan --fixture node-cli` produces a useful markdown run card.
- Tests cover detection and ranking.
- README makes the output practical for humans and agents.

