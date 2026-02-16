function closure() {
  // Internal to the framework
  let currentState = null;
  let currentView = null;
  let rootElement = null;
  let updateFn = null;
  let viewFn = null;
  let effectHandlers = {};

  class SprigganError extends Error {
    constructor(message: string) {
      super(message);
    }
  }

  function app(selector, config) {
    const { init, update, view, effects = {} } = config;

    rootElement = document.querySelector(selector);
    if (!rootElement) {
      throw new SprigganError(`Spriggan: element "${selector}" not found`);
    }

    updateFn = update;
    viewFn = view;
    effectHandlers = { ...defaultEffects, ...effects };

    // Initialize with starting state
    currentState = typeof init === "function" ? init() : init;

    // First render
    render();

    // Return API for external interaction
    return {
      dispatch,
      getState: () => currentState,
      destroy: () => {
        rootElement.innerHTML = "";
      },
    };
  }

  function dispatch(msg) {
    // Call update function
    const result = updateFn(currentState, msg);

    // Handle different return types
    if (Array.isArray(result)) {
      // [newState, effect] or [newState, effect1, effect2, ...]
      const [newState, ...effects] = result;
      currentState = newState;

      // Process effects after state update
      effects.forEach((eff) => {
        if (eff) runEffect(eff);
      });
    } else {
      // Just new state
      currentState = result;
    }

    // Re-render with new state
    render();
  }

  function render() {
    // Get new view
    const newView = viewFn(currentState, dispatch);

    // Convert to DOM if needed
    const newContent = typeof newView === "string" ? newView : newView; // Could be DOM nodes from html``

    // Simple approach: innerHTML replacement
    // (We'll optimize this later with morphdom/idiomorph)
    if (typeof newContent === "string") {
      rootElement.innerHTML = newContent;
      attachEventListeners(rootElement);
    } else {
      rootElement.innerHTML = "";
      rootElement.appendChild(newContent);
    }

    currentView = newView;
  }

  function runEffect(effect) {
    if (!effect || !effect.type) return;

    const handler = effectHandlers[effect.type];
    if (!handler) {
      console.warn(`Spriggan: unknown effect type "${effect.type}"`);
      return;
    }

    // Run the effect handler
    handler(effect, dispatch);
  }

  // Built-in effect handlers
  const defaultEffects = {
    // HTTP requests
    http: (effect, dispatch) => {
      const { url, method = "GET", body, headers, onSuccess, onError } = effect;

      fetch(url, {
        method,
        headers: headers || {},
        body: body ? JSON.stringify(body) : undefined,
      })
        .then((r) => r.json())
        .then((data) => {
          if (onSuccess) {
            dispatch({ type: onSuccess, data });
          }
        })
        .catch((err) => {
          if (onError) {
            dispatch({ type: onError, error: err.message });
          }
        });
    },

    // Timers
    delay: (effect, dispatch) => {
      const { ms, msg } = effect;
      setTimeout(() => {
        if (msg) dispatch(msg);
      }, ms);
    },

    // LocalStorage
    storage: (effect, dispatch) => {
      const { action, key, value, onSuccess } = effect;

      if (action === "set") {
        localStorage.setItem(key, JSON.stringify(value));
        if (onSuccess) dispatch({ type: onSuccess });
      } else if (action === "get") {
        const data = JSON.parse(localStorage.getItem(key) || "null");
        if (onSuccess) dispatch({ type: onSuccess, data });
      }
    },

    // Custom function execution (escape hatch)
    fn: (effect, dispatch) => {
      const { run, onComplete } = effect;
      const result = run();
      if (onComplete) {
        dispatch({ type: onComplete, result });
      }
    },
  };
}

function html(strings, ...values) {
  let result = strings[0];

  for (let i = 0; i < values.length; i++) {
    const value = values[i];

    // Handle arrays (for lists)
    if (Array.isArray(value)) {
      result += value.join("");
    } else if (value == null) {
      result += "";
    } else {
      result += value;
    }

    result += strings[i + 1];
  }

  return result;
}
