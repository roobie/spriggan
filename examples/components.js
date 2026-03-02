/// Spriggan is not designed to be used as a 'component' framework
/// This file shows anti-patterns
import createSpriggan, { html } from "../src/spriggan.js";

/**
 * @param {string | HTMLElement} mountPoint
 */
export function mount(mountPoint, component) {
  // use the factory to make our own little Spriggan state.
  const { app } = createSpriggan();
  return app(mountPoint, component);
}

/**
 * @typedef ({count: number}) State
 * @typedef ({ type: "increment" } | { type: "decrement" }) Msg
 *
 * @param {string | HTMLElement} mountPoint
 * @param {State | undefined} initialState
 */
export const Counter = {
  init: (initialState) => initialState ?? { count: 0 },
  update: (state, msg) => {
    switch (msg.type) {
      case "increment":
        return { ...state, count: state.count + 1 };
      case "decrement":
        return { ...state, count: state.count - 1 };
      default:
        return state;
    }
  },
  view: (state, _dispatch) => html`
    <div>
      <h1>Counter: ${state.count}</h1>
      <button data-msg=${{ type: "decrement" }}>-</button>
      <button data-msg=${{ type: "increment" }}>+</button>
    </div>
  `,
};

export const Loading = {
  init: () => ({}),
  update: () => void 0,
  // class="flex items-center justify-center min-h-screen text-lg opacity-70 [animation:pulse_1.5s_ease-in-out_infinite]"
  view: () => html` <div></div>`,
};

export const CounterList = {
  init: () => ({ counters: [] }),
  update: (state, msg) => {
    if (msg.$path?.startsWith("counter:")) {
      const parts = msg.$path.split(":");
      const index = parseInt(parts[1], 10);

      const subState = state.counters[index];

      const copy = [...state.counters];
      copy[index] = Counter.update(subState, msg);

      // TODO this is just wrong
      return {
        ...state,
        counters: copy,
      };
    } else {
      switch (msg.type) {
        case "AddCounter": {
          return {
            ...state,
            counters: [...state.counters, { count: 0 }],
          };
        }
      }
    }
  },
  view: (state) => html`
    <div>
      <button type="button" data-msg=${{ type: "AddCounter" }}>
        Add counter
      </button>

      <div>Counters count: ${state.counters.length}</div>

      <div>
        ${state.counters.map((ss, i) => {
          const a = Counter.view(ss);
          const b = doReplace(
            a,
            "data-msg='{",
            `data-msg='{"$path":"counter:${i}",`,
          );
          return b;
        })}
      </div>
    </div>
  `,
};

// this ain't pretty
function doReplace(str, a, b) {
  return str.split(a).join(b);
}
