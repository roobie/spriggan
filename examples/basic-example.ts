import createSpriggan from "@src/spriggan.js";

const { app, html } = createSpriggan();

type State = { count: number };
type Msg = { type: "increment" } | { type: "decrement" };

const demo = app<State, Msg>("#demo", {
  init: () => ({ count: 0 }),
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
});

// dispatch is now typed - only accepts Msg
demo.dispatch({ type: "increment" }); // ✓
// demo.dispatch({ type: "invalid" });   // ✗ type error
