# Technology Stack

**Analysis Date:** 2026-03-21

## Languages

**Primary:**
- JavaScript (ES2020+) - Core framework implementation (`src/spriggan.js`)
- HTML5 - Examples and demo pages
- CSS3 - Styling for examples

**Secondary:**
- TypeScript - Type checking via JSDoc and tsconfig
- JSDoc - Type annotations within JavaScript files

## Runtime

**Environment:**
- Browser (modern, with ES2020 module support)
- Node.js (for development tooling, not required for production)

**Package Manager:**
- Bun 1.3 - Primary package manager
- Lockfile: `bun.lock` (present)

## Frameworks

**Core:**
- Spriggan (custom) - The Elm Architecture-inspired framework (`src/spriggan.js`)
  - No dependencies, pure vanilla JavaScript
  - 750-line core implementation
  - Built for vanilla HTML/JS environments

**Testing:**
- Vitest 4.0.18 - Test runner with jsdom environment (`vitest.config.js`)
- fast-check 4.5.3 - Property-based testing library

**Build/Dev:**
- TypeScript 5.9.3 - Type checking
- Biome 2.4.0 - Linter and formatter
- Prettier 3.8.1 - Code formatting (deprecated in favor of Biome)
- ESLint 10.0.0 - Code linting
- jsdom 28.1.0 - DOM environment for testing

## Key Dependencies

**Critical:**
- None - Spriggan has zero runtime dependencies

**Infrastructure (Dev Only):**
- Vitest - Unit testing framework with jsdom support
- fast-check - Property-based testing
- Biome - Code quality tooling (replaces Prettier + ESLint)

**Examples Only:**
- showdown - Markdown converter (used in `examples/todo.js` for rendering)
- idiomorph 0.7.4 - DOM morphing library for efficient rendering (optional, CDN-loaded)

## Configuration

**Environment:**
- `.env` files: Not used (no secrets or environment variables required)
- Configuration is primarily code-based via config objects passed to `app()`

**Build:**
- `tsconfig.json` - TypeScript compiler options:
  - Module: NodeNext
  - Target: esnext
  - Strict mode enabled
  - JSX: react-jsx (for type checking)
  - Path alias: `@src/*` → `./src/*`
  - No build output (noEmit: true)

**Development:**
- `vitest.config.js` - Test runner configured with jsdom environment
- `biome.jsonc` - Unified linter and formatter configuration:
  - Recommended linter rules enabled
  - Space indentation, width 2
  - Excludes useweft files
- `.editorconfig` - Editor settings:
  - UTF-8 charset
  - LF line endings
  - 2-space indentation for code files
  - Trim trailing whitespace
- `mise.toml` - Task runner and tool versions:
  - bun 1.3
  - watchexec 2

## Build & Run Scripts

Located in `mise.toml`:

```bash
mise run install-deps    # bun install
mise run fmt             # biome format --write
mise run test            # vitest run --reporter verbose
mise run lint            # biome lint
mise run tidy            # biome check --write (includes install, fmt, test, lint)
mise run typecheck       # tsc --noEmit
mise run qa              # lint + typecheck
mise run check           # install-deps + tidy + lint
mise run serve           # HTTP server for development (python -m http.server)
```

## Platform Requirements

**Development:**
- Node.js/Bun runtime
- Unix-like shell for mise task runner
- Modern browser for testing and demos

**Production:**
- Modern browser with ES2020 module support
- No server-side infrastructure required (client-side only)
- Optional: Static HTTP server for serving modules

**Examples & Demos:**
- Static HTTP server (for ES module imports)
  - Python: `python -m http.server`
  - Node: `npx http-server`
  - Mise: `mise run serve`

## Tooling Summary

| Tool | Version | Purpose |
|------|---------|---------|
| Bun | 1.3 | Package manager |
| TypeScript | 5.9.3 | Type checking |
| Vitest | 4.0.18 | Testing |
| Biome | 2.4.0 | Linting + formatting |
| Prettier | 3.8.1 | Code formatting (legacy) |
| ESLint | 10.0.0 | Code linting (legacy) |
| jsdom | 28.1.0 | DOM testing environment |
| fast-check | 4.5.3 | Property testing |

---

*Stack analysis: 2026-03-21*
