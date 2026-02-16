# 🌿 Spriggan

**A tiny, elegant framework inspired by The Elm Architecture—no build tools, pure functions, built for humans and LLMs alike.**

```html
<script src="https://unpkg.com/spriggan/dist/spriggan.min.js"></script>
<script>
  const { app, html } = Spriggan;

  app("#root", {
    init: { count: 0 },
    update: (state, msg) =>
      msg.type === "Inc" ? { count: state.count + 1 } : state,
    view: (state, dispatch) => html`
      <div>
        <h1>${state.count}</h1>
        <button data-msg='{"type":"Inc"}'>+</button>
      </div>
    `,
  });
</script>
```

**That's it. No compilation. No configuration. Just functions and data.**

---

## Elevator Pitch

Spriggan is a **75-line core** framework that brings The Elm Architecture to vanilla JavaScript. It's designed for:

- **Prototyping** – Drop a `<script>` tag and start building
- **Teaching** – Three concepts: Model, Update, View
- **AI pair programming** – LLMs understand it instantly (no JSX, no hooks, no magic)
- **Maintainability** – Pure functions, unidirectional data flow, zero surprises

If you've ever felt that modern frontend development has too many moving parts, Spriggan is for you.

---

## Rationale

### The Problem

Modern JavaScript frameworks are powerful, but they come with costs:

- **Build complexity** – Webpack, Vite, Babel, TypeScript configs
- **Abstraction overload** – Virtual DOM, reconciliation, reactivity systems
- **Learning curves** – Hooks, lifecycle methods, context providers, state management libraries
- **LLM friction** – AI assistants struggle with framework-specific patterns and build errors

### The Spriggan Philosophy

**Simplicity over features.** Spriggan prioritizes:

1. **No build tooling** – One `<script>` tag, works everywhere
2. **Pure functions** – `update(state, msg) => newState` is testable, predictable, debuggable
3. **Explicit over implicit** – No hidden reactivity, no magic bindings
4. **Progressive enhancement** – Mix with vanilla JS, eject anytime
5. **LLM-native** – Declarative patterns that AI assistants excel at generating

### Why The Elm Architecture?

[The Elm Architecture](https://guide.elm-lang.org/architecture/) (TEA) has proven itself as one of the most elegant patterns for building UIs:

- **Unidirectional data flow** – Events flow one way: `msg → update → state → view → DOM`
- **No component state** – All state lives in one place
- **Effects as data** – Side effects are described, not executed
- **Time-travel debugging** – Every state transition is a pure function call

Spriggan brings this elegance to JavaScript without the compilation step.

---

## Quick Start

### Installation

# TODO

**Via CDN:**

```html
<script src="https://unpkg.com/spriggan/dist/spriggan.min.js"></script>
```

# TODO

**Via npm:**

```bash
npm install spriggan
```

# TODO

```javascript
import { app, html } from "spriggan";
```

### Your First App

```html
<!DOCTYPE html>
<html>
  <head>
    <meta charset="UTF-8" />
    <title>Counter</title>
  </head>
  <body>
    <div id="app"></div>

    <script src="spriggan.js"></script>
    <script>
      const { app, html } = Spriggan;

      // 1. Model - Your application state
      const init = { count: 0 };

      // 2. Update - How state changes in response to messages
      function update(state, msg) {
        switch (msg.type) {
          case "Increment":
            return { count: state.count + 1 };
          case "Decrement":
            return { count: state.count - 1 };
          case "Reset":
            return init;
          default:
            return state;
        }
      }

      // 3. View - How state is rendered
      function view(state, dispatch) {
        return html`
          <div>
            <h1>Count: ${state.count}</h1>
            <button data-msg='{"type":"Increment"}'>+</button>
            <button data-msg='{"type":"Decrement"}'>-</button>
            <button data-msg='{"type":"Reset"}'>Reset</button>
          </div>
        `;
      }

      // 4. Wire it up
      app("#app", { init, update, view });
    </script>
  </body>
</html>
```

---

## Walkthrough: Building a Todo App

Let's build something more substantial to see Spriggan's patterns in action.

### The Model

```javascript
const init = {
  todos: [],
  input: "",
  filter: "all", // 'all' | 'active' | 'completed'
  nextId: 1,
};
```

State is just plain objects. No observables, no proxies, no magic.

### The Update Function

```javascript
function update(state, msg) {
  switch (msg.type) {
    case "FieldChanged":
      return { ...state, [msg.field]: msg.value };

    case "AddTodo":
      if (!state.input.trim()) return state;

      return {
        ...state,
        todos: [
          ...state.todos,
          {
            id: state.nextId,
            text: state.input,
            done: false,
          },
        ],
        input: "",
        nextId: state.nextId + 1,
      };

    case "ToggleTodo":
      return {
        ...state,
        todos: state.todos.map((todo) =>
          todo.id === msg.id ? { ...todo, done: !todo.done } : todo,
        ),
      };

    case "DeleteTodo":
      return {
        ...state,
        todos: state.todos.filter((todo) => todo.id !== msg.id),
      };

    case "SetFilter":
      return { ...state, filter: msg.filter };

    case "SaveTodos":
      // Return state AND an effect
      return [
        state,
        {
          type: "storage",
          action: "set",
          key: "spriggan-todos",
          value: state.todos,
        },
      ];

    default:
      return state;
  }
}
```

**Key insight:** Update functions return either:

- `newState` – Just update state
- `[newState, effect1, effect2, ...]` – Update state and run side effects

### The View Function

```javascript
function view(state, dispatch) {
  const filtered = filterTodos(state.todos, state.filter);

  return html`
    <div>
      <h1>Todos</h1>

      <!-- Input field with data-model for two-way binding -->
      <input
        type="text"
        data-model="input"
        value="${state.input}"
        placeholder="What needs to be done?"
      />
      <button data-msg='{"type":"AddTodo"}'>Add</button>

      <!-- Filters -->
      <div>
        ${["all", "active", "completed"].map(
          (f) => html`
            <button
              data-msg='{"type":"SetFilter","filter":"${f}"}'
              style="${state.filter === f ? "font-weight: bold;" : ""}"
            >
              ${f}
            </button>
          `,
        )}
      </div>

      <!-- Todo list -->
      ${filtered.map(
        (todo) => html`
          <div id="todo-${todo.id}" style="${todo.done ? "opacity: 0.5;" : ""}">
            <input
              type="checkbox"
              ${todo.done ? "checked" : ""}
              data-msg='{"type":"ToggleTodo","id":${todo.id}}'
            />
            <span>${todo.text}</span>
            <button data-msg='{"type":"DeleteTodo","id":${todo.id}}'>
              Delete
            </button>
          </div>
        `,
      )}

      <!-- Stats -->
      <p>${state.todos.filter((t) => !t.done).length} items left</p>
      <button data-msg='{"type":"SaveTodos"}'>Save</button>
    </div>
  `;
}

function filterTodos(todos, filter) {
  switch (filter) {
    case "active":
      return todos.filter((t) => !t.done);
    case "completed":
      return todos.filter((t) => t.done);
    default:
      return todos;
  }
}
```

### Bootstrap with Subscriptions

```javascript
app("#app", {
  init,
  update,
  view,
  debug: true, // Enable time-travel debugging

  // Subscribe to external events
  subscriptions: (dispatch) => {
    // Auto-save on Ctrl+S
    const handleKeydown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "s") {
        e.preventDefault();
        dispatch({ type: "SaveTodos" });
      }
    };

    document.addEventListener("keydown", handleKeydown);

    // Return cleanup function
    return () => document.removeEventListener("keydown", handleKeydown);
  },
});
```

---

## Core Concepts

### 1. Messages (Actions)

Messages are plain objects that describe what happened:

```javascript
{ type: 'ButtonClicked' }
{ type: 'FieldChanged', field: 'email', value: 'user@example.com' }
{ type: 'UserLoaded', data: { name: 'Alice', age: 30 } }
```

**Convention:** Use PascalCase for message types.

### 2. The Update Function

Pure function: `(state, msg) => newState | [newState, ...effects]`

```javascript
function update(state, msg) {
  switch (msg.type) {
    case "Increment":
      return { ...state, count: state.count + 1 };

    case "FetchData":
      return [
        { ...state, loading: true },
        { type: "http", url: "/api/data", onSuccess: "DataLoaded" },
      ];

    default:
      return state;
  }
}
```

**Rules:**

- Never mutate state directly
- Return new state objects
- Keep it synchronous—use effects for async operations

### 3. Effects

Effects are descriptions of side effects, not the effects themselves:

```javascript
// HTTP request
{
  type: 'http',
  url: '/api/users',
  method: 'POST',
  body: { name: 'Alice' },
  onSuccess: 'UserCreated',
  onError: 'UserCreationFailed'
}

// Delay
{
  type: 'delay',
  ms: 1000,
  msg: { type: 'TimerExpired' }
}

// LocalStorage
{
  type: 'storage',
  action: 'set',
  key: 'user-preferences',
  value: { theme: 'dark' }
}

// Custom function (escape hatch)
{
  type: 'fn',
  run: () => console.log('Hello!'),
  onComplete: 'LogComplete'
}
```

### 4. Event Handling

Spriggan uses **event delegation** with `data-msg` attributes:

```javascript
// Click events
<button data-msg='{"type":"Save"}'>Save</button>

// With payload
<button data-msg='{"type":"Delete","id":${item.id}}'>Delete</button>

// Form inputs (automatic with data-model)
<input type="text" data-model="email" value="${state.email}" />

// Checkboxes
<input type="checkbox" data-model="agreed" ${state.agreed ? 'checked' : ''} />
```

The framework automatically dispatches:

- `click` events on elements with `data-msg`
- `input` events on elements with `data-model` (as `FieldChanged` messages)
- `change` events for checkboxes and selects
- `submit` events on forms

### 5. List Rendering with Stable IDs

When rendering lists, **always provide unique `id` attributes**:

```javascript
${items.map(item => html`
  <div id="item-${item.id}">
    ${item.name}
  </div>
`)}
```

This enables efficient DOM diffing when using [Idiomorph](https://github.com/bigskysoftware/idiomorph):

```html
<script src="https://unpkg.com/idiomorph@0.7.4/dist/idiomorph.min.js"></script>
<script src="https://unpkg.com/spriggan/dist/spriggan.min.js"></script>
```

Without Idiomorph, Spriggan falls back to `innerHTML` replacement (still works, just less efficient).

---

## Full API Reference

### `app(selector, config)`

Initialize a Spriggan application.

**Parameters:**

| Parameter              | Type                 | Required | Description                                           |
| ---------------------- | -------------------- | -------- | ----------------------------------------------------- |
| `selector`             | `string`             | ✅       | CSS selector for root element (e.g., `'#app'`)        |
| `config.init`          | `Object \| Function` | ✅       | Initial state or function returning initial state     |
| `config.update`        | `Function`           | ✅       | `(state, msg) => newState \| [newState, ...effects]`  |
| `config.view`          | `Function`           | ✅       | `(state, dispatch) => html`                           |
| `config.effects`       | `Object`             | ❌       | Custom effect handlers `{ effectType: handler }`      |
| `config.effectRunner`  | `Function`           | ❌       | Custom effect runner (for middleware/logging)         |
| `config.subscriptions` | `Function`           | ❌       | `(dispatch) => cleanup \| [cleanups]`                 |
| `config.debug`         | `boolean`            | ❌       | Enable debug mode with time-travel (default: `false`) |

**Returns:** `{ dispatch, getState, destroy }`

**Example:**

```javascript
const myApp = app("#root", {
  init: { count: 0 },
  update: (state, msg) => {
    if (msg.type === "Inc") return { count: state.count + 1 };
    return state;
  },
  view: (state, dispatch) => html`<h1>${state.count}</h1>`,
  debug: true,
});

// Interact programmatically
myApp.dispatch({ type: "Inc" });
console.log(myApp.getState()); // { count: 1 }
myApp.destroy(); // Cleanup
```

---

### `html` (Tagged Template Literal)

Create HTML strings with embedded values.

**Usage:**

```javascript
html`<div>${value}</div>`;
```

**Features:**

- **Array flattening:** `${[item1, item2]}` joins automatically
- **Null/undefined handling:** `${null}` renders as empty string
- **Boolean attributes:** `${condition ? 'checked' : ''}` works as expected

**Example:**

```javascript
const items = ["Apple", "Banana", "Cherry"];

html`
  <ul>
    ${items.map((item) => html`<li>${item}</li>`)}
  </ul>
`;
```

---

### Built-in Effects

#### HTTP Effect

```javascript
{
  type: 'http',
  url: string,              // Required
  method: string,           // Optional, default: 'GET'
  body: Object,             // Optional, will be JSON.stringify'd
  headers: Object,          // Optional, merged with default headers
  onSuccess: string,        // Optional, message type to dispatch on success
  onError: string          // Optional, message type to dispatch on error
}
```

**Example:**

```javascript
case 'FetchUser':
  return [
    { ...state, loading: true },
    {
      type: 'http',
      url: '/api/user/123',
      onSuccess: 'UserLoaded',
      onError: 'UserFailed'
    }
  ];

case 'UserLoaded':
  return { ...state, loading: false, user: msg.data };

case 'UserFailed':
  return { ...state, loading: false, error: msg.error };
```

#### Delay Effect

```javascript
{
  type: 'delay',
  ms: number,               // Required
  msg: Object              // Required, message to dispatch after delay
}
```

**Example:**

```javascript
case 'ShowNotification':
  return [
    { ...state, notification: msg.text },
    {
      type: 'delay',
      ms: 3000,
      msg: { type: 'HideNotification' }
    }
  ];
```

#### Storage Effect

```javascript
{
  type: 'storage',
  action: 'get' | 'set' | 'remove',  // Required
  key: string,                        // Required
  value: any,                         // Required for 'set'
  onSuccess: string                  // Optional
}
```

**Example:**

```javascript
case 'SaveSettings':
  return [
    state,
    {
      type: 'storage',
      action: 'set',
      key: 'user-settings',
      value: state.settings
    }
  ];

case 'LoadSettings':
  return [
    state,
    {
      type: 'storage',
      action: 'get',
      key: 'user-settings',
      onSuccess: 'SettingsLoaded'
    }
  ];

case 'SettingsLoaded':
  return { ...state, settings: msg.data || defaultSettings };
```

#### Function Effect (Escape Hatch)

```javascript
{
  type: 'fn',
  run: Function,            // Required, function to execute
  onComplete: string       // Optional, message type to dispatch with result
}
```

**Example:**

```javascript
case 'CopyToClipboard':
  return [
    state,
    {
      type: 'fn',
      run: () => navigator.clipboard.writeText(state.shareUrl),
      onComplete: 'CopiedToClipboard'
    }
  ];
```

---

### Custom Effects

Define your own effect handlers:

```javascript
const customEffects = {
  // Notification effect
  notify: (effect, dispatch) => {
    const { message, type = "info", duration = 3000 } = effect;

    const notification = document.createElement("div");
    notification.className = `notification notification-${type}`;
    notification.textContent = message;
    document.body.appendChild(notification);

    setTimeout(() => {
      notification.remove();
    }, duration);
  },

  // WebSocket effect
  websocket: (effect, dispatch) => {
    const { url, onMessage, onError } = effect;
    const ws = new WebSocket(url);

    ws.onmessage = (e) => {
      if (onMessage) {
        dispatch({ type: onMessage, data: JSON.parse(e.data) });
      }
    };

    ws.onerror = (e) => {
      if (onError) {
        dispatch({ type: onError, error: e });
      }
    };
  },

  // Analytics effect
  analytics: (effect, dispatch) => {
    const { event, properties } = effect;

    if (window.gtag) {
      window.gtag("event", event, properties);
    }
  },
};

app("#app", {
  init,
  update,
  view,
  effects: customEffects,
});
```

**Usage in update:**

```javascript
case 'FormSubmitted':
  return [
    { ...state, submitted: true },
    { type: 'notify', message: 'Form submitted!', type: 'success' },
    { type: 'analytics', event: 'form_submit', properties: { form: 'contact' } }
  ];
```

---

### Subscriptions

Subscribe to external events that aren't triggered by your UI:

```javascript
subscriptions: (dispatch) => {
  // Window events
  const handleResize = () => {
    dispatch({
      type: "WindowResized",
      width: window.innerWidth,
      height: window.innerHeight,
    });
  };
  window.addEventListener("resize", handleResize);

  // WebSocket
  const ws = new WebSocket("ws://localhost:8080");
  ws.onmessage = (e) => {
    dispatch({ type: "MessageReceived", data: JSON.parse(e.data) });
  };

  // Intervals
  const timer = setInterval(() => {
    dispatch({ type: "Tick" });
  }, 1000);

  // Keyboard shortcuts
  const handleKeydown = (e) => {
    if (e.ctrlKey && e.key === "s") {
      e.preventDefault();
      dispatch({ type: "Save" });
    }
  };
  document.addEventListener("keydown", handleKeydown);

  // Return cleanup function(s)
  return [
    () => window.removeEventListener("resize", handleResize),
    () => ws.close(),
    () => clearInterval(timer),
    () => document.removeEventListener("keydown", handleKeydown),
  ];
};
```

---

### Debug Mode

Enable debug mode for development:

```javascript
app("#app", {
  init,
  update,
  view,
  debug: true, // or: debug: process.env.NODE_ENV === 'development'
});
```

**Features:**

- **Console logging** – Every dispatch shows message, state diff, and timing
- **Performance tracking** – Measure update and render performance
- **Time-travel debugging** – Access via `window.__SPRIGGAN_DEBUG__`

**Debug API:**

```javascript
// In browser console:
__SPRIGGAN_DEBUG__.getState(); // Get current state
__SPRIGGAN_DEBUG__.dispatch(msg); // Dispatch a message
__SPRIGGAN_DEBUG__.history; // View all state transitions
__SPRIGGAN_DEBUG__.timeTravel(5); // Jump to state at index 5
__SPRIGGAN_DEBUG__.clearHistory(); // Clear history
```

**Example output:**

```
[Spriggan] Dispatch: AddTodo
  Message: {type: "AddTodo"}
  Previous state: {todos: [], input: "Buy milk", nextId: 1}
  New state: {todos: [{…}], input: "", nextId: 2}
  Changes: [
    {key: "todos", from: [], to: [{…}]},
    {key: "input", from: "Buy milk", to: ""},
    {key: "nextId", from: 1, to: 2}
  ]
  Update took 0.23ms
[Spriggan] Render took 1.45ms
```

---

### Custom Effect Runners

Replace or wrap the default effect runner for middleware-like behavior:

```javascript
// Logging effect runner
function loggingEffectRunner(effect, dispatch, handlers) {
  console.log("[Effect]", effect);

  // Call default runner
  Spriggan.defaultEffectRunner(effect, dispatch, handlers);
}

// Batching effect runner
function batchingEffectRunner(effect, dispatch, handlers) {
  if (Array.isArray(effect)) {
    effect.forEach((eff) => {
      Spriggan.defaultEffectRunner(eff, dispatch, handlers);
    });
  } else {
    Spriggan.defaultEffectRunner(effect, dispatch, handlers);
  }
}

// Compose runners
function composeEffectRunners(...runners) {
  return (effect, dispatch, handlers) => {
    runners.forEach((runner) => runner(effect, dispatch, handlers));
  };
}

app("#app", {
  init,
  update,
  view,
  effectRunner: composeEffectRunners(loggingEffectRunner, batchingEffectRunner),
});
```

---

## Patterns & Best Practices

### Component Pattern

Spriggan doesn't have "components" in the React sense—just functions that return HTML:

```javascript
function Button({ text, msg, variant = "primary" }) {
  return html`
    <button class="btn btn-${variant}" data-msg="${JSON.stringify(msg)}">
      ${text}
    </button>
  `;
}

function view(state, dispatch) {
  return html`
    <div>
      ${Button({ text: "Save", msg: { type: "Save" } })}
      ${Button({
        text: "Cancel",
        msg: { type: "Cancel" },
        variant: "secondary",
      })}
    </div>
  `;
}
```

### Form Handling

```javascript
// State
const init = {
  form: {
    name: "",
    email: "",
    agreed: false,
  },
  errors: {},
};

// Update
function update(state, msg) {
  switch (msg.type) {
    case "FieldChanged":
      return {
        ...state,
        form: { ...state.form, [msg.field]: msg.value },
      };

    case "SubmitForm":
      const errors = validateForm(state.form);
      if (Object.keys(errors).length > 0) {
        return { ...state, errors };
      }

      return [
        { ...state, submitting: true },
        {
          type: "http",
          url: "/api/submit",
          method: "POST",
          body: state.form,
          onSuccess: "FormSubmitted",
          onError: "FormError",
        },
      ];

    default:
      return state;
  }
}

// View
function view(state, dispatch) {
  return html`
    <form data-msg='{"type":"SubmitForm"}'>
      <input
        type="text"
        data-model="form.name"
        value="${state.form.name}"
        placeholder="Name"
      />
      ${state.errors.name
        ? html`<span class="error">${state.errors.name}</span>`
        : ""}

      <input
        type="email"
        data-model="form.email"
        value="${state.form.email}"
        placeholder="Email"
      />
      ${state.errors.email
        ? html`<span class="error">${state.errors.email}</span>`
        : ""}

      <label>
        <input
          type="checkbox"
          data-model="form.agreed"
          ${state.form.agreed ? "checked" : ""}
        />
        I agree to terms
      </label>

      <button type="submit" ${state.submitting ? "disabled" : ""}>
        ${state.submitting ? "Submitting..." : "Submit"}
      </button>
    </form>
  `;
}
```

### Nested State Updates

For deeply nested state, use helper functions:

```javascript
function updateIn(state, path, fn) {
  const keys = path.split('.');
  const lastKey = keys.pop();

  let current = state;
  const parents = [];

  for (const key of keys) {
    parents.push({ obj: current, key });
    current = current[key];
  }

  let updated = { ...current, [lastKey]: fn(current[lastKey]) };

  while (parents.length > 0) {
    const { obj, key } = parents.pop();
    updated = { ...obj, [key]: updated };
  }

  return updated;
}

// Usage
case 'UpdateUserCity':
  return updateIn(state, 'user.address.city', () => msg.city);
```

### Loading States

```javascript
const init = {
  data: null,
  status: "idle", // 'idle' | 'loading' | 'success' | 'error'
};

function update(state, msg) {
  switch (msg.type) {
    case "FetchData":
      return [
        { ...state, status: "loading" },
        {
          type: "http",
          url: "/api/data",
          onSuccess: "DataLoaded",
          onError: "DataFailed",
        },
      ];

    case "DataLoaded":
      return { ...state, status: "success", data: msg.data };

    case "DataFailed":
      return { ...state, status: "error", error: msg.error };

    default:
      return state;
  }
}

function view(state, dispatch) {
  if (state.status === "loading") {
    return html`<div class="spinner">Loading...</div>`;
  }

  if (state.status === "error") {
    return html`<div class="error">Error: ${state.error}</div>`;
  }

  if (state.status === "success") {
    return html`<div>${renderData(state.data)}</div>`;
  }

  return html`<button data-msg='{"type":"FetchData"}'>Load Data</button>`;
}
```

---

## Testing

Spriggan apps are easy to test because `update` is a pure function:

```javascript
// test.js
import { update } from "./app.js";

// Test increment
const state1 = { count: 0 };
const result1 = update(state1, { type: "Increment" });
console.assert(result1.count === 1, "Increment should increase count");

// Test with effects
const state2 = { loading: false };
const [newState, effect] = update(state2, { type: "FetchData" });
console.assert(newState.loading === true, "Should set loading state");
console.assert(effect.type === "http", "Should return http effect");
console.assert(effect.url === "/api/data", "Should fetch correct URL");

// Test view (snapshot testing)
import { view } from "./app.js";
const html = view(state1, () => {});
console.assert(html.includes("Count: 0"), "Should render count");

console.log("✅ All tests passed!");
```

With a test framework:

```javascript
// Using Vitest, Jest, or similar
import { describe, it, expect } from "vitest";
import { update } from "./app.js";

describe("Todo app", () => {
  it("should add a todo", () => {
    const state = { todos: [], input: "Buy milk", nextId: 1 };
    const result = update(state, { type: "AddTodo" });

    expect(result.todos).toHaveLength(1);
    expect(result.todos[0].text).toBe("Buy milk");
    expect(result.input).toBe("");
  });

  it("should toggle a todo", () => {
    const state = {
      todos: [{ id: 1, text: "Test", done: false }],
    };
    const result = update(state, { type: "ToggleTodo", id: 1 });

    expect(result.todos[0].done).toBe(true);
  });
});
```

---

## Examples

### Real-time Chat

```javascript
const init = {
  messages: [],
  input: "",
  username: "Anonymous",
  connected: false,
};

function update(state, msg) {
  switch (msg.type) {
    case "Connect":
      return [
        { ...state, connected: true },
        {
          type: "websocket",
          url: "ws://localhost:8080",
          onMessage: "MessageReceived",
          onError: "ConnectionError",
        },
      ];

    case "MessageReceived":
      return {
        ...state,
        messages: [...state.messages, msg.data],
      };

    case "SendMessage":
      if (!state.input.trim()) return state;

      return [
        { ...state, input: "" },
        {
          type: "websocket",
          action: "send",
          data: {
            username: state.username,
            text: state.input,
            timestamp: Date.now(),
          },
        },
      ];

    case "FieldChanged":
      return { ...state, [msg.field]: msg.value };

    default:
      return state;
  }
}

function view(state, dispatch) {
  return html`
    <div class="chat">
      <div class="messages">
        ${state.messages.map(
          (m) => html`
            <div class="message" id="msg-${m.timestamp}">
              <strong>${m.username}:</strong> ${m.text}
            </div>
          `,
        )}
      </div>

      <div class="input-area">
        <input
          type="text"
          data-model="input"
          value="${state.input}"
          placeholder="Type a message..."
          ${!state.connected ? "disabled" : ""}
        />
        <button
          data-msg='{"type":"SendMessage"}'
          ${!state.connected ? "disabled" : ""}
        >
          Send
        </button>
      </div>

      ${!state.connected
        ? html` <button data-msg='{"type":"Connect"}'>Connect</button> `
        : ""}
    </div>
  `;
}
```

### Multi-step Form Wizard

```javascript
const init = {
  step: 1,
  data: {
    personal: {},
    address: {},
    payment: {},
  },
};

function update(state, msg) {
  switch (msg.type) {
    case "NextStep":
      return { ...state, step: state.step + 1 };

    case "PrevStep":
      return { ...state, step: state.step - 1 };

    case "FieldChanged":
      const [section, field] = msg.field.split(".");
      return {
        ...state,
        data: {
          ...state.data,
          [section]: {
            ...state.data[section],
            [field]: msg.value,
          },
        },
      };

    case "Submit":
      return [
        state,
        {
          type: "http",
          url: "/api/submit",
          method: "POST",
          body: state.data,
          onSuccess: "SubmitSuccess",
        },
      ];

    default:
      return state;
  }
}

function view(state, dispatch) {
  return html`
    <div class="wizard">
      <div class="progress">Step ${state.step} of 3</div>

      ${state.step === 1 ? renderPersonalInfo(state, dispatch) : ""}
      ${state.step === 2 ? renderAddress(state, dispatch) : ""}
      ${state.step === 3 ? renderPayment(state, dispatch) : ""}

      <div class="buttons">
        ${state.step > 1
          ? html` <button data-msg='{"type":"PrevStep"}'>Previous</button> `
          : ""}
        ${state.step < 3
          ? html` <button data-msg='{"type":"NextStep"}'>Next</button> `
          : html` <button data-msg='{"type":"Submit"}'>Submit</button> `}
      </div>
    </div>
  `;
}

function renderPersonalInfo(state, dispatch) {
  return html`
    <div class="step">
      <h2>Personal Information</h2>
      <input
        type="text"
        data-model="personal.name"
        value="${state.data.personal.name || ""}"
        placeholder="Full Name"
      />
      <input
        type="email"
        data-model="personal.email"
        value="${state.data.personal.email || ""}"
        placeholder="Email"
      />
    </div>
  `;
}

function renderAddress(state, dispatch) {
  return html`
    <div class="step">
      <h2>Address</h2>
      <input
        type="text"
        data-model="address.street"
        value="${state.data.address.street || ""}"
        placeholder="Street"
      />
      <input
        type="text"
        data-model="address.city"
        value="${state.data.address.city || ""}"
        placeholder="City"
      />
    </div>
  `;
}

function renderPayment(state, dispatch) {
  return html`
    <div class="step">
      <h2>Payment</h2>
      <input
        type="text"
        data-model="payment.cardNumber"
        value="${state.data.payment.cardNumber || ""}"
        placeholder="Card Number"
      />
      <input
        type="text"
        data-model="payment.cvv"
        value="${state.data.payment.cvv || ""}"
        placeholder="CVV"
      />
    </div>
  `;
}
```

---

## Comparison with Other Frameworks

| Feature                | Spriggan | Alpine.js  | htmx          | React        | Vue           |
| ---------------------- | -------- | ---------- | ------------- | ------------ | ------------- |
| **Build required**     | ❌       | ❌         | ❌            | ✅           | Optional      |
| **Size (gzipped)**     | ~3KB     | ~15KB      | ~14KB         | ~42KB        | ~33KB         |
| **Architecture**       | TEA      | Reactive   | Hypermedia    | Component    | Component     |
| **Learning curve**     | Low      | Low        | Low           | Medium       | Medium        |
| **State management**   | Built-in | Local only | Server-driven | External lib | Built-in      |
| **LLM-friendly**       | ✅✅✅   | ✅✅       | ✅✅          | ✅           | ✅            |
| **Time-travel debug**  | ✅       | ❌         | ❌            | With Redux   | With DevTools |
| **Server integration** | Any      | Any        | Tight         | Any          | Any           |

**When to use Spriggan:**

- You want pure functional architecture
- You're prototyping or teaching
- You're building with AI assistance
- You need predictable, testable code
- You want zero build complexity

**When to use alternatives:**

- **Alpine.js** – You prefer reactive data binding over explicit state management
- **htmx** – Your app is primarily server-rendered with progressive enhancement
- **React/Vue** – You need a massive ecosystem, enterprise support, or complex component libraries

---

## Performance Tips

### 1. Use Idiomorph for Efficient DOM Updates

```html
<script src="https://unpkg.com/idiomorph@0.7.4/dist/idiomorph.min.js"></script>
```

Idiomorph morphs the DOM instead of replacing it, preserving:

- Input focus and cursor position
- Scroll position
- CSS transitions
- Third-party widget state

### 2. Always Provide Stable IDs for Lists

```javascript
// ✅ Good
${items.map(item => html`
  <div id="item-${item.id}">${item.name}</div>
`)}

// ❌ Bad
${items.map(item => html`
  <div>${item.name}</div>
`)}
```

### 3. Memoize Expensive Computations

```javascript
// Cache expensive filters/sorts
let cachedFiltered = null;
let lastFilter = null;

function view(state, dispatch) {
  if (state.filter !== lastFilter) {
    cachedFiltered = expensiveFilter(state.items, state.filter);
    lastFilter = state.filter;
  }

  return html` ${cachedFiltered.map((item) => renderItem(item))} `;
}
```

### 4. Debounce Rapid Updates

```javascript
case 'SearchInput':
  return [
    { ...state, query: msg.value },
    {
      type: 'delay',
      ms: 300,
      msg: { type: 'PerformSearch', query: msg.value }
    }
  ];
```

### 5. Batch Related State Changes

```javascript
// ✅ Good - single update
case 'LoadUserSuccess':
  return {
    ...state,
    user: msg.data,
    loading: false,
    error: null
  };

// ❌ Bad - multiple updates
case 'LoadUserSuccess':
  dispatch({ type: 'SetUser', user: msg.data });
  dispatch({ type: 'SetLoading', loading: false });
  dispatch({ type: 'ClearError' });
```

---

## FAQ

### How big is Spriggan?

**~3KB gzipped** for the core. With Idiomorph included: ~8KB total.

### Does it work with TypeScript?

Yes! Type definitions are included:

```typescript
import { app, html } from "spriggan";

interface State {
  count: number;
}

type Msg = { type: "Increment" } | { type: "Decrement" } | { type: "Reset" };

const init: State = { count: 0 };

function update(state: State, msg: Msg): State {
  switch (msg.type) {
    case "Increment":
      return { count: state.count + 1 };
    case "Decrement":
      return { count: state.count - 1 };
    case "Reset":
      return init;
  }
}

function view(state: State, dispatch: (msg: Msg) => void) {
  return html`
    <div>
      <h1>${state.count}</h1>
      <button data-msg='{"type":"Increment"}'>+</button>
    </div>
  `;
}

app<State, Msg>("#app", { init, update, view });
```

### Can I use it with existing apps?

Absolutely! Spriggan can control just a portion of your page:

```javascript
// Mount to a specific element
app("#widget", { init, update, view });

// Rest of page uses jQuery, vanilla JS, etc.
```

### How do I handle routing?

Spriggan doesn't include routing, but you can:

**Option 1: Use History API**

```javascript
subscriptions: (dispatch) => {
  const handlePopState = () => {
    dispatch({ type: "RouteChanged", path: window.location.pathname });
  };

  window.addEventListener("popstate", handlePopState);
  return () => window.removeEventListener("popstate", handlePopState);
};
```

**Option 2: Integrate a router**

```javascript
import page from "page";

subscriptions: (dispatch) => {
  page("/", () => dispatch({ type: "RouteChanged", route: "home" }));
  page("/about", () => dispatch({ type: "RouteChanged", route: "about" }));
  page.start();

  return () => page.stop();
};
```

**Option 3: Hash-based routing**

```javascript
function update(state, msg) {
  switch (msg.type) {
    case "Navigate":
      window.location.hash = msg.route;
      return { ...state, route: msg.route };

    case "HashChanged":
      return { ...state, route: window.location.hash.slice(1) };
  }
}

subscriptions: (dispatch) => {
  const handleHash = () => {
    dispatch({ type: "HashChanged" });
  };

  window.addEventListener("hashchange", handleHash);
  handleHash(); // Initial route

  return () => window.removeEventListener("hashchange", handleHash);
};
```

### Can I use CSS-in-JS?

You can inline styles or use template literals:

```javascript
const styles = {
  button: `
    padding: 10px 20px;
    background: blue;
    color: white;
    border: none;
    border-radius: 5px;
  `,
};

function Button(text, msg) {
  return html`
    <button style="${styles.button}" data-msg="${JSON.stringify(msg)}">
      ${text}
    </button>
  `;
}
```

Or use a `<style>` tag in your HTML.

### How do I optimize re-renders?

Spriggan re-renders on every state change. With Idiomorph, this is fast because only changed DOM nodes are updated. For extreme cases:

```javascript
// Conditional rendering
function view(state, dispatch) {
  // Only render expensive component when needed
  return html`
    <div>${state.showExpensive ? renderExpensiveComponent(state) : ""}</div>
  `;
}

// Or use CSS to hide/show
function view(state, dispatch) {
  return html`
    <div style="display: ${state.showExpensive ? "block" : "none"}">
      ${renderExpensiveComponent(state)}
    </div>
  `;
}
```

### Can I use web components?

Yes! Spriggan works with custom elements:

```javascript
function view(state, dispatch) {
  return html`
    <my-custom-element data="${JSON.stringify(state.data)}"></my-custom-element>
  `;
}
```

### How do I handle authentication?

Store tokens in state and include them in HTTP effects:

```javascript
const init = {
  user: null,
  token: localStorage.getItem("auth-token"),
};

function update(state, msg) {
  switch (msg.type) {
    case "Login":
      return [
        { ...state, loading: true },
        {
          type: "http",
          url: "/api/login",
          method: "POST",
          body: { username: msg.username, password: msg.password },
          onSuccess: "LoginSuccess",
          onError: "LoginFailed",
        },
      ];

    case "LoginSuccess":
      localStorage.setItem("auth-token", msg.data.token);
      return {
        ...state,
        loading: false,
        user: msg.data.user,
        token: msg.data.token,
      };

    case "FetchProtectedData":
      return [
        state,
        {
          type: "http",
          url: "/api/protected",
          headers: {
            Authorization: `Bearer ${state.token}`,
          },
          onSuccess: "DataLoaded",
        },
      ];
  }
}
```

---

## Browser Support

Spriggan works in all modern browsers:

- Chrome/Edge 90+
- Firefox 88+
- Safari 14+

**Polyfills needed for older browsers:**

- Template literals (ES6)
- Spread operator (ES6)
- `fetch` API
- `Object.assign`

---

## Contributing

Contributions are welcome! Please:

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/my-feature`
3. Write tests for new functionality
4. Ensure all tests pass
5. Submit a pull request

**Development setup:**

```bash
git clone https://github.com/yourusername/spriggan.git
cd spriggan
npm install
npm test
npm run build
```

---

## Roadmap

- [ ] TypeScript type definitions
- [ ] Official DevTools extension
- [ ] Server-side rendering support
- [ ] React/Vue adapter for gradual migration
- [ ] Preact-style virtual DOM option
- [ ] Animation/transition helpers
- [ ] Form validation utilities
- [ ] Official router plugin

---

## Philosophy

Spriggan is inspired by:

- **The Elm Architecture** – Unidirectional data flow, pure functions
- **htmx** – No build tools, progressive enhancement
- **Alpine.js** – Simplicity, ease of adoption
- **Mithril.js** – Minimalism, pragmatism
- **Hyperapp** – Tiny footprint, functional design

We believe:

- **Simplicity scales** – Small, composable pieces beat monolithic frameworks
- **Constraints enable creativity** – Fewer features = clearer thinking
- **Build tools should be optional** – The web platform is powerful enough
- **Pure functions > clever abstractions** – Predictability beats magic
- **AI-first design** – Frameworks should be easy for both humans and LLMs

---

## Credits

**Created by:** [Your Name]

**Inspired by:**

- [Elm](https://elm-lang.org/) and Evan Czaplicki's vision for reliable web apps
- [Hyperapp](https://github.com/jorgebucaran/hyperapp) by Jorge Bucaran
- [Mithril.js](https://mithril.js.org/) by Leo Horie
- [Alpine.js](https://alpinejs.dev/) by Caleb Porzio
- [htmx](https://htmx.org/) by Carson Gross

**Special thanks to:**

- The Idiomorph team for efficient DOM morphing
- The functional programming community for TEA
- Everyone building tools that respect the web platform

---

## License

**Apache License 2.0**

```
Copyright 2024 [Your Name]

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
```

---

## Get Started

```bash
npm install spriggan
```

Or via CDN:

```html
<script src="https://unpkg.com/spriggan/dist/spriggan.min.js"></script>
```

**[View Examples](./examples)** | **[Read the Guide](./docs/guide.md)** | **[API Reference](./docs/api.md)**

---

<p align="center">
  <strong>Built with ❤️ for the web platform</strong>
</p>
```

---

This README provides:

✅ **Clear elevator pitch** – Explains what Spriggan is in 30 seconds
✅ **Strong rationale** – Why it exists and what problems it solves
✅ **Progressive examples** – From simple counter to complex patterns
✅ **Complete API docs** – Every function, parameter, and option documented
✅ **Real-world patterns** – Forms, loading states, routing, auth
✅ **Comparison table** – Helps users decide if Spriggan fits their needs
✅ **FAQ section** – Answers common questions
✅ **Credits & license** – Proper attribution and Apache 2.0 license

The tone is friendly, practical, and emphasizes simplicity without being preachy. It positions Spriggan as a tool for people who want to build without the complexity tax of modern frameworks.
