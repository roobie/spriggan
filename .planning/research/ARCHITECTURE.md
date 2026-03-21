# Architecture Patterns: npm/JSR Dual-Publishing Pipeline

**Domain:** Package publishing infrastructure for an existing JS framework
**Researched:** 2026-03-21
**Overall confidence:** HIGH (official JSR docs + npm OIDC docs + verified patterns)

---

## Recommended Architecture

A dual-publish pipeline for Spriggan has five distinct component boundaries. Because the source is a single file with no bundling step, the pipeline is unusually simple: the complexity lives entirely in metadata files and CI workflow configuration, not in a build process.

```
[git tag push v*]
       |
       v
[GitHub Actions: gate job]
   - bun install
   - biome lint
   - vitest run
       |
    (pass)
       |
      / \
     /   \
    v     v
[npm job] [jsr job]
    |         |
    v         v
[npmjs.com] [jsr.io]
```

---

## Component Boundaries

### Component 1: Package Metadata (package.json)

**What it is:** The npm registry reads `package.json` to determine what to publish. Currently this file has no `name`, `version`, `exports`, or `files` fields — all are required for publishing.

**What needs to change:**

| Field | Required value | Reason |
|-------|---------------|--------|
| `name` | `"@bjro/spriggan"` | Scoped npm package identity |
| `version` | `"0.1.0"` (or first semver) | Must match git tag |
| `exports` | `"./src/spriggan.js"` | Entry point for consumers |
| `files` | `["src/spriggan.js", "src/spriggan.d.ts"]` | Whitelist what goes into the tarball |
| `publishConfig` | `{"access": "public"}` | Required for scoped packages on npm |

**Boundary:** This file controls what npm sees. It does NOT control what JSR sees — JSR has its own config file.

**Does not touch:** `devDependencies`, `scripts`, test config.

---

### Component 2: JSR Package Configuration (jsr.json)

**What it is:** A new file at the repo root that JSR reads. Separate from `package.json`. JSR does not use `package.json` for its own publishing metadata.

**Minimal structure:**

```json
{
  "name": "@bjro/spriggan",
  "version": "0.1.0",
  "exports": "./src/spriggan.js"
}
```

**Critical constraint for Spriggan specifically:** Spriggan's source is a `.js` file (not `.ts`). JSR cannot generate type declarations from `.js` alone. The `@ts-self-types` directive at the top of `src/spriggan.js` points JSR to the hand-maintained `src/spriggan.d.ts`:

```js
/* @ts-self-types="./spriggan.d.ts" */
```

This directive is already the standard pattern for JS packages on JSR. Without it, JSR publishes the package without type definitions, which degrades the consumer experience and disables JSR's documentation generation.

**Slow types:** The slow-types restriction is a TypeScript-specific concern. Because Spriggan ships `.js`, JSR cannot run its type-fast-path regardless. The `--allow-slow-types` flag may be needed at publish time to suppress warnings. Confidence: MEDIUM (official docs confirm JS limitation; practical flag behavior on pure-JS packages not verified against a live package).

**Boundary:** This file is JSR-only. npm ignores it. It must be kept in sync with the version in `package.json` on every release.

---

### Component 3: TypeScript Declaration Emit (tsconfig.json)

**What it is:** `src/spriggan.d.ts` already exists as a hand-maintained file. The question is whether to keep it hand-maintained or have `tsc` emit it.

**Current state:** `tsconfig.json` has `declaration: true` and `declarationMap: true` but `noEmit: true`. The `.d.ts` is currently authored manually alongside the source.

**Two options:**

| Option | Mechanism | Tradeoff |
|--------|-----------|----------|
| Keep hand-maintained | No build step | Author must update `.d.ts` on every API change; works today |
| Add `tsc --emitDeclarationOnly` build step | Remove `noEmit`, set `outDir` or emit in-place | Removes drift risk; adds a CI step before publish |

**Recommended:** Add a `tsc --emitDeclarationOnly` step in the publish workflow. Rationale: the existing tsconfig is already configured for this — only `noEmit` needs removing (or overridden with `--noEmit false`). This prevents `.d.ts` drift with zero additional tooling.

**What changes in tsconfig.json:** Uncomment `rootDir` / `outDir`, or emit declarations in-place. The publish workflow runs `tsc --emitDeclarationOnly --noEmit false` before publishing.

**Boundary:** This component feeds both npm and JSR. Its output (`.d.ts`) is what consumers of both registries get for type checking.

---

### Component 4: GitHub Actions — Gate Job

**What it is:** A job that runs quality checks before any publishing can occur. Both the npm and JSR publish jobs declare this as a dependency via `needs:`.

**Structure:**

```yaml
jobs:
  gate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: jdx/mise-action@v2        # installs bun 1.3 via mise
      - run: mise run check             # lint + test (existing task)
```

**Boundary:** Identical to the existing CI job. The only change is it now runs on `tags: ['v*']` in addition to the existing `branches: [main]` trigger. The gate job can be shared between the existing CI workflow and the new publish workflow, or kept in a separate `publish.yml` that duplicates the steps.

**Recommended:** Keep them separate. One `ci.yml` for branch/PR checks, one `publish.yml` for tag-triggered publishing. Less coupling; clearer intent.

---

### Component 5: GitHub Actions — Publish Jobs (npm + JSR)

These are two jobs in the publish workflow, both gated on the `gate` job.

#### npm Publish Job

**Authentication:** npm now supports OIDC trusted publishing (GA as of July 2025), which eliminates long-lived `NPM_TOKEN` secrets. Requires:
1. Link the package on npmjs.com: Package Settings > Trusted Publishers > GitHub Actions
2. Specify repository, workflow filename, and environment name
3. `id-token: write` permission in the workflow job

**Workflow job:**

```yaml
publish-npm:
  needs: gate
  runs-on: ubuntu-latest
  permissions:
    contents: read
    id-token: write
  environment: npm-publish           # environment name must match npmjs.com config
  steps:
    - uses: actions/checkout@v4
    - uses: actions/setup-node@v4
      with:
        node-version: '24'           # npm 11.5.1+ required for trusted publishing
        registry-url: 'https://registry.npmjs.org'
    - uses: jdx/mise-action@v2
    - run: bun install
    - run: bunx tsc --emitDeclarationOnly --noEmit false
    - name: Set version from tag
      run: npm --no-git-tag-version version ${GITHUB_REF_NAME#v}
    - run: npm publish --access public
```

**Note on version:** The tag `v1.2.3` sets package.json version to `1.2.3` ephemerally in CI — this change is never committed. This is the standard pattern for tag-triggered publishing. Alternatively, the committer updates `package.json` and `jsr.json` version before tagging.

**Alternative (simpler, but requires NPM_TOKEN secret):** Use `NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}` with a classic automation token. This works today and doesn't require Node 24. Recommended as fallback if OIDC setup proves friction.

#### JSR Publish Job

**Authentication:** JSR uses OIDC natively, no token required. Link the package on jsr.io: Package Settings > GitHub Actions > enter repository name.

```yaml
publish-jsr:
  needs: gate
  runs-on: ubuntu-latest
  permissions:
    contents: read
    id-token: write
  steps:
    - uses: actions/checkout@v4
    - uses: jdx/mise-action@v2
    - run: bun install
    - run: bunx tsc --emitDeclarationOnly --noEmit false
    - name: Set version from tag
      run: |
        TAG=${GITHUB_REF_NAME#v}
        node -e "
          const fs = require('fs');
          const j = JSON.parse(fs.readFileSync('jsr.json', 'utf8'));
          j.version = '$TAG';
          fs.writeFileSync('jsr.json', JSON.stringify(j, null, 2));
        "
    - run: npx jsr publish --allow-slow-types
```

**Note on `--allow-slow-types`:** Because `src/spriggan.js` is a JavaScript file, JSR cannot perform its fast-path type inference regardless of annotation quality. This flag suppresses the warning without consequence. Confidence: MEDIUM — verify against actual publish attempt.

---

## Data Flow: Tag Push to Published Packages

```
Developer action:
  git tag v0.1.0 && git push origin v0.1.0

GitHub Actions trigger:
  publish.yml fires on: push: tags: ['v*']

GITHUB_REF_NAME = "v0.1.0"
GITHUB_REF = "refs/tags/v0.1.0"

Stage 1 — Gate job:
  bun install
  biome lint         (via mise run check)
  vitest run         (via mise run check)
  [PASS or FAIL — if FAIL, both publish jobs are skipped]

Stage 2 — Parallel publish (both need: gate):

  npm job:                          JSR job:
  setup-node (v24, registry URL)    (no special setup needed)
  bun install                       bun install
  tsc --emitDeclarationOnly         tsc --emitDeclarationOnly
  npm version 0.1.0 (ephemeral)     jsr.json version patched to 0.1.0
  npm publish --access public       npx jsr publish --allow-slow-types
         |                                    |
         v                                    v
   npmjs.com                             jsr.io
   @bjro/spriggan@0.1.0             @bjro/spriggan@0.1.0

Consumer (npm path):               Consumer (JSR path):
  npm install @bjro/spriggan         jsr add @bjro/spriggan
  import { app } from               import { app } from
    '@bjro/spriggan'                   'jsr:@bjro/spriggan'
```

---

## Suggested Build Order (Phase Dependencies)

The components have a strict dependency order:

```
1. package.json metadata
   (name, version, exports, files, publishConfig)
   — must exist before any publish attempt

2. jsr.json creation
   (name, version, exports pointing to ./src/spriggan.js)
   — must exist before JSR publish job

3. @ts-self-types directive in src/spriggan.js
   (one-line addition at top of file)
   — must exist before JSR publish to get type coverage

4. tsc declaration emit (tsconfig.json adjustment)
   (remove noEmit or override it, add outDir/emit-in-place)
   — must work correctly before publish job runs it

5. GitHub Actions: publish.yml
   (gate job + npm job + jsr job)
   — requires components 1-4 to be correct

6. Registry linking (one-time manual steps)
   (link repo on jsr.io, link repo on npmjs.com for OIDC)
   — must happen before first publish run
```

All of components 1-4 are `package.json` / config file changes. They can be done in a single commit. Component 5 (workflow) is a new file. Component 6 is out-of-band (website configuration).

---

## Anti-Patterns to Avoid

### Anti-Pattern 1: Bundling the Single Source File

**What:** Running a bundler (esbuild, rollup) as a build step before publish.
**Why bad:** Spriggan has no imports to bundle. Bundling adds complexity, a dist/ directory, and a build step with no benefit.
**Instead:** Publish `src/spriggan.js` directly via the `exports` and `files` fields in `package.json`.

---

### Anti-Pattern 2: Committing Version Bumps to the Branch

**What:** Having the CI workflow commit a `package.json` version change back to `main`.
**Why bad:** Creates a circular trigger risk, requires write permissions to the branch, complicates history.
**Instead:** Either (a) developer bumps version in `package.json`/`jsr.json` before tagging, or (b) CI mutates version ephemerally in-memory during the publish step only. Both are clean; option (b) is more automated.

---

### Anti-Pattern 3: Single Workflow with Sequential npm then JSR

**What:** One job that publishes npm, then publishes JSR.
**Why bad:** If npm publish succeeds but JSR fails, re-running the job re-publishes to npm (which will fail with "version exists") and confuses the retry story.
**Instead:** Separate jobs with `needs: gate`. Each is independently retryable.

---

### Anti-Pattern 4: Using Long-Lived NPM_TOKEN When OIDC Is Available

**What:** Storing an npm automation token as a GitHub secret.
**Why bad:** Token can be exfiltrated from logs or environment, has no expiry, must be rotated manually.
**Instead:** npm OIDC trusted publishing (GA July 2025, requires npm 11.5.1 / Node 24). If Node 24 is not yet acceptable, use the NPM_TOKEN approach as a temporary measure with a comment noting the migration path.

---

## Scalability Considerations

This pipeline is for a zero-dependency single-file library. Scaling concerns are minimal and categorically different from application pipelines.

| Concern | Now | If framework grows to multiple files |
|---------|-----|--------------------------------------|
| Build step | None needed | Add `tsc --emitDeclarationOnly` or esbuild |
| Publish size | ~30KB source | Add `files` exclusions to trim test/examples |
| Version sync | Manual or ephemeral in CI | Consider `changesets` or `release-please` |
| Dual publish coordination | Two independent jobs | Same pattern scales; add registries as more jobs |

---

## Sources

- [Publishing packages — JSR](https://jsr.io/docs/publishing-packages) — HIGH confidence
- [npm compatibility — JSR](https://jsr.io/docs/npm-compatibility) — HIGH confidence
- [About slow types — JSR](https://jsr.io/docs/about-slow-types) — HIGH confidence
- [npm trusted publishing with OIDC is GA — GitHub Changelog](https://github.blog/changelog/2025-07-31-npm-trusted-publishing-with-oidc-is-generally-available/) — HIGH confidence
- [Generating provenance statements — npm Docs](https://docs.npmjs.com/generating-provenance-statements/) — HIGH confidence
- [Bootstrapping npm provenance with GitHub Actions](https://www.thecandidstartup.org/2026/01/26/bootstrapping-npm-provenance-github-actions.html) — MEDIUM confidence (independent blog, verified against official docs)
- [NPM trusted publishing — blog.robino.dev](https://blog.robino.dev/posts/npm-trusted-publishing) — MEDIUM confidence
