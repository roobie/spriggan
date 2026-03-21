# Project Research Summary

**Project:** Spriggan — npm + JSR publishing milestone
**Domain:** JavaScript package dual-registry publishing (npmjs.com + jsr.io)
**Researched:** 2026-03-21
**Confidence:** HIGH

## Executive Summary

Spriggan is a zero-dependency, single-file ESM framework already built and tested. The milestone is publishing it to two registries (npm and JSR) with automated, tag-triggered CI. Because the source is a single `.js` file with no imports to bundle, the pipeline is architecturally simple: no bundler is needed, no transpilation step, only declaration emit via `tsc --emitDeclarationOnly`. The complexity lives entirely in metadata configuration and CI workflow plumbing, not in a build process.

The recommended approach is OIDC trusted publishing to both registries — no long-lived secrets stored in GitHub. npm OIDC (GA July 2025) requires npm >= 11.5.1 and a one-time manual link between the package on npmjs.com and the GitHub repository. JSR OIDC is identical in concept and equally straightforward. Both registries get separate, independently-retryable publish jobs in a single `publish.yml` workflow, both gated on the existing test-and-lint check. The package ships its source `.js` file directly, with a generated `.d.ts` placed in `dist/` for TypeScript consumers.

The dominant risks are all configuration mistakes, not implementation problems. The most critical: the existing `tsconfig.json` has `noEmit: true` which silently prevents declaration emit; JSR cannot infer types from JSDoc-annotated JavaScript without a `@ts-self-types` directive; and the `exports` map in `package.json` must list `"types"` before `"default"` or TypeScript consumers see `any` everywhere. All of these are solved by getting the config files right before the first publish attempt.

## Key Findings

### Recommended Stack

The CI toolchain is already established (Bun, Vitest, Biome, mise). What is new for publishing is minimal: `actions/setup-node@v6` with Node 22 LTS to get npm >= 11.5.1 for OIDC trusted publishing, `npx jsr publish` for JSR (no version pinning needed), and `tsc -p tsconfig.build.json` for declaration emit. No new runtime tools, no bundler, no additional devDependencies.

**Core technologies:**
- `actions/setup-node@v6`: configures npm registry and Node 22 in CI — v6 is current major; v4/v5 use deprecated Node 16 runner internals
- `npm >= 11.5.1` (install via `npm install -g npm@latest` in CI): required for OIDC trusted publishing; earlier versions produce opaque 404 errors
- `npx jsr publish`: official JSR CLI fetched at runtime — no version to pin, no extra devDependency
- `tsc --emitDeclarationOnly` via `tsconfig.build.json`: generates `dist/spriggan.d.ts` without bundling or transpiling the source
- `actions/checkout@v4`, `jdx/mise-action@v2`: already in use; reused as-is in the publish workflow

### Expected Features

**Must have (table stakes) — nothing ships without these:**
- `name`, `version`, `description`, `exports`, `files`, `publishConfig` in `package.json` — npm refuses to publish without them; `files` whitelist prevents shipping test/example files
- `"types"` condition first in `exports` map — TypeScript consumers see `any` if absent or ordered wrong
- `jsr.json` at repo root — JSR CLI requires it; `package.json` is not used by JSR
- `/* @ts-self-types="./spriggan.d.ts" */` directive at top of `src/spriggan.js` — JSR cannot infer types from JSDoc; without this directive the JSR package has no type information
- `tsconfig.build.json` with `noEmit: false`, `emitDeclarationOnly: true`, `outDir: ./dist` — generates the `.d.ts` that both registries serve to TypeScript consumers
- LICENSE file present at repo root — JSR scoring penalizes its absence; npm warns
- Tag-triggered publish workflow with test/lint gate — prevents shipping broken code; gates both publish jobs on existing `mise run check`
- One-time manual registry linking on npmjs.com and jsr.io — OIDC cannot be used without it; this is a genuine prerequisite that cannot be automated
- Version consistency check in workflow — tag name and `package.json` version must match before publish runs

**Should have (differentiators):**
- npm provenance (`--provenance` flag) — links tarball to the exact CI run; zero extra work once OIDC is active
- `keywords`, `sideEffects: false`, `engines.node`, `homepage`, `bugs` in `package.json` — discoverability, tree-shaking signal, support boundary communication
- `CHANGELOG.md` — reduces friction for consumers evaluating version upgrades; start with a single entry
- Releasing section in README documenting the `vX.Y.Z` tag convention — prevents future contributors from pushing `1.0.0` and wondering why CI doesn't fire
- JSR scoring completeness (JSDoc coverage, `@module` tag) — improves jsr.io search ranking

**Defer (v2+):**
- UMD/CommonJS dual build — adds dual-package hazard, no consumer need for ESM-native package
- Automated version bumping (semantic-release, changesets) — overhead without benefit at this scale
- Automated changelog generation — requires conventional commit discipline the project does not currently have
- CDN/unpkg distribution — ESM consumers already work via `esm.sh` without author action

### Architecture Approach

The publish pipeline has five components with a strict dependency order. Components 1-4 are all config file changes that can land in a single commit; component 5 is the new workflow file; component 6 is out-of-band website configuration. The gate job is intentionally kept separate from the publish jobs — one `ci.yml` for branch/PR checks, one `publish.yml` for tag-triggered publishing.

**Major components:**
1. `package.json` metadata — controls what npm sees; `name`, `version`, `exports`, `files`, `publishConfig`, `repository`
2. `jsr.json` — JSR-only manifest; `name`, `version`, `exports`; must stay version-synced with `package.json`
3. `tsconfig.build.json` + `@ts-self-types` directive — generates `dist/spriggan.d.ts`; used by both registries
4. `publish.yml` gate job — runs `mise run check` (lint + test); both publish jobs declare `needs: gate`
5. `publish.yml` publish jobs (npm + JSR) — parallel, independently retryable; both use OIDC (`id-token: write`)

### Critical Pitfalls

1. **`noEmit: true` silently prevents declaration emit** — create a separate `tsconfig.build.json` that extends the base and overrides `noEmit: false`; never touch the base `tsconfig.json`
2. **JSR cannot generate types from JSDoc JavaScript** — add `/* @ts-self-types="./spriggan.d.ts" */` as the very first line of `src/spriggan.js` before any imports
3. **`"types"` condition must be first in `exports` map** — TypeScript evaluates conditions in order; wrong order produces `any` for all imports with no error
4. **Version mismatch between git tag and `package.json`** — add an explicit version-consistency check step in the workflow that exits 1 if they differ; also keep `jsr.json` version in sync
5. **Sequential npm-then-JSR in one job** — use two separate jobs with `needs: gate`; if npm succeeds and JSR fails, the retry re-publishes to npm (which then errors as "version exists") and is impossible to untangle cleanly
6. **Bun uses `NPM_CONFIG_TOKEN` not `NODE_AUTH_TOKEN`** — avoid this entire class of confusion by using `npm publish` (not `bun publish`) with OIDC; no token variable needed at all

## Implications for Roadmap

Based on research, the dependency graph of components maps cleanly to four phases. All phases are configuration and plumbing — there is no feature implementation work.

### Phase 1: Package Metadata Foundation

**Rationale:** Every other step depends on correct `package.json` and `jsr.json` configuration. Publishing cannot proceed without them, and getting them wrong causes failures that are hard to diagnose once CI is involved. Do this first and verify locally.

**Delivers:** A fully-configured `package.json` and new `jsr.json` that satisfy both registries; a `tsconfig.build.json` that correctly emits `dist/spriggan.d.ts`; the `@ts-self-types` directive in source.

**Addresses:** All table-stakes features: `name`, `version`, `exports`, `files`, `publishConfig`, `repository`, `description`, `keywords`, `sideEffects`, `engines`, `homepage`, `bugs` in `package.json`; `jsr.json` minimum fields; LICENSE check.

**Avoids:** Pitfall 1 (`@ts-self-types`), Pitfall 2 (`noEmit` conflict), Pitfall 3 (`exports` map order), Pitfall 4 (`files` whitelist), Pitfall 8 (`.d.ts` collision on re-run), Pitfall 10 (missing `repository`), Pitfall 11 (missing `name`/`version`).

**Verification gate:** `npm pack --dry-run` must list only `src/spriggan.js`, `dist/spriggan.d.ts`, `dist/spriggan.d.ts.map`, `LICENSE`, `README.md`. `jsr publish --dry-run` must complete without type errors.

### Phase 2: Publish Workflow

**Rationale:** The workflow is simple to write once the metadata is correct, but it has its own class of mistakes (token variable, job structure, tag pattern, version check). Separate phase makes review easier and keeps git history legible.

**Delivers:** `.github/workflows/publish.yml` with gate job + parallel npm and JSR publish jobs; version consistency check step; `CHANGELOG.md` stub.

**Addresses:** Tag-triggered automation, test/lint gate, OIDC for both registries, `--provenance` flag, `--access public` for scoped package, `--allow-slow-types` for JSR JS source.

**Uses:** `actions/setup-node@v6`, Node 22, `npm >= 11.5.1`, `npx jsr publish`, `jdx/mise-action@v2`, `actions/checkout@v4`.

**Avoids:** Pitfall 5 (version mismatch — version check step), Pitfall 6 (Bun token variable — use `npm publish` not `bun publish`), Pitfall 7 (`jsr.json` in publish include), Pitfall 12 (tag pattern documented), Pitfall 13 (`--access public` in command).

### Phase 3: Registry Linking (Manual, Out-of-Band)

**Rationale:** OIDC trusted publishing requires one-time manual configuration on npmjs.com and jsr.io. This cannot be scripted. It must be done after the package has been registered (first publish) but before the automated workflow can succeed. Separating it as a phase makes the dependency explicit and ensures it is not forgotten.

**Delivers:** Package registered on npmjs.com and jsr.io; trusted publisher entries created on both; first publish completed (may use a temporary token or manual local publish for npm's initial registration requirement).

**Avoids:** OIDC failures caused by missing trusted publisher configuration; the "package does not yet exist" first-publish chicken-and-egg problem.

### Phase 4: Post-Publish Polish

**Rationale:** These items improve discoverability and consumer trust but are not blockers for a working first publish. Doing them after the smoke clears keeps the critical path short.

**Delivers:** JSR scoring improvements (`@module` JSDoc tag, full JSDoc coverage check), `CHANGELOG.md` first real entry, README "Releasing" section, JSR score review via `jsr publish --dry-run`.

**Addresses:** Should-have differentiators from FEATURES.md; JSR scoring checklist.

### Phase Ordering Rationale

- Configuration mistakes discovered late cost significantly more than discovered early; metadata-first ordering surfaces them before CI is involved
- The workflow is inert until registry linking is done; writing it second (before linking) lets it be reviewed and merged without risk of accidental publish
- Manual registry linking is deliberately isolated — it is a human action with potential billing and auth implications that deserves its own checklist
- Polish is deferred so the critical path stays tight and the first successful publish is achievable in a single focused session

### Research Flags

Phases with standard, well-documented patterns (skip `research-phase`):
- **Phase 1:** Package metadata structure is fully specified by official npm, JSR, and TypeScript docs. No research needed during planning.
- **Phase 2:** Workflow structure is specified in STACK.md down to the YAML level. Implementation is copy-and-adapt.
- **Phase 4:** JSR scoring docs are clear; no unknowns.

Phases that may need closer attention during execution:
- **Phase 2:** The exact interaction of `actions/setup-node@v6` + OIDC trusted publishing has known edge cases (see STACK.md sources). Verify against `npm publish --dry-run` before tagging a real release.
- **Phase 3:** The first-publish chicken-and-egg (npm package must exist before trusted publisher can be configured) is well-documented but requires careful sequencing. Follow the manual steps in STACK.md exactly.

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | All tool choices verified against official docs; npm 11.5.1 requirement confirmed from multiple sources including official npm docs and practitioner posts from 2026 |
| Features | HIGH | Table stakes verified against official npm and JSR docs; anti-features are clear from project constraints |
| Architecture | HIGH | Component structure derived from official docs; five-component model verified against real pipeline patterns |
| Pitfalls | HIGH | Critical pitfalls verified against official docs and confirmed by practitioner experience (JSR GitHub issues, recent blog posts) |

**Overall confidence:** HIGH

### Gaps to Address

- **`--allow-slow-types` behavior on pure-JS packages:** JSR docs confirm JS files cannot use the fast-path type inference regardless, but the practical effect of the flag on a package using `@ts-self-types` has not been verified against a live publish. Mitigation: run `jsr publish --dry-run` in the workflow before the first real tag and inspect warnings.
- **First publish sequencing on npmjs.com:** npm requires the package to exist before a trusted publisher entry can be created, but OIDC cannot be used for the initial publish. The workaround (local publish with a temporary granular token, or using the npm website) is documented but untested in this specific setup. Mitigation: document the exact steps in a RELEASING.md or workflow comment before tagging.
- **Version sync strategy:** Both `package.json` and `jsr.json` must carry the same version. The workflow can patch `jsr.json` ephemerally from the tag, but `package.json` version must be updated before tagging. Whether to commit the version bump or use the ephemeral-patch pattern for both is a workflow design decision left to the roadmap phase.

## Sources

### Primary (HIGH confidence)
- https://docs.npmjs.com/trusted-publishers/ — npm OIDC trusted publishing
- https://jsr.io/docs/publishing-packages — JSR GitHub Actions publishing
- https://jsr.io/docs/package-configuration — jsr.json format
- https://jsr.io/docs/about-slow-types — JSR type scoring
- https://jsr.io/docs/scoring — JSR package scoring
- https://jsr.io/docs/trust — JSR provenance model
- https://docs.npmjs.com/generating-provenance-statements/ — npm provenance
- https://github.blog/changelog/2025-07-31-npm-trusted-publishing-with-oidc-is-generally-available/ — OIDC GA announcement
- https://github.com/actions/setup-node/releases — setup-node v6.3.0 verified current
- https://nodejs.org/api/packages.html — exports field resolution rules
- https://www.typescriptlang.org/docs/handbook/declaration-files/dts-from-js.html — declaration emit from JS
- https://bun.com/docs/pm/cli/publish — Bun `NPM_CONFIG_TOKEN` behavior

### Secondary (MEDIUM confidence)
- https://philna.sh/blog/2026/01/28/trusted-publishing-npm/ — npm 11.5.1 requirement and workflow gotchas (2026-01-28, verified against real workflow)
- https://nickradford.dev/blog/npm-trusted-publishing-and-github-actions — npm 11.5.1 + OIDC setup details
- https://hirok.io/posts/package-json-exports — exports field guide
- https://2ality.com/2025/02/typescript-esm-packages.html — ESM + TypeScript package publishing patterns
- https://github.com/jsr-io/jsr/issues/370 — confirms `@ts-self-types` workaround for JS entrypoints
- https://github.com/jsr-io/jsr/issues/305 — documents `error[unsupported-nested-javascript]` exact error

---
*Research completed: 2026-03-21*
*Ready for roadmap: yes*
