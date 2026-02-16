# Spriggan Robustness & DX Review (src/spriggan.mjs)

## Strengths

- **Clear TEA-style core**: `init → update → view` flow is minimal and easy to reason about.
- **Pure update pattern**: Effects are separated cleanly, and `[state, effect...]` is simple to follow.
- **Event delegation**: Only one set of listeners attached to the root; avoids per-element handlers.
- **Debug mode**: Helpful logging + history + time travel aids developer experience.
- **Effect handler registry**: Easy to extend effects without modifying core.
- **Closure-based architecture**: Each `Spriggan()` call returns an independent instance.

## Robustness Gaps (Potential Failure Modes)

### 1) ~~Event listeners aren't removed on `destroy()`~~ ✅ FIXED

Event listeners are now stored in `boundEventHandlers` and properly removed via `detachEventListeners()` when `destroy()` is called.

### 2) ~~Single global app instance~~ ✅ FIXED

Framework now uses a `closure()` factory function. Each call to `Spriggan()` returns a fresh instance with its own isolated state.

### 3) ~~Debug mode assumes object state~~ ✅ FIXED

`stateDiff(oldState, newState)` now guards for non-object states. If either state is not an object (primitives, null, undefined), it reports a simple value change instead of iterating.

### 4) ~~No guard for undefined / invalid update returns~~ ✅ FIXED

In debug mode, `update()` returning `undefined` now triggers a warning: `[Spriggan] update() returned undefined - this may be unintentional`.

`view()` returning `undefined` is handled gracefully in `render()`.

### 5) ~~Effects are not sandboxed~~ ✅ FIXED

Effect handlers are now wrapped in try/catch in `defaultEffectRunner`. If an effect throws, the error is logged and the app continues running.

### 6) HTML template does not escape

`html()` injects values raw, so it's vulnerable to XSS if you pass user content.

**Impact:** unsafe by default in untrusted contexts.

## DX Gaps (Developer Experience)

### 1) ~~Missing warnings for bad view return~~ ✅ MITIGATED

`view()` returning `undefined` is now handled gracefully without crashing.

### 2) Limited lifecycle hooks

Only subscriptions provide cleanup; components with their own listeners must manage cleanup manually.

### 3) Stringly-typed effects ✅ MITIGATED (one can pass a Msg object directly, but the usage pattern is not enforced)

Effect types are simple but typo-prone; malformed effect objects are not validated.

### 4) ~~Debug tools are global~~ ✅ FIXED

Debug tools are now instance-scoped on the app API (`appApi.debug.history`, `appApi.debug.timeTravel()`, `appApi.debug.clearHistory()`). Only present when `debug: true` is set.

## Type Checking Plan

Running `mise run typecheck` revealed 51 TypeScript errors in `src/spriggan.js`, primarily due to implicit `any` types, missing type references, and unknown properties. These stem from JavaScript lacking explicit typing. The plan is to add JSDoc type annotations to the JS file, referencing types from `src/spriggan.d.ts` (e.g., `State`, `Message`, `Dispatch`).

**Goal**: Eliminate all type violations while keeping the file as JS. No code changes beyond JSDoc comments.

**Scope**: Focus on `src/spriggan.js`; ignore external libs (e.g., Idiomorph types assumed available).

**Effort Estimate**: Medium (2-3 hours). ~50 JSDoc additions, grouped by function/variable.

### Analysis of Violations
Grouped by error type (from `mise run typecheck` output):

- **Missing Type References**: `State`, `Idiomorph` (need imports or declarations).
- **Implicit `any` Variables/Parameters**: ~40 cases (e.g., function params like `msg`, `dispatch`).
- **Unknown Object Properties**: Config object properties (e.g., `init`, `update`).
- **Other**: Missing types on closures, DOM elements.

### Proposed Fixes
Add JSDoc comments with `@type`, `@param`, `@typedef` where needed. Reference `.d.ts` types.

#### 1. **Global/Type Imports (Top of File)**
   - Add `// @ts-check` if not present.
   - Import types: `/** @typedef {import('./spriggan.d.ts').State} State */` (but adjust for generics).
   - Declare missing globals: `/** @typedef {typeof Idiomorph} Idiomorph */` (assume available).

#### 2. **Function/Variable Type Annotations**
   - For each implicit `any`, add `@type` or `@param`.
   - Examples:
     - Line 46: `/** @type {State} */ const state = ...`
     - Line 150: `/** @param {Message} msg */`
     - Line 113: `/** @type {HTMLElement} */ const rootElement = ...`

#### 3. **Object Property Access**
   - For config object: Use `@type {AppConfig}` on the config param.
   - Example: `/** @param {AppConfig} config */ function app(selector, config)`

#### 4. **DOM/Effect Handler Types**
   - DOM elements: `/** @type {HTMLElement} */`
   - Effect handlers: `/** @param {Effect} effect */`, `/** @param {Dispatch} dispatch */`

#### 5. **Generic Types**
   - Where generics are used (e.g., `T`, `M`), use JSDoc generics: `/** @template T, M extends Message */`

### Implementation Steps
1. **Add Top-Level Type Declarations** (5 min): Add @ts-check and typedefs for missing types.
2. **Annotate Closures/Variables** (30 min): Go through each error line, add @type comments.
3. **Annotate Function Parameters** (30 min): Add @param for functions with implicit params.
4. **Annotate Config/Object Access** (30 min): Type config objects and property access.
5. **Re-run Typecheck** (10 min): Verify fixes; iterate on remaining errors.

### Tradeoffs & Risks
- **Pros**: Enables type checking without converting to TS; improves dev experience.
- **Cons**: Verbose JSDoc; potential conflicts with .d.ts if types mismatch.
- **Risks**: Over-typing could mask real issues; ensure .d.ts is accurate.
- **Alternatives**: Convert to .ts (full rewrite) or disable strict checks.

### Success Criteria
- `mise run typecheck` passes with 0 errors.
- File remains .js; no runtime changes.
- Types align with .d.ts definitions.

### References
- Type violations from `mise run typecheck` output.
- Types defined in `src/spriggan.d.ts`.
- JSDoc syntax: https://jsdoc.app/tags-type.html.

## Test Coverage

Comprehensive test suite with 83 tests covering:

- `html` tagged template function (including message object stringify)
- App initialization and config validation
- Dispatch and state updates
- All effect types (http, delay, storage, fn)
- Effect error handling (network errors, unknown types, sandboxing)
- Debug mode warnings for undefined update returns
- DOM event delegation (click, input, change, submit)
- Debug mode (logging, history, time travel)
- `destroy()` cleanup (DOM, state, event listeners, subscriptions)
- Multiple instances via closure factory
- Edge cases (undefined/null state, non-object state in debug)

**Property-based tests** (fast-check):

- `html` function with arbitrary strings, numbers, arrays, messages
- State transitions with random messages
- Effect handling with random effect types

## Remaining Improvements

1. **Document XSS / escaping clearly**
   - Add a prominent note that `html()` doesn't escape.
