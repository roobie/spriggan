# Spriggan

## What This Is

Spriggan is a ~750-line, zero-dependency JavaScript framework inspired by The Elm Architecture (TEA). It provides Model-Update-View unidirectional data flow with a built-in effect system, event delegation, and optional debug tooling — all without build tools. Published as `@bjro/spriggan` on both npm and JSR.

## Core Value

A tiny, teachable TEA framework that works everywhere ES modules work — installable from npm/JSR with full TypeScript types, no build step required.

## Requirements

### Validated

- ✓ TEA core (model, update, view, dispatch) — existing
- ✓ Built-in effects (http, delay, storage, fn, dom) — existing
- ✓ Event delegation with data-msg/data-model — existing
- ✓ html tagged template literal — existing
- ✓ Debug mode with time-travel — existing
- ✓ Subscriptions for external events — existing
- ✓ Idiomorph morphing support — existing
- ✓ Vitest test suite (100 tests) — existing
- ✓ Biome lint/format — existing
- ✓ CI running checks on push/PR — existing
- ✓ Package metadata (@bjro/spriggan@1.0.0, exports, files, publishConfig) — v1.0
- ✓ TypeScript declarations (handwritten src/spriggan.d.ts, @ts-self-types) — v1.0
- ✓ JSR module configuration (jsr.json with exports and publish.include) — v1.0
- ✓ GitHub Actions publish workflow (tag-triggered, gate + parallel npm/JSR) — v1.0
- ✓ Tests and lint as gate before publish (mise run check + version consistency) — v1.0

### Active

(None yet — ship to validate)

### Out of Scope

- UMD/CDN bundle — ESM-only; CDNs like esm.sh work without author action
- Automated version bumping — manual tag push is the trigger
- TypeScript source rewrite — JS + handwritten .d.ts preserves "no build tools" philosophy

## Context

Shipped v1.0 with 979 LOC (728 JS + 251 .d.ts).
Tech stack: Vanilla JS, JSDoc types, Vitest, Biome, Bun 1.3 (via mise).
Published on npm (with provenance) and JSR (score 100%).
CI: ci.yml (push/PR checks) + publish.yml (tag-triggered dual publish).

## Constraints

- **Single source file**: `src/spriggan.js` — no bundling needed
- **Zero runtime deps**: Must stay zero-dependency for consumers
- **Tag-triggered publish**: Push `v*` tag to publish
- **ESM only**: `"type": "module"` in package.json
- **Strict semver**: Breaking changes bump major

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| @bjro/spriggan scope | User's npm/JSR scope | ✓ Good |
| ESM only, no UMD | Simplicity, modern consumers | ✓ Good |
| Tag-triggered publish | Simple, explicit version control | ✓ Good |
| Bun in CI (via mise) | Already used for dev tooling | ✓ Good |
| Handwritten .d.ts over tsc-emitted | tsc discards all generics from JSDoc | ✓ Good |
| NPM_TOKEN secret (not OIDC) | Simpler bootstrap, proven in slog | ✓ Good |
| deno publish for JSR (not npx jsr) | Native OIDC, proven in slog | ✓ Good |
| Single test gate (mise run check) | Browser-only framework, no multi-runtime needed | ✓ Good |

---
*Last updated: 2026-03-21 after v1.0 milestone*
