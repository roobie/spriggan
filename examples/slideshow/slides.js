export const slides = [
  {
    id: "title",
    title: "🌿 Spriggan",
    subtitle: "A Tiny TEA-Inspired Framework",
    tagline: "No build tools. Pure functions. Built for humans and LLMs alike.",
    content: "minimal",
    centered: true,
    notes:
      "Welcome to Spriggan - a 75-line core framework bringing The Elm Architecture to vanilla JavaScript. Press arrow keys or swipe to navigate.",
    demo: null,
  },
  {
    id: "concepts",
    title: "Core Concepts",
    content: `
      <h2>The TEA Triad</h2>
      <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 1rem; margin-top: 1rem;">
        <div style="background: rgba(127,255,212,0.1); padding: 1rem; border-radius: 12px; border: 1px solid rgba(127,255,212,0.2);">
          <h3 style="color: var(--green-5); margin-top: 0; margin-bottom: 0.5rem;">📦 Model</h3>
          <p style="margin-bottom: 0; font-size: 0.95rem;">Single source of truth — plain JS objects</p>
        </div>
        <div style="background: rgba(100,149,237,0.1); padding: 1rem; border-radius: 12px; border: 1px solid rgba(100,149,237,0.2);">
          <h3 style="color: var(--blue-5); margin-top: 0; margin-bottom: 0.5rem;">⚡ Update</h3>
          <p style="margin-bottom: 0; font-size: 0.95rem;"><code>(state, msg) => newState</code></p>
        </div>
        <div style="background: rgba(147,112,219,0.1); padding: 1rem; border-radius: 12px; border: 1px solid rgba(147,112,219,0.2);">
          <h3 style="color: var(--purple-5); margin-top: 0; margin-bottom: 0.5rem;">🎨 View</h3>
          <p style="margin-bottom: 0; font-size: 0.95rem;"><code>(state, dispatch) => HTML</code></p>
        </div>
      </div>
    `,
    demo: {
      type: "counter",
      description:
        "👆 Try it! This counter uses Spriggan's Model-Update-View pattern",
    },
    code: `const init = { count: 0 }

function update(state, msg) {
  switch (msg.type) {
    case 'Increment':
      return { count: state.count + 1 }
    default: return state
  }
}

function view(state, dispatch) {
  return html\`<button data-msg=\${{ type: 'Increment' }}>
    Count: \${state.count}
  </button>\`
}`,
    notes:
      "The beauty of TEA: predictable, testable, debuggable. No hidden reactivity.",
  },
  {
    id: "messages-effects",
    title: "Messages & Effects",
    content: `
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1.5rem;">
        <div>
          <h2 style="margin-top: 0;">📨 Messages</h2>
          <p>Plain objects describing <strong>what happened</strong></p>
          <pre><code class="language-javascript">{ type: 'ButtonClicked' }
{ type: 'FieldChanged', 
  field: 'email', 
  value: 'user@example.com' }</code></pre>
        </div>
        <div>
          <h2 style="margin-top: 0;">✨ Effects</h2>
          <p>Declarative side effect descriptions</p>
          <pre><code class="language-javascript">// HTTP Request
{ type: 'http', url: '/api',
  onSuccess: 'DataLoaded' }

// Delay
{ type: 'delay', ms: 1000,
  msg: { type: 'Timeout' } }

// Storage
{ type: 'storage', action: 'set',
  key: 'user', value: data }</code></pre>
        </div>
      </div>
    `,
    notes:
      "Effects as data enables testing, time-travel, and middleware patterns.",
    demo: null,
  },
  {
    id: "view-html",
    title: "View & HTML Templates",
    content: `
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1.5rem;">
        <div>
          <h2 style="margin-top: 0;">🏗️ Tagged Template</h2>
          <pre><code class="language-javascript">html\`
  &lt;div&gt;
    &lt;h1&gt;\${title}&lt;/h1&gt;
    &lt;button data-msg='\${{ type: "Save" }}'&gt;
      Save
    &lt;/button&gt;
  &lt;/div&gt;
\`</code></pre>
          <p style="margin-top: 0.5rem;"><em>No JSX compilation needed!</em></p>
        </div>
        <div>
          <h2 style="margin-top: 0;">🎯 Event Delegation</h2>
          <table>
            <thead>
              <tr><th>Attribute</th><th>Event</th></tr>
            </thead>
            <tbody>
              <tr><td><code>data-msg</code></td><td>click → dispatch</td></tr>
              <tr><td><code>data-model</code></td><td>input → FieldChanged</td></tr>
              <tr><td>form + data-msg</td><td>submit → dispatch</td></tr>
            </tbody>
          </table>
          <p style="margin-top: 0.5rem;"><strong>One listener per type</strong> — auto cleanup!</p>
        </div>
      </div>
    `,
    notes:
      "Event delegation means one listener per event type, not per element.",
    demo: null,
  },
  {
    id: "subscriptions-debug",
    title: "Subscriptions & Debug",
    content: `
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1.5rem;">
        <div>
          <h2 style="margin-top: 0;">🔔 Subscriptions</h2>
          <p>External events: keyboard, WebSocket, timers</p>
          <pre><code class="language-javascript">subscriptions: (dispatch) => {
  const h = (e) => {
    if (e.key === 'Escape') 
      dispatch({ type: 'Close' })
  }
  document.addEventListener('keydown', h)
  return () => 
    document.removeEventListener('keydown', h)
}</code></pre>
        </div>
        <div>
          <h2 style="margin-top: 0;">🐛 Debug Mode</h2>
          <p>Enable with <code>debug: true</code>:</p>
          <ul style="margin: 0.5rem 0; padding-left: 1.5rem;">
            <li>Console logging of every message</li>
            <li>State diff visualization</li>
            <li><strong>Time-travel debugging</strong></li>
          </ul>
          <pre><code class="language-javascript">__SPRIGGAN_DEBUG__.history
__SPRIGGAN_DEBUG__.timeTravel(5)</code></pre>
        </div>
      </div>
    `,
    notes: "Subscriptions return cleanup functions — no memory leaks.",
    demo: null,
  },
  {
    id: "get-started",
    title: "Get Started",
    content: `
      <div style="text-align: center;">
        <h2 style="margin-top: 0;">📦 Installation</h2>
        <div style="display: inline-block; text-align: left;">
          <p style="margin-bottom: 0.5rem;"><strong>CDN:</strong></p>
          <pre style="margin-bottom: 1rem;"><code class="language-html">&lt;script src="https://unpkg.com/spriggan/dist/spriggan.min.js"&gt;&lt;/script&gt;</code></pre>
          <p style="margin-bottom: 0.5rem;"><strong>npm:</strong></p>
          <pre style="margin: 0;"><code class="language-bash">npm install spriggan</code></pre>
        </div>
        <h2 style="margin-top: 1.5rem;">✨ Philosophy</h2>
        <blockquote style="font-size: 1.1rem; max-width: 500px; margin: 0 auto;">
          Simplicity over features. Pure functions over clever abstractions. Build tools optional. AI-first.
        </blockquote>
        <div style="margin-top: 1.5rem; display: flex; justify-content: center; gap: 1rem;">
          <a href="https://github.com/yourname/spriggan" style="color: var(--blue-5);">📁 GitHub</a>
          <a href="../../README.md" style="color: var(--green-5);">📖 Docs</a>
          <a href="../demo.js" style="color: var(--purple-5);">🎮 Examples</a>
        </div>
      </div>
    `,
    notes:
      "This slideshow is built with Spriggan! Press F for fullscreen, O for overview.",
    demo: null,
    cta: {
      text: "⭐ View on GitHub",
      url: "https://github.com/yourname/spriggan",
    },
  },
];
