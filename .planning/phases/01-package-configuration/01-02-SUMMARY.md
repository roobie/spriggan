---
phase: 01-package-configuration
plan: "02"
subsystem: infra
tags: [npm, jsr, package-json, jsr-json, publishing, typescript, exports-map]

# Dependency graph
requires:
  - phase: 01-package-configuration
    plan: "01"
    provides: "TYPE-01 decision: handwritten src/spriggan.d.ts authoritative; @ts-self-types directive in src/spriggan.js"
provides:
  - "Complete package.json with @bjro/spriggan npm metadata, exports map (types first), files whitelist"
  - "jsr.json with @bjro/spriggan JSR manifest, publish.include whitelist"
  - "npm pack --dry-run verified: 5 files (src/spriggan.js, src/spriggan.d.ts, LICENSE, README.md, package.json)"
  - "jsr publish --dry-run verified: no type errors, 5 files published"
affects:
  - "02 (CI/CD workflows can now reference package.json version and jsr.json for publish steps)"

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "exports map: types condition before default condition — TypeScript evaluates conditions in declaration order"
    - "default (not import) condition for .js exports — import is for TypeScript source shipping; default is for pre-built .js"
    - "jsr.json publish.include[0] must be jsr.json itself when using an include whitelist"
    - "publishConfig.provenance: true enables npm supply-chain attestation"
    - "sideEffects: false enables tree-shaking in bundlers"

key-files:
  created:
    - jsr.json
  modified:
    - package.json

key-decisions:
  - "exports['.'].types points to ./src/spriggan.d.ts (handwritten, TYPE-01 decision from Plan 01)"
  - "exports['.'] uses 'default' condition (not 'import') since spriggan ships pre-built .js"
  - "jsr.json exports points to ./src/spriggan.js directly — JSR type resolution uses @ts-self-types, not exports conditions"
  - "files array does not include dist/ — handwritten src/spriggan.d.ts is canonical"
  - "jsr publish --dry-run requires --allow-dirty if any uncommitted files exist (e.g. .planning/ files) — use in CI only on clean checkout"

patterns-established:
  - "Package publishing: exports map types-first, files whitelist, publishConfig.provenance for supply chain"
  - "JSR publishing: jsr.json self-reference first in publish.include, exports as bare string pointing to .js"

requirements-completed: [PKG-01, PKG-02, PKG-03, PKG-04, PKG-05, PKG-06]

# Metrics
duration: 3min
completed: 2026-03-21
---

# Phase 1 Plan 02: package.json + jsr.json Configuration Summary

**package.json and jsr.json fully configured for dual npm/JSR publishing of @bjro/spriggan@1.0.0 with handwritten types; both dry-run verifications pass.**

## Performance

- **Duration:** ~3 min
- **Started:** 2026-03-21T18:45:07Z
- **Completed:** 2026-03-21T18:47:54Z
- **Tasks:** 2
- **Files modified:** 2 (package.json rewritten, jsr.json created)

## Accomplishments

- Rewrote package.json with all required npm metadata: name, version, description, exports map (types before default), files whitelist, sideEffects, keywords, engines, repository, bugs, homepage, publishConfig (access: public, provenance: true)
- Created jsr.json with correct JSR manifest: self-reference first in publish.include, exports as bare string to src/spriggan.js
- npm pack --dry-run confirms exactly 5 expected files in tarball
- jsr publish --dry-run confirms no type errors, package accepted by JSR
- All 100 existing tests remain green

## Task Commits

Each task was committed atomically:

1. **Task 1: Complete package.json with all required fields** - `83500eb` (feat)
2. **Task 2: Create jsr.json and run full verification** - `585ca08` (feat)

## Files Created/Modified

- `package.json` - Complete npm metadata: @bjro/spriggan@1.0.0 with exports map (types: ./src/spriggan.d.ts first, default: ./src/spriggan.js), files whitelist, publishConfig.provenance
- `jsr.json` - JSR manifest: @bjro/spriggan@1.0.0, exports: ./src/spriggan.js, publish.include with jsr.json as first entry

## Decisions Made

**exports condition: 'default' not 'import'.** The slog reference used `"import"` because it ships TypeScript source (both types and runtime are the same .ts file). Spriggan ships pre-built .js with separate .d.ts, so `"default"` is the correct condition name for the runtime entry point.

**jsr.json exports is a bare string.** JSR resolves types via the `@ts-self-types` directive in src/spriggan.js, not via a conditions object. Using `"./src/spriggan.js"` directly is correct for JSR; the npm-style conditions object would be ignored.

**--allow-dirty for jsr publish dry-run.** The `jsr publish --dry-run` check aborts if any uncommitted files exist in the working tree, including planning files. The `--allow-dirty` flag is required for local verification; in CI this is a non-issue since checkout is always clean.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

`jsr publish --dry-run` failed initially due to uncommitted `.planning/config.json` in the working tree. Used `--allow-dirty` flag as the plan noted was an option. In CI the checkout will be clean so this flag won't be needed.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- package.json and jsr.json are fully configured and verified
- Phase 02 (CI/CD workflows) can reference package.json `version` field and use `npm publish` / `jsr publish` with the configured manifests
- First npm publish still requires one-time bootstrapping (as documented in STATE.md blockers: OIDC trusted publisher requires package to exist before it can be configured)

---
*Phase: 01-package-configuration*
*Completed: 2026-03-21*
