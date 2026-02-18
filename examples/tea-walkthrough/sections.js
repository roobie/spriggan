export const sections = [
  {
    id: "intro",
    title: "What is TEA?",
    prose: `
      <p class="text-lg mb-4">
        <strong>The Elm Architecture</strong> (TEA) is a pattern for building interactive applications
        with a clear, predictable data flow. It was popularized by the Elm programming language
        but can be applied in any language.
      </p>
      <p class="mb-4">
        At its core, TEA is remarkably simple: your application consists of just three parts
        that work together in a unidirectional cycle.
      </p>
      <div class="tea-diagram my-6">
        <div class="tea-box model">
          <div class="text-accent font-semibold">Model</div>
          <div class="text-sm opacity-70">State</div>
        </div>
        <div class="tea-arrow animate-flow-arrow">→</div>
        <div class="tea-box view">
          <div class="text-purple-400 font-semibold">View</div>
          <div class="text-sm opacity-70">HTML</div>
        </div>
        <div class="tea-arrow animate-flow-arrow">→</div>
        <div class="tea-box update">
          <div class="text-secondary font-semibold">Update</div>
          <div class="text-sm opacity-70">Messages</div>
        </div>
        <div class="tea-arrow animate-flow-arrow">→</div>
        <div class="tea-box model">
          <div class="text-accent font-semibold">Model</div>
          <div class="text-sm opacity-70">New State</div>
        </div>
      </div>
      <p class="text-sm opacity-80 mt-4">
        This cycle ensures that <strong>every change</strong> in your application follows the same path,
        making it easy to understand, debug, and test.
      </p>
    `,
    code: null,
    demo: null,
  },
  {
    id: "model",
    title: "The Model",
    prose: `
      <p class="mb-4">
        The <strong class="text-accent">Model</strong> is your application's single source of truth.
        It's a plain JavaScript object that represents everything your app needs to know.
      </p>
      <div class="bg-emerald-500/10 p-4 rounded-xl border border-emerald-500/20 my-4">
        <h4 class="text-accent mt-0 mb-2">Key Principles</h4>
        <ul class="list-disc pl-5 mb-0 text-sm space-y-2">
          <li><strong>Immutable</strong> — Never modify state directly</li>
          <li><strong>Serializable</strong> — Can be saved/loaded easily</li>
          <li><strong>Plain objects</strong> — No classes or proxies needed</li>
        </ul>
      </div>
      <p class="text-sm opacity-80 mt-4">
        Because the model is just data, you can inspect it, save it to localStorage,
        send it over the network, or even time-travel through state history.
      </p>
    `,
    code: `// The Model is just a plain object
const init = {
  count: 0,
  user: null,
  todos: [],
  filter: 'all'
}

// Or a function that returns initial state
const init = () => ({
  count: 0,
  todos: loadFromStorage() || []
})`,
    demo: null,
  },
  {
    id: "update",
    title: "The Update Function",
    prose: `
      <p class="mb-4">
        The <strong class="text-secondary">Update</strong> function is the heart of TEA.
        It takes the current state and a message, then returns a new state.
      </p>
      <div class="bg-blue-500/10 p-4 rounded-xl border border-blue-500/20 my-4">
        <h4 class="text-secondary mt-0 mb-2">Function Signature</h4>
        <code class="text-sm bg-code px-2 py-1 rounded">
          (state, message) => newState | [newState, ...effects]
        </code>
      </div>
      <p class="mb-4">
        Messages are plain objects with a <code>type</code> property. They describe
        <em>what happened</em>, not <em>how to handle it</em>.
      </p>
      <p class="text-sm opacity-80">
        The update function is <strong>pure</strong> — given the same inputs, it always
        produces the same output. This makes it trivial to test.
      </p>
    `,
    code: `function update(state, msg) {
  switch (msg.type) {
    case 'Increment':
      return { ...state, count: state.count + 1 }
    
    case 'Decrement':
      return { ...state, count: state.count - 1 }
    
    case 'Reset':
      return { ...state, count: 0 }
    
    default:
      return state  // Unknown messages are ignored
  }
}`,
    demo: {
      type: "counter",
      title: "Counter Demo",
      description: "Try the buttons! Watch how messages update the model.",
    },
  },
  {
    id: "view",
    title: "The View Function",
    prose: `
      <p class="mb-4">
        The <strong class="text-purple-400">View</strong> function takes the current state
        and a dispatch function, returning HTML. It's a pure function of state.
      </p>
      <div class="bg-purple-500/10 p-4 rounded-xl border border-purple-500/20 my-4">
        <h4 class="text-purple-400 mt-0 mb-2">Function Signature</h4>
        <code class="text-sm bg-code px-2 py-1 rounded">
          (state, dispatch) => HTML string
        </code>
      </div>
      <p class="mb-4">
        Spriggan uses <strong>tagged template literals</strong> for HTML — no JSX compilation needed!
        Messages are attached via <code>data-msg</code> attributes.
      </p>
      <p class="text-sm opacity-80">
        Event delegation means <strong>one listener per event type</strong>, not per element.
        This is efficient and eliminates memory leak concerns.
      </p>
    `,
    code: `function view(state, dispatch) {
  return html\`
    <div>
      <h1>Count: \${state.count}</h1>
      
      <!-- data-msg becomes a click handler -->
      <button data-msg=\${{ type: 'Increment' }}>
        +
      </button>
      
      <button data-msg=\${{ type: 'Decrement' }}>
        -
      </button>
      
      <!-- data-model binds to input -->
      <input 
        type="text" 
        data-model="name"
        value="\${state.name}"
      />
    </div>
  \`
}`,
    demo: null,
  },
  {
    id: "messages",
    title: "Messages as Data",
    prose: `
      <p class="mb-4">
        In TEA, <strong>messages are data</strong>, not functions or callbacks.
        This is the key insight that makes the architecture so powerful.
      </p>
      <div class="grid grid-cols-2 gap-4 my-4">
        <div class="bg-emerald-500/10 p-3 rounded-lg border border-emerald-500/20">
          <h4 class="text-accent mt-0 mb-2 text-sm">✓ TEA Way</h4>
          <code class="text-xs">{ type: 'Increment', amount: 5 }</code>
        </div>
        <div class="bg-red-500/10 p-3 rounded-lg border border-red-500/20">
          <h4 class="text-red-400 mt-0 mb-2 text-sm">✗ Not TEA</h4>
          <code class="text-xs">() => state.count += 5</code>
        </div>
      </div>
      <p class="mb-4">
        Because messages are serializable JSON, you can:
      </p>
      <ul class="list-disc pl-5 text-sm space-y-1">
        <li>Log them for debugging</li>
        <li>Store them for replay</li>
        <li>Send them over WebSockets</li>
        <li>Write tests that verify behavior</li>
      </ul>
    `,
    code: `// Messages are plain objects
const messages = [
  { type: 'Increment' },
  { type: 'Decrement' },
  { type: 'SetValue', value: 10 },
  { type: 'UserLoggedIn', user: { id: 1, name: 'Alice' } },
  { type: 'TodoAdded', 
    todo: { id: 3, text: 'Learn TEA', done: false } 
  }
]

// Even complex actions are just data
const saveAction = {
  type: 'SaveDocument',
  documentId: 123,
  content: '...',
  timestamp: Date.now()
}`,
    demo: null,
  },
  {
    id: "effects",
    title: "Effects as Data",
    prose: `
      <p class="mb-4">
        <strong>Effects</strong> let you describe side effects (HTTP requests, timers, etc.)
        as data, keeping your update function pure.
      </p>
      <div class="bg-blue-500/10 p-4 rounded-xl border border-blue-500/20 my-4">
        <h4 class="text-secondary mt-0 mb-2">Return Pattern</h4>
        <code class="text-sm bg-code px-2 py-1 rounded">
          return [newState, effect1, effect2, ...]
        </code>
      </div>
      <p class="mb-4">
        Instead of performing side effects directly, you <em>describe</em> them.
        Spriggan's effect handlers execute them and dispatch new messages with results.
      </p>
      <p class="text-sm opacity-80">
        This separation means you can test your update function without mocking
        HTTP requests or timers — just verify it returns the right effects!
      </p>
    `,
    code: `function update(state, msg) {
  switch (msg.type) {
    case 'FetchUser':
      // Return state + effect description
      return [
        { ...state, loading: true },
        { 
          type: 'http',
          url: '/api/user/' + msg.id,
          onSuccess: 'UserLoaded',
          onError: 'UserLoadFailed'
        }
      ]
    
    case 'UserLoaded':
      return { 
        ...state, 
        loading: false,
        user: msg.data 
      }
    
    case 'AutoSave':
      return [
        state,
        { type: 'delay', ms: 1000, msg: { type: 'SaveNow' } }
      ]
  }
}`,
    demo: {
      type: "multi-counter",
      title: "Multi-Counter with Effects",
      description:
        "Counters with auto-increment using delay effects. Watch the message log!",
    },
  },
  {
    id: "subscriptions",
    title: "Subscriptions",
    prose: `
      <p class="mb-4">
        <strong>Subscriptions</strong> let your app respond to external events:
        keyboard input, WebSocket messages, timers, etc.
      </p>
      <div class="bg-purple-500/10 p-4 rounded-xl border border-purple-500/20 my-4">
        <h4 class="text-purple-400 mt-0 mb-2">Key Pattern</h4>
        <code class="text-sm bg-code px-2 py-1 rounded">
          subscriptions: (dispatch) => () => cleanup
        </code>
      </div>
      <p class="mb-4">
        The subscription function receives <code>dispatch</code> and returns a cleanup function.
        This ensures no memory leaks when the app is destroyed.
      </p>
      <p class="text-sm opacity-80">
        Subscriptions are set up once at app initialization, not on every render.
      </p>
    `,
    code: `function subscriptions(dispatch) {
  // Keyboard listener
  const handleKey = (e) => {
    if (e.key === 'Escape') {
      dispatch({ type: 'CloseModal' })
    }
    if (e.key === 's' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault()
      dispatch({ type: 'Save' })
    }
  }
  
  document.addEventListener('keydown', handleKey)
  
  // Return cleanup function
  return () => {
    document.removeEventListener('keydown', handleKey)
  }
}

// In app config:
app('#app', {
  init, update, view,
  subscriptions  // <-- added here
})`,
    demo: null,
  },
  {
    id: "why-spriggan",
    title: "Why Spriggan?",
    prose: `
      <p class="mb-4">
        Spriggan brings TEA to vanilla JavaScript with minimal ceremony:
      </p>
      <div class="grid grid-cols-1 md:grid-cols-2 gap-3 my-4">
        <div class="bg-emerald-500/10 p-3 rounded-lg border border-emerald-500/20">
          <h4 class="text-accent mt-0 mb-2">🤖 LLM-Friendly</h4>
          <p class="text-xs mb-0">Pure functions are easy for AI to generate and understand</p>
        </div>
        <div class="bg-blue-500/10 p-3 rounded-lg border border-blue-500/20">
          <h4 class="text-secondary mt-0 mb-2">⚡ No Build Tools</h4>
          <p class="text-xs mb-0">Just include the script. Works in any environment.</p>
        </div>
        <div class="bg-purple-500/10 p-3 rounded-lg border border-purple-500/20">
          <h4 class="text-purple-400 mt-0 mb-2">🧪 Easy Testing</h4>
          <p class="text-xs mb-0">Pure update functions need no mocks</p>
        </div>
        <div class="bg-amber-500/10 p-3 rounded-lg border border-amber-500/20">
          <h4 class="text-amber-400 mt-0 mb-2">📦 ~400 Lines</h4>
          <p class="text-xs mb-0">You can read and understand the entire codebase</p>
        </div>
      </div>
      <p class="text-sm opacity-80 mt-4">
        Spriggan isn't trying to compete with React or Vue. It's for when you want
        TEA's benefits without the complexity of a full framework.
      </p>
    `,
    code: `// Full Spriggan app in ~20 lines
import createSpriggan, { html } from './spriggan.js'

const { app } = createSpriggan()

const init = { count: 0 }

function update(state, msg) {
  switch (msg.type) {
    case 'Inc': return { count: state.count + 1 }
    default: return state
  }
}

function view(state, dispatch) {
  return html\`
    <button data-msg=\${{ type: 'Inc' }}>
      Count: \${state.count}
    </button>
  \`
}

app('#app', { init, update, view })`,
    demo: null,
  },
  {
    id: "full-example",
    title: "Full Example: Mini Todo",
    prose: `
      <p class="mb-4">
        Let's put it all together! This todo app demonstrates:
      </p>
      <ul class="list-disc pl-5 mb-4 text-sm space-y-1">
        <li><strong class="text-accent">Model</strong> — todos array, filter state, input text</li>
        <li><strong class="text-secondary">Update</strong> — add, toggle, delete, filter</li>
        <li><strong class="text-purple-400">View</strong> — dynamic lists, conditional rendering</li>
        <li><strong class="text-amber-400">Effects</strong> — localStorage persistence</li>
      </ul>
      <p class="text-sm opacity-80">
        Try adding, completing, and filtering todos. Check the inspector below
        to see the messages and state changes in real-time.
      </p>
    `,
    code: `// State
const init = () => ({
  todos: [],
  input: '',
  filter: 'all',
  nextId: 1
})

// Update
function update(state, msg) {
  switch (msg.type) {
    case 'InputChanged':
      return { ...state, input: msg.value }
    
    case 'AddTodo':
      if (!state.input.trim()) return state
      return [{
        ...state,
        todos: [...state.todos, {
          id: state.nextId,
          text: state.input,
          done: false
        }],
        input: '',
        nextId: state.nextId + 1
      }, { type: 'storage', action: 'set', 
           key: 'todos', value: state.todos }]
    
    case 'ToggleTodo':
      return [{
        ...state,
        todos: state.todos.map(t =>
          t.id === msg.id ? {...t, done: !t.done} : t
        )
      }, { type: 'storage', action: 'set',
           key: 'todos', value: state.todos }]
    
    case 'SetFilter':
      return { ...state, filter: msg.filter }
    
    default: return state
  }
}`,
    demo: {
      type: "todo-mini",
      title: "Mini Todo App",
      description: "A complete TEA app with localStorage persistence.",
    },
  },
  {
    id: "summary",
    title: "Summary",
    prose: `
      <h3 class="text-xl font-bold mb-4 gradient-title">The TEA Cycle</h3>
      <div class="tea-diagram my-4" style="flex-direction: column; gap: 0.5rem;">
        <div class="flex items-center gap-2">
          <span class="text-2xl">📦</span>
          <span class="tea-arrow">→</span>
          <code class="text-accent">Model</code>
          <span class="text-sm opacity-60">holds state</span>
        </div>
        <div class="flex items-center gap-2">
          <span class="text-2xl">🎨</span>
          <span class="tea-arrow">→</span>
          <code class="text-purple-400">View</code>
          <span class="text-sm opacity-60">renders HTML</span>
        </div>
        <div class="flex items-center gap-2">
          <span class="text-2xl">👆</span>
          <span class="tea-arrow">→</span>
          <code class="text-secondary">Message</code>
          <span class="text-sm opacity-60">from user event</span>
        </div>
        <div class="flex items-center gap-2">
          <span class="text-2xl">⚡</span>
          <span class="tea-arrow">→</span>
          <code class="text-amber-400">Update</code>
          <span class="text-sm opacity-60">transforms state</span>
        </div>
        <div class="flex items-center gap-2">
          <span class="text-2xl">🔄</span>
          <span class="tea-arrow">→</span>
          <code class="text-accent">New Model</code>
          <span class="text-sm opacity-60">repeats cycle</span>
        </div>
      </div>
      <div class="mt-6 p-4 bg-code rounded-xl border border-theme">
        <h4 class="mt-0 mb-2 font-semibold">Key Takeaways</h4>
        <ul class="list-disc pl-5 text-sm mb-0 space-y-1">
          <li>State is <strong>immutable</strong> — always return new objects</li>
          <li>Messages are <strong>data</strong> — serializable, testable</li>
          <li>Effects are <strong>declarative</strong> — described, not executed</li>
          <li>View is a <strong>pure function</strong> — predictable rendering</li>
        </ul>
      </div>
    `,
    code: null,
    demo: null,
  },
];
