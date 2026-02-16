/**
 * Spriggan - A minimal TEA-inspired framework
 * No build tools, pure functions, LLM-friendly
 */

// @ts-check

/** @typedef {{type: string, [key: string]: any}} Message */
/** @typedef {(msg: Message) => void} Dispatch */
/** @typedef {{type: string, [key: string]: any}} Effect */
/** @typedef {{init: any, update: Function, view: Function, effects?: Object, effectRunner?: Function, subscriptions?: Function, debug?: boolean}} AppConfig */

/**
 * Tagged template literal for HTML
 * @param {TemplateStringsArray} strings - Template string parts
 * @param {...*} values - Interpolated values
 * @returns {string} HTML string
 */
export function html(strings, ...values) {
  let result = strings[0] ?? "";

  for (let i = 0; i < values.length; i++) {
    const value = values[i] ?? "";

    if (Array.isArray(value)) {
      result += value.join("");
    } else if (value == null || value === false) {
      result += "";
    } else if (value === true) {
      result += "";
    } else if (
      typeof value === "object" &&
      "type" in value &&
      typeof value.type === "string"
    ) {
      // It looks like a Message, so wrap it in single quotes and stringify it as JSON
      result += `'${JSON.stringify(value)}'`;
    } else {
      result += value;
    }

    result += strings[i + 1];
  }

  return result;
}

/**
 * Create a new Spriggan instance
 * @returns {{app: Function, html: Function}}
 */
export default function createSpriggan() {
  /** @type {*} */
  let currentState = null;
  /** @type {*} */
  let _currentView = null;
  /** @type {HTMLElement | null} */
  let rootElement = null;
  /** @type {Function | null} */
  let updateFn = null;
  /** @type {Function | null} */
  let viewFn = null;
  /** @type {Record<string, Function>} */
  let effectHandlers = {};
  /** @type {Function | null} */
  let runEffectFn = null;
  /** @type {boolean} */
  let isDebugMode = false;
  /** @type {boolean} */
  let eventListenersAttached = false;
  /** @type {Record<string, (e: Event) => void> | null} */
  let boundEventHandlers = null;
  /** @type {Array<*>} */
  let debugHistory = [];

  /**
   * Initialize a Spriggan application
   * @param {string} selector - CSS selector for root element
   * @param {AppConfig} config - Application configuration
   * @returns {Object} API for external interaction
   */
  function app(selector, config) {
    const {
      init,
      update,
      view,
      effects = {},
      effectRunner = defaultEffectRunner,
      subscriptions = null,
      debug = false,
    } = config;

    if (!init || !update || !view) {
      throw new Error("Spriggan: init, update, and view are required");
    }

    rootElement = /** @type {HTMLElement} */ (document.querySelector(selector));
    if (!rootElement) {
      throw new Error(`Spriggan: element "${selector}" not found`);
    }

    isDebugMode = debug;
    updateFn = isDebugMode ? debugUpdate(update) : update;
    viewFn = view;
    effectHandlers = { ...defaultEffects, ...effects };
    runEffectFn = isDebugMode ? debugEffectRunner(effectRunner) : effectRunner;

    currentState = typeof init === "function" ? init() : init;

    if (isDebugMode) {
      console.log("[Spriggan] Initialized with state:", currentState);
    }

    let cleanupFns = [];
    if (subscriptions) {
      const cleanup = subscriptions(dispatch);
      if (cleanup) {
        cleanupFns = Array.isArray(cleanup) ? cleanup : [cleanup];
      }
    }

    render();

    return {
      dispatch,
      getState: () => currentState,
      destroy: () => {
        cleanupFns.forEach((fn) => void fn());

        detachEventListeners(rootElement);

        if (rootElement) {
          rootElement.innerHTML = "";
        }

        currentState = null;
        _currentView = null;
        rootElement = null;
        updateFn = null;
        viewFn = null;
        effectHandlers = {};
        runEffectFn = null;
        isDebugMode = false;
        debugHistory = [];
      },
      ...(isDebugMode && {
        debug: {
          history: debugHistory,
          timeTravel: /** @param {number} index */ (index) => {
            if (debugHistory[index]) {
              currentState = debugHistory[index].state;
              render();
              console.log("[Spriggan] Time traveled to state:", currentState);
            } else {
              console.warn(`[Spriggan] No history entry at index ${index}`);
            }
          },
          clearHistory: () => {
            debugHistory.length = 0;
            console.log("[Spriggan] History cleared");
          },
        },
      }),
    };
  }

  /** @param {Message} msg */
  function dispatch(msg) {
    if (!msg || !msg.type) {
      console.warn("Spriggan: dispatch called with invalid message", msg);
      return;
    }

    const result = updateFn(currentState, msg);

    if (Array.isArray(result)) {
      const [newState, ...effects] = result;
      currentState = newState;

      effects.forEach((eff) => {
        if (eff) {
          runEffectFn(eff, dispatch, effectHandlers);
        }
      });
    } else {
      currentState = result;
    }

    render();
  }

  function render() {
    const startTime = isDebugMode ? performance.now() : 0;

    const newView = viewFn(currentState, dispatch);
    const newContent = typeof newView === "string" ? newView : newView;

    if (newContent == null || newContent === "") {
      rootElement.innerHTML = "";
    } else if (typeof newContent === "string") {
      if (typeof Idiomorph !== "undefined") {
        Idiomorph.morph(rootElement, `<div>${newContent}</div>`, {
          morphStyle: "innerHTML",
          callbacks: {
            beforeNodeMorphed:
              /** @param {HTMLElement} fromNode */ /** @param {HTMLElement} toNode */ (
                fromNode,
                toNode,
              ) => {
                if (fromNode.id && toNode.id) {
                  return fromNode.id === toNode.id;
                }
                return true;
              },
          },
        });
      } else {
        rootElement.innerHTML = newContent;
      }

      attachEventListeners(rootElement);
    } else {
      rootElement.innerHTML = "";
      rootElement.appendChild(newContent);
      attachEventListeners(rootElement);
    }

    _currentView = newView;

    if (isDebugMode) {
      const endTime = performance.now();
      console.log(
        `[Spriggan] Render took ${(endTime - startTime).toFixed(2)}ms`,
      );
    }
  }

  /** @param {HTMLElement} root */
  function attachEventListeners(root) {
    if (eventListenersAttached) return;

    boundEventHandlers = {
      click: /** @param {Event} e */ (e) => {
        const target = e.target.closest("[data-msg]");
        if (target) {
          try {
            const msg = JSON.parse(target.dataset.msg);
            dispatch(msg);
          } catch (err) {
            console.error("Spriggan: failed to parse data-msg", err);
          }
        }
      },

      input: /** @param {Event} e */ (e) => {
        if (e.target.dataset.model) {
          dispatch({
            type: "FieldChanged",
            field: e.target.dataset.model,
            value: e.target.value,
          });
        }
      },

      change: /** @param {Event} e */ (e) => {
        if (e.target.dataset.model) {
          const value =
            e.target.type === "checkbox" ? e.target.checked : e.target.value;

          dispatch({
            type: "FieldChanged",
            field: e.target.dataset.model,
            value: value,
          });
        }
      },

      submit: /** @param {Event} e */ (e) => {
        const target = e.target.closest("[data-msg]");
        if (target) {
          e.preventDefault();
          try {
            const msg = JSON.parse(target.dataset.msg);
            dispatch(msg);
          } catch (err) {
            console.error("Spriggan: failed to parse data-msg", err);
          }
        }
      },
    };

    root.addEventListener("click", boundEventHandlers.click);
    root.addEventListener("input", boundEventHandlers.input);
    root.addEventListener("change", boundEventHandlers.change);
    root.addEventListener("submit", boundEventHandlers.submit);

    eventListenersAttached = true;
  }

  /** @param {HTMLElement} root */
  function detachEventListeners(root) {
    if (!boundEventHandlers || !root) return;

    root.removeEventListener("click", boundEventHandlers.click);
    root.removeEventListener("input", boundEventHandlers.input);
    root.removeEventListener("change", boundEventHandlers.change);
    root.removeEventListener("submit", boundEventHandlers.submit);

    boundEventHandlers = null;
    eventListenersAttached = false;
  }

  /** @param {Effect} effect */ /** @param {Dispatch} dispatch */ /** @param {Object} handlers */
  function defaultEffectRunner(effect, dispatch, handlers) {
    isDebugMode &&
      console.log(`[Spriggan] Running DOM effect: ${effect?.type}"`);

    if (!effect || !effect.type) return;

    const handler = handlers[effect.type];

    if (!handler) {
      console.warn(`Spriggan: unknown effect type "${effect.type}"`);
      return;
    }

    try {
      handler(effect, dispatch);
    } catch (err) {
      console.error(
        `Spriggan: effect handler "${effect.type}" threw an error`,
        err,
      );
    }
  }

  const defaultEffects = {
    http: /** @param {Effect} effect */ /** @param {Dispatch} dispatch */ (
      effect,
      dispatch,
    ) => {
      const {
        url,
        method = "GET",
        body,
        headers = {},
        onSuccess,
        onError,
      } = effect;

      /** @type {RequestInit} */
      const fetchOptions = {
        method,
        headers: {
          "Content-Type": "application/json",
          ...headers,
        },
      };

      if (body) {
        fetchOptions.body = JSON.stringify(body);
      }

      fetch(url, fetchOptions)
        .then((response) => {
          if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
          }
          if (
            response.headers.get("Content-Type")?.includes("application/json")
          ) {
            return response.json();
          }

          return response.text();
        })
        .then((data) => {
          if (onSuccess) {
            dispatch({ type: onSuccess, data });
          }
        })
        .catch((err) => {
          if (onError) {
            dispatch({
              type: onError,
              error: err,
            });
          }
        });
    },

    delay: /** @param {Effect} effect */ /** @param {Dispatch} dispatch */ (
      effect,
      dispatch,
    ) => {
      const { ms, msg } = effect;

      if (!msg) {
        console.warn("Spriggan: delay effect requires msg property");
        return;
      }

      setTimeout(() => {
        dispatch(msg);
      }, ms);
    },

    storage: /** @param {Effect} effect */ /** @param {Dispatch} dispatch */ (
      effect,
      dispatch,
    ) => {
      const { action, key, value, onSuccess } = effect;

      try {
        if (action === "set") {
          localStorage.setItem(key, JSON.stringify(value));
          if (onSuccess) {
            dispatch({ type: onSuccess });
          }
        } else if (action === "get") {
          const data = JSON.parse(localStorage.getItem(key) || "null");
          if (onSuccess) {
            dispatch({ type: onSuccess, data });
          }
        } else if (action === "remove") {
          localStorage.removeItem(key);
          if (onSuccess) {
            dispatch({ type: onSuccess });
          }
        }
      } catch (err) {
        console.error("Spriggan: storage effect failed", err);
      }
    },

    fn: /** @param {Effect} effect */ /** @param {Dispatch} dispatch */ (
      effect,
      dispatch,
    ) => {
      const { run, onComplete } = effect;

      if (typeof run !== "function") {
        console.warn(
          "Spriggan: fn effect requires run property to be a function",
        );
        return;
      }

      try {
        const result = run();
        if (onComplete) {
          dispatch({ type: onComplete, result });
        }
      } catch (err) {
        console.error("Spriggan: fn effect failed", err);
      }
    },

    dom: /** @param {Effect} effect */ /** @param {Dispatch} _dispatch */ (
      effect,
      _dispatch,
    ) => {
      const { action, selector, name, value, delay = 0 } = effect;
      const runDomAction = () => {
        const element = selector ? document.querySelector(selector) : null;

        if (!element && selector) {
          console.warn(
            `Spriggan: dom effect - element not found: "${selector}"`,
          );
          return;
        }

        try {
          switch (action) {
            case "focus":
              element?.focus();
              break;

            case "blur":
              element?.blur();
              break;

            case "scrollIntoView":
              element?.scrollIntoView(
                typeof effect.options === "object" ? effect.options : {},
              );
              break;

            case "setAttribute":
              if (element && name) {
                element.setAttribute(name, String(value));
              }
              break;

            case "removeAttribute":
              if (element && name) {
                element.removeAttribute(name);
              }
              break;

            case "addClass":
              if (element && value) {
                element.classList.add(String(value));
              }
              break;

            case "removeClass":
              if (element && value) {
                element.classList.remove(String(value));
              }
              break;

            case "toggleClass":
              if (element && value) {
                element.classList.toggle(String(value));
              }
              break;

            case "setProperty":
              if (element && name) {
                element[name] = value;
              }
              break;

            default:
              console.warn(`Spriggan: dom effect - unknown action "${action}"`);
          }
        } catch (err) {
          console.error("Spriggan: dom effect failed", err);
        }
      };

      if (delay > 0) {
        setTimeout(runDomAction, delay);
      } else {
        requestAnimationFrame(runDomAction);
      }
    },
  };

  function debugUpdate(updateFn) {
    return /** @param {*} state */ /** @param {Message} msg */ (state, msg) => {
      const startTime = performance.now();

      console.group(`[Spriggan] Dispatch: ${msg.type}`);
      console.log("Message:", msg);
      console.log("Previous state:", state);

      const result = updateFn(state, msg);
      const newState = Array.isArray(result) ? result[0] : result;
      const effects = Array.isArray(result) ? result.slice(1) : [];

      if (result === undefined) {
        console.warn(
          "[Spriggan] update() returned undefined - this may be unintentional",
        );
      }

      console.log("New state:", newState);

      const changes = stateDiff(state, newState);
      if (changes.length > 0) {
        console.log("Changes:", changes);
      } else {
        console.log("No state changes");
      }

      if (effects.length > 0) {
        console.log("Effects:", effects);
      }

      const endTime = performance.now();
      console.log(`Update took ${(endTime - startTime).toFixed(2)}ms`);
      console.groupEnd();

      debugHistory.push({
        msg,
        state: newState,
        timestamp: Date.now(),
      });

      return result;
    };
  }

  function debugEffectRunner(/** @param {Function} runner */ runner) {
    return /** @param {Effect} effect */ /** @param {Dispatch} dispatch */ /** @param {Object} handlers */ (
      effect,
      dispatch,
      handlers,
    ) => {
      console.log("[Spriggan Effect]", effect);
      return runner(effect, dispatch, handlers);
    };
  }

  /** @param {*} oldState */ /** @param {*} newState */
  function stateDiff(oldState, newState) {
    const changes = [];

    if (
      typeof oldState !== "object" ||
      oldState === null ||
      typeof newState !== "object" ||
      newState === null
    ) {
      if (oldState !== newState) {
        changes.push({
          key: "(value)",
          from: oldState,
          to: newState,
        });
      }
      return changes;
    }

    for (const key in newState) {
      if (oldState[key] !== newState[key]) {
        changes.push({
          key,
          from: oldState[key],
          to: newState[key],
        });
      }
    }

    for (const key in oldState) {
      if (!(key in newState)) {
        changes.push({
          key,
          from: oldState[key],
          to: undefined,
        });
      }
    }

    return changes;
  }

  return { app, html };
}
