---
phase: 01-package-configuration
plan: "01"
subsystem: infra
tags: [typescript, declarations, tsconfig, tsc, ts-self-types]

# Dependency graph
requires: []
provides:
  - tsconfig.build.json for declaration-only emit from src/spriggan.js
  - "@ts-self-types directive in src/spriggan.js pointing to ./spriggan.d.ts"
  - "TYPE-01 decision: handwritten src/spriggan.d.ts is the authoritative declarations"
  - dist/ added to .gitignore
affects:
  - 01-02 (package.json exports map must use src/spriggan.d.ts for types, not dist/)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Declaration-only emit via separate tsconfig.build.json — never modifies base tsconfig.json noEmit: true"
    - "@ts-self-types directive as first line of .js file to link handwritten .d.ts"

key-files:
  created:
    - tsconfig.build.json
  modified:
    - src/spriggan.js
    - .gitignore

key-decisions:
  - "TYPE-01: Keep handwritten src/spriggan.d.ts — tsc-emitted output loses all generics (AppConfig<T,M>, AppApi<T,M>, Dispatch<M>, HtmlValue union) and emits app as Function type"
  - "Separate tsconfig.build.json extends base config and overrides noEmit:false + emitDeclarationOnly:true to avoid touching the type-check config"
  - "include: [src/spriggan.js] in tsconfig.build.json to exclude examples/ which has type errors that abort emit"
  - "@ts-self-types points to ./spriggan.d.ts (src-relative) since handwritten declarations stay in src/"

patterns-established:
  - "Type declarations: handwritten .d.ts in src/ is authoritative; tsc-emitted dist/ is reference only"
  - "Build separation: tsconfig.build.json for emit, tsconfig.json for type-checking; never conflate"

requirements-completed: [TYPE-01, TYPE-02, TYPE-03]

# Metrics
duration: 5min
completed: 2026-03-21
---

# Phase 1 Plan 01: tsconfig.build.json + @ts-self-types Setup Summary

**Handwritten src/spriggan.d.ts retained as authoritative declarations after tsc-emitted output lost all generics; @ts-self-types directive wired; tsconfig.build.json emits dist/ declarations cleanly.**

## Performance

- **Duration:** ~5 min
- **Started:** 2026-03-21T18:39:00Z
- **Completed:** 2026-03-21T18:41:14Z
- **Tasks:** 2
- **Files modified:** 3 (tsconfig.build.json created, src/spriggan.js modified, .gitignore modified)

## Accomplishments
- Created tsconfig.build.json that emits dist/spriggan.d.ts and dist/spriggan.d.ts.map cleanly (exit 0)
- Ran TYPE-01 comparison: tsc-emitted vs handwritten declarations; handwritten wins decisively
- Added @ts-self-types="./spriggan.d.ts" as first line of src/spriggan.js
- Added dist/ to .gitignore
- All 100 existing tests pass with no regressions

## Task Commits

Each task was committed atomically:

1. **Task 1: Create tsconfig.build.json and run declaration comparison** - `4272af0` (feat)
2. **Task 2: Add @ts-self-types directive to src/spriggan.js** - `f5f70ce` (feat)

## Files Created/Modified
- `tsconfig.build.json` - Declaration-only emit config extending tsconfig.json; includes only src/spriggan.js
- `src/spriggan.js` - @ts-self-types="./spriggan.d.ts" added as absolute first line
- `.gitignore` - dist/ entry added

## Decisions Made

**TYPE-01: Handwritten declarations win.** The diff between src/spriggan.d.ts and the tsc-emitted dist/spriggan.d.ts showed that tsc cannot reconstruct the rich type information from JSDoc alone:

- `createSpriggan()` return type: tsc emits `{ app: Function; html: typeof html }` — losing `SprigganInstance` with full generic `app<T, M>` signature
- `html` values: tsc emits `...values: any[]` — losing the `HtmlValue` union type
- All generic interfaces (`AppConfig<T, M>`, `AppApi<T, M>`, `UpdateFunction<T, M>`, `ViewFunction<T, M>`, `Dispatch<M>`) are completely absent from tsc output
- `BuiltInEffect` union export and all 5 built-in effect interfaces are absent from tsc output
- Biome lint immediately flagged `any`, `Function`, and confusing `void` in the tsc-emitted file

**Impact on Plan 02:** The `exports.types` field in package.json must point to `./src/spriggan.d.ts` (not `./dist/spriggan.d.ts`). The `files` array must include `src/spriggan.d.ts`.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- TYPE-01 decision is made and documented: handwritten `src/spriggan.d.ts` is authoritative
- tsconfig.build.json is functional and emits correctly
- Plan 02 (package.json configuration) can now set exports map and files array correctly:
  - `exports["."].types` → `"./src/spriggan.d.ts"`
  - `files` array must include `"src/spriggan.d.ts"` and `"src/spriggan.js"`
  - dist/ output is available for reference but not the canonical types path

---
*Phase: 01-package-configuration*
*Completed: 2026-03-21*
