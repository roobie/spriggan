/**
 * Spriggan - A minimal TEA-inspired framework
 * No build tools, pure functions, LLM-friendly
 */

// @ts-check

/** @typedef {{type: string, [key: string]: unknown}} Message */
/** @typedef {(msg: Message) => void} Dispatch */
/** @typedef {{type: string, [key: string]: unknown}} Effect */
/** @typedef {(effect: Effect, dispatch: Dispatch) => void} EffectHandler */
/** @typedef {(effect: Effect, dispatch: Dispatch, handlers: Record<string, EffectHandler>) => void} EffectRunner */
/** @typedef {(dispatch: Dispatch) => (() => void) | (() => void)[] | void} SubscriptionFn */

/** @type {Window & {Idiomorph?: {morph: (el: Element, content: string, opts: object) => void}}} */
const win = /** @type {*} */ (typeof window !== "undefined" ? window : {});

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
 * @returns {{app: Function, html: typeof html}}
 */
export default function createSpriggan() {
  /** @type {unknown} */
  let currentState = null;
  /** @type {unknown} */
  let _currentView = null;
  /** @type {HTMLElement | null} */
  let rootElement = null;
  /** @type {((state: unknown, msg: Message) => unknown) | null} */
  let updateFn = null;
  /** @type {((state: unknown, dispatch: Dispatch) => string | Node) | null} */
  let viewFn = null;
  /** @type {Record<string, EffectHandler>} */
  let effectHandlers = {};
  /** @type {EffectRunner | null} */
  let runEffectFn = null;
  let isDebugMode = false;
  let eventListenersAttached = false;
  /** @type {Record<string, (e: Event) => void> | null} */
  let boundEventHandlers = null;
  /** @type {Array<{msg: Message, state: unknown, timestamp: number}>} */
  let debugHistory = [];

  /**
   * Initialize a Spriggan application
   * @param {string} selector - CSS selector for root element
   * @param {{
   *   init: unknown | (() => unknown),
   *   update: (state: unknown, msg: Message) => unknown,
   *   view: (state: unknown, dispatch: Dispatch) => string | Node,
   *   effects?: Record<string, EffectHandler>,
   *   effectRunner?: EffectRunner,
   *   subscriptions?: SubscriptionFn,
   *   debug?: boolean
   * }} config - Application configuration
   * @returns {{dispatch: Dispatch, getState: () => unknown, destroy: () => void}}
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

    const el = document.querySelector(selector);
    if (!el) {
      throw new Error(`Spriggan: element "${selector}" not found`);
    }
    rootElement = /** @type {HTMLElement} */ (el);

    isDebugMode = debug;
    updateFn = isDebugMode ? debugUpdate(update) : update;
    viewFn = view;
    effectHandlers = { ...defaultEffects, ...effects };
    runEffectFn = isDebugMode ? debugEffectRunner(effectRunner) : effectRunner;

    currentState =
      typeof init === "function" ? /** @type {() => unknown} */ (init)() : init;

    if (isDebugMode) {
      console.log("[Spriggan] Initialized with state:", currentState);
    }

    /** @type {Array<() => void>} */
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

        if (rootElement) {
          detachEventListeners(rootElement);
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

    if (!updateFn) return;
    const result = updateFn(currentState, msg);

    if (Array.isArray(result)) {
      const [newState, ...effects] = result;
      currentState = newState;

      effects.forEach((eff) => {
        if (eff && runEffectFn) {
          runEffectFn(eff, dispatch, effectHandlers);
        }
      });
    } else {
      currentState = result;
    }

    render();
  }

  function render() {
    if (!rootElement || !viewFn) return;

    const startTime = isDebugMode ? performance.now() : 0;

    const newView = viewFn(currentState, dispatch);
    const newContent = typeof newView === "string" ? newView : newView;

    if (newContent == null || newContent === "") {
      rootElement.innerHTML = "";
    } else if (typeof newContent === "string") {
      if (typeof win.Idiomorph !== "undefined") {
        win.Idiomorph.morph(rootElement, `<div>${newContent}</div>`, {
          morphStyle: "innerHTML",
          callbacks: {
            beforeNodeMorphed: (
              /** @type {HTMLElement} */ fromNode,
              /** @type {HTMLElement} */ toNode,
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

    /** @type {Record<string, (e: Event) => void>} */
    const handlers = {
      click: /** @param {Event} e */ (e) => {
        const target = /** @type {HTMLElement | null} */ (
          /** @type {Element} */ (e.target).closest("[data-msg]")
        );
        if (target && target.dataset.msg) {
          try {
            const msg = JSON.parse(target.dataset.msg);
            dispatch(msg);
          } catch (err) {
            console.error("Spriggan: failed to parse data-msg", err);
          }
        }
      },

      input: /** @param {Event} e */ (e) => {
        const el = /** @type {HTMLInputElement} */ (e.target);
        if (el.dataset && el.dataset.model) {
          dispatch({
            type: "FieldChanged",
            field: el.dataset.model,
            value: el.value,
          });
        }
      },

      change: /** @param {Event} e */ (e) => {
        const el = /** @type {HTMLInputElement} */ (e.target);
        if (el.dataset && el.dataset.model) {
          const value = el.type === "checkbox" ? el.checked : el.value;

          dispatch({
            type: "FieldChanged",
            field: el.dataset.model,
            value: value,
          });
        }
      },

      submit: /** @param {Event} e */ (e) => {
        const target = /** @type {HTMLElement | null} */ (
          /** @type {Element} */ (e.target).closest("[data-msg]")
        );
        if (target && target.dataset.msg) {
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

    boundEventHandlers = handlers;

    root.addEventListener(
      "click",
      /** @type {EventListener} */ (handlers.click),
    );
    root.addEventListener(
      "input",
      /** @type {EventListener} */ (handlers.input),
    );
    root.addEventListener(
      "change",
      /** @type {EventListener} */ (handlers.change),
    );
    root.addEventListener(
      "submit",
      /** @type {EventListener} */ (handlers.submit),
    );

    eventListenersAttached = true;
  }

  /** @param {HTMLElement} root */
  function detachEventListeners(root) {
    if (!boundEventHandlers) return;

    root.removeEventListener(
      "click",
      /** @type {EventListener} */ (boundEventHandlers.click),
    );
    root.removeEventListener(
      "input",
      /** @type {EventListener} */ (boundEventHandlers.input),
    );
    root.removeEventListener(
      "change",
      /** @type {EventListener} */ (boundEventHandlers.change),
    );
    root.removeEventListener(
      "submit",
      /** @type {EventListener} */ (boundEventHandlers.submit),
    );

    boundEventHandlers = null;
    eventListenersAttached = false;
  }

  /**
   * @param {Effect} effect
   * @param {Dispatch} dispatch
   * @param {Record<string, EffectHandler>} handlers
   */
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

  /** @type {Record<string, EffectHandler>} */
  const defaultEffects = {
    http: (effect, dispatch) => {
      const {
        url,
        method = "GET",
        body,
        headers = {},
        onSuccess,
        onError,
      } = /** @type {{url: string, method?: string, body?: unknown, headers?: Record<string, string>, onSuccess?: string, onError?: string}} */ (
        /** @type {unknown} */ (effect)
      );

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
        dispatch(/** @type {Message} */ (msg));
      }, /** @type {number} */ (ms));
    },

    storage: /** @param {Effect} effect */ /** @param {Dispatch} dispatch */ (
      effect,
      dispatch,
    ) => {
      const { action, key, value, onSuccess } = effect;

      try {
        if (action === "set") {
          localStorage.setItem(
            /** @type {string} */ (key),
            JSON.stringify(value),
          );
          if (onSuccess) {
            dispatch({ type: /** @type {string} */ (onSuccess) });
          }
        } else if (action === "get") {
          const data = JSON.parse(
            localStorage.getItem(/** @type {string} */ (key)) || "null",
          );
          if (onSuccess) {
            dispatch({ type: /** @type {string} */ (onSuccess), data });
          }
        } else if (action === "remove") {
          localStorage.removeItem(/** @type {string} */ (key));
          if (onSuccess) {
            dispatch({ type: /** @type {string} */ (onSuccess) });
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
          dispatch({ type: /** @type {string} */ (onComplete), result });
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
        const element = selector
          ? document.querySelector(/** @type {string} */ (selector))
          : null;

        if (!element && selector) {
          console.warn(
            `Spriggan: dom effect - element not found: "${selector}"`,
          );
          return;
        }

        try {
          switch (action) {
            case "focus":
              /** @type {HTMLElement} */ (element)?.focus();
              break;

            case "blur":
              /** @type {HTMLElement} */ (element)?.blur();
              break;

            case "scrollIntoView":
              /** @type {HTMLElement} */ (element)?.scrollIntoView(
                typeof effect.options === "object"
                  ? /** @type {ScrollIntoViewOptions} */ (effect.options)
                  : {},
              );
              break;

            case "setAttribute":
              if (element && name) {
                element.setAttribute(
                  /** @type {string} */ (name),
                  String(value),
                );
              }
              break;

            case "removeAttribute":
              if (element && name) {
                element.removeAttribute(/** @type {string} */ (name));
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
                /** @type {Record<string, unknown>} */ (
                  /** @type {*} */ (element)
                )[/** @type {string} */ (name)] = value;
              }
              break;

            default:
              console.warn(`Spriggan: dom effect - unknown action "${action}"`);
          }
        } catch (err) {
          console.error("Spriggan: dom effect failed", err);
        }
      };

      if (/** @type {number} */ (delay) > 0) {
        setTimeout(runDomAction, /** @type {number} */ (delay));
      } else {
        requestAnimationFrame(runDomAction);
      }
    },
  };

  /**
   * @param {(state: unknown, msg: Message) => unknown} updateFn
   * @returns {(state: unknown, msg: Message) => unknown}
   */
  function debugUpdate(updateFn) {
    return (state, msg) => {
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

  /**
   * @param {EffectRunner} runner
   * @returns {EffectRunner}
   */
  function debugEffectRunner(runner) {
    return (effect, dispatch, handlers) => {
      console.log("[Spriggan Effect]", effect);
      return runner(effect, dispatch, handlers);
    };
  }

  /**
   * @param {unknown} oldState
   * @param {unknown} newState
   * @returns {Array<{key: string, from: unknown, to: unknown}>}
   */
  function stateDiff(oldState, newState) {
    /** @type {Array<{key: string, from: unknown, to: unknown}>} */
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

    const oldObj = /** @type {Record<string, unknown>} */ (oldState);
    const newObj = /** @type {Record<string, unknown>} */ (newState);

    for (const key in newObj) {
      if (oldObj[key] !== newObj[key]) {
        changes.push({
          key,
          from: oldObj[key],
          to: newObj[key],
        });
      }
    }

    for (const key in oldObj) {
      if (!(key in newObj)) {
        changes.push({
          key,
          from: oldObj[key],
          to: undefined,
        });
      }
    }

    return changes;
  }

  return { app, html };
}
