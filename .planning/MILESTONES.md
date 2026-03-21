# Milestones

## v1.0 Package Publishing (Shipped: 2026-03-21)

**Phases completed:** 3 phases, 3 plans, 6 tasks

**Delivered:** @bjro/spriggan@1.0.0 published to npm and JSR with automated tag-triggered CI pipeline.

**Key accomplishments:**

1. Package metadata configured (exports map, files whitelist, publishConfig, jsr.json)
2. TypeScript declarations settled — handwritten .d.ts wins over tsc-emitted (preserves generics)
3. @ts-self-types directive enables JSR type resolution from JS source
4. Publish workflow created — gate (mise run check + version consistency) → parallel npm + JSR
5. JSR score: 100%, npm provenance attestation enabled
6. First publish live on both registries via v1.0.0 tag push

---
