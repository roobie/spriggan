# Coding Conventions

**Analysis Date:** 2026-03-21

## Naming Patterns

**Files:**
- Use lowercase with hyphens for multi-word filenames: `spriggan.js`, `spriggan-dom.test.js`
- Test files use `.test.js` suffix (colocated in `__tests__/` directory)
- Examples organized by feature: `examples/todo.js`, `examples/slideshow/slideshow.js`

**Functions:**
- Use camelCase for all function names: `createSpriggan`, `attachEventListeners`, `dispatch`, `render`
- Prefix internal helper functions with similar camelCase: `detachEventListeners`, `defaultEffectRunner`
- Handler functions use descriptive camelCase: `handlers.click`, `handlers.input`, `handlers.change`, `handlers.submit`

**Variables:**
- Use camelCase for all variable names: `currentState`, `rootElement`, `updateFn`, `viewFn`, `effectHandlers`
- Use leading underscore for private/internal variables when needed: `_currentView`, `_dispatchMock`
- Use CONSTANT_CASE for module-level configuration that appears static
- Array variables often use plural or descriptive names: `debugHistory`, `cleanupFns`, `effects`

**Types:**
- Use PascalCase for type definitions: `Message`, `Dispatch`, `Effect`, `EffectHandler`, `EffectRunner`, `SubscriptionFn`
- Typedef comments use JSDoc format with `@typedef` annotations
- Complex union types documented as separate typedef blocks for clarity
- Generic object types include bracket notation for index signatures: `Record<string, EffectHandler>`

## Code Style

**Formatting:**
- Biome formatter with 2-space indentation (specified in `biome.jsonc`)
- EditorConfig enforces UTF-8, LF line endings, final newlines, trailing whitespace trimming
- Space indent style with indent size of 2 for all code files

**Linting:**
- Biome linter with recommended rules enabled (`biome.jsonc`)
- No ESLint configuration — project uses Biome as the unified linter/formatter
- TypeScript strict mode enabled with `checkJs: true` for JS type checking

**Markup:**
- HTML templates use template literals (backticks) for conditional content
- String interpolation for dynamic values within HTML templates
- Message objects in HTML attributes stringified as JSON with single quotes: `data-msg='{"type":"Click"}'`

## Import Organization

**Order:**
1. Framework/utility imports from external libraries (`import fc from "fast-check"`)
2. Vitest utilities and functions (`import { afterEach, beforeEach, describe, expect, it, vi }`)
3. Global/setup mocks and configuration (global.fetch, global.console)
4. Application code imports (`import createSpriggan from "../src/spriggan"`)

**Path Aliases:**
- Configured alias `@src/*` maps to `./src/*` in `tsconfig.json`
- Relative imports use standard patterns: `import createSpriggan from "../src/spriggan"`
- Most code uses relative imports rather than the `@src/` alias

## Error Handling

**Patterns:**
- Validation checks throw `Error` with descriptive messages at entry points: `throw new Error("Spriggan: init, update, and view are required")`
- Invalid element selectors throw with message format: `throw new Error('Spriggan: element "${selector}" not found')`
- JSON parse errors caught with try-catch, logged to console: `catch (err) { console.error("Spriggan: failed to parse data-msg", err) }`
- Dispatch with invalid messages triggers console warning: `console.warn("Spriggan: dispatch called with invalid message", msg)`
- DOM effects that fail to find elements trigger console warning: `console.warn('Spriggan: dom effect - element not found: "#nonexistent"')`
- Unknown effect actions trigger console warning: `console.warn('Spriggan: dom effect - unknown action "unknownAction"')`

## Logging

**Framework:** `console` (native, not a separate logging library)

**Patterns:**
- Debug mode adds prefix: `[Spriggan]` for all console messages
- Error cases use `console.error()` with descriptive context
- Warnings use `console.warn()` for non-fatal issues (missing elements, invalid actions)
- Info logging uses `console.log()` with debug context when `debug: true`
- Performance timing logged when debug enabled: `[Spriggan] Render took X.XXms`
- State changes logged in debug mode: `[Spriggan] Initialized with state:`, `[Spriggan] Time traveled to state:`

## Comments

**When to Comment:**
- JSDoc comments on all exported functions with `@param` and `@returns` annotations
- Section headers use separators: `// ========================================================================`
- Model, Update, View sections explicitly marked in examples
- Inline comments explain non-obvious logic or special cases
- Comments explain why, not what (code structure is self-evident)

**JSDoc/TSDoc:**
- All public functions documented with full JSDoc blocks including param types and return types
- Complex type definitions documented with `@typedef` blocks
- Conditional logic documented with `@type` casts for TypeScript type narrowing: `/** @type {HTMLElement} */ (e.target)`

## Function Design

**Size:** Functions are kept concise, typically 10-30 lines for core logic. Longer functions (50+ lines) break related concerns into named helper functions.

**Parameters:** Functions accept explicit parameters with type annotations in JSDoc. Complex configuration objects passed as single parameter object with destructuring.

**Return Values:** Functions return values directly or as tuples `[newState, ...effects]` for multi-value returns. Effects are optional in return array.

## Module Design

**Exports:**
- Default export for main factory function: `export default function createSpriggan()`
- Named exports for utilities: `export function html(strings, ...values)`
- Single responsibility per module file

**Barrel Files:** Not used. Imports reference specific functions from source files directly.

---

*Convention analysis: 2026-03-21*
