---
phase: 1
slug: package-configuration
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-21
---

# Phase 1 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4.x |
| **Config file** | `vitest.config.js` (jsdom environment) |
| **Quick run command** | `bunx vitest run --reporter verbose` |
| **Full suite command** | `bunx vitest run --reporter verbose` |
| **Estimated runtime** | ~5 seconds |

---

## Sampling Rate

- **After every task commit:** Run `bunx vitest run --reporter verbose`
- **After every plan wave:** Run `bunx vitest run && npm pack --dry-run && bunx tsc -p tsconfig.build.json`
- **Before `/gsd:verify-work`:** Full suite must be green + `npm pack --dry-run` + `jsr publish --dry-run`
- **Max feedback latency:** 10 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 01-01 | 01 | 1 | PKG-01 | smoke | `node -e "const p=JSON.parse(require('fs').readFileSync('package.json','utf8')); console.assert(p.name==='@bjro/spriggan'); console.assert(p.version==='1.0.0')"` | ✅ | ⬜ pending |
| 01-02 | 01 | 1 | PKG-02 | smoke | `node -e "const p=JSON.parse(require('fs').readFileSync('package.json','utf8')); console.assert(p.exports['.'].types); console.assert(p.exports['.'].default)"` | ✅ | ⬜ pending |
| 01-03 | 01 | 1 | PKG-03 | smoke | `npm pack --dry-run 2>&1` | ✅ | ⬜ pending |
| 01-04 | 01 | 1 | PKG-04 | smoke | `node -e "const p=JSON.parse(require('fs').readFileSync('package.json','utf8')); console.assert(p.publishConfig.access==='public')"` | ✅ | ⬜ pending |
| 01-05 | 01 | 1 | PKG-05 | smoke | `node -e "const p=JSON.parse(require('fs').readFileSync('package.json','utf8')); console.assert(Array.isArray(p.keywords)); console.assert(p.sideEffects===false)"` | ✅ | ⬜ pending |
| 01-06 | 01 | 1 | PKG-06 | smoke | `node -e "const p=JSON.parse(require('fs').readFileSync('jsr.json','utf8')); console.assert(p.name==='@bjro/spriggan')"` | ❌ W0 | ⬜ pending |
| 01-07 | 02 | 1 | TYPE-02 | smoke | `bunx tsc -p tsconfig.build.json && ls dist/spriggan.d.ts` | ❌ W0 | ⬜ pending |
| 01-08 | 02 | 1 | TYPE-01 | manual | `diff src/spriggan.d.ts dist/spriggan.d.ts` | ✅ | ⬜ pending |
| 01-09 | 02 | 1 | TYPE-03 | smoke | `head -3 src/spriggan.js` | ✅ | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `jsr.json` — must be created (PKG-06)
- [ ] `tsconfig.build.json` — must be created (TYPE-02); enables TYPE-01 comparison

*Existing test infrastructure in `__tests__/` covers Spriggan runtime behavior. No new test files needed for Phase 1 — requirements are configuration, verified by tool commands.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| .d.ts matches public API | TYPE-01 | Requires human judgment on generics quality | Run `tsc -p tsconfig.build.json`, diff handwritten vs emitted, choose better one |
| npm pack tarball contents | PKG-03 | Requires visual inspection of file list | Run `npm pack --dry-run`, verify only expected files listed |
| jsr publish dry-run | PKG-06 | Requires JSR CLI interaction | Run `npx jsr publish --dry-run`, verify no type errors |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 10s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
