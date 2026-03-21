# Domain Pitfalls: npm + JSR Dual Publishing

**Domain:** JavaScript package dual publishing (npm + JSR), single ESM file, JSDoc types
**Project:** @bjro/spriggan
**Researched:** 2026-03-21
**Confidence:** HIGH (primary pitfalls verified against official docs and multiple sources)

---

## Critical Pitfalls

Mistakes that cause publish failures, broken consumer experience, or require immediate re-publish.

---

### Pitfall 1: JSR Cannot Generate Types from JSDoc-Annotated JavaScript

**What goes wrong:** JSR only generates type documentation and npm-compat `.d.ts` files from TypeScript source. When the package entrypoint is a `.js` file, JSR cannot infer types from JSDoc comments. The publish either errors or produces a package with no types in the JSR registry (score penalty, degraded consumer experience). Specifically, `jsr publish` will surface `error[unsupported-nested-javascript]` when a `.ts` module references a `.js` entrypoint without type declarations.

**Why it happens:** JSR's type analysis pipeline runs on TypeScript AST, not JSDoc. The `@ts-check` directive and JSDoc annotations are invisible to JSR's type generator.

**Consequences:**
- Package publishes with zero type information unless addressed
- Documentation tab on jsr.io is empty or severely degraded
- npm-compat layer produces `.d.ts` files with `any` everywhere
- JSR score suffers, reducing package discoverability

**Prevention:** Add a `/* @ts-self-types="./spriggan.d.ts" */` directive at the very top of `src/spriggan.js` (before any imports). This tells JSR to use the pre-generated `.d.ts` file instead of trying to analyse the JavaScript. The `.d.ts` must be included in the `jsr.json` `include` array and must be published alongside the source.

**Warning signs:**
- `jsr publish --dry-run` shows warnings about missing type declarations
- The JSR package page shows "No documentation" after publish
- Consumer TypeScript projects see `any` for all imported symbols

**Phase:** Package metadata setup (earliest phase) — must be resolved before first publish attempt.

---

### Pitfall 2: `noEmit: true` Blocks Declaration Generation

**What goes wrong:** The current `tsconfig.json` has `noEmit: true` alongside `declaration: true` and `declarationMap: true`. These options are contradictory: `noEmit` silently wins and no `.d.ts` files are produced. The project appears configured for declaration emit but running `tsc` produces nothing.

**Why it happens:** `noEmit` is correct for type-checking-only workflows (CI lint). Adding `declaration: true` to the same config is aspirational but inert when `noEmit` is set.

**Consequences:**
- Running `tsc` in the publish workflow produces no output and silently succeeds with exit 0
- The published npm package contains no `.d.ts` files
- TypeScript consumers see `Could not find a declaration file for module '@bjro/spriggan'`

**Prevention:** Create a separate `tsconfig.build.json` that extends the base config and overrides `noEmit: false`, sets `rootDir: "./src"`, `outDir: "./dist"`, and removes `"include"` patterns that would pull in test/example files. The publish workflow uses `tsconfig.build.json`; CI type-checking continues to use the base `tsconfig.json`.

**Warning signs:**
- `tsc --project tsconfig.json` exits 0 but no `dist/` directory is created
- `npm pack` tarball inspection shows no `.d.ts` files

**Phase:** Package metadata / tsconfig setup — must be the first thing done.

---

### Pitfall 3: `"exports"` Field Missing or Misconfigured for TypeScript Consumers

**What goes wrong:** Once `"exports"` is added to `package.json`, Node.js enforces it strictly and ignores all other resolution. If the `"types"` condition is absent, TypeScript (with `"moduleResolution": "bundler"` or `"node16"`) will refuse to resolve types and emit:

```
Could not find a declaration file for module '@bjro/spriggan'.
There are types at './dist/spriggan.d.ts', but this result could not be
resolved when respecting package.json 'exports'.
```

A secondary mistake is putting `"types"` last in the condition object. Conditions are evaluated in order; `"types"` must appear first.

**Why it happens:** TypeScript added `"exports"`-aware resolution in v4.7. Packages that previously worked with only a `"main"` field break when `"exports"` is introduced without `"types"`.

**Consequences:**
- TypeScript consumers get implicit `any` for all imports
- VSCode shows no autocomplete, no hover types
- The package is effectively unusable in typed projects

**Prevention:** Use this exact structure in `package.json`:

```json
{
  "exports": {
    ".": {
      "types": "./dist/spriggan.d.ts",
      "default": "./src/spriggan.js"
    }
  }
}
```

The `"types"` key must be first. For an ESM-only package without a build step on the JS source, `"default"` pointing directly to the source file is correct. The `.d.ts` is a build artefact placed in `dist/`.

**Warning signs:**
- `npx tsc --moduleResolution node16 --traceResolution` on a consumer project shows type resolution failing for `@bjro/spriggan`
- `npm pack` then `cd /tmp && npm install ./spriggan-x.y.z.tgz` and TypeScript gives `any` errors

**Phase:** Package metadata setup.

---

### Pitfall 4: Accidentally Publishing Files That Should Not Be in the Package

**What goes wrong:** Without an explicit `"files"` whitelist in `package.json`, `npm publish` includes everything not in `.gitignore` or `.npmignore`. For this project that means `examples/`, `tests/`, `node_modules/` (if `.gitignore` is incomplete), `tsconfig.json`, biome config, etc. — adding noise and size, and potentially leaking dev tooling configuration that consumers don't need.

A subtler variant: if `.npmignore` is created at any point, it takes precedence over `.gitignore` entirely, meaning previously ignored files may suddenly be included.

**Why it happens:** npm's default include-everything behaviour surprises most authors. `.npmignore` override of `.gitignore` is documented but non-obvious.

**Consequences:**
- Published package is larger than necessary
- `node_modules/` subdirectories can appear in publish if `.gitignore` doesn't cover them
- Test files confuse consumers browsing the registry source view

**Prevention:** Use the `"files"` whitelist approach (not `.npmignore`). A minimal correct entry for this project:

```json
{
  "files": ["src/spriggan.js", "dist/spriggan.d.ts", "dist/spriggan.d.ts.map"]
}
```

Verify with `npm pack --dry-run` before the first publish and inspect the file list.

**Warning signs:**
- `npm pack` tarball contains `examples/`, `tests/`, or `node_modules/`
- Tarball size is more than ~50 KB for a 750-line single-file package

**Phase:** Package metadata setup (add `"files"` before the CI workflow is written).

---

### Pitfall 5: Version Mismatch Between Git Tag and `package.json`

**What goes wrong:** The planned workflow is tag-triggered: push `v1.0.0` tag → publish. If `package.json` still contains no `"version"` field (current state) or an old version, the published package has a different version than the git tag. npm uses the version from `package.json`, not the tag name.

**Why it happens:** Tag and `package.json` version are independent. Nothing enforces they match unless the workflow explicitly checks.

**Consequences:**
- `npm install @bjro/spriggan@1.0.0` installs a package whose internal metadata says `0.0.0` or something else
- Semver tooling (Dependabot, Renovate) behaves unpredictably
- Cannot re-publish the same version if it was published with wrong metadata (npm immutability)

**Prevention:** Add an explicit version-consistency check step in the publish workflow before the `npm publish` step:

```yaml
- name: Verify tag matches package.json version
  run: |
    PKG_VERSION=$(node -p "require('./package.json').version")
    TAG_VERSION="${GITHUB_REF_NAME#v}"
    if [ "$PKG_VERSION" != "$TAG_VERSION" ]; then
      echo "Version mismatch: package.json=$PKG_VERSION tag=$TAG_VERSION"
      exit 1
    fi
```

**Warning signs:**
- `package.json` has no `"version"` field (current state — this will cause `npm publish` to fail outright)
- Workflow fires on tag push but no pre-publish version check step exists

**Phase:** Publish workflow setup.

---

### Pitfall 6: Bun Uses `NPM_CONFIG_TOKEN`, Not `NODE_AUTH_TOKEN`

**What goes wrong:** The standard GitHub Actions pattern for npm authentication is to set `NODE_AUTH_TOKEN`. This works when using `actions/setup-node` with `registry-url`, which writes `.npmrc` referencing `NODE_AUTH_TOKEN`. Bun ignores `NODE_AUTH_TOKEN` and reads `NPM_CONFIG_TOKEN` instead. Using the wrong variable causes a silent auth failure with a 401 or 403 from the registry.

**Why it happens:** Bun implements its own npm-compatible client with different environment variable conventions.

**Consequences:**
- `bun publish` exits with authentication error in CI
- If `npm` is used instead of `bun publish` in the workflow, `actions/setup-node` + `registry-url` must be used, but `registry-url` can conflict with JSR's compatibility layer configuration

**Prevention:** Use one of these approaches (pick one, not both):
- Use `bun publish` and set `NPM_CONFIG_TOKEN` in the workflow env/secrets
- Use `npm publish` (npm is available in GitHub Actions runners) with `actions/setup-node` and `NODE_AUTH_TOKEN`
- Use npm trusted publishing (OIDC) which requires `id-token: write` permission and npm CLI >= 11.5.1 — no token secret needed at all

OIDC trusted publishing is the most secure and eliminates the token variable confusion entirely, but requires one-time setup on npmjs.com per package.

**Warning signs:**
- Workflow uses `bun publish` but secrets are named `NODE_AUTH_TOKEN` or `NPM_TOKEN`
- `actions/setup-node` with `registry-url` is used alongside `bun publish`

**Phase:** Publish workflow setup.

---

### Pitfall 7: `jsr.json` Not Including Itself in `publish.include`

**What goes wrong:** When `jsr.json` uses `publish.include` to restrict which files are published (recommended to avoid shipping tests and examples), authors frequently forget to include `jsr.json` itself. The result is that `jsr publish` fails with a confusing error about a missing configuration file, or publishes without the config being available to JSR's tooling.

**Why it happens:** The `jsr.json` file is the manifest; it seems odd that you'd need to explicitly include it. But if `publish.include` is an explicit allowlist, it is not automatically included.

**Consequences:**
- `jsr publish` fails or warns about missing configuration
- JSR package may not correctly expose the declared exports

**Prevention:** Always include `jsr.json` explicitly when using `publish.include`:

```json
{
  "name": "@bjro/spriggan",
  "version": "1.0.0",
  "exports": "./src/spriggan.js",
  "publish": {
    "include": ["jsr.json", "src/spriggan.js", "dist/spriggan.d.ts"]
  }
}
```

**Warning signs:**
- `jsr publish --dry-run` succeeds but the published package has no exports on jsr.io
- Error message references missing or unresolvable config during publish

**Phase:** JSR configuration setup.

---

## Moderate Pitfalls

Mistakes that degrade quality or require a patch release, but don't block publishing.

---

### Pitfall 8: `.d.ts` File Collision Breaks Incremental Declaration Emit

**What goes wrong:** Running `tsc --allowJs --declaration --emitDeclarationOnly` twice in a row fails on the second run. TypeScript treats an existing `.d.ts` adjacent to a `.js` source file as an input file and refuses to overwrite it. The CI publish step may succeed on a clean runner but fail locally, causing confusion.

**Why it happens:** TypeScript's input collection includes `*.d.ts` files, and it won't emit over its own inputs.

**Prevention:** The build script in `package.json` should clean `dist/` before running `tsc`:

```json
{
  "scripts": {
    "build:types": "rm -rf dist && tsc --project tsconfig.build.json"
  }
}
```

**Phase:** Package metadata / tsconfig setup.

---

### Pitfall 9: JSR Score Penalty for Slow Types Due to Missing Explicit Return Types

**What goes wrong:** JSR scores packages on type quality. Functions that return complex inferred types (rather than explicitly annotated types) are flagged as "slow types." For a JSDoc-annotated JS file using `@ts-self-types` to provide a `.d.ts`, this is less likely to bite — the `.d.ts` is pre-generated by `tsc` and types are explicit there. However, if any exported function in the `.d.ts` resolves to a complex inferred type (e.g., an object literal return type not annotated in JSDoc), JSR will penalise the score.

**Prevention:** After generating the `.d.ts` with `tsc`, inspect the output and confirm all exported function signatures have explicit return type annotations, not inferred ones. Use `jsr publish --dry-run` to see the score preview before committing to a publish.

**Phase:** First publish validation / pre-publish checklist.

---

### Pitfall 10: `"repository"` Field Absent Breaks Provenance Attestation

**What goes wrong:** npm provenance (the feature that links a published package to its GitHub Actions run) requires the `package.json` `"repository"` field to be set and to match the GitHub repository. Without it, provenance generation silently fails or the OIDC token is rejected.

**Prevention:** Add to `package.json`:

```json
{
  "repository": {
    "type": "git",
    "url": "git+https://github.com/roobie/spriggan.git"
  }
}
```

**Phase:** Package metadata setup.

---

## Minor Pitfalls

Easily fixed once noticed, but waste time.

---

### Pitfall 11: `"name"` and `"version"` Required by Both Registries

The package currently has neither `"name"` nor `"version"` in `package.json`. Both are required for `npm publish` and `bun publish` to succeed. `jsr publish` uses `jsr.json` for these, but npm will error immediately without them. This is the most obvious first step and easy to overlook in planning because it seems trivial.

**Phase:** Package metadata setup — literally the first change.

---

### Pitfall 12: Tag Pattern Mismatch in Workflow `on.push.tags`

**What goes wrong:** A workflow triggering on `v*` tags will also fire on tags like `v2-beta`, `v1-rc1`, etc. Conversely, `v[0-9]+.[0-9]+.[0-9]+` is stricter but won't match pre-release tags like `v1.0.0-alpha.1` if those are ever needed. Choose the pattern intentionally.

**Prevention:** Use `'v[0-9]+.[0-9]+.[0-9]+'` for strict semver tags, or `'v*'` for maximum flexibility. Document the choice. Add the version consistency check (Pitfall 5) to guard against accidents regardless of pattern.

**Phase:** Publish workflow setup.

---

### Pitfall 13: Forgetting `--access public` for Scoped npm Packages

**What goes wrong:** Scoped npm packages (`@bjro/spriggan`) default to private on first publish. Running `npm publish` without `--access public` on the first publish requires a paid npm account or fails with a permissions error. Subsequent publishes remember the access level, but the first one must be explicit.

**Prevention:** Always include `--access public` in the publish command in the workflow:

```yaml
- run: npm publish --access public --provenance
```

**Phase:** Publish workflow setup.

---

## Phase-Specific Warnings

| Phase Topic | Likely Pitfall | Mitigation |
|-------------|----------------|------------|
| Add `name`, `version`, `exports`, `files` to package.json | Missing `"types"` in exports (Pitfall 3); missing `"repository"` (Pitfall 10); no `"files"` whitelist (Pitfall 4) | Follow the exports structure template above; run `npm pack --dry-run` |
| TypeScript declaration emit via tsconfig | `noEmit: true` conflict (Pitfall 2); `.d.ts` collision on re-run (Pitfall 8) | Create separate `tsconfig.build.json`; clean dist before emit |
| JSR config (jsr.json) | JSDoc types invisible to JSR (Pitfall 1); `jsr.json` not in include list (Pitfall 7) | Add `@ts-self-types` directive; include `jsr.json` in publish.include |
| npm publish GitHub Actions workflow | Bun token variable (Pitfall 6); scoped package access (Pitfall 13); tag/version mismatch (Pitfall 5); tag pattern (Pitfall 12) | Use OIDC or `NPM_CONFIG_TOKEN`; add version check step; use `--access public` |
| JSR publish GitHub Actions workflow | Bun `--allow-dirty` flag confusion; slow types score (Pitfall 9) | Use `jsr publish --dry-run` first; inspect score |

---

## Sources

- [JSR: About slow types](https://jsr.io/docs/about-slow-types) — HIGH confidence (official docs)
- [JSR: Publishing packages](https://jsr.io/docs/publishing-packages) — HIGH confidence (official docs)
- [JSR: npm compatibility](https://jsr.io/docs/npm-compatibility) — HIGH confidence (official docs)
- [Node.js: Packages (exports field rules)](https://nodejs.org/api/packages.html) — HIGH confidence (official docs)
- [npm: Trusted publishers (OIDC)](https://docs.npmjs.com/trusted-publishers/) — HIGH confidence (official docs)
- [npm: Generating provenance statements](https://docs.npmjs.com/generating-provenance-statements/) — HIGH confidence (official docs)
- [Things you need to do for npm trusted publishing to work — Phil Nash, 2026-01-28](https://philna.sh/blog/2026/01/28/trusted-publishing-npm/) — HIGH confidence (author verified against real workflow, very recent)
- [TypeScript: Creating .d.ts files from .js files](https://www.typescriptlang.org/docs/handbook/declaration-files/dts-from-js.html) — HIGH confidence (official docs)
- [Tutorial: publishing ESM-based npm packages with TypeScript — 2ality, 2025-02](https://2ality.com/2025/02/typescript-esm-packages.html) — MEDIUM confidence (third-party, well-regarded author)
- [Publish pure ESM npm package written in TypeScript to JSR — dev.to/fabon](https://dev.to/fabon/publish-pure-esm-npm-package-written-in-typescript-to-jsr-4ih2) — MEDIUM confidence (practitioner experience, verified against official docs)
- [Guide to the package.json exports field — Hiroki Osame](https://hirok.io/posts/package-json-exports) — MEDIUM confidence (detailed reference, widely cited)
- [JSR issue #370: d.ts files ignored when entrypoint is js file](https://github.com/jsr-io/jsr/issues/370) — MEDIUM confidence (bug report, confirms `@ts-self-types` workaround)
- [JSR issue #305: error[unsupported-nested-javascript]](https://github.com/jsr-io/jsr/issues/305) — MEDIUM confidence (documents exact error)
- [npm Blog: Publishing what you mean to publish](https://blog.npmjs.org/post/165769683050/publishing-what-you-mean-to-publish.html) — MEDIUM confidence (official npm blog, slightly dated but still accurate)
- [Bun: bun publish docs](https://bun.com/docs/pm/cli/publish) — HIGH confidence (official Bun docs, `NPM_CONFIG_TOKEN` behaviour)
