# Spriggan

## What This Is

Spriggan is a ~750-line, zero-dependency JavaScript framework inspired by The Elm Architecture (TEA). It provides Model-Update-View unidirectional data flow with a built-in effect system, event delegation, and optional debug tooling — all without build tools. Designed for prototyping, teaching, and AI pair programming.

## Core Value

Ship Spriggan as a proper package on npm and JSR so consumers can `npm install @bjro/spriggan` or `jsr add @bjro/spriggan` instead of copying the source file.

## Requirements

### Validated

- ✓ TEA core (model, update, view, dispatch) — existing
- ✓ Built-in effects (http, delay, storage, fn, dom) — existing
- ✓ Event delegation with data-msg/data-model — existing
- ✓ html tagged template literal — existing
- ✓ Debug mode with time-travel — existing
- ✓ Subscriptions for external events — existing
- ✓ Idiomorph morphing support — existing
- ✓ Vitest test suite — existing
- ✓ Biome lint/format — existing
- ✓ CI running checks on push/PR — existing
- ✓ Package metadata (@bjro/spriggan@1.0.0, exports, files, publishConfig) — Phase 1
- ✓ TypeScript declarations (handwritten src/spriggan.d.ts, @ts-self-types) — Phase 1
- ✓ JSR module configuration (jsr.json with exports and publish.include) — Phase 1

### Active

- [ ] GitHub Actions workflow to publish to npm on version tag push
- [ ] GitHub Actions workflow to publish to JSR on version tag push
- [ ] Tests and lint pass as gate before publish

### Out of Scope

- UMD/CDN bundle — ESM-only for now, can revisit later
- Feature additions — framework is feature-complete for this milestone
- Breaking API changes — publish what exists as-is
- Automated version bumping — manual tag push is the trigger

## Context

- Source is a single file: `src/spriggan.js` with JSDoc type annotations
- tsconfig.json already has `declaration: true` and `declarationMap: true` but `noEmit: true`
- Package manager is Bun 1.3 (via mise)
- CI uses `jdx/mise-action@v2` to run checks
- GitHub org/user: roobie
- npm scope: @bjro
- JSR scope: @bjro

## Constraints

- **Single source file**: The framework is one file (`src/spriggan.js`) — no bundling needed, just proper package metadata and declaration emit
- **Zero runtime deps**: Must stay zero-dependency for consumers
- **Tag-triggered publish**: Push `v*` tag to publish — no manual npm/jsr CLI steps
- **ESM only**: `"type": "module"` already set in package.json

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| @bjro/spriggan scope | User's npm/JSR scope | — Pending |
| ESM only, no UMD | Simplicity, modern consumers | — Pending |
| Tag-triggered publish | Simple, explicit version control | — Pending |
| Bun in CI | Already used for dev tooling via mise | — Pending |
| Handwritten .d.ts over tsc-emitted | tsc discards all generics from JSDoc; handwritten preserves full type safety | ✓ Good |

---
*Last updated: 2026-03-21 after Phase 1 completion*
