import createSpriggan, { html } from "../src/spriggan.js";

const { app } = createSpriggan();

const converter = new showdown.Converter();

// ========================================================================
// Model
// ========================================================================

/**
 * @typedef {{
 *   tasks: Task[];
 *   filter: "all" | "active" | "completed";
 *   newTaskText: string;
 *   editingId: number | null;
 *   editText: string;
 *   quote: string | null;
 *   loading: boolean;
 *   error: string | null;
 *   nextId: number;
 * }} State
 */

/** @typedef {{ id: number; text: string; completed: boolean; created: number }} Task */

/** @returns {State} */
const init = () => ({
  tasks: [],
  filter: "all",
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
 *   type: "FieldChanged";
 *   field: "newTaskText" | "editText";
 *   value: string;
 * } | {
 *   type: "AddTask";
 * } | {
 *   type: "ToggleTask";
 *   id: number;
 * } | {
 *   type: "DeleteTask";
 *   id: number;
 * } | {
 *   type: "StartEdit";
 *   id: number;
 * } | {
 *   type: "UpdateEdit";
 *   text: string;
 * } | {
 *   type: "SaveEdit";
 * } | {
 *   type: "CancelEdit";
 * } | {
 *   type: "UpdateNewTask";
 *   text: string;
 * } | {
 *   type: "SetFilter";
 *   filter: "all" | "active" | "completed";
 * } | {
 *   type: "LoadTasks";
 *   tasks: Task[];
 * } | {
 *   type: "FetchQuote";
 * } | {
 *   type: "QuoteFetched";
 *   data: string;
 * } | {
 *   type: "QuoteError";
 *   error: string;
 * } | {
 *   type: "ClearCompleted";
 * }} Msg
 */

/** @typedef {{ type: string; [key: string]: unknown }} Effect */

/**
 * @param {State} state
 * @param {Msg} msg
 * @returns {State | [State, ...Effect[]]}
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

    case "AddTask": {
      if (!state.newTaskText.trim()) return state;
      const newTask = {
        id: state.nextId,
        text: state.newTaskText.trim(),
        completed: false,
        created: Date.now(),
      };
      return [
        {
          ...state,
          tasks: [newTask, ...state.tasks],
          newTaskText: "",
          nextId: state.nextId + 1,
        },
        /** @type {Effect} */ ({
          type: "storage",
          action: "set",
          key: "tasks",
          value: [...state.tasks, newTask],
        }),
      ];
    }
    case "ToggleTask": {
      const updatedTasks = state.tasks.map((/** @type {Task} */ task) =>
        task.id === msg.id ? { ...task, completed: !task.completed } : task,
      );
      return [
        { ...state, tasks: updatedTasks },
        /** @type {Effect} */ ({
          type: "storage",
          action: "set",
          key: "tasks",
          value: updatedTasks,
        }),
      ];
    }

    case "DeleteTask": {
      const filteredTasks = state.tasks.filter(
        (/** @type {Task} */ task) => task.id !== msg.id,
      );
      return [
        { ...state, tasks: filteredTasks },
        /** @type {Effect} */ ({
          type: "storage",
          action: "set",
          key: "tasks",
          value: filteredTasks,
        }),
      ];
    }

    case "StartEdit": {
      const taskToEdit = state.tasks.find(
        (/** @type {Task} */ t) => t.id === msg.id,
      );
      return [
        {
          ...state,
          editingId: msg.id,
          editText: taskToEdit ? taskToEdit.text : "",
        },
        /** @type {Effect} */ ({
          type: "dom",
          action: "focus",
          selector: '.modal-content input[data-model="editText"]',
        }),
      ];
    }

    case "UpdateEdit":
      return { ...state, editText: msg.text };

    case "SaveEdit": {
      if (!state.editText.trim() || state.editingId === null)
        return { ...state, editingId: null, editText: "" };
      const editedTasks = state.tasks.map((/** @type {Task} */ task) =>
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
        /** @type {Effect} */ ({
          type: "storage",
          action: "set",
          key: "tasks",
          value: editedTasks,
        }),
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
        nextId:
          Math.max(
            ...(msg.tasks || []).map((/** @type {{ id: number }} */ t) => t.id),
            0,
          ) + 1,
      };

    case "FetchQuote":
      return [
        { ...state, loading: true, error: null },
        /** @type {Effect} */ ({
          type: "http",
          url: "./message-debug.md",
          onSuccess: "QuoteFetched",
          onError: "QuoteError",
        }),
      ];

    case "QuoteFetched":
      return { ...state, quote: msg.data, loading: false };

    case "QuoteError":
      return { ...state, error: msg.error, loading: false };

    case "ClearCompleted": {
      const activeTasks = state.tasks.filter(
        (/** @type {{ completed: boolean }} */ task) => !task.completed,
      );
      return [
        { ...state, tasks: activeTasks },
        /** @type {Effect} */ ({
          type: "storage",
          action: "set",
          key: "tasks",
          value: activeTasks,
        }),
      ];
    }

    default:
      return state;
  }
}

// ========================================================================
// View
// ========================================================================

/**
 * @param {State} state
 * @param {(msg: Msg) => void} _dispatch
 * @returns {string}
 */
function view(state, _dispatch) {
  const filteredTasks = getFilteredTasks(state);

  return html`
    <div class="space-y-6">
      ${renderQuote(state)} ${renderStats(state)} ${renderFilters(state)}
      ${renderAddTask(state)} ${renderTaskList(filteredTasks, state)}
      ${renderClearCompleted(state)} ${renderEditModal(state)}
    </div>
  `;
}

/**
 * @param {State} state
 * @returns {string}
 */
function renderQuote(state) {
  if (state.loading) {
    return html`
      <div
        class="bg-blue-900/50 p-4 rounded-lg italic text-slate-300 animate-pulse"
      >
        Loading quote...
      </div>
    `;
  }
  if (state.error) {
    return html`
      <div class="bg-red-900/50 p-4 rounded-lg italic text-red-300">
        Error: ${state.error}
      </div>
    `;
  }
  if (!state.quote) {
    return html`
      <div class="bg-blue-900/50 p-4 rounded-lg italic text-slate-300">
        <button
          data-msg=${{ type: "FetchQuote" }}
          class="px-3 py-1 bg-blue-600 hover:bg-blue-500 rounded text-white text-sm transition-colors"
        >
          Get Inspiration
        </button>
      </div>
    `;
  }

  return html`
    <div class="bg-blue-900/50 p-4 rounded-lg italic text-slate-300">
      ${converter.makeHtml(state.quote)}
      <br />
      <small class="text-slate-400">— Stylish</small>
      <br />
      <small>
        <button
          data-msg=${{ type: "FetchQuote" }}
          class="px-3 py-1 bg-blue-600 hover:bg-blue-500 rounded text-white text-sm transition-colors mt-2"
        >
          New Post
        </button>
      </small>
    </div>
  `;
}

/**
 * @param {State} state
 * @returns {string}
 */
function renderStats(state) {
  const total = state.tasks.length;
  const active = state.tasks.filter(
    (/** @type {{ completed: boolean }} */ t) => !t.completed,
  ).length;
  const completed = total - active;

  return html`
    <div class="grid grid-cols-3 gap-4">
      <div class="bg-amber-600 p-4 rounded-lg text-center">
        <div class="text-2xl font-bold">${total}</div>
        <div class="text-sm text-amber-100">Total Tasks</div>
      </div>
      <div class="bg-amber-600 p-4 rounded-lg text-center">
        <div class="text-2xl font-bold">${active}</div>
        <div class="text-sm text-amber-100">Active</div>
      </div>
      <div class="bg-amber-600 p-4 rounded-lg text-center">
        <div class="text-2xl font-bold">${completed}</div>
        <div class="text-sm text-amber-100">Completed</div>
      </div>
    </div>
  `;
}

/**
 * @param {State} state
 * @returns {string}
 */
function renderFilters(state) {
  const baseClasses = "px-4 py-2 rounded text-sm font-medium transition-colors";
  const activeClasses = "bg-slate-800 text-white";
  const inactiveClasses = "bg-slate-600 text-slate-200 hover:bg-slate-500";

  return html`
    <div class="flex gap-2 justify-center">
      <button
        data-msg=${{ type: "SetFilter", filter: "all" }}
        class="${baseClasses} ${
          state.filter === "all" ? activeClasses : inactiveClasses
        }"
      >
        All
      </button>
      <button
        data-msg=${{ type: "SetFilter", filter: "active" }}
        class="${baseClasses} ${
          state.filter === "active" ? activeClasses : inactiveClasses
        }"
      >
        Active
      </button>
      <button
        data-msg=${{ type: "SetFilter", filter: "completed" }}
        class="${baseClasses} ${
          state.filter === "completed" ? activeClasses : inactiveClasses
        }"
      >
        Completed
      </button>
    </div>
  `;
}

/**
 * @param {State} state
 * @returns {string}
 */
function renderAddTask(state) {
  return html`
    <form data-msg=${{ type: "AddTask" }} class="flex gap-2">
      <input
        type="text"
        placeholder="What needs to be done?"
        data-model="newTaskText"
        value="${state.newTaskText}"
        autofocus
        class="flex-1 px-4 py-2 rounded bg-slate-800 border border-slate-600 text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
      />
      <button
        type="submit"
        ${!state.newTaskText.trim() ? "disabled" : ""}
        class="px-6 py-2 bg-green-600 hover:bg-green-500 disabled:bg-slate-700 disabled:text-slate-500 rounded font-medium transition-colors"
      >
        Add Task
      </button>
    </form>
  `;
}

/**
 * @param {State["tasks"]} tasks
 * @param {State} state
 * @returns {string}
 */
function renderTaskList(tasks, state) {
  if (tasks.length === 0) {
    return html`
      <p class="text-center text-slate-400 py-8">
        No tasks ${state.filter !== "all" ? `(${state.filter})` : ""}
      </p>
    `;
  }

  return html`
    <ul class="space-y-2">
      ${tasks.map((/** @type {Task} */ task) => renderTask(task))}
    </ul>
  `;
}

/**
 * @param {Task} task
 * @returns {string}
 */
function renderTask(task) {
  return html`
    <li
      class="grid grid-cols-[auto_1fr_auto] items-center gap-4 p-3 border border-slate-700 rounded-lg bg-slate-800/50 hover:bg-slate-800 transition-colors group"
    >
      <input
        type="checkbox"
        data-msg=${{ type: "ToggleTask", id: task.id }}
        ${task.completed ? "checked" : ""}
        class="w-5 h-5 rounded accent-green-500 cursor-pointer"
      />
      <span
        class="${
          task.completed ? "line-through text-slate-500" : "text-slate-100"
        } truncate"
      >
        ${task.text}
      </span>
      <div
        class="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity"
      >
        <button
          data-msg=${{ type: "StartEdit", id: task.id }}
          class="px-3 py-1 bg-slate-600 hover:bg-slate-500 rounded text-sm transition-colors"
        >
          Edit
        </button>
        <button
          data-msg=${{ type: "DeleteTask", id: task.id }}
          class="px-3 py-1 bg-red-600 hover:bg-red-500 rounded text-sm transition-colors"
        >
          Delete
        </button>
      </div>
    </li>
  `;
}

/**
 * @param {State} state
 * @returns {string}
 */
function renderClearCompleted(state) {
  const completedCount = state.tasks.filter(
    (/** @type {{ completed: boolean }} */ t) => t.completed,
  ).length;

  return html`
    <div class="text-center">
      <button
        data-msg=${{ type: "ClearCompleted" }}
        ${completedCount === 0 ? "disabled" : ""}
        class="px-4 py-2 bg-slate-700 hover:bg-slate-600 disabled:bg-slate-800 disabled:text-slate-500 rounded text-sm transition-colors"
      >
        Clear Completed (${completedCount})
      </button>
    </div>
  `;
}

/**
 * @param {State} state
 * @returns {string}
 */
function renderEditModal(state) {
  if (state.editingId === null) return "";

  const task = state.tasks.find(
    (/** @type {Task} */ t) => t.id === state.editingId,
  );
  if (!task) return "";

  return html`
    <div
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
    >
      <div class="absolute inset-0" data-msg=${{ type: "CancelEdit" }}></div>
      <div
        class="relative z-10 bg-slate-800 p-6 rounded-lg shadow-xl min-w-[300px] max-w-[90vw] border border-slate-600"
      >
        <h3 class="text-lg font-semibold mb-4">Edit Task</h3>
        <input
          type="text"
          data-model="editText"
          value="${state.editText}"
          class="w-full px-4 py-2 rounded bg-slate-700 border border-slate-600 text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent mb-4"
        />
        <div class="flex justify-end gap-2">
          <button
            data-msg=${{ type: "CancelEdit" }}
            class="px-4 py-2 bg-slate-600 hover:bg-slate-500 rounded transition-colors"
          >
            Cancel
          </button>
          <button
            data-msg=${{ type: "SaveEdit" }}
            class="px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded transition-colors"
          >
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

/**
 * @param {State} state
 * @returns {State["tasks"]}
 */
function getFilteredTasks(state) {
  switch (state.filter) {
    case "active":
      return state.tasks.filter(
        (/** @type {{ completed: boolean }} */ task) => !task.completed,
      );
    case "completed":
      return state.tasks.filter(
        (/** @type {{ completed: boolean }} */ task) => task.completed,
      );
    default:
      return state.tasks;
  }
}

// ========================================================================
// Bootstrap
// ========================================================================

app("#app", {
  init,
  update,
  view,
  debug: true,
  subscriptions: (dispatch) => {
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

    /**
     * @param {KeyboardEvent} e
     */
    const handleKeydown = (e) => {
      if (/** @type {HTMLElement} */ (e.target).tagName === "INPUT") return;

      if (e.key === "n" && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        const input = /** @type {HTMLInputElement | null} */ (
          document.querySelector('input[data-model="newTaskText"]')
        );
        if (input) input.focus();
      }
    };

    document.addEventListener("keydown", handleKeydown);

    return () => {
      document.removeEventListener("keydown", handleKeydown);
    };
  },
});
