# Architecture

**Analysis Date:** 2026-03-21

## Pattern Overview

**Overall:** The Elm Architecture (TEA) - A unidirectional data flow framework for building interactive applications with pure functions and immutable state updates.

**Key Characteristics:**
- Unidirectional message-driven state updates
- Pure functions for state transitions (no side effects in update)
- Effects are data descriptors, not direct actions
- Event delegation for DOM manipulation
- Type-safe message dispatch with typed payloads
- Optional debug mode with time-travel and message history

## Layers

**Application Layer (User Code):**
- Purpose: Implement concrete applications using Spriggan
- Location: `examples/`, user application files
- Contains: init, update, view functions; message types; effect handlers
- Depends on: Spriggan core (`src/spriggan.js`)
- Used by: Nothing (top layer)

**Framework Core:**
- Purpose: Manage state flow, rendering, event handling, effect execution
- Location: `src/spriggan.js`
- Contains: app() initialization, dispatch mechanism, render pipeline, event delegation
- Depends on: Browser DOM APIs, localStorage, fetch, setTimeout
- Used by: Application code via createSpriggan()

**Effect System:**
- Purpose: Execute side effects declared in update function returns
- Location: `src/spriggan.js` (defaultEffectRunner, defaultEffects)
- Contains: http, delay, storage, fn, dom built-in effects; custom effect handlers
- Depends on: Framework core, application-provided handlers
- Used by: Framework core after update() returns

**Template Engine:**
- Purpose: Generate HTML strings from template literals
- Location: `src/spriggan.js` (html function)
- Contains: String concatenation, value interpolation, special handling for Messages
- Depends on: Nothing (pure function)
- Used by: View functions to generate HTML markup

## Data Flow

**Message Dispatch and Render Cycle:**

1. User interaction triggers event listener (click, input, change, submit)
2. Event listener extracts Message from data-msg or data-model attribute
3. dispatch(msg) is called with the Message
4. update(state, msg) is invoked to compute new state
5. If update returns [newState, ...effects], state updates and effects queue
6. render() is called to regenerate view with new state
7. Idiomorph (if available) morphs DOM, else replaces innerHTML
8. Event listeners are reattached to new or updated DOM
9. If effects exist, runEffectFn invokes each effect handler
10. Effect handlers may dispatch new messages, triggering cycle again

**State Management:**

- All state lives in a single state object, managed by the framework
- State is accessed via getState() or internally during render
- State updates are isolated: only update() modifies state
- No automatic property tracking; model structure is explicit in init

## Key Abstractions

**Message:**
- Purpose: Describes a user action or external event as a data structure
- Examples: `{ type: "ClickCounter" }`, `{ type: "FieldChanged", field: "name", value: "Alice" }`
- Pattern: Plain object with mandatory `type` string and optional payload properties
- Type definition: `src/spriggan.d.ts` lines 40-44

**Effect:**
- Purpose: Data descriptor for side effects to be executed after state update
- Examples: `{ type: "http", url: "/api/data", onSuccess: "DataLoaded" }`, `{ type: "delay", ms: 3000, msg: {...} }`
- Pattern: Plain object with `type` string matching a registered handler
- Built-in types: http, delay, storage, fn, dom (defined in `src/spriggan.js` lines 393-613)
- Custom effects: User registers additional handlers via AppConfig.effects

**Update Function:**
- Purpose: Compute new state and declare effects in response to a message
- Signature: `(state: T, msg: Message) => T | [T, ...Effect[]]`
- Pattern: Switch on msg.type to handle different message cases
- Returns either new state alone, or tuple of [newState, ...effects]
- Examples: `examples/todo.js` (lines 96+), `examples/slideshow/slideshow.js` (lines 50+)

**View Function:**
- Purpose: Render current state to HTML string or DOM node
- Signature: `(state: T, dispatch: Dispatch) => string | Node`
- Pattern: Conditional rendering with html`` template, onClick handlers encode messages in data-msg
- Examples: All examples use html`` tagged template for declarative markup

## Entry Points

**Application Initialization:**
- Location: `src/spriggan.js` lines 59-183 (app function)
- Triggers: User calls `const appInstance = app(selector, config)`
- Responsibilities:
  - Validate selector finds an HTMLElement
  - Parse and store init state (invoke if function)
  - Wire up update, view, effect handlers, subscriptions
  - Perform initial render
  - Return API object (dispatch, getState, destroy, optional debug)

**Render Pipeline:**
- Location: `src/spriggan.js` lines 211-256 (render function)
- Triggers: Called after state update, or manually if needed
- Responsibilities:
  - Invoke view function with current state and dispatch
  - Choose morph strategy: Idiomorph (if available) or innerHTML
  - Reattach event listeners after DOM change
  - Log timing in debug mode

**Event Delegation:**
- Location: `src/spriggan.js` lines 259-338 (attachEventListeners)
- Triggers: After initial render and after each re-render
- Responsibilities:
  - Attach click, input, change, submit listeners to root element
  - Delegate to single handler per event type
  - Parse data-msg attributes to extract Message payloads
  - Support two-way binding via data-model on form inputs
  - Dispatch extracted messages

## Error Handling

**Strategy:** Graceful degradation with logging. Framework catches effect handler errors; application responsible for update validation.

**Patterns:**

- **Message validation** (dispatch, line 186-190): Warn if msg lacks type property
- **Effect handler errors** (defaultEffectRunner, line 383-390): Try/catch each handler, log to console.error
- **HTTP errors** (defaultEffects.http, line 420-445): Return either response.json() or response.text(); HTTP status check on response.ok
- **Storage errors** (defaultEffects.storage, line 495-497): Try/catch localStorage operations
- **DOM parsing errors** (attachEventListeners, line 269-273, 308-313): Try/catch JSON.parse of data-msg
- **Selector not found** (app, line 114-116): Throw synchronously with clear error message

## Cross-Cutting Concerns

**Logging:**
- Framework logs to console in debug mode (enabled via config.debug)
- Debug wrapper (debugUpdate, debugEffectRunner) logs messages, state diffs, timing
- Effect logging indicates effect type and completion time
- Application can use console directly; no structured logging framework

**Validation:**
- Message structure validated only on dispatch (type check)
- State shape is implicit from init; no runtime validation
- Effect structure validated on execution (handler lookup by type)
- Application responsible for update function correctness

**Authentication:**
- No built-in authentication
- HTTP effect supports custom headers for bearer tokens
- Application manages credentials in state or via subscriptions

---

*Architecture analysis: 2026-03-21*
