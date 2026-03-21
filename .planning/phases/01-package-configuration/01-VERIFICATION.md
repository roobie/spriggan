---
phase: 01-package-configuration
verified: 2026-03-21T19:52:00Z
status: passed
score: 7/7 must-haves verified
re_verification: false
---

# Phase 1: Package Configuration Verification Report

**Phase Goal:** The package is correctly configured for both registries — a consumer can `npm pack` and see exactly the right files, TypeScript can resolve types, and JSR can read them via `@ts-self-types`
**Verified:** 2026-03-21T19:52:00Z
**Status:** PASSED
**Re-verification:** No — initial verification

---

## Goal Achievement

### Observable Truths

| #  | Truth                                                                                   | Status     | Evidence                                                                                      |
|----|-----------------------------------------------------------------------------------------|------------|-----------------------------------------------------------------------------------------------|
| 1  | `tsc -p tsconfig.build.json` emits dist/spriggan.d.ts and dist/spriggan.d.ts.map without errors | VERIFIED | `bunx tsc -p tsconfig.build.json` exits 0; dist/spriggan.d.ts and dist/spriggan.d.ts.map confirmed present |
| 2  | TYPE-01 decision (handwritten vs tsc-emitted) is decided and documented in SUMMARY       | VERIFIED | 01-01-SUMMARY.md key-decisions: "TYPE-01: Keep handwritten src/spriggan.d.ts" with detailed rationale |
| 3  | src/spriggan.js has `@ts-self-types` as its very first content line                     | VERIFIED | `head -1 src/spriggan.js` = `/* @ts-self-types="./spriggan.d.ts" */`                         |
| 4  | `npm pack --dry-run` lists only src/spriggan.js, src/spriggan.d.ts, LICENSE, README.md, package.json | VERIFIED | Exact 5 files: LICENSE, README.md, package.json, src/spriggan.d.ts, src/spriggan.js          |
| 5  | TypeScript resolves types via exports.types placed before exports.default               | VERIFIED | exports conditions order: `types,default`; types = `./src/spriggan.d.ts`                     |
| 6  | jsr.json has name @bjro/spriggan, version 1.0.0, exports pointing to src/spriggan.js   | VERIFIED | jsr.json: name=@bjro/spriggan, version=1.0.0, exports="./src/spriggan.js" (bare string)      |
| 7  | All existing tests still pass (no regressions)                                          | VERIFIED | `bunx vitest run`: 100 tests passed across 2 test files                                       |

**Score:** 7/7 truths verified

---

### Required Artifacts

| Artifact              | Expected                                        | Status   | Details                                                             |
|-----------------------|-------------------------------------------------|----------|---------------------------------------------------------------------|
| `tsconfig.build.json` | Declaration-only emit config extending base tsconfig | VERIFIED | extends ./tsconfig.json, noEmit: false, emitDeclarationOnly: true, include: [src/spriggan.js] |
| `src/spriggan.js`     | Source file with @ts-self-types directive        | VERIFIED | First line: `/* @ts-self-types="./spriggan.d.ts" */`               |
| `.gitignore`          | Ignores dist/ directory                          | VERIFIED | Line 3: `dist/`                                                     |
| `package.json`        | Complete npm package metadata                    | VERIFIED | All required fields present: name, version, exports, files, publishConfig, sideEffects, keywords, engines, repository, bugs, homepage |
| `jsr.json`            | JSR registry manifest                            | VERIFIED | name, version, exports (bare string), publish.include (jsr.json first) |
| `src/spriggan.d.ts`   | Handwritten declarations (TYPE-01 winner)        | VERIFIED | 252 lines; full generics: AppConfig<T,M>, AppApi<T,M>, Dispatch<M>, HtmlValue union, 5 built-in effect types |

---

### Key Link Verification

| From                         | To                          | Via                          | Status   | Details                                                              |
|------------------------------|-----------------------------|------------------------------|----------|----------------------------------------------------------------------|
| `tsconfig.build.json`        | `tsconfig.json`             | `extends` field              | VERIFIED | `"extends": "./tsconfig.json"` confirmed                            |
| `src/spriggan.js`            | `src/spriggan.d.ts`         | `@ts-self-types` directive   | VERIFIED | `/* @ts-self-types="./spriggan.d.ts" */` is line 1; path resolves to same-dir .d.ts |
| `package.json exports.types` | `./src/spriggan.d.ts`       | exports map types condition  | VERIFIED | `"types": "./src/spriggan.d.ts"` — first key in exports["."] object |
| `jsr.json exports`           | `./src/spriggan.js`         | exports field (bare string)  | VERIFIED | `"exports": "./src/spriggan.js"` — JSR reads @ts-self-types from there |
| `jsr.json publish.include`   | `jsr.json` (self-reference) | publish.include array        | VERIFIED | `publish.include[0] = "jsr.json"` confirmed                         |

---

### Requirements Coverage

| Requirement | Source Plan | Description                                                     | Status    | Evidence                                                      |
|-------------|-------------|-----------------------------------------------------------------|-----------|---------------------------------------------------------------|
| PKG-01      | 01-02       | name, version, description, repository/homepage/bugs fields     | SATISFIED | All fields present in package.json: @bjro/spriggan, 1.0.0, description, repository, bugs, homepage |
| PKG-02      | 01-02       | exports map with types and default conditions                   | SATISFIED | `exports["."] = { types: "./src/spriggan.d.ts", default: "./src/spriggan.js" }` |
| PKG-03      | 01-02       | files array limiting tarball to source + declarations           | SATISFIED | files: [src/spriggan.js, src/spriggan.d.ts, LICENSE]; npm pack confirms 5-file tarball |
| PKG-04      | 01-02       | publishConfig.access set to "public"                            | SATISFIED | `"publishConfig": { "access": "public", "provenance": true }` |
| PKG-05      | 01-02       | keywords, sideEffects: false, and engines fields                | SATISFIED | keywords: 7 entries, sideEffects: false, engines: { node: ">=18" } |
| PKG-06      | 01-02       | jsr.json with name, version, exports pointing to source         | SATISFIED | jsr.json confirmed; exports = ./src/spriggan.js (bare string, correct for JSR) |
| TYPE-01     | 01-01       | src/spriggan.d.ts complete and matches public API surface       | SATISFIED | 252-line handwritten .d.ts includes all generics: AppConfig<T,M>, AppApi<T,M>, HtmlValue union, 5 built-in effects; tsc output rejected as lossy |
| TYPE-02     | 01-01       | tsconfig.build.json for declaration-only emit                   | SATISFIED | tsconfig.build.json: emitDeclarationOnly: true, extends base, produces dist/spriggan.d.ts at exit 0 |
| TYPE-03     | 01-01       | @ts-self-types directive at top of src/spriggan.js              | SATISFIED | First line confirmed: `/* @ts-self-types="./spriggan.d.ts" */` |

No orphaned requirements — all 9 IDs declared in plans (PKG-01 through PKG-06 in 01-02, TYPE-01 through TYPE-03 in 01-01) are mapped, covered, and satisfied.

---

### Anti-Patterns Found

None. No TODO/FIXME/placeholder markers in any modified files.

---

### Human Verification Required

#### 1. JSR Publish Dry-Run

**Test:** Run `npx jsr publish --dry-run --allow-dirty` from repo root
**Expected:** Completes without type errors; reports package accepted with 5 files
**Why human:** The SUMMARY noted `--allow-dirty` was required locally due to uncommitted planning files. Full clean-checkout behavior is only verifiable in CI or a fresh clone. Automated check was skipped here to avoid side effects.

#### 2. TypeScript Consumer Import Resolution

**Test:** In a separate project with `"@bjro/spriggan": "file:../spriggan"` in package.json, write `import createSpriggan from '@bjro/spriggan'` and hover over `createSpriggan` in an IDE
**Expected:** IDE shows `(): SprigganInstance` return type with full generics (not `Function`); `createSpriggan().app<State, Msg>(...)` resolves `AppConfig<State, Msg>` correctly
**Why human:** Exports map type resolution requires a real TypeScript language server; cannot be verified by grep

---

### Gaps Summary

No gaps. All must-haves from both plans are satisfied by the actual codebase. The phase goal is achieved:

- A consumer running `npm pack` sees exactly: src/spriggan.js, src/spriggan.d.ts, LICENSE, README.md, package.json (5 files, verified by dry-run).
- TypeScript resolves types from the exports map: `types` condition appears before `default`, pointing at the rich handwritten `src/spriggan.d.ts`.
- JSR resolves types via `@ts-self-types="./spriggan.d.ts"` on the first line of `src/spriggan.js`; jsr.json exports is a bare string to that file.
- `tsconfig.build.json` produces `dist/spriggan.d.ts` at exit 0, separate from the noEmit check config.
- All 100 existing tests remain green.

---

_Verified: 2026-03-21T19:52:00Z_
_Verifier: Claude (gsd-verifier)_
