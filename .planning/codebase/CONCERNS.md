# Codebase Concerns

**Analysis Date:** 2026-03-21

## Tech Debt

**HTML Template Injection / XSS Vulnerability:**
- Issue: The `html()` tagged template function in `src/spriggan.js` does not escape HTML entities or sanitize user-provided content. Values are injected raw into the HTML string.
- Files: `src/spriggan.js` (lines 24-53, particularly line 44-46)
- Impact: If user input (or untrusted data) is interpolated directly into `html` templates, attackers can inject malicious HTML/JavaScript. This is unsafe by default in untrusted contexts.
- Example vulnerability:
  ```javascript
  const userName = '<script>alert("xss")</script>';
  html`<div>${userName}</div>` // renders script tag unescaped
  ```
- Fix approach:
  1. Add an explicit note in documentation warning about unsafe-by-default behavior
  2. Provide an optional `escape()` utility function for user input
  3. Consider adding a strict mode flag that enforces escaping
  4. Document secure patterns (use attribute binding with `data-msg` for untrusted data)

**Component Sub-State Pattern Not Designed:**
- Issue: `examples/components.js` (line 61) has a TODO comment indicating the component composition pattern is "just wrong". The file explicitly states "Spriggan is not designed to be used as a 'component' framework" yet shows anti-patterns without clear migration path.
- Files: `examples/components.js` (lines 1-2, 61)
- Impact: Developers may attempt to use component patterns that don't work reliably, leading to buggy applications
- Fix approach: Remove or deprecate `examples/components.js` entirely; replace with clear examples of function-based composition using the `html` helper only

**Event Listener Re-attachment on Every Render:**
- Issue: `attachEventListeners()` in `src/spriggan.js` (lines 259-338) checks `eventListenersAttached` flag but the flag is local to the closure. Each render that produces a string (lines 238, 241, 245) may re-attach listeners even though `innerHTML` assignment detaches them implicitly.
- Files: `src/spriggan.js` (lines 75, 259-338)
- Impact: Memory leak potential if render frequency is high (e.g., every animation frame); event handlers accumulate if listeners aren't properly detached between renders
- Safe modification: Confirm listener detachment happens automatically after `innerHTML` assignment. Consider explicit `removeEventListener` calls before `innerHTML =` to be defensive.
- Test coverage: Event listener cleanup is tested in `__tests__/spriggan.test.js` but only for `destroy()` call, not for intermediate re-renders

**Missing Cleanup on Subscription Errors:**
- Issue: If `subscriptions()` function throws an error during app initialization (line 134), `cleanupFns` array is never populated, but `render()` still completes, leaving subscriptions dangling.
- Files: `src/spriggan.js` (lines 134-139, 146-147)
- Impact: External event listeners set up by subscription functions may not be cleaned up if subscription setup fails partway through
- Fix approach: Wrap subscription setup in try/catch; collect cleanup functions incrementally; ensure partial cleanup if subscription fails

**Debug History Unbounded Memory Growth:**
- Issue: `debugHistory` array (line 79, 654-658) grows indefinitely when debug mode is enabled. Every dispatch adds an entry with no limit or eviction policy.
- Files: `src/spriggan.js` (lines 79, 654-658)
- Impact: Long-running applications with debug mode enabled will accumulate memory proportional to the number of messages dispatched
- Fix approach: Add optional `maxHistory` config parameter; implement circular buffer or LRU eviction; document memory implications of debug mode

**Type-checking Plan Incomplete:**
- Issue: `WORK.md` (lines 60-65) documents a plan to add JSDoc type annotations to eliminate TypeScript errors, but this work is not yet completed. The file has ~51 type violations when run through `mise run typecheck`.
- Files: `src/spriggan.js` (entire file missing comprehensive JSDoc types)
- Impact: Type safety is reduced; IDEs provide limited autocomplete/type checking; developers miss errors at edit time
- Fix approach: Complete JSDoc annotations following the plan outlined in `WORK.md`; run `mise run typecheck` to verify zero errors

## Known Bugs

**Effect Handler Exceptions Swallowed with Console.error Only:**
- Symptoms: If a custom effect handler throws an error, it's caught and logged to console but doesn't halt the app or expose the error to user code.
- Files: `src/spriggan.js` (lines 383-390)
- Trigger: Define a custom effect handler that throws, then dispatch an effect of that type
- Workaround: Manually verify effect handlers don't throw; add try/catch inside custom handler implementations

**JSON.parse in Event Handler Has No Fallback:**
- Symptoms: If `data-msg` attribute contains invalid JSON, `JSON.parse()` throws and the error is logged, but dispatch doesn't occur.
- Files: `src/spriggan.js` (lines 269-274, 308-313)
- Trigger: Manually set `data-msg='not valid json'` on an HTML element, then click it
- Current mitigation: Error is caught and logged; app continues running
- Improvement: Could offer a strict mode that re-throws or provides better error context

**localStorage Exceptions Silently Logged:**
- Symptoms: If `localStorage.setItem()` fails (quota exceeded, private browsing), error is caught and logged with `console.error()` but effect silently fails.
- Files: `src/spriggan.js` (lines 473-497)
- Trigger: Fill localStorage to quota, then try storage effect with action "set"
- Workaround: Monitor console for errors; implement fallback storage mechanism outside Spriggan

## Security Considerations

**User Input in HTML Templates - Critical:**
- Risk: Any user-provided string interpolated into `html` templates can execute arbitrary JavaScript via script injection or DOM-based XSS.
- Files: `src/spriggan.js` (lines 44-46 interpolation), `examples/todo.js`, all example files using `html`
- Current mitigation: None at framework level. Framework is documented as suitable for trusted contexts (LLM output, structured data, examples).
- Recommendations:
  1. Add prominent security warning to README: "Spriggan does not escape HTML; only use with trusted content"
  2. Provide optional `escape()` or `safeHtml()` helper function
  3. Document the secure pattern: bind user input to `data-*` attributes, not HTML body
  4. Consider adding optional strict mode that rejects raw object interpolation in certain positions

**data-msg Parsing Accepts Any JSON:**
- Risk: `JSON.parse()` on untrusted `data-msg` could theoretically execute code if JSON contains `eval()` or similar (though JSON.parse itself is safe). Main risk is application logic accepting malformed messages.
- Files: `src/spriggan.js` (lines 270, 309)
- Current mitigation: Caught try/catch, error logged
- Recommendations: Validate message shape after parsing; consider JSON schema validation for production apps

**HTTP Effect Has No CSRF Protection:**
- Risk: HTTP effect (lines 395-446) sends requests without CSRF tokens or same-origin checks. Suitable for same-origin requests but dangerous if cross-origin requests are made.
- Files: `src/spriggan.js` (lines 420-445)
- Current mitigation: None
- Recommendations: Document CSRF risk; recommend always including CSRF tokens in `headers` option when making POST/PUT/PATCH requests

## Performance Bottlenecks

**Re-rendering Entire View on Every State Change:**
- Problem: `render()` function (lines 211-256) always reconstructs the full view and morphs the entire DOM tree via Idiomorph or `innerHTML` assignment.
- Files: `src/spriggan.js` (lines 211-256, particularly lines 238, 243-244)
- Cause: Framework has no granular update tracking; all state changes trigger full view re-evaluation
- Improvement path:
  1. Profile real applications to identify if this is an actual bottleneck
  2. Consider optional virtual-dom style diffing for large lists
  3. Document when rendering performance becomes a concern (Spriggan is designed for small-to-medium apps)

**Debug Mode Logging Creates Console Spam:**
- Problem: Debug mode logs every dispatch, state change, effect, and render with full console.group/groupEnd overhead.
- Files: `src/spriggan.js` (lines 619-662, 668-672)
- Cause: Comprehensive logging by design, but can overwhelm browsers with many messages per second
- Improvement path:
  1. Add optional `logLevel` config to control verbosity (error, warn, info, debug, trace)
  2. Filter history in debug UI (only show last N entries by default)
  3. Provide debug tool UI that limits console output while preserving history

**Effect Runner Iterates All Effects Synchronously:**
- Problem: When update returns multiple effects, `defaultEffectRunner` is called for each synchronously (lines 199-203). If any effect handler is slow, it blocks the next one.
- Files: `src/spriggan.js` (lines 199-203)
- Cause: No queueing or async batching of effects
- Improvement path:
  1. Profile with multiple concurrent effects to determine if real issue
  2. Consider optional effect batching or queueing
  3. Document that long-running effects should use async handlers (e.g., `fn` effect wrapping a Promise)

## Fragile Areas

**Render Function Assumes rootElement Always Valid:**
- Files: `src/spriggan.js` (lines 211-256)
- Why fragile: `render()` checks `if (!rootElement || !viewFn) return;` but if rootElement is removed from DOM after initialization, subsequent renders operate on a detached node. This could silently fail without warning.
- Safe modification: Add debug warning if `rootElement.parentNode === null` (element removed from DOM)
- Test coverage: No test for scenario where root element is removed mid-app lifecycle

**Effect Handler Registry Mutation Not Protected:**
- Files: `src/spriggan.js` (lines 71, 122)
- Why fragile: `effectHandlers` object is replaced during app initialization but shared reference. If two apps try to modify handlers concurrently, race conditions could occur (though unlikely in single-threaded JS).
- Safe modification: Deep clone handlers object to prevent cross-contamination; document that effects are per-instance
- Test coverage: Multiple instances tested (line 1450+ in tests) but not for handler mutation

**State Diff Comparison Is Shallow:**
- Files: `src/spriggan.js` (lines 680-724)
- Why fragile: `stateDiff()` in debug mode uses `===` comparison (line 704), which fails for nested objects or arrays that change in-place. Developers mutating state objects will see "no changes" in debug output.
- Safe modification: Add deep-equality option or recommend immutable patterns; document shallow comparison behavior
- Test coverage: Tested only with primitive values (line 704); no test for nested object mutations

**DOM Effect Selector Not Validated Early:**
- Files: `src/spriggan.js` (lines 527-538)
- Why fragile: DOM effect silently continues if `selector` doesn't match any element (warns but doesn't fail). If selector is typo'd, effect disappears silently.
- Safe modification: Add strict mode option that throws on missing selector; log selector failures to debug history
- Test coverage: Exists in `__tests__/spriggan-dom.test.js` but only for warning, not for strict mode

## Scaling Limits

**Single Root Element Architecture:**
- Current capacity: One app instance per root element; no built-in mounting multiple apps on same page
- Limit: Breaks at O(n) apps where n = number of elements trying to mount Spriggan instances
- Scaling path:
  1. Document pattern for creating multiple instances (each calls `createSpriggan()` separately)
  2. Consider module-level registry for app lifecycle management if apps need to coordinate

**Debug History Unbounded:**
- Current capacity: Stores every message indefinitely
- Limit: Memory grows ~1-2KB per message (rough estimate), so ~1M messages = 1-2GB
- Scaling path: Implement circular buffer with configurable max size (default 1000); add export/import history feature for analysis

**HTTP Effect Doesn't Handle Concurrent Requests:**
- Current capacity: Fires requests immediately, no cancellation or queue
- Limit: Rapid succession of HTTP effects can lead to race conditions where responses arrive out of order
- Scaling path: Implement request tracking with ID; tag responses with request ID; document request ordering guarantees

## Dependencies at Risk

**Idiomorph Optional Dependency Not Vendored:**
- Risk: If `window.Idiomorph` is not loaded, framework falls back to `innerHTML =` assignment which discards DOM state (focus, selection, animation state)
- Impact: When Idiomorph is not present, app loses morphing benefits; users should be aware
- Migration plan:
  1. Document Idiomorph as optional performance enhancement
  2. Add warning if Idiomorph is recommended but missing
  3. Consider bundling a lightweight DOM morph fallback

**No Version Lock on devDependencies:**
- Risk: `package.json` uses `^` ranges (e.g., `"vitest": "^4.0.18"`) which allow minor/patch upgrades that may introduce breaking changes
- Impact: CI builds may behave differently than local development; tests may fail unexpectedly with new minor versions
- Migration plan: Lock to exact versions in `package-lock.json` or `bun.lock` (already present); document CI process

## Missing Critical Features

**No Form State Binding Utility:**
- Problem: Two-way binding for form inputs requires manual `data-model` binding and FieldChanged dispatch. No helper to simplify pattern.
- Blocks: Rapid form development; developers must write boilerplate for each input field
- Example gap:
  ```javascript
  // No built-in way to do this more concisely:
  view: (state) => html`
    <input data-model="name" value="${state.name}" />
    <input data-model="email" value="${state.email}" />
  `
  ```

**No Built-in Router:**
- Problem: No URL routing support; developers must implement own route handling via subscriptions or query string parsing
- Blocks: Building multi-page SPAs; URL-driven state management
- Workaround: Listen to popstate events in subscriptions; manually manage URL

**No Server-Side Rendering Support:**
- Problem: `Spriggan` assumes browser environment (uses DOM APIs, localStorage, etc.); cannot render on Node.js for SSR
- Blocks: Server-side rendering for SEO or initial page load performance
- Improvement path: Consider isomorphic variant that separates view logic from DOM rendering

**No Time-Travel Reset:**
- Problem: Time-travel debugging allows jumping to past states but not to future states or clearing history
- Blocks: Advanced debugging workflows; state inspection for regression testing
- Fix: Already have `clearHistory()` in `src/spriggan.js` (line 176); add `timeTravel()` reset to jump back to initial state

## Test Coverage Gaps

**Event Listener Detachment on Re-render Not Tested:**
- What's not tested: Whether event listeners are properly removed and re-attached when `innerHTML` changes between renders
- Files: `src/spriggan.js` (lines 259-363), `__tests__/spriggan.test.js`, `__tests__/spriggan-dom.test.js`
- Risk: Memory leak if listeners accumulate; multiple handlers for same event
- Suggested test: Create app, render multiple times with different HTML, verify listener count stays constant

**Subscription Cleanup on App Destroy Not Fully Tested:**
- What's not tested: If subscription returns array of cleanup functions, are ALL called on destroy?
- Files: `src/spriggan.js` (lines 134-147), `__tests__/spriggan.test.js`
- Risk: Partial cleanup leads to lingering event listeners or references
- Suggested test: Multiple subscriptions returning array of cleanup functions; call destroy; verify all cleanup functions called

**XSS Attack Vectors Not Tested:**
- What's not tested: Interpolating user input containing script tags, event handlers, protocol handlers
- Files: `src/spriggan.js` (html function)
- Risk: Security breach if developer assumes framework escapes
- Suggested test: Add explicit XSS test cases in test suite that document unsafe-by-default behavior

**localStorage Quota Exceeded Not Tested:**
- What's not tested: Storage effect behavior when localStorage quota is exceeded
- Files: `src/spriggan.js` (lines 467-498)
- Risk: Silent failure; no way for app to know if write succeeded
- Suggested test: Mock localStorage.setItem to throw "QuotaExceededError"

**Effect Handler Exception Propagation Not Tested:**
- What's not tested: App continues running after effect handler throws; app doesn't expose exception to user code
- Files: `src/spriggan.js` (lines 383-390)
- Risk: Debugging difficult; error appears only in console
- Suggested test: Custom effect handler that throws; verify app continues and error is logged but not re-thrown

---

*Concerns audit: 2026-03-21*
