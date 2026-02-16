const init = {
  count: 0,
  status: "idle",
  users: [],
};

function update(state, msg) {
  switch (msg.type) {
    case "Increment":
      return { ...state, count: state.count + 1 };

    case "Decrement":
      return { ...state, count: state.count - 1 };

    case "FetchUsers":
      return [
        { ...state, status: "loading" },
        {
          type: "http",
          url: "/api/users",
          onSuccess: "UsersLoaded",
          onError: "UsersFailed",
        },
      ];

    case "UsersLoaded":
      return { ...state, status: "success", users: msg.data };

    case "UsersFailed":
      return { ...state, status: "error" };

    default:
      return state;
  }
}

function view(state, dispatch) {
  return html`
    <div>
      <h1>Count: ${state.count}</h1>
      <button data-msg='{"type":"Increment"}'>+</button>
      <button data-msg='{"type":"Decrement"}'>-</button>

      <hr />

      <button data-msg='{"type":"FetchUsers"}'>Load Users</button>
      <p>Status: ${state.status}</p>

      ${state.users.length > 0
        ? html`
            <ul>
              ${state.users.map((u) => `<li>${u.name}</li>`).join("")}
            </ul>
          `
        : ""}
    </div>
  `;
}

app("#root", { init, update, view });
