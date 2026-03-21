# Retrospective

## Milestone: v1.0 — Package Publishing

**Shipped:** 2026-03-21
**Phases:** 3 | **Plans:** 3

### What Was Built
- Package metadata (package.json exports, files, publishConfig, jsr.json)
- TypeScript declaration strategy (handwritten .d.ts wins over tsc-emitted)
- @ts-self-types directive for JSR type resolution
- Tag-triggered publish workflow (gate → parallel npm + JSR)
- First publish: @bjro/spriggan@1.0.0 live on both registries

### What Worked
- slog as a reference implementation was invaluable — avoided most pitfalls
- Coarse granularity (3 phases) was right for this scope
- TYPE-01 comparison (handwritten vs tsc-emitted) during execution was the right call — avoided premature commitment
- Single test gate kept CI simple

### What Was Inefficient
- Phase 3 (Registry Activation) was manual steps, not code — could have been a checklist in Phase 2's plan instead of a separate phase
- Research phase for Phase 2 largely repeated findings from project-level research

### Patterns Established
- Follow slog's publish.yml as template for @bjro scoped packages
- Handwritten .d.ts for JS packages where tsc loses generics
- Version consistency check in CI gate (tag vs package.json vs jsr.json)

### Key Lessons
- For config-heavy milestones, coarse granularity works well
- Manual registry activation steps should be documented in the workflow, not as a separate phase
- `deno publish --dry-run` works cleanly for JS + @ts-self-types (no --allow-slow-types needed)

---

## Cross-Milestone Trends

| Milestone | Phases | Plans | Timeline |
|-----------|--------|-------|----------|
| v1.0 | 3 | 3 | 1 session |
