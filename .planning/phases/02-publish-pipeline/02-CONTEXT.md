# Phase 2: Publish Pipeline - Context

**Gathered:** 2026-03-21
**Status:** Ready for planning

<domain>
## Phase Boundary

GitHub Actions workflow that triggers on `v*` tag push, runs tests and lint as a gate, then publishes to npm and JSR in parallel. No registry activation or first-publish bootstrapping (Phase 3).

</domain>

<decisions>
## Implementation Decisions

### Auth strategy
- NPM_TOKEN secret (like slog) — store a granular automation token in GitHub secrets
- `npm publish --provenance --access public` with `id-token: write` permission for provenance attestation
- JSR uses OIDC natively via `deno publish` with `id-token: write` — no stored token needed

### Test gate scope
- Single gate: `mise run check` (Biome lint + Vitest via Bun)
- No multi-runtime testing — Spriggan is browser-focused, tested via jsdom
- Reuse existing CI setup (`jdx/mise-action@v2`)

### Version consistency
- CI step fails the workflow if git tag (strip `v` prefix) doesn't match package.json version AND jsr.json version
- Hard fail, not warning — prevents accidental publish of wrong version

### Workflow structure
- Separate `publish.yml` file (like slog) — ci.yml stays for push/PR checks
- Clean separation: one file per concern
- publish.yml triggers on `push: tags: ['v*']`

### Claude's Discretion
- Exact version check script implementation
- Whether to use `setup-node` or `mise-action` for the publish jobs
- Node version for npm publish job
- Whether `deno publish` needs `npm ci` step (slog does this)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Reference implementation (user's own project)
- `~/devel/slog/.github/workflows/publish.yml` — Proven publish workflow: test gates → parallel npm + JSR jobs. Follow this structure closely.
- `~/devel/slog/package.json` — Working publishConfig pattern with @bjro scope

### Existing CI
- `.github/workflows/ci.yml` — Current CI: uses `jdx/mise-action@v2`, runs `mise run check`
- `mise.toml` — Task definitions: check depends on install-deps, tidy, lint

### Phase 1 outputs (must work with these)
- `package.json` — Has publishConfig.access: "public", publishConfig.provenance: true
- `jsr.json` — Has name, version, exports, publish.include
- `src/spriggan.js` — Has @ts-self-types directive on line 1

### Research
- `.planning/research/STACK.md` — Publishing stack details, OIDC vs token tradeoffs
- `.planning/research/ARCHITECTURE.md` — Pipeline component boundaries and data flow
- `.planning/research/PITFALLS.md` — CI pitfalls: Bun token variable, setup-node interference

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `.github/workflows/ci.yml`: Existing CI pattern — `actions/checkout@v4` + `jdx/mise-action@v2` + `mise run check`
- `mise.toml`: Task runner with `check` task that runs install-deps, tidy, lint
- `~/devel/slog/.github/workflows/publish.yml`: Complete working template for @bjro scoped dual-publish

### Established Patterns
- CI uses `mise-action` for tool management (Bun 1.3 + watchexec)
- Tests run via `bunx vitest run` (through mise task)
- slog pattern: test jobs → parallel npm/jsr jobs with `needs: [test, ...]`

### Integration Points
- `publish.yml` is a new file — no existing file to modify
- npm job needs `NPM_TOKEN` secret configured in GitHub repo settings
- JSR job needs repo linked in jsr.io package settings
- Version check reads `package.json` and `jsr.json` at repo root

</code_context>

<specifics>
## Specific Ideas

- Follow slog's publish.yml structure as closely as possible — proven pattern from same author/scope
- Key differences from slog: single test gate (not 3), no deno test gate, mise-action instead of raw npm ci for the gate job

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 02-publish-pipeline*
*Context gathered: 2026-03-21*
