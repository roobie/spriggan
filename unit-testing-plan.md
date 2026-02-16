# Unit Testing Plan for Spriggan Framework (src/spriggan.js)

## Overview

Spriggan is a minimal TEA-inspired framework for building web applications with pure functions. This plan outlines a comprehensive unit testing strategy to ensure reliability, maintainability, and correctness of the framework's core functionality.

## Architecture Analysis

The framework consists of several key components:

- **Core API**: `app()`, `dispatch()`, `html()` - Public interfaces
- **State Management**: State initialization, updates, and effects processing
- **Rendering**: DOM manipulation with Idiomorph or innerHTML fallback
- **Event Handling**: Delegated event listeners for user interactions
- **Effects System**: Built-in handlers for HTTP, delay, storage, and custom functions
- **Debug Mode**: Logging, history tracking, and time travel functionality

## Testing Strategy

### Testing Framework

- Use **Vitest** (compatible with Bun runtime)
- Configure with **jsdom** for DOM API mocking
- Use **msw** (Mock Service Worker) for HTTP request mocking
- Enable code coverage reporting

### Test Categories

#### 1. Pure Functions

- `html()` tagged template literal
- `stateDiff()` utility
- Effect handlers (logic without side effects)

#### 2. State Management

- State initialization from `init`
- `update()` function calls with various messages
- Effect processing and dispatching

#### 3. Rendering

- Initial render on app startup
- Re-renders after state changes
- DOM manipulation (innerHTML vs Idiomorph)
- Event listener attachment

#### 4. Event Handling

- Click events with `data-msg`
- Input/change events with `data-model`
- Form submission events

#### 5. Effects System

- HTTP effects (success/error scenarios)
- Delay effects (setTimeout mocking)
- Storage effects (localStorage mocking)
- Custom function effects

#### 6. Debug Mode

- Logging output verification
- History tracking
- Time travel functionality

### Mocking Strategy

- **DOM**: Use jsdom to provide `document`, `window`, `Element` APIs
- **HTTP**: Mock `fetch` globally or use msw
- **Timers**: Mock `setTimeout` with Vitest's timer utilities
- **Storage**: Mock `localStorage` with a simple in-memory implementation
- **Idiomorph**: Mock or skip if not available

### Test Structure

```
__tests__/
├── spriggan.test.js          # Main test suite
├── html.test.js              # Pure function tests
├── effects.test.js           # Effect handler tests
├── rendering.test.js         # DOM rendering tests
├── events.test.js            # Event handling tests
└── debug.test.js             # Debug mode tests
```

## Implementation Plan

### Phase 1: Setup (2-4 hours)

- Install Vitest, jsdom, msw
- Configure test environment in package.json or vite.config.js
- Create basic test file structure
- Setup global mocks for DOM APIs

### Phase 2: Pure Functions (4-6 hours)

- Test `html()` with various inputs (strings, arrays, nulls, booleans)
- Test `stateDiff()` with different state objects
- Test effect handler logic in isolation

### Phase 3: State Management (6-8 hours)

- Test `app()` initialization with valid/invalid configs
- Test `dispatch()` with simple messages
- Test update function wrapping in debug mode
- Test effect processing pipeline

### Phase 4: Rendering & Events (8-10 hours)

- Test initial render after app init
- Test re-render after dispatch
- Test event listener attachment
- Test delegated event handling (click, input, change, submit)
- Test with/without Idiomorph

### Phase 5: Effects (6-8 hours)

- Test HTTP effects (GET/POST, success/error)
- Test delay effects
- Test storage effects (set/get/remove)
- Test custom function effects

### Phase 6: Debug Mode (4-6 hours)

- Test debug logging output
- Test state history tracking
- Test time travel functionality
- Test debug tools setup

### Phase 7: Integration & Coverage (4-6 hours)

- Add integration tests combining multiple features
- Ensure 80%+ code coverage
- Test error handling and edge cases
- Performance testing for render/update cycles

## Success Criteria

- All public APIs (`app`, `html`) are fully tested
- Core functionality (state updates, rendering, effects) has >90% coverage
- Error conditions and edge cases are covered
- Tests run reliably in CI/CD pipeline
- Debug mode doesn't break production functionality

## Risks & Mitigations

- **DOM Mocking Complexity**: Use established jsdom setup, test against real browser if needed
- **Async Effects**: Use Vitest's async utilities and proper cleanup
- **Global State**: Reset state between tests to avoid interference
- **Idiomorph Dependency**: Mock when not available, test both code paths

## Dependencies

- Bun runtime for test execution
- Existing project structure and conventions
- No external services required (all mocked)

## Effort Estimate

Total: 34-46 hours across 7 phases

- Setup: 2-4h
- Pure functions: 4-6h
- State management: 6-8h
- Rendering & Events: 8-10h
- Effects: 6-8h
- Debug mode: 4-6h
- Integration: 4-6h

## Next Steps

1. Review and approve this plan
2. Set up testing infrastructure
3. Begin implementation with Phase 1
4. Regular check-ins and adjustments based on findings
