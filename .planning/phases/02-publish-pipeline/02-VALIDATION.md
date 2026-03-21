---
phase: 2
slug: publish-pipeline
status: draft
nyquist_compliant: false
wave_0_complete: true
created: 2026-03-21
---

# Phase 2 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest (via `bunx vitest run`) |
| **Config file** | `vitest.config.js` (jsdom environment) |
| **Quick run command** | `bunx vitest run` |
| **Full suite command** | `mise run check` |
| **Estimated runtime** | ~5 seconds |

---

## Sampling Rate

- **After every task commit:** Run `mise run check`
- **After every plan wave:** Run `mise run check` + YAML structural grep checks
- **Before `/gsd:verify-work`:** All structural checks pass + dry-runs reviewed
- **Max feedback latency:** 10 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 02-01 | 01 | 1 | CICD-01 | structural | `grep "tags:" .github/workflows/publish.yml` | ❌ W0 | ⬜ pending |
| 02-02 | 01 | 1 | CICD-02 | structural | `grep "mise run check" .github/workflows/publish.yml` | ❌ W0 | ⬜ pending |
| 02-03 | 01 | 1 | CICD-03 | structural | `grep "NPM_TOKEN\|NODE_AUTH_TOKEN" .github/workflows/publish.yml` | ❌ W0 | ⬜ pending |
| 02-04 | 01 | 1 | CICD-04 | structural | `grep "provenance" .github/workflows/publish.yml` | ❌ W0 | ⬜ pending |
| 02-05 | 01 | 1 | CICD-05 | structural | `grep "deno publish" .github/workflows/publish.yml` | ❌ W0 | ⬜ pending |
| 02-06 | 01 | 1 | CICD-06 | structural | `grep "needs:.*gate" .github/workflows/publish.yml` (both npm and jsr jobs) | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

*Existing infrastructure covers all phase requirements. The publish workflow itself is the deliverable — no pre-existing test files needed.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Workflow triggers on v* tag | CICD-01 | Requires actual tag push to GitHub | Push a tag, verify Actions UI shows workflow |
| Gate blocks publish on failure | CICD-02 | Workflow execution order | Verify in Actions UI that publish jobs wait for gate |
| NPM_TOKEN secret works | CICD-03 | Secret injection in CI | Verify npm publish succeeds in Actions run |
| Provenance attestation | CICD-04 | Requires live publish | Check npmjs.com for provenance badge after publish |
| JSR OIDC works | CICD-05 | Requires live publish | Check jsr.io for package after publish |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 10s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
