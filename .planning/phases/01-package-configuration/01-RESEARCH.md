# Phase 1: Package Configuration - Research

**Researched:** 2026-03-21
**Domain:** npm + JSR package metadata, TypeScript declaration emit, @ts-self-types directive
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **Version:** Start at 1.0.0 — framework is feature-complete and tested, signal confidence
- **Semver:** Strict semver going forward — any breaking change bumps major, consumers can trust ^1.x ranges
- **Declaration approach:** Evaluate tsc-emitted vs handwritten .d.ts during this phase; run `tsc --emitDeclarationOnly` and diff against existing `src/spriggan.d.ts`; if tsc output is good enough, use it; if handwritten is better, ship handwritten + add CI diff check; if handwritten wins: keep declarations in `src/` alongside source (no `dist/` folder); if tsc-emitted wins: emit to `dist/`, gitignore generated files
- **Tarball contents:** Minimal: `src/spriggan.js`, `src/spriggan.d.ts`, `src/spriggan.d.ts.map`, `README.md`, `LICENSE`; no examples, no config files, no tests in the published package; use `files` array in package.json to enforce this
- **JSR scope and version sync:** Same name on both registries: `@bjro/spriggan`; manual version bump in both package.json and jsr.json before tagging; CI consistency check as safety net

### Claude's Discretion
- Exact package.json field ordering
- tsconfig.build.json configuration details
- Keywords selection for npm discoverability
- engines.node range

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| PKG-01 | package.json has name (@bjro/spriggan), version, description, and repository/homepage/bugs fields | Standard npm fields; slog reference shows exact structure; repository must match GitHub repo for provenance |
| PKG-02 | package.json has exports map with types and default conditions | "types" must come first in conditions object; "default" points to src/spriggan.js; "types" points to the chosen .d.ts location |
| PKG-03 | package.json has files array limiting tarball to source + declarations | Use "files" whitelist, not .npmignore; verify with `npm pack --dry-run`; always includes package.json, README.md, LICENSE automatically |
| PKG-04 | package.json has publishConfig.access set to "public" | Scoped packages default to private; required or publish fails with billing error |
| PKG-05 | package.json has keywords, sideEffects: false, and engines fields | All low-complexity additions; sideEffects: false enables tree-shaking; engines.node range can be permissive |
| PKG-06 | jsr.json created with name, version, and exports pointing to source | New file at repo root; export points to src/spriggan.js; publish.include must contain jsr.json itself |
| TYPE-01 | src/spriggan.d.ts is complete and matches the public API surface of src/spriggan.js | Handwritten .d.ts already exists (252 lines) and covers full API; must verify against tsc-emitted output; key gap: app function is declared inside createSpriggan closure, not directly exported |
| TYPE-02 | tsconfig.build.json created for declaration-only emit (separate from noEmit check config) | Base tsconfig.json has noEmit: true which wins over declaration: true; build config must override noEmit: false and scope include to src/spriggan.js only to avoid errors in examples/**; also needs rootDir/outDir |
| TYPE-03 | @ts-self-types directive added to top of src/spriggan.js for JSR type resolution | Single comment: `/* @ts-self-types="./spriggan.d.ts" */`; must be absolute first non-whitespace content; JSR cannot infer types from JSDoc JS without it |
</phase_requirements>

## Summary

Phase 1 is purely metadata configuration — no algorithmic work, no new library installs. The source file (`src/spriggan.js`) and handwritten type declarations (`src/spriggan.d.ts`) already exist; this phase wires them into the packaging machinery. The primary work is: filling in `package.json` fields, creating `jsr.json`, creating `tsconfig.build.json`, running the declaration comparison to settle the handwritten-vs-tsc question, and adding the `@ts-self-types` directive.

The canonical reference is `~/devel/slog/` — a working `@bjro`-scoped package from the same author. Spriggan differs from slog in one critical way: slog ships TypeScript source directly (so `exports["."].types` points at `.ts`), while Spriggan ships a `.js` file and needs a separate `.d.ts` file. This means the `exports` map needs the `types` condition pointing at the `.d.ts` artefact, and `tsconfig.build.json` must exist to produce that artefact.

The `tsconfig.json` has a latent conflict: `noEmit: true` silently overrides `declaration: true`, so running `tsc` currently produces nothing. The fix is a separate `tsconfig.build.json` that scopes the compiler to `src/spriggan.js` only (the base `include` covers `examples/**` which has type errors). The declaration location (src/ or dist/) depends on the TYPE-01 comparison, which must happen during execution.

**Primary recommendation:** Complete the `package.json` + `tsconfig.build.json` + `jsr.json` + `@ts-self-types` changes atomically in a single commit, then run `npm pack --dry-run` and `jsr publish --dry-run` as the verification gate before marking the phase done.

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| TypeScript | 5.9.3 (already installed) | Declaration emit via `tsc --emitDeclarationOnly` | Already a devDep; `tsc` is the only tool needed for .d.ts generation |
| npm CLI | bundled with Node in CI | `npm pack --dry-run` for tarball inspection | Standard way to preview what gets published |
| jsr CLI | via `npx jsr` (no version pin) | `jsr publish --dry-run` for JSR validation | Official JSR CLI, fetched at runtime |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `@arethetypeswrong/cli` | latest via npx | Verify exports map resolves correctly for TypeScript consumers | Optional but catches condition-order bugs early |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `tsc --emitDeclarationOnly` | `dts-bundle-generator`, `tsup` | Both add tooling overhead with zero benefit for a single-file package |
| Handwritten `.d.ts` | Auto-generated only | Handwritten may be richer; comparison step (TYPE-01) decides which to ship |
| `jsr.json` | `deno.json` | `deno.json` implies a Deno project; `jsr.json` is correct for non-Deno packages |

**Installation:** No new packages needed. All tooling is already installed.

## Architecture Patterns

### Recommended Project Structure

After phase completion (tsc-emitted path):
```
spriggan/
├── src/
│   ├── spriggan.js          # Source, shipped directly
│   └── spriggan.d.ts        # Only if handwritten wins TYPE-01 comparison
├── dist/                    # Only if tsc-emitted wins (add to .gitignore)
│   ├── spriggan.d.ts        # tsc output
│   └── spriggan.d.ts.map
├── package.json             # Filled in with all required fields
├── jsr.json                 # New file, JSR-only manifest
├── tsconfig.json            # Unchanged (noEmit: true stays)
└── tsconfig.build.json      # New file, overrides noEmit for emit only
```

After phase completion (handwritten wins path):
```
spriggan/
├── src/
│   ├── spriggan.js          # Source, shipped directly (with @ts-self-types at top)
│   ├── spriggan.d.ts        # Handwritten, shipped alongside source
│   └── spriggan.d.ts.map    # Optional; add if tsc can emit it
├── package.json
├── jsr.json
├── tsconfig.json            # Unchanged
└── tsconfig.build.json      # Still needed to run comparison / CI diff check
```

### Pattern 1: exports map with types-first condition

```json
// package.json — tsc-emitted path
{
  "exports": {
    ".": {
      "types": "./dist/spriggan.d.ts",
      "default": "./src/spriggan.js"
    }
  }
}

// package.json — handwritten path
{
  "exports": {
    ".": {
      "types": "./src/spriggan.d.ts",
      "default": "./src/spriggan.js"
    }
  }
}
```

The `"types"` key MUST appear before `"default"`. TypeScript evaluates conditions in declaration order; wrong order produces implicit `any` for all imports with no diagnostic.

### Pattern 2: tsconfig.build.json — scoped to src/spriggan.js only

```json
// tsconfig.build.json
{
  "extends": "./tsconfig.json",
  "compilerOptions": {
    "noEmit": false,
    "emitDeclarationOnly": true,
    "rootDir": "./src",
    "outDir": "./dist",
    "declarationDir": "./dist"
  },
  "include": ["src/spriggan.js"]
}
```

The `"include": ["src/spriggan.js"]` override is required. Without it, the base config's `include: ["src/**/*", "examples/**/*"]` pulls in `examples/` which has type errors that abort declaration emit. Confirmed by local test: running `tsc --emitDeclarationOnly` with the base config produces 10+ errors from examples files before reaching spriggan.js.

### Pattern 3: jsr.json with publish.include

```json
// jsr.json
{
  "name": "@bjro/spriggan",
  "version": "1.0.0",
  "exports": "./src/spriggan.js",
  "publish": {
    "include": [
      "jsr.json",
      "src/spriggan.js",
      "src/spriggan.d.ts",
      "README.md",
      "LICENSE"
    ]
  }
}
```

The `"jsr.json"` entry in `publish.include` is mandatory when using the include list — JSR's CLI requires the manifest to be part of the published set. Omitting it causes a confusing failure. (Source: PITFALLS.md Pitfall 7, confirmed by jsr-io/jsr GitHub issue.)

For the tsc-emitted path, replace `src/spriggan.d.ts` with `dist/spriggan.d.ts` and `dist/spriggan.d.ts.map`.

### Pattern 4: @ts-self-types directive placement

```javascript
/* @ts-self-types="./spriggan.d.ts" */

/**
 * Spriggan - A minimal TEA-inspired framework
 * No build tools, pure functions, LLM-friendly
 */

// @ts-check
```

The directive must be the absolute first content of the file (before even the descriptive comment block). The path is relative to the `.js` file. For the tsc-emitted path, change the path to `"../dist/spriggan.d.ts"` because the `.js` lives in `src/` and the `.d.ts` in `dist/`.

### Pattern 5: package.json complete shape (slog-derived, adapted for JS+.d.ts)

```json
{
  "name": "@bjro/spriggan",
  "version": "1.0.0",
  "description": "A minimal TEA (The Elm Architecture) framework for the browser — no build tools, pure functions",
  "type": "module",
  "exports": {
    ".": {
      "types": "./dist/spriggan.d.ts",
      "default": "./src/spriggan.js"
    }
  },
  "files": [
    "src/spriggan.js",
    "dist/spriggan.d.ts",
    "dist/spriggan.d.ts.map",
    "LICENSE"
  ],
  "sideEffects": false,
  "keywords": ["tea", "elm-architecture", "unidirectional", "frontend", "no-build", "mvc", "browser"],
  "engines": {
    "node": ">=18"
  },
  "author": "bjro",
  "license": "MIT",
  "repository": {
    "type": "git",
    "url": "git+https://github.com/roobie/spriggan.git"
  },
  "bugs": {
    "url": "https://github.com/roobie/spriggan/issues"
  },
  "homepage": "https://github.com/roobie/spriggan#readme",
  "publishConfig": {
    "access": "public",
    "provenance": true
  },
  "devDependencies": { "...existing..." }
}
```

NOTE: README.md and LICENSE are automatically included by npm even without listing them in `files`, but LICENSE should be listed explicitly to be safe. README.md need not be in `files`.

### Anti-Patterns to Avoid

- **Putting `"types"` after `"default"` in exports:** TypeScript sees only `"default"`, produces implicit `any` everywhere.
- **Touching `tsconfig.json` to enable emit:** The base config has `noEmit: true` intentionally for type-checking-only workflows. Use only `tsconfig.build.json`.
- **Using `deno.json` for JSR config:** Spriggan is not a Deno project; use `jsr.json`.
- **Placing `@ts-self-types` after any content in spriggan.js:** JSR's parser requires it as the very first content.
- **Forgetting to clean dist/ before re-running tsc:** TypeScript refuses to overwrite its own input `.d.ts` files; always `rm -rf dist` first.
- **Adding `.npmignore`:** Once present, it overrides `.gitignore` entirely and previously excluded files may appear in the tarball. Use only the `files` whitelist.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Type declarations for JS source | Custom JSDoc-to-.d.ts scripts | `tsc --emitDeclarationOnly` | tsc handles all edge cases; already a devDep |
| Tarball content listing | Custom script to check file list | `npm pack --dry-run` | Built into npm; canonical output |
| JSR publish validation | Manual file inspection | `npx jsr publish --dry-run` | JSR CLI validates types, exports, scoring; catches pitfalls before real publish |
| Version consistency check | Bespoke tag-parsing script | Inline bash in the workflow | Simple, no dep, self-documenting; see Pitfall 5 snippet |

**Key insight:** Package configuration has no novel algorithmic content. Every problem here has a standard tool solution. The only decision that requires judgment is the handwritten-vs-tsc declaration comparison (TYPE-01).

## Common Pitfalls

### Pitfall 1: noEmit: true silently blocks declaration emit
**What goes wrong:** Base `tsconfig.json` has `noEmit: true` alongside `declaration: true`. Running `tsc` succeeds with exit 0 and produces no files. No error, no warning.
**Why it happens:** `noEmit` explicitly wins over `declaration`.
**How to avoid:** Always use `tsconfig.build.json` with `noEmit: false` override for emit. Never run `tsc -p tsconfig.json` expecting output.
**Warning signs:** `tsc -p tsconfig.json` exits 0 but no `dist/` directory exists.

### Pitfall 2: examples/ in tsc include pulls in type errors
**What goes wrong:** Base `tsconfig.json` includes `examples/**/*`. The example files have untyped parameters and other errors. Running `tsc` with the base include aborts declaration emit after printing those errors.
**Why it happens:** `tsconfig.build.json` that only overrides `noEmit`/`outDir` but not `include` inherits the broad include pattern.
**How to avoid:** `tsconfig.build.json` MUST override `"include": ["src/spriggan.js"]` explicitly.
**Warning signs:** Running `tsc -p tsconfig.build.json` shows errors from `examples/components.js` or similar.

### Pitfall 3: @ts-self-types path varies by declaration location
**What goes wrong:** If declarations are in `src/` alongside the source, the directive is `/* @ts-self-types="./spriggan.d.ts" */`. If in `dist/`, it must be `/* @ts-self-types="../dist/spriggan.d.ts" */`. Using the wrong relative path causes JSR to report missing types.
**Why it happens:** The path is relative to the `.js` file's location, not the repo root.
**How to avoid:** Choose declaration location (TYPE-01 decision) before writing the directive. Write the path explicitly, then verify with `jsr publish --dry-run`.

### Pitfall 4: jsr.json not in publish.include
**What goes wrong:** Using `publish.include` as an allowlist causes `jsr.json` itself to be excluded from the publish, triggering confusing errors.
**How to avoid:** Always include `"jsr.json"` as the first item in `publish.include`.

### Pitfall 5: TYPE-01 comparison — app() is not a top-level export
**What goes wrong:** The handwritten `.d.ts` declares `app` as a top-level `declare function app(...)`. But in the source, `app` is defined inside the `createSpriggan()` closure and returned as part of the `{ app, html }` object. tsc-emitted declarations will reflect the actual runtime shape (returned from `createSpriggan`), which may differ from the handwritten declarations.
**Why it matters:** If the handwritten declarations describe a different call shape than what the runtime provides, TypeScript consumers will be misled.
**How to avoid:** During TYPE-01 comparison, specifically check: does the handwritten `.d.ts` match how consumers actually use the API? The exported symbols from the `.js` file are `default createSpriggan` and named `html`. The `app` function is a method on the returned object.

## Code Examples

### Running declaration emit with tsconfig.build.json
```bash
# Clean previous output first (prevents TypeScript input collision)
rm -rf dist
# Emit declarations only, scoped to src/spriggan.js
bunx tsc -p tsconfig.build.json
# Verify output
ls dist/
# Expected: spriggan.d.ts  spriggan.d.ts.map
```

### Verifying tarball contents
```bash
npm pack --dry-run
# Expected output should list only:
# src/spriggan.js
# dist/spriggan.d.ts  (or src/spriggan.d.ts if handwritten wins)
# dist/spriggan.d.ts.map  (if present)
# LICENSE
# README.md
# package.json  (always included automatically)
```

### Validating JSR publish without actually publishing
```bash
npx jsr publish --dry-run
# Should complete without errors; check for type warnings
```

### Diffing handwritten vs tsc-emitted declarations (TYPE-01 decision)
```bash
rm -rf dist
bunx tsc -p tsconfig.build.json
# Then diff and review:
diff src/spriggan.d.ts dist/spriggan.d.ts
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `"main"` field for package entry | `"exports"` map | Node 12+ / npm 7+ | Enables conditional exports, TypeScript types condition, strict encapsulation |
| Long-lived npm tokens (`NPM_TOKEN`) | OIDC trusted publishing | npm 11.5.1 (GA July 2025) | No secrets to store or rotate; token is scoped and ephemeral |
| `deno publish` for JSR | `npx jsr publish` | 2024 | No Deno toolchain needed for non-Deno packages |
| Ship only `"default"` in exports | `"types"` condition first | TypeScript 4.7 | Without it, TS consumers see `any` for all imports |

## Open Questions

1. **TYPE-01: Which declaration wins — handwritten or tsc-emitted?**
   - What we know: Handwritten `.d.ts` is 252 lines with full coverage including 5 built-in effect types. tsc can emit from JSDoc-annotated JS. The `app` function is inside the closure, not top-level exported.
   - What's unclear: Whether tsc can emit an idiomatic, complete `.d.ts` from the JSDoc annotations in spriggan.js, and whether it matches the handwritten version in quality.
   - Recommendation: Run the comparison early in execution (before writing other files that depend on the declaration path). Check specifically: (a) does tsc emit `app` as a method on the return type of `createSpriggan`, (b) does tsc emit the generic `AppConfig<T, M>` and `AppApi<T, M>` shapes correctly, (c) are the 5 built-in effect union types present.

2. **LICENSE file presence**
   - What we know: Referenced in CONTEXT.md as a tarball content item. Not confirmed to be present in the repo.
   - What's unclear: Does `~/devel/spriggan/LICENSE` exist?
   - Recommendation: Check at execution start. If absent, create it (MIT, matching slog).

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 4.x |
| Config file | `vitest.config.js` (jsdom environment) |
| Quick run command | `bunx vitest run --reporter verbose` |
| Full suite command | `bunx vitest run --reporter verbose` |

### Phase Requirements → Test Map

Phase 1 requirements are configuration files, not runtime behavior. Most cannot be verified by unit tests — they are verified by tool commands (`npm pack --dry-run`, `tsc -p tsconfig.build.json`, `jsr publish --dry-run`, diff).

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|--------------|
| PKG-01 | package.json has name, version, description, repo fields | manual-only | `node -e "const p=require('./package.json'); console.log(p.name, p.version)"` | ✅ (verify contents) |
| PKG-02 | exports map with types + default conditions | manual-only | `cat package.json \| node -e "const p=JSON.parse(require('fs').readFileSync('/dev/stdin','utf8')); console.log(JSON.stringify(p.exports,null,2))"` | ✅ (verify structure) |
| PKG-03 | files array limits tarball | smoke | `npm pack --dry-run 2>&1` | ✅ (run tool) |
| PKG-04 | publishConfig.access = "public" | manual-only | `node -e "const p=require('./package.json'); console.log(p.publishConfig)"` | ✅ (verify contents) |
| PKG-05 | keywords, sideEffects, engines present | manual-only | `node -e "const p=require('./package.json'); console.log(p.keywords, p.sideEffects, p.engines)"` | ✅ (verify contents) |
| PKG-06 | jsr.json has name, version, exports | manual-only | `node -e "const p=JSON.parse(require('fs').readFileSync('jsr.json','utf8')); console.log(p.name, p.version, p.exports)"` | ❌ Wave 0: jsr.json must be created |
| TYPE-01 | .d.ts matches public API surface | manual-only | `diff src/spriggan.d.ts dist/spriggan.d.ts` (after tsc emit) | ✅ (compare outputs) |
| TYPE-02 | tsconfig.build.json emits declarations | smoke | `rm -rf dist && bunx tsc -p tsconfig.build.json && ls dist/` | ❌ Wave 0: tsconfig.build.json must be created |
| TYPE-03 | @ts-self-types directive at top of spriggan.js | smoke | `head -1 src/spriggan.js` | ✅ (verify after edit) |

**Manual-only justification:** Package metadata fields are configuration, not executable behavior. The correct verification tool is `npm pack --dry-run` (checks PKG-03) and tool dry-runs, not unit tests. Attempting to unit-test JSON structure would be ceremony with no signal value.

### Sampling Rate
- **Per task commit:** `bunx vitest run` (existing tests must stay green throughout)
- **Per wave merge:** `bunx vitest run && npm pack --dry-run && bunx tsc -p tsconfig.build.json`
- **Phase gate:** `npm pack --dry-run` output lists only expected files + `jsr publish --dry-run` completes without type errors

### Wave 0 Gaps
- [ ] `jsr.json` — must be created (PKG-06); no test to write, but file is a prerequisite
- [ ] `tsconfig.build.json` — must be created (TYPE-02); enables the TYPE-01 comparison
- [ ] `dist/` — generated by `tsc -p tsconfig.build.json`; add to `.gitignore` if tsc-emitted wins

*(Existing test infrastructure in `__tests__/` covers spriggan runtime behavior and will be run as a health check throughout this phase, but no new test files are needed for Phase 1 requirements.)*

## Sources

### Primary (HIGH confidence)
- `~/devel/slog/package.json` — Canonical @bjro scoped package; proven in production
- `~/devel/slog/jsr.json` — Canonical jsr.json pattern; shows publish.include with jsr.json self-reference
- `.planning/research/PITFALLS.md` — All pitfalls verified against official docs
- `.planning/research/STACK.md` — tsconfig.build.json pattern with correct field set
- `.planning/research/FEATURES.md` — Complete field checklist for table-stakes and differentiators
- https://nodejs.org/api/packages.html — exports field resolution rules (types-first ordering)
- https://jsr.io/docs/package-configuration — jsr.json format and publish.include behavior
- https://www.typescriptlang.org/docs/handbook/declaration-files/dts-from-js.html — emitDeclarationOnly from JS files

### Secondary (MEDIUM confidence)
- https://github.com/jsr-io/jsr/issues/370 — Confirms @ts-self-types workaround for JS entrypoints
- https://hirok.io/posts/package-json-exports — exports field conditions ordering reference

### Tertiary (LOW confidence)
None for this phase — all findings backed by primary sources.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — tsc is already installed; jsr CLI is official; no new tools
- Architecture: HIGH — exports map shape, tsconfig.build.json pattern, and jsr.json format all verified against official docs and working reference (slog)
- Pitfalls: HIGH — all critical pitfalls verified; examples/ type-error issue confirmed by local test run
- TYPE-01 comparison outcome: UNKNOWN — cannot be resolved before execution; flag as open question

**Research date:** 2026-03-21
**Valid until:** 2026-06-21 (stable domain; npm/JSR config APIs change infrequently)
