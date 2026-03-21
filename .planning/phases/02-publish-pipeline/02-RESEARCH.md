# Phase 2: Publish Pipeline - Research

**Researched:** 2026-03-21
**Domain:** GitHub Actions publish workflow — tag-triggered, NPM_TOKEN + OIDC (JSR), dual-registry
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Auth strategy:**
- NPM_TOKEN secret (like slog) — store a granular automation token in GitHub secrets
- `npm publish --provenance --access public` with `id-token: write` permission for provenance attestation
- JSR uses OIDC natively via `deno publish` with `id-token: write` — no stored token needed

**Test gate scope:**
- Single gate: `mise run check` (Biome lint + Vitest via Bun)
- No multi-runtime testing — Spriggan is browser-focused, tested via jsdom
- Reuse existing CI setup (`jdx/mise-action@v2`)

**Version consistency:**
- CI step fails the workflow if git tag (strip `v` prefix) doesn't match package.json version AND jsr.json version
- Hard fail, not warning — prevents accidental publish of wrong version

**Workflow structure:**
- Separate `publish.yml` file (like slog) — ci.yml stays for push/PR checks
- Clean separation: one file per concern
- publish.yml triggers on `push: tags: ['v*']`

### Claude's Discretion

- Exact version check script implementation
- Whether to use `setup-node` or `mise-action` for the publish jobs
- Node version for npm publish job
- Whether `deno publish` needs `npm ci` step (slog does this)

### Deferred Ideas (OUT OF SCOPE)

None — discussion stayed within phase scope
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| CICD-01 | GitHub Actions publish workflow triggers on v* tag push | Trigger pattern: `on: push: tags: ['v*']` — direct from slog template |
| CICD-02 | Publish workflow runs tests and lint as a gate before any publish job | Gate job using `mise run check` via `jdx/mise-action@v2`; both publish jobs declare `needs: gate` |
| CICD-03 | npm publish job uses NPM_TOKEN secret (user override of REQUIREMENTS.md OIDC wording) | `NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}` with `actions/setup-node` + `registry-url` — confirmed by slog template |
| CICD-04 | npm publish includes --provenance flag for supply-chain attestation | `npm publish --access public --provenance`; requires `id-token: write` permission even with token auth |
| CICD-05 | JSR publish job uses OIDC (deno publish with id-token: write) | `deno publish` via `denoland/setup-deno@v2`; no token secret needed; confirmed by slog template |
| CICD-06 | npm and JSR publish jobs run in parallel after gate passes | Both jobs: `needs: gate` — parallel by default when needs array points to same prerequisite |
</phase_requirements>

---

## Summary

This phase creates a single file: `.github/workflows/publish.yml`. Phase 1 already delivered all the metadata (`package.json`, `jsr.json`, `src/spriggan.d.ts`, `@ts-self-types` directive) that the workflow depends on. The workflow mirrors slog's proven structure with three adaptations: (1) single gate job using `mise run check` instead of three runtime-specific test jobs, (2) NPM_TOKEN secret authentication for npm instead of OIDC trusted publishing, and (3) an explicit version consistency check step absent from slog.

The canonical template (`~/devel/slog/.github/workflows/publish.yml`) maps almost 1:1 to what Spriggan needs. The slog workflow has five jobs: `test`, `test-bun`, `test-deno`, `npm`, `jsr`. Spriggan collapses the three test jobs into one `gate` job. The `npm` and `jsr` job structures are copied verbatim except for the version check addition and the removal of the Deno test runtime dependency from the JSR job.

The only design decision left to Claude's discretion (per CONTEXT.md) is whether the JSR job needs a `npm ci` step before `deno publish`. Slog does run `npm ci` before `deno publish`. For Spriggan this step is not needed: `jsr.json` is the manifest, Deno does not read `node_modules`, and there are no `npm:` specifiers in the source. Skip it.

**Primary recommendation:** Copy slog's `publish.yml` structure, collapse the three test gates into one `gate` job using `jdx/mise-action@v2`, add a version check step before the publish jobs, and remove the `npm ci` step from the JSR job.

---

## Standard Stack

### Core (all already proven — from slog template)

| Tool | Version | Purpose | Source |
|------|---------|---------|--------|
| `actions/checkout` | `v4` | Repo checkout in all jobs | slog template, current major |
| `jdx/mise-action` | `v2` | Installs Bun 1.3 + mise tasks | Existing ci.yml; same in gate job |
| `actions/setup-node` | `v4` | Configures Node + npm registry URL | slog template; v4 current |
| `denoland/setup-deno` | `v2` | Installs Deno for JSR publish | slog template; v2 current |

### Auth

| Secret/Permission | Job | Value | Notes |
|-------------------|-----|-------|-------|
| `secrets.NPM_TOKEN` | npm | Granular automation token | Stored in GitHub repo secrets |
| `NODE_AUTH_TOKEN` | npm | env var consumed by setup-node's .npmrc | Standard npm auth pattern |
| `id-token: write` | npm | Required for `--provenance` attestation | Even when using token auth |
| `id-token: write` | jsr | Required for OIDC-based deno publish | No secret needed for JSR |

### No New Dependencies

This phase adds zero new devDependencies, zero new npm packages, and zero new mise tools. All tooling is already installed.

---

## Architecture Patterns

### Workflow Job Structure

```
on: push: tags: ['v*']

jobs:
  gate          → runs mise run check (lint + test)
  npm           → needs: gate → npm publish --provenance --access public
  jsr           → needs: gate → deno publish
```

### Pattern 1: Gate Job (adapted from slog's `test` job)

**What:** Single quality gate using the project's existing mise task.
**When to use:** Tag-triggered publish workflows where the test suite is runtime-agnostic.

```yaml
# Source: slog publish.yml adapted + existing ci.yml
gate:
  runs-on: ubuntu-latest
  steps:
    - uses: actions/checkout@v4
    - uses: jdx/mise-action@v2
    - run: mise run check
```

Note: `jdx/mise-action@v2` installs Bun 1.3 (from `mise.toml`) and makes `mise` available. No separate `bun install` step is needed because `mise run check` depends on `install-deps` which runs `bun install`.

### Pattern 2: Version Consistency Check

**What:** Shell step that compares git tag to both `package.json` and `jsr.json` versions. Hard fails the gate if they diverge.
**When to use:** Before any publish step; prevents publishing a wrong version that cannot be unpublished.

```yaml
# Source: derived from CONTEXT.md requirement + PITFALLS.md Pitfall 5
- name: Verify tag matches package versions
  run: |
    TAG="${GITHUB_REF_NAME#v}"
    PKG="$(node -p "require('./package.json').version")"
    JSR="$(node -p "require('./jsr.json').version")"
    if [ "$PKG" != "$TAG" ]; then
      echo "Version mismatch: package.json=$PKG tag=$TAG"
      exit 1
    fi
    if [ "$JSR" != "$TAG" ]; then
      echo "Version mismatch: jsr.json=$JSR tag=$TAG"
      exit 1
    fi
    echo "Version check passed: $TAG"
```

This step belongs in the `gate` job (before publish jobs are triggered), not inside the individual publish jobs. Failing early prevents partial publishes.

### Pattern 3: npm Publish Job (from slog template)

```yaml
# Source: ~/devel/slog/.github/workflows/publish.yml lines 42-58
npm:
  needs: gate
  runs-on: ubuntu-latest
  permissions:
    contents: read
    id-token: write         # required for --provenance even with token auth
  steps:
    - uses: actions/checkout@v4
    - uses: actions/setup-node@v4
      with:
        node-version: '22'
        registry-url: 'https://registry.npmjs.org'
    - run: npm publish --access public --provenance
      env:
        NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}
```

Key differences from slog: no `npm ci` step needed (no build step in Spriggan's publish path — source is published directly; `.d.ts` is already committed in `src/`).

### Pattern 4: JSR Publish Job (from slog template)

```yaml
# Source: ~/devel/slog/.github/workflows/publish.yml lines 60-78
jsr:
  needs: gate
  runs-on: ubuntu-latest
  permissions:
    contents: read
    id-token: write         # OIDC for deno publish
  steps:
    - uses: actions/checkout@v4
    - uses: denoland/setup-deno@v2
    - run: deno publish
```

Key differences from slog: `npm ci` step removed (not needed — Deno does not read `node_modules`; `jsr.json` is the manifest). `actions/setup-node` also not needed in this job.

### Recommended Project Structure (new file only)

```
.github/
└── workflows/
    ├── ci.yml            # existing — unchanged
    └── publish.yml       # NEW — this phase's deliverable
```

### Anti-Patterns to Avoid

- **Version check inside publish jobs:** Check version in the gate job, not per-publish job. If the check lives in the npm job, the JSR job may still start (they run in parallel). Gate-level check blocks both.
- **`npm ci` before `deno publish`:** Slog runs this to resolve `npm:` specifiers in TypeScript source. Spriggan has no npm dependencies in source and no build step — skip it.
- **Sequential npm-then-JSR in one job:** Kills independent retryability. If npm succeeds and JSR fails, re-running that job hits "version already published" on npm. Keep them as separate jobs.
- **Using `mise-action` in the JSR job:** Deno does not need Bun or mise. Adding it is dead weight.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| npm registry auth in CI | Custom .npmrc generation | `actions/setup-node` with `registry-url` | setup-node writes the .npmrc with `NODE_AUTH_TOKEN` reference automatically |
| JSR OIDC token exchange | Any token management | `deno publish` (handles internally) | Deno CLI handles the OIDC token exchange with jsr.io natively |
| Deno installation | Manual download/install | `denoland/setup-deno@v2` | Correct PATH, caching, pinnable versions |
| Version parsing | Custom semver parsing | `node -p "require('./package.json').version"` | `node` is always available; `jq` may not be |

**Key insight:** Every complex operation in this workflow has a first-party action. The workflow's implementation surface is almost entirely YAML wiring, not scripting.

---

## Common Pitfalls

### Pitfall 1: Version Check in Wrong Place

**What goes wrong:** If the version check lives inside the `npm` or `jsr` job rather than the `gate` job, the two publish jobs can still launch in parallel — one may start publishing before the check runs in the other job.
**Why it happens:** Natural instinct to put publish-related checks near publish commands.
**How to avoid:** Put the version check as the last step of the `gate` job. Both publish jobs are blocked on `gate` completing.
**Warning signs:** Workflow YAML has version check step inside `npm:` or `jsr:` job definitions.

### Pitfall 2: `publishConfig.provenance: true` in package.json Does Not Replace `--provenance` Flag

**What goes wrong:** `package.json` already has `"publishConfig": { "provenance": true }`. This field is documented but its CI behavior is environment-dependent. Using the explicit `--provenance` flag in the workflow command is the authoritative path.
**How to avoid:** Keep `--provenance` in the `npm publish` command regardless of what `publishConfig` says. Belt and suspenders.

### Pitfall 3: `id-token: write` Missing When Using `--provenance` with Token Auth

**What goes wrong:** `--provenance` requires OIDC token generation even when the registry auth uses `NODE_AUTH_TOKEN`. The workflow needs `id-token: write` in the npm job's `permissions` block.
**How to avoid:** Always include both `contents: read` and `id-token: write` in the npm job permissions. slog template already does this correctly.
**Warning signs:** npm publish fails with "insufficient permissions for provenance" or similar OIDC error.

### Pitfall 4: Tag Pattern `v*` Fires on Annotated and Lightweight Tags

**What goes wrong:** `v*` matches any ref starting with `v` including `v2-beta`, `v1-broken`. This is acceptable for Spriggan but should be documented.
**How to avoid:** The version consistency check is the safety net — a tag like `v2-beta` will fail the check because `package.json` version won't match `2-beta`. No additional filter needed.

### Pitfall 5: `--allow-slow-types` for JSR (if needed)

**What goes wrong:** `deno publish` may warn about slow types for JS packages using `@ts-self-types`. The flag suppresses this.
**How to avoid:** If the first dry-run of `deno publish` produces slow-types warnings, add `--allow-slow-types` to the `deno publish` command. Confidence: MEDIUM — depends on how Deno processes the `@ts-self-types` directive.
**Recommendation:** Start without the flag. If the first real publish or a pre-push dry-run produces errors, add it. Do not add preemptively since it suppresses potentially useful diagnostics.

---

## Code Examples

### Complete publish.yml

```yaml
# Source: ~/devel/slog/.github/workflows/publish.yml adapted per CONTEXT.md
name: Publish

on:
  push:
    tags:
      - 'v*'

jobs:
  gate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: jdx/mise-action@v2
      - run: mise run check
      - name: Verify tag matches package versions
        run: |
          TAG="${GITHUB_REF_NAME#v}"
          PKG="$(node -p "require('./package.json').version")"
          JSR="$(node -p "require('./jsr.json').version")"
          if [ "$PKG" != "$TAG" ]; then
            echo "Version mismatch: package.json=$PKG tag=$TAG"
            exit 1
          fi
          if [ "$JSR" != "$TAG" ]; then
            echo "Version mismatch: jsr.json=$JSR tag=$TAG"
            exit 1
          fi
          echo "Version check passed: $TAG"

  npm:
    needs: gate
    runs-on: ubuntu-latest
    permissions:
      contents: read
      id-token: write
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '22'
          registry-url: 'https://registry.npmjs.org'
      - run: npm publish --access public --provenance
        env:
          NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}

  jsr:
    needs: gate
    runs-on: ubuntu-latest
    permissions:
      contents: read
      id-token: write
    steps:
      - uses: actions/checkout@v4
      - uses: denoland/setup-deno@v2
      - run: deno publish
```

### Tagging Convention (for README / developer reference)

```bash
# Bump version in both files first
# Edit package.json "version" field
# Edit jsr.json "version" field
# Commit the bump
git add package.json jsr.json
git commit -m "chore: bump to 1.1.0"

# Create and push tag — triggers publish.yml
git tag v1.1.0
git push origin v1.1.0
```

---

## State of the Art

| Old Approach | Current Approach | Impact for Spriggan |
|---|---|---|
| Long-lived NPM_TOKEN for all publishes | OIDC trusted publishing (GA July 2025, npm >= 11.5.1) | Spriggan uses NPM_TOKEN per user decision (CONTEXT.md locked) — same as slog |
| `npx jsr publish` | `deno publish` | slog uses `deno publish`; Spriggan follows slog |
| Per-registry tsc build step | Publish source directly (no build for pure JS) | No `tsc` step needed in publish jobs — `.d.ts` already in `src/` |

**Deprecated/outdated:**
- `setup-node@v3` and earlier: use Node 16 runner internals — use `v4`.
- `oven-sh/setup-bun` in publish jobs: not needed — `jdx/mise-action` provides Bun for the gate, and publish jobs use Node/Deno respectively.
- `deno run -A npm:vitest run` multi-runtime testing: slog pattern not adopted — Spriggan skips per CONTEXT.md.

---

## Open Questions

1. **Does `deno publish` need `--allow-slow-types` for a JS+`@ts-self-types` package?**
   - What we know: JSR docs confirm JS files cannot use fast-path type inference; `@ts-self-types` redirects to the `.d.ts`
   - What's unclear: Whether Deno CLI surfaces a slow-types warning or error when the entrypoint is `.js` but types come from `.d.ts` via directive
   - Recommendation: Start without the flag. If the publish job fails or warns, add `--allow-slow-types`. The planner should note this as a conditional task step.

2. **Does `node -p "require('./package.json').version"` work in CI runner?**
   - What we know: All GitHub Actions ubuntu runners have Node.js available regardless of job setup
   - What's unclear: Nothing — this is universally safe and is the pattern from PITFALLS.md
   - Recommendation: Use it. No dependency on `jq` or other tools.

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest (via `bunx vitest run`) |
| Config file | `vitest.config.js` (jsdom environment) |
| Quick run command | `bunx vitest run` |
| Full suite command | `mise run check` (lint + format + test) |

### Phase Requirements → Test Map

This phase creates infrastructure (a YAML workflow file), not runtime code. Tests of CI/CD workflows are integration tests that require a real GitHub Actions environment to execute. Most verification is therefore manual or dry-run based.

| Req ID | Behavior | Test Type | Automated Command | Notes |
|--------|----------|-----------|-------------------|-------|
| CICD-01 | Workflow triggers on v* tag | manual-only | n/a | Requires actual tag push to GitHub |
| CICD-02 | Gate job runs before publish | manual-only | n/a | Workflow execution order; verify in Actions UI |
| CICD-03 | npm publish uses NPM_TOKEN | manual-only | n/a | Secret injection; verifiable only in CI |
| CICD-04 | npm publish includes --provenance | structural | `grep -r 'provenance' .github/workflows/publish.yml` | Static YAML content check |
| CICD-05 | JSR uses deno publish with OIDC | structural | `grep -r 'deno publish' .github/workflows/publish.yml` | Static YAML content check |
| CICD-06 | npm and jsr jobs run in parallel | structural | `grep -r 'needs: gate' .github/workflows/publish.yml` | Both jobs must declare `needs: gate`, not `needs: [gate, npm]` |

### Pre-Push Dry Runs (substitute for CI integration tests)

```bash
# Verify workflow YAML is syntactically valid (actionlint if available, otherwise yamllint)
yamllint .github/workflows/publish.yml

# Verify version check logic locally (simulates gate step)
GITHUB_REF_NAME="v1.0.0" bash -c '
  TAG="${GITHUB_REF_NAME#v}"
  PKG="$(node -p "require(\"./package.json\").version")"
  JSR="$(node -p "require(\"./jsr.json\").version")"
  echo "tag=$TAG pkg=$PKG jsr=$JSR"
'

# Dry-run JSR publish to validate deno can read jsr.json + source
deno publish --dry-run --allow-dirty
```

### Sampling Rate

- **Per task commit:** `mise run check` (existing gate)
- **Per wave merge:** `mise run check` + YAML structure grep checks above
- **Phase gate:** All structural checks pass + dry-run results reviewed before any real tag is pushed

### Wave 0 Gaps

None — existing test infrastructure covers all automatable phase requirements. The publish workflow itself is the deliverable; its correctness is verified via structural checks and dry-runs, not unit tests.

---

## Sources

### Primary (HIGH confidence)

- `~/devel/slog/.github/workflows/publish.yml` — Canonical reference; proven template from same author/scope
- `~/devel/spriggan/.github/workflows/ci.yml` — Existing CI pattern reused in gate job
- `~/devel/spriggan/mise.toml` — Task definitions; `check` task confirmed to run lint + test
- `~/devel/spriggan/package.json` — Phase 1 output; confirms `publishConfig.provenance: true`, no build step
- `~/devel/spriggan/jsr.json` — Phase 1 output; confirms `publish.include` already set
- https://docs.npmjs.com/generating-provenance-statements/ — `--provenance` flag requirements including `id-token: write`
- https://jsr.io/docs/publishing-packages — `deno publish` OIDC workflow

### Secondary (MEDIUM confidence)

- https://philna.sh/blog/2026/01/28/trusted-publishing-npm/ — npm token auth + provenance workflow details (2026-01-28)
- `.planning/research/ARCHITECTURE.md` — Pipeline component boundaries; job structure confirmed

### Tertiary (LOW confidence)

- None

---

## Metadata

**Confidence breakdown:**
- Workflow structure: HIGH — direct adaptation of proven slog template; same author, same scope (@bjro/*)
- Version check script: HIGH — standard shell + node pattern; verified against PITFALLS.md
- JSR `--allow-slow-types` need: MEDIUM — JS+`@ts-self-types` behavior not verified against live deno publish
- Auth wiring: HIGH — NPM_TOKEN + NODE_AUTH_TOKEN is the exact slog pattern; setup-node docs confirm

**Research date:** 2026-03-21
**Valid until:** 2026-06-21 (workflow action versions stable; npm/JSR auth APIs mature)
