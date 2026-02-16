/**
 * Spriggan - A minimal TEA-inspired framework
 * No build tools, pure functions, LLM-friendly
 */
(function (global) {
  "use strict";

  /**
   * Tagged template literal for HTML (stateless, can be outside closure)
   * @param {Array} strings - Template string parts
   * @param {...*} values - Interpolated values
   * @returns {string} HTML string
   */
  function html(strings, ...values) {
    let result = strings[0];

    for (let i = 0; i < values.length; i++) {
      const value = values[i];

      if (Array.isArray(value)) {
        result += value.join("");
      } else if (value == null || value === false) {
        result += "";
      } else if (value === true) {
        result += "";
      } else {
        result += value;
      }

      result += strings[i + 1];
    }

    return result;
  }

  function closure() {
    let currentState = null;
    let currentView = null;
    let rootElement = null;
    let updateFn = null;
    let viewFn = null;
    let effectHandlers = {};
    let runEffectFn = null;
    let isDebugMode = false;
    let eventListenersAttached = false;
    let boundEventHandlers = null;

    // ============================================================================
    // Core API
    // ============================================================================

    /**
     * Initialize a Spriggan application
     * @param {string} selector - CSS selector for root element
     * @param {Object} config - Application configuration
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

      // Validate config
      if (!init || !update || !view) {
        throw new Error("Spriggan: init, update, and view are required");
      }

      // Find root element
      rootElement = document.querySelector(selector);
      if (!rootElement) {
        throw new Error(`Spriggan: element "${selector}" not found`);
      }

      // Setup
      isDebugMode = debug;
      updateFn = isDebugMode ? debugUpdate(update) : update;
      viewFn = view;
      effectHandlers = { ...defaultEffects, ...effects };
      runEffectFn = isDebugMode
        ? debugEffectRunner(effectRunner)
        : effectRunner;

      // Initialize state
      currentState = typeof init === "function" ? init() : init;

      if (isDebugMode) {
        console.log("[Spriggan] Initialized with state:", currentState);
        setupDebugTools();
      }

      // Setup subscriptions
      let cleanupFns = [];
      if (subscriptions) {
        const cleanup = subscriptions(dispatch);
        if (cleanup) {
          cleanupFns = Array.isArray(cleanup) ? cleanup : [cleanup];
        }
      }

      // Initial render
      render();

      // Return public API
      return {
        dispatch,
        getState: () => currentState,
        destroy: () => {
          cleanupFns.forEach((fn) => fn());

          detachEventListeners(rootElement);

          if (rootElement) {
            rootElement.innerHTML = "";
          }

          currentState = null;
          currentView = null;
          rootElement = null;
          updateFn = null;
          viewFn = null;
          effectHandlers = {};
          runEffectFn = null;
          isDebugMode = false;
        },
      };
    }

    /**
     * Dispatch a message to trigger state update
     * @param {Object} msg - Message object with 'type' property
     */
    function dispatch(msg) {
      if (!msg || !msg.type) {
        console.warn("Spriggan: dispatch called with invalid message", msg);
        return;
      }

      // Call update function
      const result = updateFn(currentState, msg);

      // Handle return value
      if (Array.isArray(result)) {
        // [newState, effect1, effect2, ...]
        const [newState, ...effects] = result;
        currentState = newState;

        // Process effects after state update
        effects.forEach((eff) => {
          if (eff) {
            runEffectFn(eff, dispatch, effectHandlers);
          }
        });
      } else {
        // Just new state
        currentState = result;
      }

      // Re-render with new state
      render();
    }

    // ============================================================================
    // Rendering
    // ============================================================================

    /**
     * Render the current state to DOM
     */
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
              beforeNodeMorphed: (fromNode, toNode) => {
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

      currentView = newView;

      if (isDebugMode) {
        const endTime = performance.now();
        console.log(
          `[Spriggan] Render took ${(endTime - startTime).toFixed(2)}ms`,
        );
      }
    }

    /**
     * Attach event listeners using delegation
     * @param {Element} root - Root element to attach listeners to
     */
    function attachEventListeners(root) {
      if (eventListenersAttached) return;

      boundEventHandlers = {
        click: (e) => {
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

        input: (e) => {
          if (e.target.dataset.model) {
            dispatch({
              type: "FieldChanged",
              field: e.target.dataset.model,
              value: e.target.value,
            });
          }
        },

        change: (e) => {
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

        submit: (e) => {
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

    /**
     * Detach event listeners from root element
     * @param {Element} root - Root element to remove listeners from
     */
    function detachEventListeners(root) {
      if (!boundEventHandlers || !root) return;

      root.removeEventListener("click", boundEventHandlers.click);
      root.removeEventListener("input", boundEventHandlers.input);
      root.removeEventListener("change", boundEventHandlers.change);
      root.removeEventListener("submit", boundEventHandlers.submit);

      boundEventHandlers = null;
      eventListenersAttached = false;
    }

    // ============================================================================
    // Effects System
    // ============================================================================

    /**
     * Default effect runner
     * @param {Object} effect - Effect description
     * @param {Function} dispatch - Dispatch function
     * @param {Object} handlers - Effect handlers
     */
    function defaultEffectRunner(effect, dispatch, handlers) {
      if (!effect || !effect.type) return;

      const handler = handlers[effect.type];
      if (!handler) {
        console.warn(`Spriggan: unknown effect type "${effect.type}"`);
        return;
      }

      handler(effect, dispatch);
    }

    /**
     * Built-in effect handlers
     */
    const defaultEffects = {
      /**
       * HTTP effect
       * Usage: { type: 'http', url, method?, body?, headers?, onSuccess?, onError? }
       */
      http: (effect, dispatch) => {
        const {
          url,
          method = "GET",
          body,
          headers = {},
          onSuccess,
          onError,
        } = effect;

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
              throw new Error(
                `HTTP ${response.status}: ${response.statusText}`,
              );
            }
            return response.json();
          })
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

      /**
       * Delay effect
       * Usage: { type: 'delay', ms, msg }
       */
      delay: (effect, dispatch) => {
        const { ms, msg } = effect;

        if (!msg) {
          console.warn("Spriggan: delay effect requires msg property");
          return;
        }

        setTimeout(() => {
          dispatch(msg);
        }, ms);
      },

      /**
       * LocalStorage effect
       * Usage: { type: 'storage', action: 'get'|'set'|'remove', key, value?, onSuccess? }
       */
      storage: (effect, dispatch) => {
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

      /**
       * Custom function effect (escape hatch)
       * Usage: { type: 'fn', run, onComplete? }
       */
      fn: (effect, dispatch) => {
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
    };

    // ============================================================================
    // Debug Mode
    // ============================================================================

    /**
     * Wrap update function with debug logging
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

        console.log("New state:", newState);

        // Show diff
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

        // Store in history
        if (global.__SPRIGGAN_DEBUG__) {
          global.__SPRIGGAN_DEBUG__.history.push({
            msg,
            state: newState,
            timestamp: Date.now(),
          });
        }

        return result;
      };
    }

    /**
     * Wrap effect runner with debug logging
     */
    function debugEffectRunner(runner) {
      return (effect, dispatch, handlers) => {
        console.log("[Spriggan Effect]", effect);
        return runner(effect, dispatch, handlers);
      };
    }

    /**
     * Simple state diff utility
     */
    function stateDiff(oldState, newState) {
      const changes = [];

      // Check all keys in new state
      for (const key in newState) {
        if (oldState[key] !== newState[key]) {
          changes.push({
            key,
            from: oldState[key],
            to: newState[key],
          });
        }
      }

      // Check for deleted keys
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

    /**
     * Setup debug tools in global scope
     */
    function setupDebugTools() {
      global.__SPRIGGAN_DEBUG__ = {
        getState: () => currentState,
        dispatch: dispatch,
        history: [],
        timeTravel: (index) => {
          if (global.__SPRIGGAN_DEBUG__.history[index]) {
            currentState = global.__SPRIGGAN_DEBUG__.history[index].state;
            render();
            console.log("[Spriggan] Time traveled to state:", currentState);
          } else {
            console.warn(`[Spriggan] No history entry at index ${index}`);
          }
        },
        clearHistory: () => {
          global.__SPRIGGAN_DEBUG__.history = [];
          console.log("[Spriggan] History cleared");
        },
      };

      console.log(
        "[Spriggan] Debug tools available at window.__SPRIGGAN_DEBUG__",
      );
      console.log("  - __SPRIGGAN_DEBUG__.getState()");
      console.log("  - __SPRIGGAN_DEBUG__.dispatch(msg)");
      console.log("  - __SPRIGGAN_DEBUG__.history");
      console.log("  - __SPRIGGAN_DEBUG__.timeTravel(index)");
      console.log("  - __SPRIGGAN_DEBUG__.clearHistory()");
    }

    return { app, html };
  }

  /** Export the Spriggan factory */
  global.Spriggan = closure;
  /** Export */
  closure.html = html;

  if (typeof module !== "undefined" && module.exports) {
    module.exports = global.Spriggan;
  }

  if (typeof define === "function" && define.amd) {
    define([], function () {
      return global.Spriggan;
    });
  }
})(typeof window !== "undefined" ? window : this);
