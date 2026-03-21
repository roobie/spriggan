---
gsd_state_version: 1.0
milestone: v1.0
milestone_name: milestone
status: unknown
stopped_at: Completed 02-publish-pipeline 02-01-PLAN.md
last_updated: "2026-03-21T20:21:39.221Z"
progress:
  total_phases: 3
  completed_phases: 2
  total_plans: 3
  completed_plans: 3
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-03-21)

**Core value:** Consumers can install @bjro/spriggan from npm and JSR with working types, published automatically from CI on version tag push.
**Current focus:** Phase 02 — Publish Pipeline

## Current Position

Phase: 02 (Publish Pipeline) — EXECUTING
Plan: 1 of 1

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
| Phase 01-package-configuration P01 | 5min | 2 tasks | 3 files |
| Phase 01-package-configuration P02 | 3min | 2 tasks | 2 files |
| Phase 02-publish-pipeline P01 | 4min | 2 tasks | 1 files |

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.
Recent decisions affecting current work:

- Use OIDC trusted publishing (no stored secrets) for both npm and JSR
- ESM only, no UMD/CJS bundle
- Tag-triggered publish (`v*` tag) — manual version bump before tagging
- Use `npm publish` (not `bun publish`) in CI to avoid `NPM_CONFIG_TOKEN` confusion
- Separate `tsconfig.build.json` — never touch base `tsconfig.json`'s `noEmit: true`
- [Phase 01-package-configuration]: TYPE-01: Handwritten src/spriggan.d.ts retained as authoritative declarations; tsc-emitted output loses all generics
- [Phase 01-package-configuration]: tsconfig.build.json uses include:[src/spriggan.js] to exclude examples/ type errors that would abort emit
- [Phase 01-package-configuration]: @ts-self-types in src/spriggan.js points to ./spriggan.d.ts; Plan 02 exports.types must point to src/spriggan.d.ts
- [Phase 01-package-configuration P02]: exports['.'].types=./src/spriggan.d.ts (handwritten); 'default' condition (not 'import') for .js exports
- [Phase 01-package-configuration P02]: jsr.json exports is bare string ./src/spriggan.js; JSR resolves types via @ts-self-types directive
- [Phase 01-package-configuration P02]: jsr publish --dry-run requires --allow-dirty for local runs; CI checkout is clean so flag not needed in CI
- [Phase 02-publish-pipeline]: Version check in gate job (not per publish job) blocks both npm and jsr if tag mismatches — prevents partial publish
- [Phase 02-publish-pipeline]: No npm ci in jsr job: Deno reads jsr.json manifest directly, no node_modules needed
- [Phase 02-publish-pipeline]: deno publish dry-run confirms no --allow-slow-types needed: JS+@ts-self-types passes clean

### Pending Todos

None yet.

### Blockers/Concerns

- First npm publish requires package to exist before OIDC trusted publisher can be configured — one-time manual local publish (or temporary granular token) needed to bootstrap; document exact steps before tagging
- `--allow-slow-types` behavior on JS+`@ts-self-types` packages not verified against live JSR publish; run `jsr publish --dry-run` in workflow as canary

## Session Continuity

Last session: 2026-03-21T20:04:19.997Z
Stopped at: Completed 02-publish-pipeline 02-01-PLAN.md
Resume file: None
