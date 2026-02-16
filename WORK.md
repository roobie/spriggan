# Spriggan Robustness & DX Review (src/spriggan.js)

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

### 3) Debug mode assumes object state

`stateDiff(oldState, newState)` assumes both are objects; if `init` returns `null` or a primitive, debug mode may throw.

**Impact:** debug mode crashes for non-object state models.

**Status:** Partially mitigated - tests exist but `stateDiff` still iterates without checking types.

### 4) ~~No guard for undefined / invalid update returns~~ ✅ MITIGATED

If `update()` returns `undefined`, state becomes `undefined` silently. Tests cover this behavior.

`view()` returning `undefined` is now handled gracefully in `render()`.

### 5) Effects are not sandboxed

If an effect handler throws, it bubbles into render cycle. `defaultEffectRunner` does not catch handler exceptions.

**Impact:** one faulty effect can crash the whole app.

### 6) HTML template does not escape

`html()` injects values raw, so it's vulnerable to XSS if you pass user content.

**Impact:** unsafe by default in untrusted contexts.

## DX Gaps (Developer Experience)

### 1) ~~Missing warnings for bad view return~~ ✅ MITIGATED

`view()` returning `undefined` is now handled gracefully without crashing.

### 2) Limited lifecycle hooks

Only subscriptions provide cleanup; components with their own listeners must manage cleanup manually.

### 3) Stringly-typed effects

Effect types are simple but typo-prone; malformed effect objects are not validated.

### 4) ~~Debug tools are global~~ ✅ MITIGATED

`window.__SPRIGGAN_DEBUG__` could still collide, but multiple apps now have isolated state via closures. Each debug-enabled app resets the global debug tools.

## Test Coverage

Comprehensive test suite with 63 tests covering:

- `html` tagged template function
- App initialization and config validation
- Dispatch and state updates
- All effect types (http, delay, storage, fn)
- Effect error handling (network errors, unknown types)
- DOM event delegation (click, input, change, submit)
- Debug mode (logging, history, time travel)
- `destroy()` cleanup (DOM, state, event listeners, subscriptions)
- Multiple instances via closure factory
- Edge cases (undefined/null state, non-object state in debug)

## Remaining Improvements

1. **Guard `stateDiff` for non-object states**
   - Check if states are objects before iterating.

2. **Protect effect handlers with try/catch**
   - Wrap handler calls in `defaultEffectRunner` to prevent app crashes.

3. **Document XSS / escaping clearly**
   - Add a prominent note that `html()` doesn't escape.

4. **Consider namespacing debug tools per instance**
   - Store debug tools per-instance rather than on global `window`.
