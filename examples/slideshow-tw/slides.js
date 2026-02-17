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
      <h2 class="text-xl md:text-2xl mt-4 md:mt-8 mb-4 text-accent">The TEA Triad</h2>
      <div class="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4 mt-4">
        <div class="bg-emerald-500/10 p-3 md:p-4 rounded-xl border border-emerald-500/20">
          <h3 class="text-accent mt-0 mb-2">📦 Model</h3>
          <p class="mb-0 text-sm">Single source of truth — plain JS objects</p>
        </div>
        <div class="bg-blue-500/10 p-3 md:p-4 rounded-xl border border-blue-500/20">
          <h3 class="text-secondary mt-0 mb-2">⚡ Update</h3>
          <p class="mb-0 text-sm"><code>(state, msg) => newState</code></p>
        </div>
        <div class="bg-purple-500/10 p-3 md:p-4 rounded-xl border border-purple-500/20">
          <h3 class="text-purple-400 mt-0 mb-2">🎨 View</h3>
          <p class="mb-0 text-sm"><code>(state, dispatch) => HTML</code></p>
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
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
        <div>
          <h2 class="mt-0 text-lg md:text-xl">📨 Messages</h2>
          <p class="text-sm md:text-base">Plain objects describing <strong>what happened</strong></p>
          <pre class="text-xs md:text-sm"><code class="language-javascript">{ type: 'ButtonClicked' }
{ type: 'FieldChanged', 
  field: 'email', 
  value: 'user@example.com' }</code></pre>
        </div>
        <div>
          <h2 class="mt-4 lg:mt-0 text-lg md:text-xl">✨ Effects</h2>
          <p class="text-sm md:text-base">Declarative side effect descriptions</p>
          <pre class="text-xs md:text-sm"><code class="language-javascript">// HTTP Request
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
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
        <div>
          <h2 class="mt-0 text-lg md:text-xl">🏗️ Tagged Template</h2>
          <pre class="text-xs md:text-sm"><code class="language-javascript">html\`
  &lt;div&gt;
    &lt;h1&gt;\${title}&lt;/h1&gt;
    &lt;button data-msg='\${{ type: "Save" }}'&gt;
      Save
    &lt;/button&gt;
  &lt;/div&gt;
\`</code></pre>
          <p class="mt-2 text-sm"><em>No JSX compilation needed!</em></p>
        </div>
        <div>
          <h2 class="mt-4 lg:mt-0 text-lg md:text-xl">🎯 Event Delegation</h2>
          <table class="w-full border-collapse my-4 md:my-6 text-xs md:text-sm">
            <thead>
              <tr><th class="p-2 md:p-3 border border-slate-600 text-left bg-slate-800 font-semibold">Attribute</th><th class="p-2 md:p-3 border border-slate-600 text-left bg-slate-800 font-semibold">Event</th></tr>
            </thead>
            <tbody>
              <tr><td class="p-2 md:p-3 border border-slate-600"><code>data-msg</code></td><td class="p-2 md:p-3 border border-slate-600">click → dispatch</td></tr>
              <tr><td class="p-2 md:p-3 border border-slate-600"><code>data-model</code></td><td class="p-2 md:p-3 border border-slate-600">input → FieldChanged</td></tr>
              <tr><td class="p-2 md:p-3 border border-slate-600">form + data-msg</td><td class="p-2 md:p-3 border border-slate-600">submit → dispatch</td></tr>
            </tbody>
          </table>
          <p class="mt-2 text-sm"><strong>One listener per type</strong> — auto cleanup!</p>
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
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
        <div>
          <h2 class="mt-0 text-lg md:text-xl">🔔 Subscriptions</h2>
          <p class="text-sm md:text-base">External events: keyboard, WebSocket, timers</p>
          <pre class="text-xs md:text-sm"><code class="language-javascript">subscriptions: (dispatch) => {
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
          <h2 class="mt-4 lg:mt-0 text-lg md:text-xl">🐛 Debug Mode</h2>
          <p class="text-sm md:text-base">Enable with <code>debug: true</code>:</p>
          <ul class="my-2 pl-6 list-disc text-sm md:text-base">
            <li>Console logging of every message</li>
            <li>State diff visualization</li>
            <li><strong>Time-travel debugging</strong></li>
          </ul>
          <pre class="text-xs md:text-sm"><code class="language-javascript">__SPRIGGAN_DEBUG__.history
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
      <div class="text-center">
        <h2 class="mt-0 text-lg md:text-xl">📦 Installation</h2>
        <div class="inline-block text-left text-sm md:text-base">
          <p class="mb-2"><strong>CDN:</strong></p>
          <pre class="mb-4 text-xs md:text-sm"><code class="language-html">&lt;script src="https://unpkg.com/spriggan/dist/spriggan.min.js"&gt;&lt;/script&gt;</code></pre>
          <p class="mb-2"><strong>npm:</strong></p>
          <pre class="m-0 text-xs md:text-sm"><code class="language-bash">npm install spriggan</code></pre>
        </div>
        <h2 class="mt-4 md:mt-6 text-lg md:text-xl">✨ Philosophy</h2>
        <blockquote class="text-base md:text-lg max-w-lg mx-auto border-l-4 border-accent pl-4 md:pl-6 my-4 md:my-6 italic opacity-90">
          Simplicity over features. Pure functions over clever abstractions. Build tools optional. AI-first.
        </blockquote>
        <div class="mt-4 md:mt-6 flex flex-col md:flex-row justify-center gap-2 md:gap-4 text-sm md:text-base">
          <a href="https://github.com/yourname/spriggan" class="text-secondary hover:underline">📁 GitHub</a>
          <a href="../../README.md" class="text-accent hover:underline">📖 Docs</a>
          <a href="../demo.js" class="text-purple-400 hover:underline">🎮 Examples</a>
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
