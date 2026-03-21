# Requirements: Spriggan

**Defined:** 2026-03-21
**Core Value:** Consumers can install @bjro/spriggan from npm and JSR with working types, published automatically from CI on version tag push.

## v1 Requirements

Requirements for initial publish milestone. Each maps to roadmap phases.

### Package Metadata

- [x] **PKG-01**: package.json has name (@bjro/spriggan), version, description, and repository/homepage/bugs fields
- [x] **PKG-02**: package.json has exports map with types and default conditions
- [x] **PKG-03**: package.json has files array limiting tarball to source + declarations
- [x] **PKG-04**: package.json has publishConfig.access set to "public"
- [x] **PKG-05**: package.json has keywords, sideEffects: false, and engines fields
- [x] **PKG-06**: jsr.json created with name, version, and exports pointing to source

### Type Declarations

- [x] **TYPE-01**: src/spriggan.d.ts is complete and matches the public API surface of src/spriggan.js
- [x] **TYPE-02**: tsconfig.build.json created for declaration-only emit (separate from noEmit check config)
- [x] **TYPE-03**: @ts-self-types directive added to top of src/spriggan.js for JSR type resolution

### Publishing Pipeline

- [ ] **CICD-01**: GitHub Actions publish workflow triggers on v* tag push
- [ ] **CICD-02**: Publish workflow runs tests and lint as a gate before any publish job
- [ ] **CICD-03**: npm publish job uses OIDC trusted publishing (no stored secrets)
- [ ] **CICD-04**: npm publish includes --provenance flag for supply-chain attestation
- [ ] **CICD-05**: JSR publish job uses OIDC (npx jsr publish with id-token: write)
- [ ] **CICD-06**: npm and JSR publish jobs run in parallel after gate passes

## v2 Requirements

Deferred to after first successful publish.

### Documentation

- **DOC-01**: CHANGELOG.md started with first version entry
- **DOC-02**: README updated with "Releasing" section documenting tag workflow
- **DOC-03**: JSDoc @module tag added for JSR documentation page

### Quality

- **QUAL-01**: JSR scoring checklist addressed (runtime compat tags, documentation coverage)

## Out of Scope

| Feature | Reason |
|---------|--------|
| UMD/CommonJS bundle | ESM only — modern tooling handles ESM natively |
| Automated version bumping (semantic-release) | Overhead; manual tag push is simpler |
| Bundling/minification | Single ~750-line source file; consumers' bundlers handle this |
| TypeScript source rewrite | Breaks "no build tools" philosophy |
| CDN auto-publish | ESM CDNs (esm.sh) work without author action |
| Long-lived npm tokens | Deprecated; OIDC trusted publishing replaces them |
| Automated changelog generation | Requires conventional commit discipline not yet in place |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| PKG-01 | Phase 1 | Complete |
| PKG-02 | Phase 1 | Complete |
| PKG-03 | Phase 1 | Complete |
| PKG-04 | Phase 1 | Complete |
| PKG-05 | Phase 1 | Complete |
| PKG-06 | Phase 1 | Complete |
| TYPE-01 | Phase 1 | Complete |
| TYPE-02 | Phase 1 | Complete |
| TYPE-03 | Phase 1 | Complete |
| CICD-01 | Phase 2 | Pending |
| CICD-02 | Phase 2 | Pending |
| CICD-03 | Phase 2 | Pending |
| CICD-04 | Phase 2 | Pending |
| CICD-05 | Phase 2 | Pending |
| CICD-06 | Phase 2 | Pending |

**Coverage:**
- v1 requirements: 15 total
- Mapped to phases: 15
- Unmapped: 0

---
*Requirements defined: 2026-03-21*
*Last updated: 2026-03-21 after roadmap creation*
