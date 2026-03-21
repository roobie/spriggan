# Codebase Structure

**Analysis Date:** 2026-03-21

## Directory Layout

```
spriggan/
├── src/                    # Framework source code
│   ├── spriggan.js         # Core framework implementation (750 lines)
│   └── spriggan.d.ts       # TypeScript type definitions
├── examples/               # Complete working applications
│   ├── todo.js             # Todo app with persistence
│   ├── todo.html           # Todo app HTML
│   ├── todo-tailwind.js    # Todo with Tailwind CSS
│   ├── todo-tailwind.html  # Todo Tailwind HTML
│   ├── components.js       # Component composition examples
│   ├── components.html     # Components HTML
│   ├── slideshow/          # Interactive slideshow demo
│   │   ├── slideshow.js    # Slideshow controller
│   │   ├── slides.js       # Slide content definitions
│   │   ├── slideshow.css   # Slideshow styles
│   │   └── index.html      # Entry point
│   ├── slideshow-tw/       # Slideshow with Tailwind
│   │   ├── slideshow.js
│   │   ├── slides.js
│   │   └── index.html
│   └── tea-walkthrough/    # Interactive TEA tutorial
│       ├── walkthrough.js  # Main walkthrough controller
│       ├── sections.js     # Tutorial section definitions
│       ├── walkthrough.css # Tutorial styles
├── __tests__/              # Test suite
│   ├── spriggan.test.js    # Framework core tests
│   └── spriggan-dom.test.js # DOM event tests
├── chronicles/             # Documentation and notes
├── .planning/              # Analysis and planning documents
│   └── codebase/
├── index.html              # Root entry point (loads TEA walkthrough)
├── package.json            # NPM metadata and dev dependencies
├── tsconfig.json           # TypeScript configuration
├── vitest.config.js        # Test runner configuration
├── biome.jsonc             # Code formatter/linter configuration
├── mise.toml               # Task runner configuration
├── LICENSE                 # License file
└── README.md               # Project documentation
```

## Directory Purposes

**src/**
- Purpose: Core framework code shipped to end users
- Contains: JavaScript source module (spriggan.js) and TypeScript declarations (spriggan.d.ts)
- Key files: `src/spriggan.js` is the entire framework; `src/spriggan.d.ts` provides TypeScript support

**examples/**
- Purpose: Complete, runnable applications demonstrating Spriggan patterns
- Contains: HTML entry points, controller modules, slide/content definitions, CSS
- Key files: Each example has at least a .js controller and .html entry point
- Why separate: Examples run standalone in browser; can be served directly or used as references

**__tests__/**
- Purpose: Test suite for framework functionality
- Contains: Vitest test files covering core framework and DOM event handling
- Key files: `spriggan.test.js` tests core behavior; `spriggan-dom.test.js` tests event delegation

**chronicles/**
- Purpose: Documentation, analysis, and planning notes
- Contains: Markdown documents explaining framework concepts and design decisions

**.planning/codebase/**
- Purpose: GSD codebase analysis documents
- Contains: ARCHITECTURE.md, STRUCTURE.md, CONVENTIONS.md, TESTING.md, CONCERNS.md (as generated)

## Key File Locations

**Entry Points:**
- `src/spriggan.js`: Framework core; default export is createSpriggan factory
- `examples/*/index.html`: Each example's HTML entry point (loads scripts and mounts #app)
- `index.html`: Root entry point serving TEA walkthrough demo

**Configuration:**
- `tsconfig.json`: TypeScript compilation (allowJs, checkJs, strict mode)
- `vitest.config.js`: Test runner using jsdom environment
- `biome.jsonc`: Code formatting (2-space indent) and linting
- `package.json`: Dev dependencies (vitest, typescript, prettier, eslint, biome, fast-check)

**Core Logic:**
- `src/spriggan.js` lines 24-53: html() template function
- `src/spriggan.js` lines 59-183: app() initialization and factory
- `src/spriggan.js` lines 186-209: dispatch() message handling
- `src/spriggan.js` lines 211-256: render() pipeline
- `src/spriggan.js` lines 259-338: attachEventListeners() event delegation
- `src/spriggan.js` lines 370-391: defaultEffectRunner()
- `src/spriggan.js` lines 393-613: Built-in effect handlers (http, delay, storage, fn, dom)

**Testing:**
- `__tests__/spriggan.test.js`: Tests for html(), app(), dispatch, state updates, effects, subscriptions
- `__tests__/spriggan-dom.test.js`: Tests for click, input, change, submit event handling and data-msg parsing

## Naming Conventions

**Files:**
- JavaScript modules: camelCase (e.g., `slideshow.js`, `walkthrough.js`)
- Type definitions: uppercase .d.ts (e.g., `spriggan.d.ts`)
- Test files: `.test.js` suffix (e.g., `spriggan.test.js`)
- CSS files: lowercase with hyphens (e.g., `slideshow.css`, `walkthrough.css`)
- HTML entry points: `index.html` in example directories

**Directories:**
- Source code: lowercase (src)
- Tests: double underscore prefix (__tests__)
- Examples: lowercase with hyphens for multi-word names (slideshow-tw, tea-walkthrough)
- Planning: hidden directory prefix (. for .planning)

**Code Symbols:**
- Functions: camelCase (app, dispatch, render, attachEventListeners, defaultEffectRunner)
- Types: PascalCase in JSDoc and .d.ts (Message, Effect, AppConfig, State)
- Constants: camelCase or UPPERCASE_SNAKE_CASE (defaultEffects, isDebugMode)
- Private module variables: prefixed with _ (e.g., _currentView, _dispatch)

## Where to Add New Code

**New Feature:**
- Primary code: Add update cases to the example's update function (e.g., in `examples/todo.js`)
- Tests: Add test cases to `__tests__/spriggan.test.js` or `__tests__/spriggan-dom.test.js`
- Pattern: Follow message-driven update pattern (switch on msg.type, return new state or [state, ...effects])

**New Example Application:**
- Implementation: Create new directory under `examples/` (e.g., `examples/my-app/`)
- Files needed:
  - `my-app/index.html` - HTML entry point with #app div, script imports
  - `my-app/my-app.js` - Controller with init, update, view functions
  - Optional: `my-app/styles.css` for custom styling
- Pattern: See `examples/slideshow/` or `examples/tea-walkthrough/` for structure

**Utilities or Helpers:**
- Shared helpers: Create in `src/spriggan.js` if general framework concern
- Application-specific helpers: Define in the example application file (e.g., `examples/todo.js` defines init, update, view)
- No separate utils directory; keep related code co-located

**Custom Effects:**
- Definition: In application code, pass to app() via config.effects
- Location: Define in same file as application (e.g., in `examples/todo.js` before calling app())
- Pattern: Register handler function with signature `(effect, dispatch) => void`
- Example: See HTTP effect in todo.js (lines 150-165 of README patterns)

**New Tests:**
- Unit tests: Add describe/it blocks to `__tests__/spriggan.test.js`
- DOM tests: Add to `__tests__/spriggan-dom.test.js` if testing event delegation
- Pattern: Use beforeEach to create Spriggan instance, vi.mock for dependencies (fetch, localStorage)

## Special Directories

**node_modules/:**
- Purpose: NPM dependencies
- Generated: Yes (npm install / bun install)
- Committed: No (in .gitignore)
- Contains: Dev tools (vitest, typescript, eslint, prettier, biome, fast-check, jsdom)

**dist/:**
- Purpose: Built distribution bundle (if generated)
- Generated: Yes (via esbuild or similar, not in repo)
- Committed: No
- Note: CDN bundle would live here after build step

**.git/:**
- Purpose: Git version control metadata
- Generated: Yes (git init)
- Committed: No
- Location: Hidden directory at root

**.sigil/:**
- Purpose: Internal GSD context storage
- Generated: Yes
- Committed: No (in .gitignore)

---

*Structure analysis: 2026-03-21*
