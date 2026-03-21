# Roadmap: Spriggan

## Overview

Spriggan is already built and tested. This milestone ships it as a proper package on npm and JSR. The work is entirely configuration and CI plumbing: get the metadata right, generate the type declarations, write the publish workflow, and activate OIDC trusted publishing on both registries. Three phases, each delivering a verifiable capability, in strict dependency order.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [x] **Phase 1: Package Configuration** - All metadata and type declaration files that make the package installable with correct types (completed 2026-03-21)
- [ ] **Phase 2: Publish Pipeline** - GitHub Actions workflow that gates on tests/lint and publishes to both registries on version tag push
- [ ] **Phase 3: Registry Activation** - Manual OIDC linking on npmjs.com and jsr.io, first publish verification

## Phase Details

### Phase 1: Package Configuration
**Goal**: The package is correctly configured for both registries — a consumer can `npm pack` and see exactly the right files, TypeScript can resolve types, and JSR can read them via `@ts-self-types`
**Depends on**: Nothing (first phase)
**Requirements**: PKG-01, PKG-02, PKG-03, PKG-04, PKG-05, PKG-06, TYPE-01, TYPE-02, TYPE-03
**Success Criteria** (what must be TRUE):
  1. `npm pack --dry-run` lists only `src/spriggan.js`, `dist/spriggan.d.ts`, `dist/spriggan.d.ts.map`, `LICENSE`, and `README.md` — nothing else
  2. `tsc -p tsconfig.build.json` emits `dist/spriggan.d.ts` without errors, and the declarations match the public API of `src/spriggan.js`
  3. `jsr publish --dry-run` completes without type errors or missing-types warnings
  4. A TypeScript consumer importing `@bjro/spriggan` gets typed completions (not `any`) because the `exports` map lists `"types"` before `"default"`
  5. `jsr.json` exists at repo root with `name`, `version`, and `exports` fields populated
**Plans:** 2/2 plans complete
Plans:
- [ ] 01-01-PLAN.md — Type declarations: tsconfig.build.json, tsc-vs-handwritten comparison, @ts-self-types directive
- [ ] 01-02-PLAN.md — Package metadata: package.json fields, jsr.json creation, dry-run verification

### Phase 2: Publish Pipeline
**Goal**: Pushing a `v*` tag triggers a CI workflow that runs tests and lint, then publishes to npm and JSR in parallel using OIDC — no stored secrets
**Depends on**: Phase 1
**Requirements**: CICD-01, CICD-02, CICD-03, CICD-04, CICD-05, CICD-06
**Success Criteria** (what must be TRUE):
  1. `.github/workflows/publish.yml` exists with a gate job that runs `mise run check` (tests + lint) before any publish job starts
  2. The npm publish job and JSR publish job run in parallel after the gate passes — neither blocks the other
  3. The workflow includes a version-consistency step that exits non-zero if the git tag does not match `package.json` version
  4. npm publish uses `--provenance` flag and OIDC (`id-token: write`), with no `NODE_AUTH_TOKEN` or stored secrets
  5. JSR publish uses `npx jsr publish` with `id-token: write`, no stored token
**Plans**: TBD

### Phase 3: Registry Activation
**Goal**: OIDC trusted publishing is configured on both registries and the first real publish completes successfully — `@bjro/spriggan` is live on npmjs.com and jsr.io
**Depends on**: Phase 2
**Requirements**: (no additional requirements — this phase executes the pipeline created in Phases 1-2)
**Success Criteria** (what must be TRUE):
  1. npmjs.com shows `@bjro/spriggan` with the correct version, description, and provenance attestation link
  2. jsr.io shows `@bjro/spriggan` with typed exports and the correct version
  3. `npm install @bjro/spriggan` in a fresh project resolves types without error
  4. The publish workflow run in GitHub Actions shows green for gate, npm, and JSR jobs
**Plans**: TBD

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Package Configuration | 2/2 | Complete   | 2026-03-21 |
| 2. Publish Pipeline | 0/TBD | Not started | - |
| 3. Registry Activation | 0/TBD | Not started | - |
