# Phase 1: Package Configuration - Context

**Gathered:** 2026-03-21
**Status:** Ready for planning

<domain>
## Phase Boundary

All metadata and type declaration files that make @bjro/spriggan installable with correct types from both npm and JSR. This includes package.json fields, jsr.json, type declarations, and the @ts-self-types directive. No CI/CD workflows (Phase 2) or registry activation (Phase 3).

</domain>

<decisions>
## Implementation Decisions

### Version strategy
- Start at 1.0.0 — framework is feature-complete and tested, signal confidence
- Strict semver going forward — any breaking change bumps major, consumers can trust ^1.x ranges

### Declaration approach
- Evaluate tsc-emitted vs handwritten .d.ts during this phase
- Run `tsc --emitDeclarationOnly` and diff against existing `src/spriggan.d.ts`
- If tsc output is good enough, use it; if handwritten is better, ship handwritten + add CI diff check
- If handwritten wins: keep declarations in `src/` alongside source (no `dist/` folder)
- If tsc-emitted wins: emit to `dist/`, gitignore generated files
- Decision on which approach to use is made during execution, not upfront

### Tarball contents
- Minimal: `src/spriggan.js`, `src/spriggan.d.ts`, `src/spriggan.d.ts.map`, `README.md`, `LICENSE`
- No examples, no config files, no tests in the published package
- Use `files` array in package.json to enforce this

### JSR scope and version sync
- Same name on both registries: `@bjro/spriggan`
- Manual version bump in both package.json and jsr.json before tagging
- CI consistency check as safety net (fail if versions differ or don't match tag)

### Claude's Discretion
- Exact package.json field ordering
- tsconfig.build.json configuration details
- Keywords selection for npm discoverability
- engines.node range

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Package configuration
- `.planning/research/STACK.md` — Publishing stack: OIDC, setup-node v6, tsconfig.build.json pattern
- `.planning/research/FEATURES.md` — Table stakes fields, exports map structure, @ts-self-types directive
- `.planning/research/PITFALLS.md` — noEmit conflict, scoped package access, JSR publish.include gotcha

### Existing code
- `src/spriggan.js` — Source file to be published (single file, ~750 lines)
- `src/spriggan.d.ts` — Handwritten type declarations (252 lines) to evaluate against tsc output
- `package.json` — Current state: missing name, version, exports, files, publishConfig
- `tsconfig.json` — Base config with noEmit: true, declaration: true (contradictory)
- `jsr.json` — Does not exist yet, must be created

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/spriggan.d.ts`: Comprehensive handwritten declarations covering full public API including generics and all 5 built-in effect types
- `tsconfig.json`: Already has `declaration: true`, `declarationMap: true`, `strict: true` — just needs `noEmit` override in build config

### Established Patterns
- Single default export (`createSpriggan`) + single named export (`html`) — exports map is straightforward
- `"type": "module"` already set — ESM is the existing pattern
- Biome for formatting/linting, Vitest for tests — no changes needed for this phase

### Integration Points
- `package.json`: Needs name, version, description, exports, files, publishConfig, repository, homepage, bugs, keywords, sideEffects, engines
- `jsr.json`: New file at repo root — name, version, exports, publish.include
- `src/spriggan.js` line 1: Add `/* @ts-self-types="./spriggan.d.ts" */` directive for JSR

</code_context>

<specifics>
## Specific Ideas

- "No build tools" philosophy should extend to the package — prefer shipping source directly over generated artifacts when possible
- Declaration location follows the declaration approach decision: handwritten stays in src/, tsc-emitted goes to dist/

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 01-package-configuration*
*Context gathered: 2026-03-21*
