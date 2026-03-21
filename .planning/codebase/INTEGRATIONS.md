# External Integrations

**Analysis Date:** 2026-03-21

## APIs & External Services

**HTTP Effect:**
- Framework provides built-in `http` effect for fetch-based API calls
- Location: `src/spriggan.js` lines 395-446
- Usage pattern:
  ```javascript
  { type: 'http', url: '/api/path', method: 'GET|POST', headers: {}, body: {}, onSuccess: 'MessageType', onError: 'ErrorType' }
  ```
- Supports JSON and text responses
- Error handling via message dispatch on failure

**Example Usage:**
- `examples/todo.js` - Fetches quotes from public API (demonstrates http effect)
- `examples/tea-walkthrough/` - Includes HTTP request example

**Note:** No built-in SDK clients. All external services are consumed via standard fetch API.

## Data Storage

**Databases:**
- None - Framework has no database integration
- Examples use browser localStorage for persistence

**File Storage:**
- None - Framework has no file storage integration
- Local filesystem only for development

**Caching:**
- Browser localStorage API available via `storage` effect
  - Location: `src/spriggan.js` lines 467-498
  - Actions: `set`, `get`, `remove`
  - Usage: `{ type: 'storage', action: 'set', key: 'key', value: data, onSuccess: 'msg' }`
- Example: `examples/todo.js` persists todos to localStorage

## Authentication & Identity

**Auth Provider:**
- None - Framework provides no authentication
- Custom implementation required via http effects and message handlers

## Monitoring & Observability

**Error Tracking:**
- None

**Logs:**
- Browser console (console.log, console.warn, console.error)
- Debug mode available via framework config: `debug: true`
- Framework logs dispatched messages, state changes, render times when debug enabled
- Location: `src/spriggan.js` lines 128-180 (debug utilities)

**Performance Monitoring:**
- Built-in render time measurement (debug mode)
- `performance.now()` used to track render duration

## CI/CD & Deployment

**Hosting:**
- Static file hosting only (client-side application)
- Any static HTTP server works
- GitHub Pages compatible

**CI Pipeline:**
- GitHub Actions workflow at `.github/workflows/ci.yml`
- Triggers: push to main, pull requests
- Runs: `mise run check` (installs deps, formats, tests, lints)
- Environment: ubuntu-latest
- Tool: mise-action@v2 for managing tool versions

## Environment Configuration

**Required env vars:**
- None - Framework requires no environment variables
- Configuration is entirely code-based

**Secrets location:**
- Not applicable - Framework is client-side only

**Config approach:**
- All configuration is imperative: passed as JavaScript objects to `app()` function
- Example from README:
  ```javascript
  app('#app', {
    init: { count: 0 },
    update: (state, msg) => newState,
    view: (state) => html`...`,
    effects: { /* custom effect handlers */ },
    debug: true
  })
  ```

## Webhooks & Callbacks

**Incoming:**
- None - Framework is client-side only

**Outgoing:**
- HTTP effect can POST to any endpoint
- Subscriptions pattern allows wiring external events (e.g., keyboard, custom events)
- Location: `src/spriggan.js` lines 134-139
- Example: `examples/todo.js` demonstrates keyboard shortcuts via subscriptions

## DOM Integration

**Optional Libraries (CDN):**
- Idiomorph 0.7.4 - DOM morphing library for efficient re-renders
  - CDN: `https://unpkg.com/idiomorph@0.7.4/dist/idiomorph.min.js`
  - Framework detects and uses if available
  - Location: `src/spriggan.js` lines 222-236
  - Enables smart DOM diffing while rendering

**Event System:**
- Built-in event delegation for DOM events
- Supported events: click, input, change, submit
- Event data passed via `data-msg` attribute with JSON payload
- Location: `src/spriggan.js` lines 258-338

## Asset Loading

**External Resources (Examples):**
- Google Fonts (typography)
  - `https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800`
- Open Props (CSS utilities)
  - `https://unpkg.com/open-props`
- Prism.js (syntax highlighting)
  - `https://cdnjs.cloudflare.com/ajax/libs/prism/9000.0.1/`
- Showdown (Markdown rendering)
  - Used in `examples/todo.js`

**Build Artifacts:**
- Note: Repository ships source only
- No prebuilt dist/ bundle
- CDN distribution would require build step (suggested: esbuild)

## useWeft Integration (Demo Only)

**Web Analytics/Feedback:**
- useWeft analytics loaded in `index.html` and `examples/tea-walkthrough/index.html`
- Endpoint: `https://api.useweft.dev`
- Script: `https://useweft.dev/client/latest.js`
- Purpose: Tracking demo page analytics
- Not part of framework core

## Network Policy

**CORS:**
- All external integrations must support CORS for browser requests
- Framework uses standard fetch API (respects browser CORS policy)

**Headers:**
- Default: `Content-Type: application/json` for http effect
- Custom headers supported via effect config
- Location: `src/spriggan.js` lines 410-413

---

*Integration audit: 2026-03-21*
