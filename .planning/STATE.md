# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-03-21)

**Core value:** Consumers can install @bjro/spriggan from npm and JSR with working types, published automatically from CI on version tag push.
**Current focus:** Phase 1 — Package Configuration

## Current Position

Phase: 1 of 3 (Package Configuration)
Plan: 0 of TBD in current phase
Status: Ready to plan
Last activity: 2026-03-21 — Roadmap created

Progress: [░░░░░░░░░░] 0%

## Performance Metrics

**Velocity:**
- Total plans completed: 0
- Average duration: —
- Total execution time: —

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| - | - | - | - |

**Recent Trend:**
- Last 5 plans: —
- Trend: —

*Updated after each plan completion*

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.
Recent decisions affecting current work:

- Use OIDC trusted publishing (no stored secrets) for both npm and JSR
- ESM only, no UMD/CJS bundle
- Tag-triggered publish (`v*` tag) — manual version bump before tagging
- Use `npm publish` (not `bun publish`) in CI to avoid `NPM_CONFIG_TOKEN` confusion
- Separate `tsconfig.build.json` — never touch base `tsconfig.json`'s `noEmit: true`

### Pending Todos

None yet.

### Blockers/Concerns

- First npm publish requires package to exist before OIDC trusted publisher can be configured — one-time manual local publish (or temporary granular token) needed to bootstrap; document exact steps before tagging
- `--allow-slow-types` behavior on JS+`@ts-self-types` packages not verified against live JSR publish; run `jsr publish --dry-run` in workflow as canary

## Session Continuity

Last session: 2026-03-21
Stopped at: Roadmap created, files written. Ready to plan Phase 1.
Resume file: None
