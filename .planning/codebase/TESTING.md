# Testing Patterns

**Analysis Date:** 2026-03-21

## Test Framework

**Runner:**
- Vitest 4.0.18 - configured in `vitest.config.js`
- Config: `vitest.config.js` - sets environment to "jsdom"

**Assertion Library:**
- Native Vitest `expect()` API

**Run Commands:**
```bash
mise run test         # Run all tests (uses: bunx vitest run --reporter verbose)
mise run check        # Run all checks including tests
```

## Test File Organization

**Location:**
- Tests colocated in `__tests__/` directory at project root
- Pattern: `__tests__/spriggan.test.js`, `__tests__/spriggan-dom.test.js`
- NOT colocated with source files (separate `__tests__/` folder)

**Naming:**
- Test files use `.test.js` suffix
- Descriptive test file names matching primary module: `spriggan.test.js` (core), `spriggan-dom.test.js` (DOM-specific)

**Structure:**
```
__tests__/
├── spriggan.test.js        # Core framework tests (html, app, dispatch, effects)
└── spriggan-dom.test.js    # DOM integration tests (event delegation, DOM effects)
```

## Test Structure

**Suite Organization:**
```javascript
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Global mocks setup
global.fetch = vi.fn();
global.localStorage = { /* mock methods */ };
global.console = { /* mock methods */ };

describe("Feature/Module Name", () => {
  let Spriggan;  // Module instance variable

  beforeEach(() => {
    // Setup: spy/mock window methods
    vi.spyOn(window, "requestAnimationFrame").mockImplementation((cb) => cb());

    // Reset DOM
    document.body.innerHTML = "";

    // Reset all mocks
    vi.clearAllMocks();

    // Create fresh instance
    Spriggan = createSpriggan();
  });

  afterEach(() => {
    // Cleanup: restore mocked methods
    window.requestAnimationFrame.mockRestore();
  });

  describe("nested feature", () => {
    it("should do something specific", () => {
      // Arrange
      const state = { count: 0 };

      // Act
      const result = operation(state);

      // Assert
      expect(result).toEqual(expected);
    });
  });
});
```

**Patterns:**
- Setup: `beforeEach()` initializes fresh instance, clears DOM, resets all mocks
- Teardown: `afterEach()` restores spied methods
- Assertion: `expect()` with matchers like `toEqual()`, `toBe()`, `toHaveBeenCalledWith()`

## Mocking

**Framework:** Vitest built-in mocking with `vi` object

**Patterns:**
```javascript
// Global mocks setup before importing tested code
global.fetch = vi.fn();
global.localStorage = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};

// Method spying with return value mocking
vi.spyOn(window, "requestAnimationFrame").mockImplementation((cb) => cb());

// Return value mocking
global.fetch.mockImplementation(() =>
  Promise.resolve({
    ok: true,
    headers: { get: (name) => "application/json" },
    json: () => ({ data: "test" }),
  }),
);

// Fake timers for async testing
vi.useFakeTimers();
vi.runOnlyPendingTimers();
vi.useRealTimers();

// Reset mocks between tests
vi.clearAllMocks();
mock.mockReset();
mock.mockRestore();
```

**What to Mock:**
- Window API methods: `requestAnimationFrame`, `fetch`, `localStorage`, `console`
- DOM environment setup for jsdom testing
- Async operations (fetch, timers) to control timing in tests

**What NOT to Mock:**
- DOM manipulation methods (querySelector, innerHTML, appendChild)
- Event creation and dispatching (new Event(), dispatchEvent())
- Application dispatch() and update() logic — test these directly
- State management — verify state changes directly through getState()

## Fixtures and Factories

**Test Data:**
```javascript
// Simple state objects
const initState = { count: 0 };

// Message objects for dispatching
const msg = { type: "increment" };
const msgWithPayload = { type: "setItem", id: 42, value: "test" };

// App initialization config
const appConfig = {
  init: () => ({ count: 0 }),
  update: (state, msg) => {
    if (msg.type === "Increment") {
      return { count: state.count + 1 };
    }
    return state;
  },
  view: (state) => `<div>Count: ${state.count}</div>`,
};
```

**Location:**
- Test data created inline in test blocks using helper objects
- No separate fixtures file — data kept near tests for readability
- Reusable config objects defined at describe block scope

## Coverage

**Requirements:** Not enforced (no coverage threshold configured in vitest.config.js)

**View Coverage:**
```bash
bunx vitest run --coverage
```

Current coverage includes:
- Core html function (template literal handling)
- App initialization and configuration
- Dispatch and state updates
- Effects system (http, delay, dom)
- Event delegation (click, input, change, submit)
- DOM effects (focus, blur, addClass, removeClass, etc.)

## Test Types

**Unit Tests:**
- Scope: Individual functions like `html()` template tag, `dispatch()` message handling
- Approach: Test with pure inputs/outputs, mock external dependencies
- Example: `spriggan.test.js` - html interpolation, message validation, state updates

**Integration Tests:**
- Scope: Interaction between components (app initialization, dispatch, render, effects)
- Approach: Test full workflows with real DOM and mocked external APIs (fetch, timers)
- Example: `spriggan-dom.test.js` - event delegation, DOM effect execution, HTML rendering

**E2E Tests:**
- Framework: Not used — Vitest jsdom tests serve as integration coverage

## Common Patterns

**Async Testing:**
```javascript
it("should call focus on element when found", async () => {
  // Setup
  const appApi = Spriggan.app("#app", {
    init: () => ({}),
    update: (state, msg) => {
      if (msg.type === "Focus") {
        return [
          state,
          { type: "dom", action: "focus", selector: "#target" },
        ];
      }
      return state;
    },
    view: () => "",
  });

  // Dispatch async action
  appApi.dispatch({ type: "Focus" });

  // Wait for async completion
  await vi.waitFor(() => {
    expect(focusCalled).toBe(true);
  });
});
```

**Error Testing:**
```javascript
it("should handle malformed data-msg JSON gracefully", () => {
  // Setup
  document.body.innerHTML = '<div id="app"></div>';
  const appApi = Spriggan.app("#app", {
    init: () => ({ count: 0 }),
    update: (state, msg) => {
      if (msg.type === "Click") {
        return { count: state.count + 1 };
      }
      return state;
    },
    view: () => "<button data-msg='{invalid json}'>Click</button>",
  });

  // Act
  const button = document.querySelector("#app button");
  button.click();

  // Assert error was logged
  expect(console.error).toHaveBeenCalledWith(
    "Spriggan: failed to parse data-msg",
    expect.any(Error),
  );

  // Assert state unchanged on error
  expect(appApi.getState()).toEqual({ count: 0 });
});
```

**DOM Event Simulation:**
```javascript
it("should handle submit events and prevent default", () => {
  // Create and setup form
  document.body.innerHTML = '<div id="app"></div>';
  const appApi = Spriggan.app("#app", {
    init: () => ({ submitted: false }),
    update: (state, msg) => {
      if (msg.type === "Submit") {
        return { submitted: true };
      }
      return state;
    },
    view: () =>
      '<form data-msg=\'{"type":"Submit"}\'><button type="submit">Go</button></form>',
  });

  // Dispatch DOM event
  const form = document.querySelector("#app form");
  const event = new Event("submit", { bubbles: true, cancelable: true });
  form.dispatchEvent(event);

  // Assert preventDefault was called
  expect(event.defaultPrevented).toBe(true);
  expect(appApi.getState()).toEqual({ submitted: true });
});
```

**Mock Return Values:**
```javascript
// Test HTTP success response
global.fetch.mockImplementation(() =>
  Promise.resolve({
    ok: true,
    headers: {
      get: (name) =>
        name === "Content-Type" ? "application/json" : null,
    },
    json: () => ({ data: "test" }),
  }),
);

// Test HTTP error response
global.fetch.mockImplementation(() =>
  Promise.resolve({
    ok: false,
    status: 404,
    statusText: "Not Found",
  }),
);
```

---

*Testing analysis: 2026-03-21*
