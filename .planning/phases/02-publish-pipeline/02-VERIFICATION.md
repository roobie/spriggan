---
phase: 02-publish-pipeline
verified: 2026-03-21T21:15:00Z
status: passed
score: 6/6 must-haves verified
re_verification: false
requirements_notes:
  - id: CICD-03
    requirements_md_says: "npm publish job uses OIDC trusted publishing (no stored secrets)"
    actual_implementation: "NPM_TOKEN secret — user override documented in CONTEXT.md"
    status: satisfied_with_override
    action_needed: "REQUIREMENTS.md wording is stale; should read: npm publish uses NPM_TOKEN secret with --provenance for supply-chain attestation"
  - id: CICD-05
    requirements_md_says: "npx jsr publish with id-token: write"
    actual_implementation: "deno publish with id-token: write"
    status: satisfied
    action_needed: "REQUIREMENTS.md wording is stale; should read: deno publish (not npx jsr publish)"
---

# Phase 2: Publish Pipeline Verification Report

**Phase Goal:** Pushing a `v*` tag triggers a CI workflow that runs tests and lint, then publishes to npm and JSR in parallel using OIDC — no stored secrets
**Verified:** 2026-03-21T21:15:00Z
**Status:** passed
**Re-verification:** No — initial verification

> **Note on "no stored secrets":** The phase goal states OIDC for both registries. Per user decision in CONTEXT.md, npm uses `NPM_TOKEN` secret (same as the slog reference project), with OIDC-based provenance attestation via `id-token: write`. JSR uses pure OIDC. This is the intended implementation. REQUIREMENTS.md CICD-03 and CICD-05 wording is stale relative to the actual decisions made.

---

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | `publish.yml` triggers only on `v*` tag push, not on branch pushes or PRs | VERIFIED | Lines 3-6: `on: push: tags: ['v*']` — no `branches:` key present |
| 2 | Tests and lint run as a gate before any publish job starts | VERIFIED | `gate` job runs `mise run check` (line 14); both npm and jsr declare `needs: gate` (lines 31, 47) |
| 3 | npm and JSR publish jobs run in parallel after the gate passes | VERIFIED | Both jobs: `needs: gate` with no cross-dependency between npm and jsr |
| 4 | npm publish uses NPM_TOKEN secret and `--provenance` flag with `id-token: write` | VERIFIED | Line 35: `id-token: write`; line 42: `npm publish --access public --provenance`; line 44: `NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}` |
| 5 | JSR publish uses `deno publish` with OIDC (`id-token: write`, no stored secret) | VERIFIED | Line 51: `id-token: write`; line 55: `deno publish` — no secret env var |
| 6 | Version consistency check fails the gate if tag does not match package.json and jsr.json versions | VERIFIED | Lines 15-28: version check script strips `v` prefix from `GITHUB_REF_NAME`, compares against `node -p "require('./package.json').version"` and `node -p "require('./jsr.json').version"`, exits 1 on mismatch |

**Score:** 6/6 truths verified

---

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `.github/workflows/publish.yml` | Complete publish pipeline with gate, npm, and jsr jobs | VERIFIED | 55 lines; created in commit `0e61703`; contains `name: Publish`, three jobs, all structural patterns present |

**Artifact depth check:**

- **Exists:** yes — 55 lines
- **Substantive:** yes — no placeholder content, no TODO comments, all three jobs fully implemented
- **Wired:** N/A — this is the root artifact; it is directly consumed by GitHub Actions on tag push

---

### Key Link Verification

| From | To | Via | Status | Evidence |
|------|----|-----|--------|---------|
| `gate` job | `mise run check` | `jdx/mise-action@v2` step | WIRED | Line 13: `uses: jdx/mise-action@v2`; line 14: `run: mise run check` |
| `npm` job | `gate` job | `needs: gate` | WIRED | Line 31: `needs: gate` |
| `jsr` job | `gate` job | `needs: gate` | WIRED | Line 47: `needs: gate` |

---

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|---------|
| CICD-01 | 02-01-PLAN.md | Workflow triggers on `v*` tag push | SATISFIED | Lines 3-6: `on: push: tags: ['v*']` |
| CICD-02 | 02-01-PLAN.md | Tests and lint run as gate before any publish | SATISFIED | Gate job runs `mise run check`; both publish jobs declare `needs: gate` |
| CICD-03 | 02-01-PLAN.md | npm publish auth (NPM_TOKEN — user override) | SATISFIED (with override) | `NPM_TOKEN` secret used as per CONTEXT.md decision; REQUIREMENTS.md wording stale (says OIDC) |
| CICD-04 | 02-01-PLAN.md | `--provenance` flag for supply-chain attestation | SATISFIED | Line 42: `npm publish --access public --provenance`; `id-token: write` present |
| CICD-05 | 02-01-PLAN.md | JSR uses `deno publish` with OIDC | SATISFIED | Line 55: `deno publish`; `id-token: write` on line 51; REQUIREMENTS.md wording stale (says `npx jsr publish`) |
| CICD-06 | 02-01-PLAN.md | npm and JSR jobs parallel after gate | SATISFIED | Both declare `needs: gate` only; no cross-dependency between them |

**Orphaned requirements:** None — all 6 CICD IDs mapped to this phase are claimed by 02-01-PLAN.md.

**Stale requirements wording (not blocking, informational):**
- CICD-03 in REQUIREMENTS.md reads "OIDC trusted publishing (no stored secrets)" — implementation uses NPM_TOKEN by user decision. The requirement as written is not what was built, but the build matches the explicit design decision.
- CICD-05 in REQUIREMENTS.md reads "npx jsr publish" — implementation uses `deno publish`. Both achieve the same outcome; `deno publish` is the correct tool for a Deno-native publish.

---

### Anti-Patterns Found

None. No TODO/FIXME/placeholder comments. No empty handlers or stub implementations.

---

### Human Verification Required

Two items require a live test to confirm end-to-end behavior. These cannot be verified by file inspection alone.

**1. Tag push triggers workflow**

- **Test:** Push a `v1.0.0` tag to GitHub and observe whether the Actions workflow fires
- **Expected:** Workflow run appears under the "Publish" workflow name; gate job starts
- **Why human:** GitHub Actions event dispatch cannot be verified from the local filesystem

**2. NPM_TOKEN secret is configured and npm publish succeeds**

- **Test:** After configuring `NPM_TOKEN` in GitHub repo secrets (Settings > Secrets and variables > Actions), push a `v*` tag and confirm the npm job completes without auth error
- **Expected:** Package appears on `registry.npmjs.org/@bjro/spriggan`
- **Why human:** Secret is not in the codebase; first publish requires the npm bootstrap step documented in SUMMARY.md

---

### Gaps Summary

No structural gaps. The workflow file is complete, substantive, and every key link is wired.

Two stale wording items in REQUIREMENTS.md should be updated to reflect the actual user-approved implementation (NPM_TOKEN for npm, `deno publish` for JSR), but these do not block the phase goal. The phase goal — tag-triggered CI that gates on tests/lint and publishes to both registries — is fully achieved by `.github/workflows/publish.yml`.

---

_Verified: 2026-03-21T21:15:00Z_
_Verifier: Claude (gsd-verifier)_
