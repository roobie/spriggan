# Feature Landscape: npm/JSR Package Publishing

**Domain:** JavaScript framework package publishing (npm + JSR dual-registry)
**Project:** @bjro/spriggan — single-file, zero-dep TEA framework
**Researched:** 2026-03-21

---

## Table Stakes

Features consumers and tooling expect. Missing = package feels broken or unpublishable.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| `name` + `version` in package.json | npm/Bun refuse to publish without them | Low | Scope `@bjro/spriggan`, start at `0.1.0` or `1.0.0` |
| `exports` map in package.json | Replaces `main`; required for ESM encapsulation and TypeScript resolution | Low | `{ ".": { "types": "...", "default": "..." } }` |
| `files` array in package.json | Controls what lands in the published tarball; omitting it ships `node_modules`, test files, etc. | Low | List `["src/spriggan.js", "src/spriggan.d.ts"]` — no build step needed |
| `"type": "module"` in package.json | Already set; signals ESM. Required for `.js` files to be treated as ESM by Node | Low | Already present |
| TypeScript declaration file (.d.ts) | Without it, TypeScript users see `any` everywhere; most consumers require types | Low | `src/spriggan.d.ts` already exists but is handwritten — must verify it's complete and matches the JS surface |
| `publishConfig.access: "public"` | Scoped npm packages default to private; omitting this causes publish to fail with a billing error | Low | Required for `@bjro/` scope |
| LICENSE file | npm warns; JSR scoring penalizes; consumers and legal teams check; missing is a blocker for enterprise use | Low | MIT licence file must be present at repo root |
| README.md | Displayed on npmjs.com and jsr.io package pages; no README = package looks abandoned | Low | Already exists; review completeness |
| `description` field in package.json | Used in npm search ranking and JSR discoverability scoring; blank = zero discoverability | Low | One sentence description |
| `repository` field in package.json | Links npmjs.com page back to GitHub source; standard expectation for open source | Low | `{ "type": "git", "url": "https://github.com/roobie/spriggan" }` |
| `jsr.json` configuration | Required by JSR publish CLI; without it `npx jsr publish` fails | Low | Needs `name`, `version`, `exports` |
| `/* @ts-self-types="./spriggan.d.ts" */` directive in JS source | JSR cannot auto-generate types from plain JS. Without this, JSR npm compatibility layer produces `any` types and package score is penalised | Low | Single comment at top of `src/spriggan.js` |
| Tag-triggered GitHub Actions publish (npm) | Without automation, publishing is error-prone manual work | Medium | Needs `id-token: write` permission and npm 11.5.1+ for OIDC trusted publishing |
| Tag-triggered GitHub Actions publish (JSR) | JSR publish from CI uses OIDC — no secrets to rotate | Low | `npx jsr publish` with `id-token: write`; link repo in JSR package settings |
| Tests + lint gate before publish | Prevents shipping broken code; npm/JSR do not validate code correctness | Low | Already exists (Vitest + Biome); add as `needs:` dependency in publish workflow |

---

## Differentiators

Features that improve quality and discoverability beyond bare minimum. Not blockers, but worth the small investment.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| npm provenance statement (`--provenance` flag) | Links published tarball to the exact GitHub Actions run and commit that produced it; consumers can verify supply-chain integrity. Becoming standard security practice post-2025 attacks | Low | Add `--provenance` to `npm publish` command in workflow. Requires OIDC trusted publishing (already recommended) |
| `keywords` array in package.json | Improves npm search results. "elm architecture", "tea", "unidirectional", "mvc", "frontend" are relevant terms | Low | 5–8 keywords; direct tradeoff: takes 5 minutes, permanently improves findability |
| `engines.node` field | Prevents installation on unsupported Node versions; communicates support intent clearly | Low | Spriggan has no Node API usage so range can be permissive, e.g. `">=18"` |
| `sideEffects: false` in package.json | Tells bundlers (Webpack, Rollup, esbuild) the package is tree-shakeable; improves consumer bundle size in apps that import only part of the API | Low | Safe for Spriggan — the package has no global side effects at import time |
| `homepage` field in package.json | Links npmjs.com page to project homepage or repo; quick trust signal for evaluators | Low | Can point to GitHub repo README or a docs page |
| `bugs` field in package.json | Direct link to issue tracker on npm package page; reduces friction for users who hit problems | Low | `{ "url": "https://github.com/roobie/spriggan/issues" }` |
| JSR scoring checklist completeness | JSR shows a public score. High score (documentation, best practices, compatibility) increases trust and search ranking | Medium | Score factors: README, JSDoc coverage, no slow types, provenance, runtime compatibility tags |
| JSDoc `@module` tag in source | Drives JSR's module-level documentation; shows as package description on the JSR docs page, above symbol listings | Low | Add `/** @module @bjro/spriggan ... */` at top of `src/spriggan.js` |
| `CHANGELOG.md` | Consumers want to know what changed between versions; absence is a friction point for adoption decisions | Low | Start with a single entry for the first published version; format: Keep a Changelog |
| Version tag naming convention documented | `v*` pattern is assumed in PROJECT.md, but should be explicit in CONTRIBUTING or README so future contributors don't push `1.0.0` and wonder why CI doesn't publish | Low | One-liner in README under "Releasing" |

---

## Anti-Features

Features to deliberately NOT build for this milestone.

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| UMD / CommonJS dual build | Already out of scope per PROJECT.md. Adds a build step, tooling complexity, and the "dual package hazard" (two copies of the module loaded). Modern tooling handles ESM natively. | ESM only; `"type": "module"` is already set |
| Automated version bumping (semantic-release, changesets) | Adds significant tooling overhead and opinionated commit message conventions. Manual tag push is simpler and already decided | Push `vX.Y.Z` tag manually to trigger publish |
| Bundling / minification step | Spriggan is a single ~750-line source file; bundling adds complexity with zero benefit. Consumers' bundlers handle this. | Publish source file directly |
| TypeScript source rewrite | Spriggan already has a handwritten `.d.ts` and JSDoc annotations. Converting to TS would require a build step and change the "no build tools" characteristic | Keep JS source + `.d.ts` |
| CDN/unpkg auto-publish | Out of scope per PROJECT.md. Requires UMD build. ESM via CDN (`esm.sh`, `jspm`) works without special configuration. | ESM consumers can use `esm.sh/@bjro/spriggan` without action from the author |
| npm access token secrets (long-lived) | Classic npm tokens deprecated for automation post-November 2025. 90-day granular tokens require manual rotation. | Use OIDC trusted publishing (no secrets) |
| Automated changelog generation | Requires conventional commit discipline the project doesn't have yet; adds ceremony. | Write CHANGELOG.md entries manually when tagging |
| Monorepo / workspace setup | This is a single-package repo. Workspace tooling would add overhead with no benefit. | Stay single-package |

---

## Feature Dependencies

```
npm trusted publishing (OIDC)
  requires: npm package settings on npmjs.com linked to GitHub repo
  requires: id-token: write permission in GitHub Actions workflow
  requires: npm >= 11.5.1 in CI

JSR trusted publishing (OIDC)
  requires: JSR package settings linked to GitHub repo
  requires: id-token: write permission in GitHub Actions workflow

npm provenance
  depends on: npm trusted publishing (OIDC is required for provenance)

TypeScript declaration .d.ts accuracy
  blocks: exports map types condition (types: field must point to a valid file)
  blocks: JSR @ts-self-types directive (same file)

tests + lint gate
  must precede: publish jobs in workflow (use jobs.<job>.needs)

version in package.json + jsr.json
  must stay in sync (two sources of truth; update both when tagging)
```

---

## MVP Recommendation

For the first published version, prioritize in this order:

1. **package.json metadata** — `name`, `version`, `description`, `exports`, `files`, `publishConfig`, `repository`, `homepage`, `bugs`, `keywords`, `sideEffects`, `engines`
2. **Verify/complete `src/spriggan.d.ts`** — must cover the full public API before types condition in exports is useful
3. **`/* @ts-self-types */` directive** — enables JSR type generation from the JS source
4. **`jsr.json`** — minimum: name, version, exports
5. **LICENSE file** — if not already present at repo root
6. **npm publish workflow** (OIDC trusted publishing) — tag-triggered, with test/lint gate, `--provenance`
7. **JSR publish workflow** — tag-triggered, with test/lint gate
8. **`--provenance` flag** — zero extra work once OIDC publish is set up

Defer to a follow-up:
- `CHANGELOG.md` — valuable but not a publish blocker; start it after first release
- JSR scoring polish (full JSDoc coverage, `@module` tag) — improves discoverability but doesn't block publishing

---

## Sources

- JSR publishing docs: https://jsr.io/docs/publishing-packages (HIGH confidence — official docs)
- JSR package configuration reference: https://jsr.io/docs/package-configuration (HIGH confidence — official docs)
- JSR about slow types: https://jsr.io/docs/about-slow-types (HIGH confidence — official docs)
- JSR scoring: https://jsr.io/docs/scoring (HIGH confidence — official docs)
- Node.js publishing guide: https://nodejs.org/en/learn/modules/publishing-a-package (HIGH confidence — official docs)
- package.json exports field guide: https://hirok.io/posts/package-json-exports (MEDIUM confidence — verified against Node.js docs)
- npm trusted publishing / OIDC: https://nickradford.dev/blog/npm-trusted-publishing-and-github-actions (MEDIUM confidence — December 2025 post, consistent with npm docs navigation)
- npm provenance docs: https://docs.npmjs.com/generating-provenance-statements (MEDIUM confidence — page loaded via crawl4ai; content visible from nav structure, not body)
- npm supply chain / token deprecation: multiple sources, November 2025 (MEDIUM confidence — multiple independent sources agree)
- Snyk modern npm package guide: https://snyk.io/blog/best-practices-create-modern-npm-package/ (MEDIUM confidence — WebFetch)
