# Technology Stack: npm + JSR Publishing Infrastructure

**Project:** Spriggan — publishing milestone
**Researched:** 2026-03-21
**Scope:** CI/CD tools only — existing framework stack (Bun, Vitest, Biome, mise) is not re-researched

---

## Recommended Stack

### GitHub Actions Core Actions

| Tool | Version | Purpose | Why |
|------|---------|---------|-----|
| `actions/checkout` | `v4` | Checkout source for publish job | Standard, stable; v4 is the current major with Node 20 runner support |
| `actions/setup-node` | `v6` | Install Node.js + configure npm registry | Latest major (v6.3.0, Mar 2025); required to set `registry-url` which writes `.npmrc` for OIDC auth |
| `jdx/mise-action` | `v2` | Already used in CI for Bun/tooling | Re-use existing for consistency in the check gate before publish |

Confidence: HIGH — verified against https://github.com/actions/setup-node/releases

### npm Publishing

| Tool | Version | Purpose | Why |
|------|---------|---------|-----|
| npm CLI | `>=11.5.1` (install latest in CI) | Publish to npmjs.com | Trusted publishing (OIDC) requires exactly npm 11.5.1+; earlier versions give opaque 404 errors |
| Node.js | `22.x` (LTS) | Runtime for npm CLI | npm 11.5.1 requires Node 22.14.0+; use LTS for stability |

**Authentication method: OIDC Trusted Publishing (no stored secrets)**

OIDC trusted publishing (GA as of July 2025 per GitHub changelog) means no `NPM_TOKEN` secret stored in GitHub. npm issues a short-lived token per workflow run, scoped to the specific package and operation. This is the current best practice — long-lived tokens are the legacy approach.

Requires one-time manual setup on npmjs.com per package: navigate to package Access settings, add a Trusted Publisher entry specifying org/user, repo, workflow filename, and (optionally) environment name.

Confidence: HIGH — documented at https://docs.npmjs.com/trusted-publishers/ and confirmed GA via GitHub changelog

### JSR Publishing

| Tool | Version | Purpose | Why |
|------|---------|---------|-----|
| `npx jsr publish` | current (via npx) | Publish to jsr.io | Official JSR CLI; no version pinning needed, npx fetches current |
| `jsr.json` | — | Package config file for JSR | Standalone config preferred over deno.json for non-Deno projects; cleaner separation |

**Authentication method: OIDC (same mechanism as npm, different setup)**

JSR uses OIDC identity tokens for tokenless publishing from GitHub Actions. Requires linking the GitHub repository to the JSR package via package settings on jsr.io (Settings tab → link repo). No secret stored in GitHub.

Provenance is automatic: JSR generates SLSA provenance statements and publishes to the Sigstore Rekor transparency log for all GitHub Actions publishes.

Confidence: HIGH — verified at https://jsr.io/docs/publishing-packages and https://jsr.io/docs/trust

### TypeScript Declaration Emit

| Tool | Config | Purpose | Why |
|------|--------|---------|-----|
| `tsc` (already in devDeps) | `emitDeclarationOnly: true`, `outDir: ./dist` | Generate `.d.ts` from JSDoc-annotated JS | The existing tsconfig has `declaration: true` and `declarationMap: true` but `noEmit: true`; flip `noEmit` off and add `outDir` to emit declarations without touching source |

**No bundler needed.** Spriggan is a single-file ESM package (`src/spriggan.js`). `tsc --emitDeclarationOnly` produces `dist/spriggan.d.ts` and `dist/spriggan.d.ts.map`. No transpilation, no bundling. The source `.js` file ships directly.

Confidence: HIGH — standard TypeScript capability, confirmed by TypeScript docs

---

## What NOT to Use

### Do NOT use: Long-lived npm tokens

**Avoid:** Setting `NPM_TOKEN` as a GitHub Actions secret and passing it via `NODE_AUTH_TOKEN` env var.

**Why:** OIDC trusted publishing is the current standard. Long-lived tokens are a supply chain attack surface; if the secret leaks, any workflow (or attacker) can publish indefinitely. OIDC tokens are scoped, short-lived, and tied to the specific workflow run.

**Exception:** If npm trusted publishing setup fails or the package does not yet exist on npm (first publish requires a manual step or token — see Pitfalls), fall back to a granular token temporarily.

### Do NOT use: `actions/setup-node@v4` or earlier

**Avoid:** Pinning to v4 or v5 of setup-node.

**Why:** v6 is the current major (released Oct 2024, updated Mar 2025). v4 uses Node 16 runner internals. Actions major versions are stable breaking-change boundaries — use the current one.

### Do NOT use: A third-party "npm publish" Marketplace action

**Avoid:** Actions like `JS-DevTools/npm-publish`, `pascalgn/npm-publish-action`, etc.

**Why:** These add an unnecessary third-party dependency with its own update/security lifecycle. The official `npm publish` command via `actions/setup-node` + OIDC is simpler, more transparent, and officially maintained. Marketplace actions for publishing were useful before OIDC; they're now unnecessary complexity.

### Do NOT use: `deno.json` as the JSR config for this project

**Avoid:** Using `deno.json` to hold JSR package metadata.

**Why:** Spriggan is not a Deno project. `deno.json` implies Deno-specific tooling to contributors. `jsr.json` is the standalone equivalent for non-Deno packages and is the right choice when Deno is not otherwise in use.

### Do NOT use: A bundler (Rollup, esbuild, tsup, etc.)

**Avoid:** Adding a build step that bundles `src/spriggan.js` into a `dist/` artifact.

**Why:** The source is already a single ES module file. Bundling adds complexity and a tool dependency for zero benefit. Ship the source directly; only emit `.d.ts` declarations.

---

## package.json Changes Required

The current `package.json` has no `name`, `version`, `exports`, or `files` fields. These must be added:

```json
{
  "name": "@bjro/spriggan",
  "version": "0.1.0",
  "type": "module",
  "exports": {
    ".": {
      "types": "./dist/spriggan.d.ts",
      "default": "./src/spriggan.js"
    }
  },
  "files": [
    "src/spriggan.js",
    "dist/spriggan.d.ts",
    "dist/spriggan.d.ts.map"
  ],
  "repository": {
    "type": "git",
    "url": "git+https://github.com/roobie/spriggan.git"
  },
  "publishConfig": {
    "access": "public",
    "provenance": true
  }
}
```

**Key decisions:**
- `exports["."].types` points to `dist/` (emitted), `default` points to `src/` (source) — no copy step needed
- `publishConfig.access: "public"` required because scoped packages default to private on npm
- `publishConfig.provenance: true` explicitly opts into provenance (belt-and-suspenders alongside OIDC)
- `repository` field must match what is configured in npm trusted publisher settings

Confidence: HIGH for structure; MEDIUM for exact paths (depends on tsconfig `outDir` decision)

---

## jsr.json Required

New file at repo root:

```json
{
  "name": "@bjro/spriggan",
  "version": "0.1.0",
  "exports": "./src/spriggan.js"
}
```

JSR resolves types from JSDoc automatically for `.js` files — no separate `types` pointer needed. The `include` field is optional but can be used to limit what JSR ingests if the repo has non-package files.

Confidence: HIGH — verified at https://jsr.io/docs/package-configuration

---

## tsconfig.json Changes Required

To emit declarations, `noEmit` must be disabled and `outDir`/`rootDir` set for the emit run. The cleanest approach is a separate `tsconfig.build.json` so the default `tsconfig.json` stays in type-check-only mode:

```json
// tsconfig.build.json
{
  "extends": "./tsconfig.json",
  "compilerOptions": {
    "noEmit": false,
    "emitDeclarationOnly": true,
    "rootDir": "./src",
    "outDir": "./dist",
    "declarationDir": "./dist"
  },
  "include": ["src/spriggan.js"]
}
```

Run with: `tsc -p tsconfig.build.json`

This keeps IDE/linting using the original `tsconfig.json` (noEmit, broader include) and the publish workflow uses `tsconfig.build.json` to emit.

Confidence: HIGH — standard TypeScript pattern

---

## GitHub Actions Workflow Design

### Trigger

```yaml
on:
  push:
    tags:
      - 'v*'
```

Tag-triggered publish is the stated constraint. A `v*` pattern matches `v0.1.0`, `v1.0.0`, etc.

### Job structure

Two separate jobs: one for npm, one for JSR. They can run in parallel after a shared `check` job that gates on tests+lint passing. This mirrors the existing CI structure.

```yaml
jobs:
  check:
    # reuse existing mise run check — tests + lint must pass before publish

  publish-npm:
    needs: check
    permissions:
      contents: read
      id-token: write   # required for OIDC token generation
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v6
        with:
          node-version: '22'
          registry-url: 'https://registry.npmjs.org'
      - run: npm install -g npm@latest   # ensure npm >= 11.5.1
      - run: tsc -p tsconfig.build.json  # emit .d.ts
      - run: npm publish --access public

  publish-jsr:
    needs: check
    permissions:
      contents: read
      id-token: write   # required for JSR OIDC
    steps:
      - uses: actions/checkout@v4
      - run: npx jsr publish
```

**Note on `registry-url`:** `actions/setup-node` writes a `.npmrc` with the registry and a `NODE_AUTH_TOKEN` placeholder when `registry-url` is set. With OIDC trusted publishing, this placeholder is replaced by the OIDC-issued token automatically. The `registry-url` step is still required — without it, npm does not know which registry to authenticate against.

Confidence: MEDIUM — pattern verified across multiple sources; exact interaction of setup-node + OIDC trusted publishing has known edge cases (see Pitfalls). The npm 11.5.1 requirement is HIGH confidence from official docs.

---

## First-Publish Manual Steps (One-Time)

These cannot be automated:

1. **npm:** Create package on npmjs.com first (either `npm publish` from local with a token, or via the website). Trusted publishing cannot be configured on a package that does not yet exist in the registry.

2. **npm:** After first publish, go to `https://www.npmjs.com/package/@bjro/spriggan/access` → add Trusted Publisher → fill in: owner `roobie`, repo `spriggan`, workflow filename `publish.yml`, no environment required.

3. **JSR:** Create package on jsr.io, then go to package Settings → link to `roobie/spriggan` GitHub repository.

Confidence: HIGH — documented in official npm and JSR docs; failure to do these steps causes the automated workflow to fail with authentication errors.

---

## Alternatives Considered

| Category | Recommended | Alternative | Why Not |
|----------|-------------|-------------|---------|
| npm auth | OIDC trusted publishing | Long-lived `NPM_TOKEN` secret | Security: token leakage risk; tokens don't expire; OIDC is current best practice |
| JSR publish | `npx jsr publish` | `denoland/setup-deno` + `deno publish` | Not a Deno project; adds unnecessary Deno toolchain dependency |
| Declaration emit | `tsc --emitDeclarationOnly` | tsup, dts-bundle-generator | Zero build pipeline needed; tsc is already a devDep; no new tools |
| Workflow trigger | `push: tags: v*` | GitHub Releases `published` event | Project constraint states "tag push is the trigger"; simpler, no release object required |
| setup-node version | v6 | v4 | v6 is current major; v4 uses deprecated Node 16 runner internals |

---

## Sources

- https://docs.npmjs.com/trusted-publishers/ (npm OIDC trusted publishing, official)
- https://github.blog/changelog/2025-07-31-npm-trusted-publishing-with-oidc-is-generally-available/ (GA announcement)
- https://jsr.io/docs/publishing-packages (JSR GitHub Actions publishing, official)
- https://jsr.io/docs/package-configuration (jsr.json format, official)
- https://jsr.io/docs/trust (JSR provenance model, official)
- https://github.com/actions/setup-node/releases (setup-node v6.3.0 confirmed current, verified)
- https://philna.sh/blog/2026/01/28/trusted-publishing-npm/ (npm 11.5.1 requirement, workflow gotchas)
- https://nickradford.dev/blog/npm-trusted-publishing-and-github-actions (npm 11.5.1 + OIDC setup details)
