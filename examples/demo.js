import createSpriggan, { html } from "../src/spriggan.js";

const { app } = createSpriggan();

const converter = new showdown.Converter();

// ========================================================================
// Model
// ========================================================================

/**
 * @typedef {{
 *   tasks: { id: number; text: string; completed: boolean; created: number }[];
 *   filter: "all" | "active" | "completed";
 *   newTaskText: string;
 *   editingId: number | null;
 *   editText: string;
 *   quote: string | null;
 *   loading: boolean;
 *   error: string | null;
 *   nextId: number;
 * }} State
 * @returns {State}
 */
const init = () => ({
  tasks: [],
  filter: "all", // 'all', 'active', 'completed'
  newTaskText: "",
  editingId: null,
  editText: "",
  quote: null,
  loading: false,
  error: null,
  nextId: 1,
});

// ========================================================================
// Update
// ========================================================================

/**
 * @typedef {{
 *  type: "FieldChanged";
 *  field: "newTaskText" | "editText";
 *  value: string;
 * } | {
 *  type: "AddTask";
 * } | {
 *  type: "ToggleTask";
 *  id: number;
 * } | {
 *  type: "DeleteTask";
 *  id: number;
 * } | {
 *  type: "StartEdit";
 *  id: number;
 * } | {
 *  type: "UpdateEdit";
 *  text: string;
 * } | {
 *  type: "SaveEdit";
 * } | {
 *  type: "CancelEdit";
 * } | {
 *  type: "UpdateNewTask";
 *  text: string;
 * } | {
 *  type: "SetFilter";
 *  filter: "all" | "active" | "completed";
 * } | {
 *  type: "LoadTasks";
 *  tasks: { id: number; text: string; completed: boolean; created: number }[];
 * } | {
 *  type: "FetchQuote";
 * } | {
 *  type: "QuoteFetched";
 *  data: string;
 * } | {
 *  type: "QuoteError";
 *  error: string;
 * }} Msg
 * @param {State} state
 * @param {Msg} msg
 * @returns
 */
function update(state, msg) {
  switch (msg.type) {
    case "FieldChanged":
      switch (msg.field) {
        case "newTaskText":
          return { ...state, newTaskText: msg.value };
        case "editText":
          return { ...state, editText: msg.value };
        default:
          return state;
      }

    case "AddTask":
      if (!state.newTaskText.trim()) return state;
      return [
        {
          ...state,
          tasks: [
            ...state.tasks,
            {
              id: state.nextId,
              text: state.newTaskText.trim(),
              completed: false,
              created: Date.now(),
            },
          ],
          newTaskText: "",
          nextId: state.nextId + 1,
        },
        {
          type: "storage",
          action: "set",
          key: "tasks",
          value: [
            ...state.tasks,
            {
              id: state.nextId,
              text: state.newTaskText.trim(),
              completed: false,
              created: Date.now(),
            },
          ],
        },
      ];

    case "ToggleTask": {
      const updatedTasks = state.tasks.map((task) =>
        task.id === msg.id ? { ...task, completed: !task.completed } : task,
      );
      return [
        {
          ...state,
          tasks: updatedTasks,
        },
        {
          type: "storage",
          action: "set",
          key: "tasks",
          value: updatedTasks,
        },
      ];
    }

    case "DeleteTask": {
      const filteredTasks = state.tasks.filter((task) => task.id !== msg.id);
      return [
        {
          ...state,
          tasks: filteredTasks,
        },
        {
          type: "storage",
          action: "set",
          key: "tasks",
          value: filteredTasks,
        },
      ];
    }

    case "StartEdit": {
      const taskToEdit = state.tasks.find((t) => t.id === msg.id);
      return [
        {
          ...state,
          editingId: msg.id,
          editText: taskToEdit ? taskToEdit.text : "",
        },
        {
          type: "dom",
          action: "focus",
          selector: '.modal-content input[data-model="editText"]',
        },
      ];
    }

    case "UpdateEdit":
      return { ...state, editText: msg.text };

    case "SaveEdit": {
      if (!state.editText.trim() || state.editingId === null)
        return { ...state, editingId: null, editText: "" };
      const editedTasks = state.tasks.map((task) =>
        task.id === state.editingId
          ? { ...task, text: state.editText.trim() }
          : task,
      );
      return [
        {
          ...state,
          tasks: editedTasks,
          editingId: null,
          editText: "",
        },
        {
          type: "storage",
          action: "set",
          key: "tasks",
          value: editedTasks,
        },
      ];
    }

    case "CancelEdit":
      return { ...state, editingId: null, editText: "" };

    case "UpdateNewTask":
      return { ...state, newTaskText: msg.text };

    case "SetFilter":
      return { ...state, filter: msg.filter };

    case "LoadTasks":
      return {
        ...state,
        tasks: msg.tasks || [],
        nextId: Math.max(...(msg.tasks || []).map((t) => t.id), 0) + 1,
      };

    case "FetchQuote":
      return [
        { ...state, loading: true, error: null },
        {
          type: "http",
          url: "./examples/message-debug.md",
          onSuccess: "QuoteFetched",
          onError: "QuoteError",
        },
      ];

    case "QuoteFetched":
      return { ...state, quote: msg.data, loading: false };

    case "QuoteError":
      return { ...state, error: msg.error, loading: false };

    case "ClearCompleted": {
      const activeTasks = state.tasks.filter((task) => !task.completed);
      return [
        {
          ...state,
          tasks: activeTasks,
        },
        {
          type: "storage",
          action: "set",
          key: "tasks",
          value: activeTasks,
        },
      ];
    }

    default:
      return state;
  }
}

// ========================================================================
// View
// ========================================================================

function view(state, dispatch) {
  const filteredTasks = getFilteredTasks(state);

  return html`
    <div>
      <h1>Task Manager</h1>

      ${renderQuote(state, dispatch)} ${renderStats(state)}
      ${renderFilters(state, dispatch)} ${renderAddTask(state, dispatch)}
      ${renderTaskList(filteredTasks, state, dispatch)}
      ${renderEditModal(state)}

      <div>
        <button
          data-msg=${{ type: "ClearCompleted" }}
          ${state.tasks.filter((t) => t.completed).length === 0
            ? "disabled"
            : ""}
        >
          Clear Completed (${state.tasks.filter((t) => t.completed).length})
        </button>
      </div>
    </div>
  `;
}

function renderQuote(state, _dispatch) {
  if (state.loading)
    return html`<div class="quote bg-gray p2 rounded my2 italic">
      Loading quote...
    </div>`;
  if (state.error)
    return html`<div class="quote bg-gray p2 rounded my2 italic">
      Error: ${state.error}
    </div>`;
  if (!state.quote)
    return html`<div class="quote bg-gray p2 rounded my2 italic">
      <button data-msg=${{ type: "FetchQuote" }}>Get Inspiration</button>
    </div>`;

  return html`
    <div class="quote bg-gray p2 rounded my2 italic">
      ${converter.makeHtml(state.quote)}
      <br /><small>— Stylish</small> <br /><small
        ><button data-msg=${{ type: "FetchQuote" }}>New Post</button></small
      >
    </div>
  `;
}

function renderStats(state) {
  const total = state.tasks.length;
  const active = state.tasks.filter((t) => !t.completed).length;
  const completed = total - active;

  return html`
    <div class="stats">
      <div class="stat bg-black p2 rounded center">
        <strong>${total}</strong><br />Total Tasks
      </div>
      <div class="stat bg-black p2 rounded center">
        <strong>${active}</strong><br />Active
      </div>
      <div class="stat bg-black p2 rounded center">
        <strong>${completed}</strong><br />Completed
      </div>
    </div>
  `;
}

function renderFilters(state, _dispatch) {
  return html`
    <div class="filters flex mx2 my2">
      <button
        data-msg=${{ type: "SetFilter", filter: "all" }}
        class="${state.filter === "all" ? "secondary" : ""}"
      >
        All
      </button>
      <button
        data-msg=${{ type: "SetFilter", filter: "active" }}
        class="${state.filter === "active" ? "secondary" : ""}"
      >
        Active
      </button>
      <button
        data-msg=${{ type: "SetFilter", filter: "completed" }}
        class="${state.filter === "completed" ? "secondary" : ""}"
      >
        Completed
      </button>
    </div>
  `;
}

function renderAddTask(state, _dispatch) {
  return html`
    <form data-msg=${{ type: "AddTask" }}>
      <input
        type="text"
        placeholder="What needs to be done?"
        data-model="newTaskText"
        value="${state.newTaskText}"
        autofocus
      />
      <button type="submit" ${!state.newTaskText.trim() ? "disabled" : ""}>
        Add Task
      </button>
    </form>
  `;
}

function renderTaskList(tasks, state, dispatch) {
  if (tasks.length === 0) {
    return html`<p>
      No tasks ${state.filter !== "all" ? `(${state.filter})` : ""}
    </p>`;
  }

  return html`
    <ul>
      ${tasks.map((task) => renderTask(task, state, dispatch))}
    </ul>
  `;
}

function renderTask(task, state, _dispatch) {
  const _isEditing = state.editingId === task.id;

  return html`
    <li
      class="task-item ${task.completed
        ? "completed"
        : ""} items-center p1 border rounded my1 list-style-none"
    >
      <input
        type="checkbox"
        class="checkbox"
        data-msg=${{ type: "ToggleTask", id: task.id }}
        ${task.completed ? "checked" : ""}
      />

      <span class="task-text truncate">${task.text}</span>
      <div class="task-actions flex">
        <button data-msg=${{ type: "StartEdit", id: task.id }}>Edit</button>
        <button data-msg=${{ type: "DeleteTask", id: task.id }}>Delete</button>
      </div>
    </li>
  `;
}

function renderEditModal(state) {
  if (state.editingId === null) return "";

  const task = state.tasks.find((t) => t.id === state.editingId);
  if (!task) return "";

  return html`
    <div
      class="modal-overlay fixed top-0 right-0 bottom-0 left-0 flex items-center justify-center z4"
    >
      <div
        class="modal-backdrop absolute top-0 right-0 bottom-0 left-0"
        data-msg=${{ type: "CancelEdit" }}
      ></div>
      <div class="modal-content relative z1 p3 rounded max-width-4">
        <h3 class="mt0 mb2">Edit Task</h3>
        <input
          type="text"
          class="col-12 mb2"
          data-model="editText"
          value="${state.editText}"
        />
        <div class="modal-actions flex justify-end mx1">
          <button data-msg=${{ type: "CancelEdit" }} class="m0">Cancel</button>
          <button data-msg=${{ type: "SaveEdit" }} class="secondary m0">
            Save
          </button>
        </div>
      </div>
    </div>
  `;
}

// ========================================================================
// Utilities
// ========================================================================

function getFilteredTasks(state) {
  switch (state.filter) {
    case "active":
      return state.tasks.filter((task) => !task.completed);
    case "completed":
      return state.tasks.filter((task) => task.completed);
    default:
      return state.tasks;
  }
}

// ========================================================================
// Bootstrap
// ========================================================================

window.app = app("#app", {
  init,
  update,
  view,
  debug: true,
  subscriptions: (dispatch) => {
    // Load tasks from localStorage on startup
    const loadTasks = () => {
      try {
        const stored = localStorage.getItem("tasks");
        if (stored) {
          dispatch({ type: "LoadTasks", tasks: JSON.parse(stored) });
        }
      } catch (e) {
        console.warn("Failed to load tasks from storage", e);
      }
    };
    loadTasks();

    // Focus modal input when modal opens
    const focusModalInput = () => {
      const input = document.querySelector(
        '.modal-content input[data-model="editText"]',
      );
      if (input) input.focus();
    };
    const observer = new MutationObserver(focusModalInput);
    observer.observe(document.getElementById("app"), {
      childList: true,
      subtree: true,
    });

    // Keyboard shortcuts
    const handleKeydown = (e) => {
      if (e.target.tagName === "INPUT") return; // Don't interfere with input

      if (e.key === "n" && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        document.querySelector('input[data-model="newTaskText"]').focus();
      }
    };

    document.addEventListener("keydown", handleKeydown);

    // Cleanup
    return () => {
      document.removeEventListener("keydown", handleKeydown);
      observer.disconnect();
    };
  },
});
