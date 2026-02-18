// @ts-check
import createSpriggan, { html } from "../../src/spriggan.js";
import { sections } from "./sections.js";

const { app } = createSpriggan();

/** @typedef {{ type: string, [key: string]: unknown }} Msg */

/**
 * @typedef {{
 *   activeSection: number;
 *   totalSections: number;
 *   proseScrollTop: number;
 *   demoScrollTop: number;
 *   theme: 'dark' | 'light';
 *   messageLog: Array<{ type: string; timestamp: number }>;
 *   demos: {
 *     counter: { count: number };
 *     multiCounter: { counters: Array<{ id: number; value: number }>; nextId: number; autoIncrement: boolean };
 *     todoMini: { todos: Array<{ id: number; text: string; done: boolean }>; input: string; filter: 'all' | 'active' | 'completed'; nextId: number };
 *   };
 * }} State
 */

/** @typedef {{ type: string; [key: string]: unknown }} Effect */

/** @typedef {'all' | 'active' | 'completed'} TodoFilter */

/**
 * @param {unknown} value
 * @returns {value is number}
 */
function isNumber(value) {
  return typeof value === "number";
}

/**
 * @param {unknown} value
 * @returns {value is string}
 */
function isString(value) {
  return typeof value === "string";
}

/**
 * @param {unknown} value
 * @returns {value is TodoFilter}
 */
function isTodoFilter(value) {
  return value === "all" || value === "active" || value === "completed";
}

/**
 * @template T
 * @param {unknown} value
 * @param {(v: unknown) => v is T} guard
 * @returns {T | null}
 */
function parseWith(value, guard) {
  return guard(value) ? value : null;
}

/** @type {State} */
const init = {
  activeSection: 0,
  totalSections: sections.length,
  proseScrollTop: 0,
  demoScrollTop: 0,
  theme: "dark",
  messageLog: [],
  demos: {
    counter: { count: 0 },
    multiCounter: {
      counters: [{ id: 1, value: 0 }],
      nextId: 2,
      autoIncrement: false,
    },
    todoMini: { todos: [], input: "", filter: "all", nextId: 1 },
  },
};

/**
 * @param {State} state
 * @param {Msg} msg
 * @returns {State | [State, ...Effect[]]}
 */
function update(state, msg) {
  const logMessage =
    msg.type &&
    !msg.type.startsWith("Scroll") &&
    !msg.type.startsWith("Set") &&
    !msg.type.startsWith("Log") &&
    !msg.type.startsWith("Field");

  const result = updateCore(state, msg);

  if (logMessage) {
    const newState = Array.isArray(result) ? result[0] : result;
    /** @type {Effect[]} */
    const effects = Array.isArray(result)
      ? /** @type {Effect[]} */ (result.slice(1))
      : [];
    const loggedState = {
      ...newState,
      messageLog: [
        ...newState.messageLog.slice(-19),
        { type: msg.type, timestamp: Date.now() },
      ],
    };
    return effects.length > 0 ? [loggedState, ...effects] : loggedState;
  }

  return result;
}

/**
 * @param {State} state
 * @param {Msg} msg
 * @returns {State | [State, ...Effect[]]}
 */
function updateCore(state, msg) {
  switch (msg.type) {
    case "SetActiveSection": {
      const index = parseWith(msg.index, isNumber);
      if (index === null) return state;
      return { ...state, activeSection: index };
    }

    case "ToggleTheme":
      return [
        { ...state, theme: state.theme === "dark" ? "light" : "dark" },
        {
          type: "storage",
          action: "set",
          key: "tea-walkthrough-theme",
          value: state.theme === "dark" ? "light" : "dark",
        },
      ];

    case "SetTheme": {
      const theme =
        msg.theme === "light" || msg.theme === "dark" ? msg.theme : "dark";
      return { ...state, theme };
    }

    case "ScrollProse": {
      const scrollTop = parseWith(msg.scrollTop, isNumber) ?? 0;
      return { ...state, proseScrollTop: scrollTop };
    }

    case "ScrollDemo": {
      const scrollTop = parseWith(msg.scrollTop, isNumber) ?? 0;
      return { ...state, demoScrollTop: scrollTop };
    }

    case "ClearMessageLog":
      return { ...state, messageLog: [] };

    case "CounterIncrement":
      return {
        ...state,
        demos: {
          ...state.demos,
          counter: { count: state.demos.counter.count + 1 },
        },
      };

    case "CounterDecrement":
      return {
        ...state,
        demos: {
          ...state.demos,
          counter: { count: state.demos.counter.count - 1 },
        },
      };

    case "CounterReset":
      return {
        ...state,
        demos: {
          ...state.demos,
          counter: { count: 0 },
        },
      };

    case "MultiCounterAdd":
      return {
        ...state,
        demos: {
          ...state.demos,
          multiCounter: {
            ...state.demos.multiCounter,
            counters: [
              ...state.demos.multiCounter.counters,
              { id: state.demos.multiCounter.nextId, value: 0 },
            ],
            nextId: state.demos.multiCounter.nextId + 1,
          },
        },
      };

    case "MultiCounterRemove":
      if (state.demos.multiCounter.counters.length <= 1) return state;
      return {
        ...state,
        demos: {
          ...state.demos,
          multiCounter: {
            ...state.demos.multiCounter,
            counters: state.demos.multiCounter.counters.filter(
              (_, i) => i !== state.demos.multiCounter.counters.length - 1,
            ),
          },
        },
      };

    case "MultiCounterIncrement":
      return {
        ...state,
        demos: {
          ...state.demos,
          multiCounter: {
            ...state.demos.multiCounter,
            counters: state.demos.multiCounter.counters.map((c) =>
              c.id === msg.id ? { ...c, value: c.value + 1 } : c,
            ),
          },
        },
      };

    case "MultiCounterDecrement":
      return {
        ...state,
        demos: {
          ...state.demos,
          multiCounter: {
            ...state.demos.multiCounter,
            counters: state.demos.multiCounter.counters.map((c) =>
              c.id === msg.id ? { ...c, value: c.value - 1 } : c,
            ),
          },
        },
      };

    case "MultiCounterToggleAuto": {
      const newAuto = !state.demos.multiCounter.autoIncrement;
      const newState = {
        ...state,
        demos: {
          ...state.demos,
          multiCounter: {
            ...state.demos.multiCounter,
            autoIncrement: newAuto,
          },
        },
      };
      if (newAuto) {
        return [
          newState,
          {
            type: "delay",
            ms: 1000,
            msg: { type: "MultiCounterAutoIncrement" },
          },
        ];
      }
      return newState;
    }

    case "MultiCounterAutoIncrement":
      if (!state.demos.multiCounter.autoIncrement) return state;
      return [
        {
          ...state,
          demos: {
            ...state.demos,
            multiCounter: {
              ...state.demos.multiCounter,
              counters: state.demos.multiCounter.counters.map((c) => ({
                ...c,
                value: c.value + 1,
              })),
            },
          },
        },
        { type: "delay", ms: 1000, msg: { type: "MultiCounterAutoIncrement" } },
      ];

    case "FieldChanged": {
      const field = parseWith(msg.field, isString);
      if (field === "todoInput") {
        const value = parseWith(msg.value, isString) ?? "";
        return {
          ...state,
          demos: {
            ...state.demos,
            todoMini: {
              ...state.demos.todoMini,
              input: value,
            },
          },
        };
      }
      return state;
    }

    case "TodoMiniInputChanged": {
      const value = parseWith(msg.value, isString) ?? "";
      return {
        ...state,
        demos: {
          ...state.demos,
          todoMini: {
            ...state.demos.todoMini,
            input: value,
          },
        },
      };
    }

    case "TodoMiniAdd":
      if (!state.demos.todoMini.input.trim()) return state;
      return {
        ...state,
        demos: {
          ...state.demos,
          todoMini: {
            ...state.demos.todoMini,
            todos: [
              ...state.demos.todoMini.todos,
              {
                id: state.demos.todoMini.nextId,
                text: state.demos.todoMini.input,
                done: false,
              },
            ],
            input: "",
            nextId: state.demos.todoMini.nextId + 1,
          },
        },
      };

    case "TodoMiniToggle":
      return {
        ...state,
        demos: {
          ...state.demos,
          todoMini: {
            ...state.demos.todoMini,
            todos: state.demos.todoMini.todos.map((t) =>
              t.id === msg.id ? { ...t, done: !t.done } : t,
            ),
          },
        },
      };

    case "TodoMiniDelete":
      return {
        ...state,
        demos: {
          ...state.demos,
          todoMini: {
            ...state.demos.todoMini,
            todos: state.demos.todoMini.todos.filter((t) => t.id !== msg.id),
          },
        },
      };

    case "TodoMiniSetFilter": {
      const filter = parseWith(msg.filter, isTodoFilter) ?? "all";
      return {
        ...state,
        demos: {
          ...state.demos,
          todoMini: {
            ...state.demos.todoMini,
            filter,
          },
        },
      };
    }

    default:
      return state;
  }
}

/**
 * @param {string} str
 * @returns {string}
 */
function escapeHtml(str) {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

/**
 * @param {State} state
 * @param {(msg: Msg) => void} dispatch
 * @returns {string}
 */
function renderProseColumn(state, dispatch) {
  return html`
    <div
      class="prose-column overflow-y-auto h-full p-6 lg:p-8 bg-prose border-r border-theme"
    >
      <header class="mb-8 pb-4 border-b border-theme">
        <h1 class="text-2xl lg:text-3xl font-extrabold gradient-title mb-2">
          The Elm Architecture
        </h1>
        <p class="text-sm opacity-70">
          An interactive walkthrough with Spriggan
        </p>
      </header>

      ${sections.map((section, index) =>
        renderSection(section, index, state, dispatch),
      )}

      <footer class="mt-8 pt-4 border-t border-theme text-sm opacity-60">
        <p>Built with 🌿 Spriggan — A tiny TEA-inspired framework</p>
      </footer>
    </div>
  `;
}

/**
 * @param {{ id: string; title: string; prose: string; code: string | null; demo: { type: string; title: string; description: string } | null }} section
 * @param {number} index
 * @param {State} state
 * @param {(msg: Msg) => void} dispatch
 * @returns {string}
 */
function renderSection(section, index, state, dispatch) {
  const isActive = index === state.activeSection;
  const isCompleted = index < state.activeSection;

  return html`
    <section
      id="section-${index}"
      class="section-content mb-8 p-4 lg:p-6 rounded-xl border border-theme transition-all ${
        isActive
          ? "bg-accent/5 border-accent/30"
          : isCompleted
            ? "opacity-70"
            : ""
      }"
      data-section="${index}"
    >
      <div class="flex items-center gap-3 mb-4">
        <span
          class="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
            isActive
              ? "bg-accent text-[var(--slide-bg)]"
              : isCompleted
                ? "bg-secondary/50 text-white"
                : "bg-code text-slate-400"
          }"
        >
          ${index + 1}
        </span>
        <h2 class="text-xl font-bold ${isActive ? "text-accent" : ""}">
          ${section.title}
        </h2>
      </div>

      <div class="prose-content text-sm lg:text-base leading-relaxed">
        ${section.prose}
      </div>
    </section>
  `;
}

/**
 * @param {State} state
 * @param {(msg: Msg) => void} dispatch
 * @returns {string}
 */
function renderDemoColumn(state, dispatch) {
  const currentSection = sections[state.activeSection];

  return html`
    <div class="demo-column overflow-y-auto h-full p-6 lg:p-8 bg-demo">
      <div
        class="sticky top-0 bg-demo/95 backdrop-blur-sm pb-4 mb-4 border-b border-theme z-10"
      >
        <div class="flex items-center justify-between">
          <h2 class="text-lg font-semibold text-secondary">
            ${currentSection?.title || "Code & Demo"}
          </h2>
          <div class="flex gap-2">
            <button
              data-msg=${{ type: "ClearMessageLog" }}
              class="text-xs px-2 py-1 rounded bg-slate-700 hover:bg-slate-600 transition-colors"
            >
              Clear Log
            </button>
          </div>
        </div>
      </div>

      ${
        currentSection?.code
          ? html`
            <div class="code-block mb-6">
              <h3 class="text-sm font-semibold text-slate-400 mb-2">Code</h3>
              <pre
                class="animate-fade-in-up"
              ><code class="language-javascript">${escapeHtml(
                currentSection.code,
              )}</code></pre>
            </div>
          `
          : ""
      }
      ${
        currentSection?.demo
          ? renderDemo(currentSection.demo, state, dispatch)
          : ""
      }

      <div
        class="inspector mt-6 p-4 bg-black/30 rounded-xl border border-theme"
      >
        <h3 class="text-sm font-semibold text-slate-400 mb-2">Message Log</h3>
        <div class="message-log">
          ${
            state.messageLog.length === 0
              ? html`<p class="text-xs text-slate-500 italic">
                No messages yet. Interact with demos above!
              </p>`
              : state.messageLog.map(
                  (msg) => html`
                  <div class="message-entry animate-fade-in-up">
                    <span class="text-accent">${msg.type}</span>
                    <span class="text-slate-500 ml-2"
                      >${new Date(msg.timestamp).toLocaleTimeString()}</span
                    >
                  </div>
                `,
                )
          }
        </div>
      </div>
    </div>
  `;
}

/**
 * @param {{ type: string; title: string; description: string }} demo
 * @param {State} state
 * @param {(msg: Msg) => void} dispatch
 * @returns {string}
 */
function renderDemo(demo, state, dispatch) {
  switch (demo.type) {
    case "counter":
      return renderCounterDemo(demo, state, dispatch);
    case "multi-counter":
      return renderMultiCounterDemo(demo, state, dispatch);
    case "todo-mini":
      return renderTodoMiniDemo(demo, state, dispatch);
    default:
      return html`<p class="text-slate-500">
        Unknown demo type: ${demo.type}
      </p>`;
  }
}

/**
 * @param {{ title: string; description: string }} demo
 * @param {State} state
 * @param {(msg: Msg) => void} dispatch
 * @returns {string}
 */
function renderCounterDemo(demo, state, dispatch) {
  const { count } = state.demos.counter;

  return html`
    <div class="demo-container animate-fade-in-up">
      <div class="demo-header">
        <span class="font-semibold text-accent">${demo.title}</span>
        <span class="text-xs text-slate-400">${demo.description}</span>
      </div>
      <div class="demo-content flex flex-col items-center justify-center gap-4">
        <div class="text-4xl font-bold">${count}</div>
        <div class="flex gap-3">
          <button
            data-msg=${{ type: "CounterDecrement" }}
            class="w-12 h-12 rounded-full border-2 border-secondary bg-transparent text-secondary text-2xl cursor-pointer transition-all hover:bg-secondary hover:text-white hover:scale-110"
          >
            -
          </button>
          <button
            data-msg=${{ type: "CounterIncrement" }}
            class="w-12 h-12 rounded-full border-2 border-accent bg-transparent text-accent text-2xl cursor-pointer transition-all hover:bg-accent hover:text-[var(--slide-bg)] hover:scale-110"
          >
            +
          </button>
          <button
            data-msg=${{ type: "CounterReset" }}
            class="px-4 h-12 rounded-lg border-2 border-slate-500 bg-transparent text-slate-400 text-sm cursor-pointer transition-all hover:bg-slate-500 hover:text-white"
          >
            Reset
          </button>
        </div>
      </div>
      <div class="demo-inspector">
        <div class="text-slate-400 mb-2">Current State:</div>
        <code class="text-accent">{ count: ${count} }</code>
      </div>
    </div>
  `;
}

/**
 * @param {{ title: string; description: string }} demo
 * @param {State} state
 * @param {(msg: Msg) => void} dispatch
 * @returns {string}
 */
function renderMultiCounterDemo(demo, state, dispatch) {
  const { counters, autoIncrement } = state.demos.multiCounter;

  return html`
    <div class="demo-container animate-fade-in-up">
      <div class="demo-header">
        <span class="font-semibold text-accent">${demo.title}</span>
        <span class="text-xs text-slate-400">${demo.description}</span>
      </div>
      <div class="demo-content">
        <div class="flex flex-wrap gap-3 mb-4 justify-center">
          ${counters.map(
            (c) => html`
              <div
                class="flex flex-col items-center p-3 bg-black/20 rounded-xl border border-theme"
              >
                <span class="text-xs text-slate-400 mb-1">Counter ${c.id}</span>
                <span class="text-2xl font-bold mb-2">${c.value}</span>
                <div class="flex gap-1">
                  <button
                    data-msg=${{ type: "MultiCounterDecrement", id: c.id }}
                    class="w-8 h-8 rounded-full border border-secondary bg-transparent text-secondary text-lg cursor-pointer transition-all hover:bg-secondary hover:text-white"
                  >
                    -
                  </button>
                  <button
                    data-msg=${{ type: "MultiCounterIncrement", id: c.id }}
                    class="w-8 h-8 rounded-full border border-accent bg-transparent text-accent text-lg cursor-pointer transition-all hover:bg-accent hover:text-[var(--slide-bg)]"
                  >
                    +
                  </button>
                </div>
              </div>
            `,
          )}
        </div>
        <div class="flex flex-wrap gap-2 justify-center">
          <button
            data-msg=${{ type: "MultiCounterAdd" }}
            class="px-3 py-2 rounded-lg bg-accent text-[var(--slide-bg)] text-sm font-medium cursor-pointer transition-all hover:opacity-80"
          >
            Add Counter
          </button>
          <button
            data-msg=${{ type: "MultiCounterRemove" }}
            ${counters.length <= 1 ? "disabled" : ""}
            class="px-3 py-2 rounded-lg bg-red-500/20 text-red-400 text-sm font-medium cursor-pointer transition-all hover:bg-red-500/30 disabled:opacity-30 disabled:cursor-not-allowed"
          >
            Remove
          </button>
          <button
            data-msg=${{ type: "MultiCounterToggleAuto" }}
            class="px-3 py-2 rounded-lg ${
              autoIncrement
                ? "bg-amber-500 text-black"
                : "bg-slate-700 text-slate-300"
            } text-sm font-medium cursor-pointer transition-all hover:opacity-80"
          >
            Auto +1: ${autoIncrement ? "ON" : "OFF"}
          </button>
        </div>
      </div>
      <div class="demo-inspector">
        <div class="text-slate-400 mb-2">Effect Status:</div>
        <code class="${autoIncrement ? "text-amber-400" : "text-slate-500"}">
          ${
            autoIncrement
              ? "⏳ Delay effect running (1000ms interval)"
              : "No active effects"
          }
        </code>
      </div>
    </div>
  `;
}

/**
 * @param {{ title: string; description: string }} demo
 * @param {State} state
 * @param {(msg: Msg) => void} dispatch
 * @returns {string}
 */
function renderTodoMiniDemo(demo, state, dispatch) {
  const { todos, input, filter, nextId } = state.demos.todoMini;
  const filteredTodos = todos.filter((t) => {
    if (filter === "active") return !t.done;
    if (filter === "completed") return t.done;
    return true;
  });

  return html`
    <div class="demo-container animate-fade-in-up">
      <div class="demo-header">
        <span class="font-semibold text-accent">${demo.title}</span>
        <span class="text-xs text-slate-400">${demo.description}</span>
      </div>
      <div class="demo-content">
        <form data-msg=${{ type: "TodoMiniAdd" }} class="flex gap-2 mb-4">
          <input
            type="text"
            data-model="todoInput"
            value="${input}"
            placeholder="Add a todo..."
            class="flex-1 px-3 py-2 rounded-lg bg-black/30 border border-theme text-slide placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-accent"
          />
          <button
            type="submit"
            ${!input.trim() ? "disabled" : ""}
            class="px-4 py-2 rounded-lg bg-accent text-[var(--slide-bg)] font-medium cursor-pointer transition-all hover:opacity-80 disabled:opacity-30 disabled:cursor-not-allowed"
          >
            Add
          </button>
        </form>

        <div class="flex gap-2 mb-4 justify-center">
          ${["all", "active", "completed"].map(
            (f) => html`
              <button
                data-msg=${{ type: "TodoMiniSetFilter", filter: f }}
                class="px-3 py-1 rounded-lg text-sm font-medium cursor-pointer transition-all ${
                  filter === f
                    ? "bg-secondary text-white"
                    : "bg-slate-700 text-slate-300 hover:bg-slate-600"
                }"
              >
                ${f.charAt(0).toUpperCase() + f.slice(1)}
              </button>
            `,
          )}
        </div>

        <ul class="space-y-2">
          ${
            filteredTodos.length === 0
              ? html`<li class="text-center text-slate-500 py-4">
                No todos ${filter !== "all" ? `(${filter})` : ""}
              </li>`
              : filteredTodos.map(
                  (t) => html`
                  <li
                    class="flex items-center gap-3 p-2 rounded-lg bg-black/20 border border-theme group"
                  >
                    <input
                      type="checkbox"
                      data-msg=${{ type: "TodoMiniToggle", id: t.id }}
                      ${t.done ? "checked" : ""}
                      class="w-5 h-5 rounded accent-accent cursor-pointer"
                    />
                    <span
                      class="${
                        t.done ? "line-through text-slate-500" : ""
                      } flex-1"
                      >${t.text}</span
                    >
                    <button
                      data-msg=${{ type: "TodoMiniDelete", id: t.id }}
                      class="opacity-0 group-hover:opacity-100 px-2 py-1 rounded text-xs bg-red-500/20 text-red-400 cursor-pointer transition-all hover:bg-red-500/30"
                    >
                      ✕
                    </button>
                  </li>
                `,
                )
          }
        </ul>
      </div>
      <div class="demo-inspector">
        <div class="text-slate-400 mb-2">Stats:</div>
        <code class="text-accent"
          >${todos.length} total, ${todos.filter((t) => t.done).length}
          done</code
        >
      </div>
    </div>
  `;
}

/**
 * @param {State} state
 * @returns {string}
 */
function renderNavigation(state) {
  return html`
    <nav
      class="fixed bottom-4 left-1/2 -translate-x-1/2 flex gap-1 p-2 bg-black/60 backdrop-blur-xl rounded-full border border-theme z-50"
      id="section-nav"
    >
      ${sections.map(
        (_, index) => html`
          <button
            data-section-nav="${index}"
            class="w-3 h-3 rounded-full cursor-pointer transition-all ${
              index === state.activeSection
                ? "bg-accent scale-125"
                : index < state.activeSection
                  ? "bg-secondary/50"
                  : "bg-slate-600 hover:bg-slate-500"
            }"
            title="Section ${index + 1}: ${sections[index]?.title || "Unknown"}"
          ></button>
        `,
      )}
    </nav>
  `;
}

/**
 * @param {State} state
 * @returns {string}
 */
function renderThemeToggle(state) {
  return html`
    <button
      data-msg=${{ type: "ToggleTheme" }}
      class="fixed top-4 right-4 p-2 rounded-full bg-black/30 backdrop-blur-sm border border-theme cursor-pointer transition-all hover:scale-110 z-50"
      title="Toggle theme"
    >
      ${state.theme === "dark" ? "☀️" : "🌙"}
    </button>
  `;
}

/**
 * @param {State} state
 * @param {(msg: Msg) => void} dispatch
 * @returns {string}
 */
function view(state, dispatch) {
  return html`
    <div
      class="bg-slide text-slide min-h-screen transition-colors duration-400 ${state.theme}"
    >
      <div class="two-column flex h-screen">
        <div class="prose-column w-1/2 lg:w-[45%] min-w-[300px]">
          ${renderProseColumn(state, dispatch)}
        </div>
        <div class="demo-column flex-1">
          ${renderDemoColumn(state, dispatch)}
        </div>
      </div>
      ${renderNavigation(state)} ${renderThemeToggle(state)}
    </div>
  `;
}

function triggerPrismHighlight() {
  requestAnimationFrame(() => {
    if (typeof window.Prism !== "undefined" && window.Prism.highlightAll) {
      window.Prism.highlightAll();
    }
  });
}

/**
 * @param {(msg: Msg) => void} dispatch
 * @returns {(() => void)[]}
 */
function subscriptions(dispatch) {
  let ticking = false;
  let isScrollingProgrammatically = false;

  /**
   * @param {Event} _e
   */
  const handleScroll = (_e) => {
    if (isScrollingProgrammatically) return;
    if (!ticking) {
      requestAnimationFrame(() => {
        const proseColumn = document.querySelector(".prose-column");
        const demoColumn = document.querySelector(".demo-column");
        if (proseColumn) {
          const sectionEls = proseColumn.querySelectorAll("[data-section]");
          const proseRect = proseColumn.getBoundingClientRect();
          // Detect section near top of viewport (15% from top, accounting for header)
          const detectY = proseRect.top + proseRect.height * 0.15;

          let closestIndex = 0;
          let closestDistance = Infinity;

          sectionEls.forEach((section, index) => {
            const rect = section.getBoundingClientRect();
            const sectionTop = rect.top;
            const distance = Math.abs(sectionTop - detectY);

            if (distance < closestDistance) {
              closestDistance = distance;
              closestIndex = index;
            }
          });

          dispatch({ type: "SetActiveSection", index: closestIndex });

          // Sync demo column scroll proportionally
          if (demoColumn && proseColumn) {
            const proseScrollRatio =
              proseColumn.scrollTop /
              (proseColumn.scrollHeight - proseColumn.clientHeight || 1);
            const demoTargetScroll =
              proseScrollRatio *
              (demoColumn.scrollHeight - demoColumn.clientHeight);
            if (Math.abs(demoColumn.scrollTop - demoTargetScroll) > 5) {
              demoColumn.scrollTop = demoTargetScroll;
            }
          }
        }
        ticking = false;
      });
      ticking = true;
    }
  };

  /**
   * @param {number} sectionIndex
   */
  const scrollToSection = (sectionIndex) => {
    const proseColumn = document.querySelector(".prose-column");
    const demoColumn = document.querySelector(".demo-column");
    if (!proseColumn) return;

    const sectionEl = proseColumn.querySelector(
      `[data-section="${sectionIndex}"]`,
    );
    if (!sectionEl) return;

    isScrollingProgrammatically = true;

    sectionEl.scrollIntoView({ behavior: "smooth", block: "start" });

    setTimeout(() => {
      isScrollingProgrammatically = false;
    }, 600);
  };

  // Expose scrollToSection globally for navigation clicks
  /** @type {Window & { teaWalkthroughScrollTo?: (index: number) => void }} */
  const win = /** @type {*} */ (window);
  win.teaWalkthroughScrollTo = scrollToSection;

  /**
   * @param {KeyboardEvent} e
   */
  const handleKeydown = (e) => {
    if (
      e.target instanceof HTMLInputElement ||
      e.target instanceof HTMLTextAreaElement
    )
      return;

    const currentSection = sections.length > 0 ? sections[0] : null;

    if (e.key === "ArrowDown" || e.key === "PageDown") {
      e.preventDefault();
      const proseColumn = document.querySelector(".prose-column");
      if (proseColumn) {
        proseColumn.scrollBy({ top: 200, behavior: "smooth" });
      }
    } else if (e.key === "ArrowUp" || e.key === "PageUp") {
      e.preventDefault();
      const proseColumn = document.querySelector(".prose-column");
      if (proseColumn) {
        proseColumn.scrollBy({ top: -200, behavior: "smooth" });
      }
    } else if (e.key === "Home") {
      e.preventDefault();
      const proseColumn = document.querySelector(".prose-column");
      if (proseColumn) {
        proseColumn.scrollTo({ top: 0, behavior: "smooth" });
      }
    } else if (e.key === "t" || e.key === "T") {
      dispatch({ type: "ToggleTheme" });
    }
  };

  const proseColumn = document.querySelector(".prose-column");
  if (proseColumn) {
    proseColumn.addEventListener("scroll", handleScroll, { passive: true });
  }
  document.addEventListener("keydown", handleKeydown);

  /**
   * @param {MouseEvent} e
   */
  const handleNavClick = (e) => {
    const target = e.target;
    if (target instanceof HTMLElement) {
      const navBtn = target.closest("[data-section-nav]");
      if (navBtn instanceof HTMLElement) {
        const index = parseInt(navBtn.dataset.sectionNav || "0", 10);
        dispatch({ type: "SetActiveSection", index });
        if (win.teaWalkthroughScrollTo) {
          win.teaWalkthroughScrollTo(index);
        }
      }
    }
  };
  document.addEventListener("click", handleNavClick);

  const savedTheme = localStorage.getItem("tea-walkthrough-theme");
  if (savedTheme === "light") {
    dispatch({ type: "SetTheme", theme: "light" });
  }

  setTimeout(triggerPrismHighlight, 100);

  return [
    () => {
      if (proseColumn) {
        proseColumn.removeEventListener("scroll", handleScroll);
      }
      document.removeEventListener("keydown", handleKeydown);
      document.removeEventListener("click", handleNavClick);
    },
  ];
}

/** @type {Record<string, (effect: { [key: string]: unknown }, _dispatch: (msg: Msg) => void) => void>} */
const customEffects = {
  announce: (effect, _dispatch) => {
    const announcer = document.getElementById("sr-announcer");
    if (announcer && effect.message) {
      announcer.textContent = "";
      setTimeout(() => {
        announcer.textContent = String(effect.message || "");
      }, 50);
    }
  },
};

const instance = app("#app", {
  init,
  update,
  view,
  subscriptions,
  effects: customEffects,
  debug: location.href.includes("localhost"),
});

setTimeout(triggerPrismHighlight, 200);
