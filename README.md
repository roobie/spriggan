# 🌿 Spriggan

**A tiny, elegant framework inspired by The Elm Architecture—no build tools, pure functions, built for humans and LLMs alike.**

[GitHub](https://github.com/roobie/spriggan) | [Live Demo](https://roobie.github.io/spriggan)

```html
<script type="module">
  import createSpriggan, { html } from './src/spriggan.js';

  const { app } = createSpriggan();

  app('#app', {
    init: { count: 0 },
    update: (state, msg) => (msg.type === 'Inc' ? { count: state.count + 1 } : state),
    view: (state) => html`<div><h1>${state.count}</h1><button data-msg='{"type":"Inc"}'>+</button></div>`,
  });
</script>
```

That's it. No compilation. No configuration. Just functions and data.

---

## Elevator Pitch

Spriggan is a **750-line core** framework that brings The Elm Architecture to vanilla JavaScript. It's designed for:

- **Prototyping** – Drop `src/spriggan.js` into a page and start building
- **Teaching** – Three concepts: Model, Update, View
- **AI pair programming** – LLMs understand it instantly (no JSX, no hooks, no magic)
- **Maintainability** – Pure functions, unidirectional data flow, zero surprises

If you've ever felt that modern frontend development has too many moving parts, Spriggan is for you.

---

## Quick Start

### Use as an ES module (recommended)

This repository ships the source module at `src/spriggan.js`. The examples and the live demo import it directly as an ES module.

- Open `index.html` in this repository with a static server (recommended for module imports):
  - `python -m http.server 8000`
  - or `npx http-server .`
  - Then open `http://localhost:8000`.

- Or import directly from the file in a module script (see examples):

```html
<script type="module">
  import createSpriggan, { html } from './src/spriggan.js';
  const { app } = createSpriggan();
  // ...
</script>
```

### CDN / npm usage (note)

The README historically showed a CDN snippet (e.g. `https://unpkg.com/spriggan/dist/spriggan.min.js`). This repository currently contains the source module only and does not include a prebuilt `dist/` bundle or published npm package. The CDN snippet in older docs is an example of what consumers could use after publishing — not a shipped artifact in this repo.

If you want a UMD/Browser bundle for CDN use, build and publish first. Example (esbuild):

```bash
npx esbuild src/spriggan.js --bundle --minify --format=umd --global-name=Spriggan --outfile=dist/spriggan.min.js
```

---

## Representative Patterns (with links to examples)

Below are concise, representative patterns you will encounter in real apps. Full working examples live in the `examples/` directory — open them with a static server.

1) Counter (simple state + events)

```javascript
// examples/basic counter
const init = { count: 0 };
function update(state, msg) {
  if (msg.type === 'Inc') return { count: state.count + 1 };
  return state;
}
function view(state) {
  return html`<div><h1>${state.count}</h1><button data-msg='{"type":"Inc"}'>+</button></div>`;
}
app('#app', { init, update, view });
```

See: examples/slideshow and examples/tea-walkthrough for counters used in demos.

2) Todo app (add/toggle/delete + persistence)

- Pattern: keep all state in `model`, return effects to persist.
- Example: `examples/todo.js` demonstrates `storage` effects and list rendering with stable ids.

Key parts:
```javascript
case 'AddTodo':
  return {
    ...state,
    todos: [...state.todos, { id: state.nextId, text: state.input, done: false }],
    input: '', nextId: state.nextId + 1
  };

case 'SaveTodos':
  return [state, { type: 'storage', action: 'set', key: 'spriggan-todos', value: state.todos }];
```

3) HTTP effect (async requests)

```javascript
case 'FetchUsers':
  return [
    { ...state, loading: true },
    { type: 'http', url: '/api/users', onSuccess: 'UsersLoaded', onError: 'UsersFailed' }
  ];

case 'UsersLoaded':
  return { ...state, loading: false, users: msg.data };
```

See: examples/tea-walkthrough for an HTTP demo.

4) Delay / notifications (debounce, timeouts)

```javascript
case 'ShowToast':
  return [
    { ...state, toast: msg.text },
    { type: 'delay', ms: 3000, msg: { type: 'HideToast' } }
  ];
```

5) DOM effects (focus, add/remove class)

```javascript
return [state, { type: 'dom', action: 'focus', selector: '#name-input' }];
```

See dom effect tests in `__tests__/spriggan-dom.test.js` and `examples/components.html`.

6) Subscriptions (external events)

```javascript
subscriptions: (dispatch) => {
  const onKey = (e) => { if (e.key === 's' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); dispatch({ type: 'Save' }); } };
  document.addEventListener('keydown', onKey);
  return () => document.removeEventListener('keydown', onKey);
}
```

7) Components as functions

```javascript
function Button({ text, msg }) {
  return html`<button data-msg='${JSON.stringify(msg)}'>${text}</button>`;
}

function view(state) {
  return html`<div>${Button({ text: 'Save', msg: { type: 'Save' } })}</div>`;
}
```

8) List rendering with stable IDs

```javascript
${items.map(item => html`<div id="item-${item.id}">${item.name}</div>`) }
```

This enables Idiomorph morphing to preserve focus/selection.

---

## Core Concepts (short)

- Model: the application state (plain JS objects)
- Messages: plain objects describing events: `{type: 'AddTodo'}`
- Update: pure function `(state, msg) => newState | [newState, effect1, ...]`
- View: `view(state, dispatch) => html` (returns an HTML string or Node)
- Effects: describe side effects (http, storage, dom, fn, delay) handled by effect handlers

For the full API, inspect `src/spriggan.js` — JSDoc comments document types and behavior.

---

## Testing & Development

- Install dev dependencies: `npm install`
- Run tests: `npx vitest` or `npm exec vitest` (there is no `test` script in package.json)
- Run checks/lint: `npm run check` (this repository includes a `check` script)

Unit tests for DOM behavior live in `__tests__/spriggan-dom.test.js` and exercise event delegation and built-in effects.

---

## Contributing

1. Fork the repo.
2. Create a branch: `git checkout -b feature/thing`.
3. Run linters and tests: `npm install && npm run check && npx vitest`.
4. Open a PR describing the change.

If you plan to maintain a published package, consider adding a build step and CI that runs tests and publishes artifacts.

---

## Roadmap (suggested)

- Optional build output and published package
- TypeScript declaration files (.d.ts) for consumers
- Official DevTools integration for time-travel debugging
- Router and form utilities

---

## License

Apache License 2.0 — see LICENSE

<p align="center"><strong>Built with ❤️ for the web platform</strong></p>
