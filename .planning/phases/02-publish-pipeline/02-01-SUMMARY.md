---
phase: 02-publish-pipeline
plan: 01
subsystem: infra
tags: [github-actions, npm, jsr, deno, mise, provenance, oidc]

# Dependency graph
requires:
  - phase: 01-package-configuration
    provides: "package.json with publishConfig.provenance, jsr.json with publish.include, src/spriggan.d.ts handwritten declarations"
provides:
  - ".github/workflows/publish.yml — tag-triggered publish pipeline with gate, npm, and jsr jobs"
  - "Automated dual-registry publishing (npm + JSR) on v* tag push"
  - "Supply-chain provenance attestation via --provenance flag and OIDC"
affects: [release-process, publishing]

# Tech tracking
tech-stack:
  added: [actions/checkout@v4, jdx/mise-action@v2, actions/setup-node@v4, denoland/setup-deno@v2]
  patterns:
    - "Gate job pattern: single job runs all checks before publish jobs can start"
    - "Parallel publish jobs both declare needs: gate, neither depends on the other"
    - "Version consistency check in gate: strip v-prefix from GITHUB_REF_NAME, compare to both package.json and jsr.json"

key-files:
  created:
    - .github/workflows/publish.yml
  modified: []

key-decisions:
  - "Version check in gate job (not per publish job) blocks both npm and jsr if tag mismatches"
  - "No npm ci in jsr job: Deno reads jsr.json manifest directly, no node_modules needed"
  - "No mise-action in npm or jsr jobs: dead weight; gate already ran checks"
  - "deno publish dry-run confirms no --allow-slow-types needed: JS+@ts-self-types passes clean"

patterns-established:
  - "Gate pattern: checkout + mise-action + mise run check + version check — before any publish job"
  - "npm publish pattern: setup-node with registry-url, NODE_AUTH_TOKEN from NPM_TOKEN secret, --access public --provenance"
  - "JSR publish pattern: setup-deno only, deno publish with id-token: write OIDC"

requirements-completed: [CICD-01, CICD-02, CICD-03, CICD-04, CICD-05, CICD-06]

# Metrics
duration: 4min
completed: 2026-03-21
---

# Phase 2 Plan 1: Publish Pipeline Summary

**Tag-triggered GitHub Actions publish workflow: single gate (mise run check + version check) feeds parallel npm (--provenance + NPM_TOKEN) and JSR (deno publish OIDC) jobs**

## Performance

- **Duration:** 4 min
- **Started:** 2026-03-21T20:01:52Z
- **Completed:** 2026-03-21T20:05:49Z
- **Tasks:** 2 (1 create, 1 verify)
- **Files modified:** 1

## Accomplishments

- Created `.github/workflows/publish.yml` with exactly three jobs: gate, npm, jsr
- Gate job runs `mise run check` (Biome lint + Vitest via Bun) and version consistency check before either publish job can start
- npm and jsr jobs run in parallel after gate passes; neither depends on the other
- Version check confirmed working locally: tag=1.0.0 matches package.json=1.0.0 and jsr.json=1.0.0
- `deno publish --dry-run --allow-dirty` confirms JSR compatibility: clean pass, no slow-types warnings

## Task Commits

Each task was committed atomically:

1. **Task 1: Create publish workflow** - `0e61703` (feat)
2. **Task 2: Structural verification and dry-runs** - verification-only, no file changes

**Plan metadata:** pending (docs commit after SUMMARY created)

## Files Created/Modified

- `.github/workflows/publish.yml` - Complete publish pipeline: gate (mise run check + version check), npm (setup-node + npm publish --provenance), jsr (setup-deno + deno publish)

## Decisions Made

- Version check placed in gate job, not inside individual publish jobs — ensures both jobs are blocked if tag mismatches version, preventing partial publish scenarios
- `npm ci` step omitted from jsr job — Deno reads `jsr.json` directly; no `npm:` specifiers in source means `node_modules` is irrelevant
- `jdx/mise-action` omitted from npm and jsr jobs — gate already ran all quality checks; publish jobs need only registry tooling
- Started without `--allow-slow-types` flag on `deno publish` — dry-run confirmed no slow-types warnings for JS+@ts-self-types packages, so flag is not needed

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None. The research was comprehensive and the complete workflow design was specified in RESEARCH.md. All structural checks passed first time; deno dry-run clean.

## User Setup Required

**External services require manual configuration before the first publish:**

1. **npm bootstrap** (one-time): The first npm publish requires the package to exist on the registry before OIDC trusted publisher can be configured. Use a temporary granular automation token to do an initial local publish:
   ```bash
   npm publish --access public
   ```
   Then configure the Granular Automation Token in GitHub repo secrets as `NPM_TOKEN`.

2. **GitHub secret**: Add `NPM_TOKEN` to GitHub repo secrets (Settings → Secrets and variables → Actions).

3. **JSR**: No setup needed. `deno publish` uses OIDC natively — the `id-token: write` permission in the workflow is sufficient.

See STATE.md Blockers section for additional context on the npm bootstrap requirement.

## Next Phase Readiness

- Phase 2 is complete — `.github/workflows/publish.yml` is the sole deliverable
- Publishing is fully automated from this point: bump version in `package.json` and `jsr.json`, commit, tag `vX.Y.Z`, push tag
- No blockers for Phase 3 (if any)

---
*Phase: 02-publish-pipeline*
*Completed: 2026-03-21*
