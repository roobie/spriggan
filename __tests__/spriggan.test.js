import fc from "fast-check";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

global.fetch = vi.fn();

const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};
global.localStorage = localStorageMock;

global.console = {
  log: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
  group: vi.fn(),
  groupEnd: vi.fn(),
};

import createSpriggan from "../src/spriggan";

describe("Spriggan Framework", () => {
  let Spriggan;

  beforeEach(() => {
    document.body.innerHTML = "";
    vi.clearAllMocks();
    localStorageMock.getItem.mockReset();
    localStorageMock.setItem.mockReset();
    localStorageMock.removeItem.mockReset();
    console.log.mockReset();
    console.warn.mockReset();
    console.error.mockReset();
    console.group.mockReset();
    console.groupEnd.mockReset();

    Spriggan = createSpriggan();
  });

  describe("html function", () => {
    it("should return basic HTML strings unchanged", () => {
      const result = Spriggan.html`<div>Hello World</div>`;
      expect(result).toBe("<div>Hello World</div>");
    });

    it("should interpolate string values", () => {
      const name = "Alice";
      const result = Spriggan.html`<p>Hello ${name}</p>`;
      expect(result).toBe("<p>Hello Alice</p>");
    });

    it("should handle number values", () => {
      const count = 42;
      const result = Spriggan.html`<span>${count}</span>`;
      expect(result).toBe("<span>42</span>");
    });

    it("should join array elements", () => {
      const items = ["<li>One</li>", "<li>Two</li>"];
      const result = Spriggan.html`<ul>${items}</ul>`;
      expect(result).toBe("<ul><li>One</li><li>Two</li></ul>");
    });

    it("should skip null and undefined values", () => {
      const result = Spriggan.html`<div>${null}${undefined}text</div>`;
      expect(result).toBe("<div>text</div>");
    });

    it("should skip false values", () => {
      const show = false;
      const result = Spriggan.html`<div>${show && "hidden"}</div>`;
      expect(result).toBe("<div></div>");
    });

    it("should skip true values (for boolean attributes)", () => {
      const result = Spriggan.html`<input${true} />`;
      expect(result).toBe("<input />");
    });

    it("should stringify Message objects with single quotes for HTML attributes", () => {
      const msg = { type: "increment" };
      const result = Spriggan.html`<button data-msg=${msg}>Click</button>`;
      expect(result).toBe(
        `<button data-msg='{"type":"increment"}'>Click</button>`,
      );
    });

    it("should stringify Message objects with additional properties", () => {
      const msg = { type: "setItem", id: 42, value: "test" };
      const result = Spriggan.html`<button data-msg=${msg}>Set</button>`;
      expect(result).toBe(
        `<button data-msg='{"type":"setItem","id":42,"value":"test"}'>Set</button>`,
      );
    });

    it("should not stringify objects without type property", () => {
      const obj = { name: "test", count: 5 };
      const result = Spriggan.html`<div data-obj=${obj}>Content</div>`;
      expect(result).toBe("<div data-obj=[object Object]>Content</div>");
    });

    it("should not stringify objects with non-string type", () => {
      const obj = { type: 123 };
      const result = Spriggan.html`<div data-obj=${obj}>Content</div>`;
      expect(result).toBe("<div data-obj=[object Object]>Content</div>");
    });
  });

  describe("app initialization", () => {
    it("should throw error if required config is missing", () => {
      document.body.innerHTML = '<div id="app"></div>';

      expect(() => {
        Spriggan.app("#app", {});
      }).toThrow("Spriggan: init, update, and view are required");
    });

    it("should throw error if root element not found", () => {
      expect(() => {
        Spriggan.app("#nonexistent", {
          init: () => ({}),
          update: (state) => state,
          view: () => "",
        });
      }).toThrow('Spriggan: element "#nonexistent" not found');
    });

    it("should initialize with basic config", () => {
      document.body.innerHTML = '<div id="app"></div>';

      const initState = { count: 0 };
      const { getState } = Spriggan.app("#app", {
        init: () => initState,
        update: (state) => state,
        view: () => "<div>Counter: 0</div>",
      });

      expect(getState()).toEqual(initState);
      expect(document.querySelector("#app").innerHTML).toBe(
        "<div>Counter: 0</div>",
      );
    });

    it("should handle init as function or value", () => {
      document.body.innerHTML = '<div id="app"></div>';

      // Function
      const { getState: getState1 } = Spriggan.app("#app", {
        init: () => ({ a: 1 }),
        update: (state) => state,
        view: () => "",
      });
      expect(getState1()).toEqual({ a: 1 });

      // Reset
      document.body.innerHTML = '<div id="app"></div>';

      // Value
      const { getState: getState2 } = Spriggan.app("#app", {
        init: { b: 2 },
        update: (state) => state,
        view: () => "",
      });
      expect(getState2()).toEqual({ b: 2 });
    });
  });

  describe("dispatch", () => {
    let appApi;

    beforeEach(() => {
      document.body.innerHTML = '<div id="app"></div>';

      appApi = Spriggan.app("#app", {
        init: () => ({ count: 0 }),
        update: (state, msg) => {
          if (msg.type === "Increment") {
            return { count: state.count + 1 };
          }
          return state;
        },
        view: (state) => `<div>Count: ${state.count}</div>`,
      });
    });

    it("should update state on valid message", () => {
      appApi.dispatch({ type: "Increment" });
      expect(appApi.getState()).toEqual({ count: 1 });
    });

    it("should re-render after dispatch", () => {
      appApi.dispatch({ type: "Increment" });
      expect(document.querySelector("#app").innerHTML).toBe(
        "<div>Count: 1</div>",
      );
    });

    it("should warn on invalid message", () => {
      appApi.dispatch({});
      expect(console.warn).toHaveBeenCalledWith(
        "Spriggan: dispatch called with invalid message",
        {},
      );
    });

    it("should handle effects returned from update", () => {
      vi.useFakeTimers();
      // Reset for new app with effects
      document.body.innerHTML = '<div id="app"></div>';

      const appWithEffects = Spriggan.app("#app", {
        init: () => ({ loading: false }),
        update: (state, msg) => {
          if (msg.type === "LoadData") {
            return [
              { loading: true },
              { type: "delay", ms: 100, msg: { type: "DataLoaded" } },
            ];
          }
          if (msg.type === "DataLoaded") {
            return { loading: false };
          }
          return state;
        },
        view: (state) => `<div>Loading: ${state.loading}</div>`,
      });

      appWithEffects.dispatch({ type: "LoadData" });
      expect(appWithEffects.getState()).toEqual({ loading: true });

      // Advance timers
      vi.runOnlyPendingTimers();
      expect(appWithEffects.getState()).toEqual({ loading: false });
      vi.useRealTimers();
    });
  });

  describe("effects system", () => {
    let _dispatchMock;
    let _handlers;

    beforeEach(() => {
      _dispatchMock = vi.fn();
      // Get the default effects from the module
      // Since they're internal, we'll test the effect runner directly
      // For now, test via app dispatch
    });

    it("should handle HTTP effects", async () => {
      document.body.innerHTML = '<div id="app"></div>';

      global.fetch.mockImplementation(() =>
        Promise.resolve({
          ok: true,
          json: () => ({ data: "test" }),
        }),
      );

      const appApi = Spriggan.app("#app", {
        init: () => ({}),
        update: (state, msg) => {
          if (msg.type === "FetchData") {
            return [
              state,
              {
                type: "http",
                url: "/api/test",
                onSuccess: "DataFetched",
              },
            ];
          }
          if (msg.type === "DataFetched") {
            return { data: msg.data };
          }
          return state;
        },
        view: () => "",
      });

      appApi.dispatch({ type: "FetchData" });

      await vi.waitFor(() => {
        expect(appApi.getState()).toEqual({ data: { data: "test" } });
      });
    });

    it("should handle HTTP effect errors", async () => {
      document.body.innerHTML = '<div id="app"></div>';

      global.fetch.mockImplementation(() =>
        Promise.resolve({
          ok: false,
          status: 404,
          statusText: "Not Found",
        }),
      );

      const appApi = Spriggan.app("#app", {
        init: () => ({}),
        update: (state, msg) => {
          if (msg.type === "FetchData") {
            return [
              state,
              {
                type: "http",
                url: "/api/test",
                onError: "FetchError",
              },
            ];
          }
          if (msg.type === "FetchError") {
            return { error: msg.error };
          }
          return state;
        },
        view: () => "",
      });

      appApi.dispatch({ type: "FetchData" });

      await vi.waitFor(() => {
        expect(appApi.getState()).toEqual({ error: "HTTP 404: Not Found" });
      });
    });

    it("should handle delay effects", () => {
      document.body.innerHTML = '<div id="app"></div>';

      vi.useFakeTimers();

      const appApi = Spriggan.app("#app", {
        init: () => ({ triggered: false }),
        update: (state, msg) => {
          if (msg.type === "DelayAction") {
            return [
              state,
              { type: "delay", ms: 1000, msg: { type: "DelayedAction" } },
            ];
          }
          if (msg.type === "DelayedAction") {
            return { triggered: true };
          }
          return state;
        },
        view: () => "",
      });

      appApi.dispatch({ type: "DelayAction" });
      expect(appApi.getState()).toEqual({ triggered: false });

      vi.advanceTimersByTime(1000);
      expect(appApi.getState()).toEqual({ triggered: true });

      vi.useRealTimers();
    });

    it("should handle storage effects", () => {
      document.body.innerHTML = '<div id="app"></div>';

      localStorageMock.setItem.mockImplementation(() => {});
      localStorageMock.getItem.mockReturnValue(null);

      const appApi = Spriggan.app("#app", {
        init: () => ({}),
        update: (state, msg) => {
          if (msg.type === "SaveData") {
            return [
              state,
              {
                type: "storage",
                action: "set",
                key: "testKey",
                value: { test: "data" },
                onSuccess: "DataSaved",
              },
            ];
          }
          if (msg.type === "DataSaved") {
            return { saved: true };
          }
          if (msg.type === "LoadData") {
            return [
              state,
              {
                type: "storage",
                action: "get",
                key: "testKey",
                onSuccess: "DataLoaded",
              },
            ];
          }
          if (msg.type === "DataLoaded") {
            return { loaded: msg.data };
          }
          return state;
        },
        view: () => "",
      });

      // Test set
      appApi.dispatch({ type: "SaveData" });
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        "testKey",
        JSON.stringify({ test: "data" }),
      );
      expect(appApi.getState()).toEqual({ saved: true });

      // Test get
      localStorageMock.getItem.mockReturnValue(
        JSON.stringify({ test: "data" }),
      );
      appApi.dispatch({ type: "LoadData" });
      expect(localStorageMock.getItem).toHaveBeenCalledWith("testKey");
      expect(appApi.getState()).toEqual({ loaded: { test: "data" } });
    });
  });

  describe("event handling", () => {
    let appApi;

    beforeEach(() => {
      document.body.innerHTML = '<div id="app"></div>';

      appApi = Spriggan.app("#app", {
        init: () => ({ input: "", clicked: false }),
        update: (state, msg) => {
          switch (msg.type) {
            case "FieldChanged":
              return { ...state, input: msg.value };
            case "ButtonClicked":
              return { ...state, clicked: true };
            default:
              return state;
          }
        },
        view: (state) => `
          <input data-model="input" value="${state.input}" />
          <button data-msg="${JSON.stringify({ type: "ButtonClicked" }).replace(/"/g, "&quot;")}">Click</button>
        `,
      });
    });

    it("should handle input events", () => {
      appApi.dispatch({
        type: "FieldChanged",
        field: "input",
        value: "test input",
      });

      expect(appApi.getState()).toEqual({
        input: "test input",
        clicked: false,
      });
    });

    it("should handle click events with data-msg", () => {
      appApi.dispatch({ type: "ButtonClicked" });

      expect(appApi.getState()).toEqual({ input: "", clicked: true });
    });

    it("should handle checkbox change events", () => {
      document.body.innerHTML = '<div id="app"></div>';

      const appWithCheckbox = Spriggan.app("#app", {
        init: () => ({ checked: false }),
        update: (state, msg) => {
          if (msg.type === "FieldChanged" && msg.field === "checkbox") {
            return { checked: msg.value };
          }
          return state;
        },
        view: () => '<input type="checkbox" data-model="checkbox" />',
      });

      appWithCheckbox.dispatch({
        type: "FieldChanged",
        field: "checkbox",
        value: true,
      });

      expect(appWithCheckbox.getState()).toEqual({ checked: true });
    });
  });

  describe("debug mode", () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it("should log initialization in debug mode", () => {
      document.body.innerHTML = '<div id="app"></div>';

      Spriggan.app("#app", {
        init: () => ({ count: 0 }),
        update: (state) => state,
        view: () => "",
        debug: true,
      });

      expect(console.log).toHaveBeenCalledWith(
        "[Spriggan] Initialized with state:",
        { count: 0 },
      );
    });

    it("should log dispatch details in debug mode", () => {
      document.body.innerHTML = '<div id="app"></div>';

      const appApi = Spriggan.app("#app", {
        init: () => ({ count: 0 }),
        update: (state, msg) => {
          if (msg.type === "Increment") {
            return { count: state.count + 1 };
          }
          return state;
        },
        view: () => "",
        debug: true,
      });

      appApi.dispatch({ type: "Increment" });

      expect(console.group).toHaveBeenCalledWith(
        "[Spriggan] Dispatch: Increment",
      );
      expect(console.log).toHaveBeenCalledWith("Message:", {
        type: "Increment",
      });
      expect(console.log).toHaveBeenCalledWith("Previous state:", { count: 0 });
      expect(console.log).toHaveBeenCalledWith("New state:", { count: 1 });
      expect(console.groupEnd).toHaveBeenCalled();
    });

    it("should track history in debug mode", () => {
      document.body.innerHTML = '<div id="app"></div>';

      const appApi = Spriggan.app("#app", {
        init: () => ({ count: 0 }),
        update: (state, _msg) => ({ count: state.count + 1 }),
        view: () => "",
        debug: true,
      });

      appApi.dispatch({ type: "Increment" });
      vi.advanceTimersByTime(10);
      appApi.dispatch({ type: "Increment" });

      expect(appApi.debug.history).toHaveLength(2);
    });

    it("should provide timeTravel functionality", () => {
      document.body.innerHTML = '<div id="app"></div>';

      const appApi = Spriggan.app("#app", {
        init: () => ({ count: 0 }),
        update: (state, _msg) => ({ count: state.count + 1 }),
        view: () => "",
        debug: true,
      });

      appApi.dispatch({ type: "Increment" });
      appApi.dispatch({ type: "Increment" });
      appApi.dispatch({ type: "Increment" });

      expect(appApi.getState()).toEqual({ count: 3 });

      appApi.debug.timeTravel(0);
      expect(appApi.getState()).toEqual({ count: 1 });
    });

    it("should warn on invalid timeTravel index", () => {
      document.body.innerHTML = '<div id="app"></div>';

      const appApi = Spriggan.app("#app", {
        init: () => ({ count: 0 }),
        update: (state) => state,
        view: () => "",
        debug: true,
      });

      appApi.debug.timeTravel(999);
      expect(console.warn).toHaveBeenCalledWith(
        "[Spriggan] No history entry at index 999",
      );
    });

    it("should clear history with clearHistory", () => {
      document.body.innerHTML = '<div id="app"></div>';

      const appApi = Spriggan.app("#app", {
        init: () => ({ count: 0 }),
        update: (state, _msg) => ({ count: state.count + 1 }),
        view: () => "",
        debug: true,
      });

      appApi.dispatch({ type: "Increment" });
      appApi.dispatch({ type: "Increment" });

      expect(appApi.debug.history).toHaveLength(2);
      appApi.debug.clearHistory();
      expect(appApi.debug.history).toHaveLength(0);
    });
  });

  describe("destroy() and cleanup", () => {
    it("should clear DOM content on destroy", () => {
      document.body.innerHTML = '<div id="app"></div>';

      const appApi = Spriggan.app("#app", {
        init: () => ({ count: 0 }),
        update: (state) => state,
        view: () => "<div>Content</div>",
      });

      expect(document.querySelector("#app").innerHTML).toBe(
        "<div>Content</div>",
      );

      appApi.destroy();
      expect(document.querySelector("#app").innerHTML).toBe("");
    });

    it("should reset state to null after destroy", () => {
      document.body.innerHTML = '<div id="app"></div>';

      const appApi = Spriggan.app("#app", {
        init: () => ({ count: 0 }),
        update: (state) => state,
        view: () => "",
      });

      expect(appApi.getState()).toEqual({ count: 0 });
      appApi.destroy();
      expect(appApi.getState()).toBeNull();
    });

    it("should allow re-mounting after destroy without duplicate dispatches", () => {
      document.body.innerHTML = '<div id="app"></div>';

      let dispatchCount = 0;

      const app1 = Spriggan.app("#app", {
        init: () => ({ count: 0 }),
        update: (state, msg) => {
          if (msg.type === "Inc") {
            dispatchCount++;
            return { count: state.count + 1 };
          }
          return state;
        },
        view: (state) =>
          `<button data-msg='{"type":"Inc"}'>${state.count}</button>`,
      });

      const button = document.querySelector("#app button");
      button.click();
      expect(dispatchCount).toBe(1);

      app1.destroy();

      document.body.innerHTML = '<div id="app"></div>';

      const _app2 = Spriggan.app("#app", {
        init: () => ({ count: 0 }),
        update: (state, msg) => {
          if (msg.type === "Inc") {
            dispatchCount++;
            return { count: state.count + 1 };
          }
          return state;
        },
        view: (state) =>
          `<button data-msg='{"type":"Inc"}'>${state.count}</button>`,
      });

      const button2 = document.querySelector("#app button");
      button2.click();
      expect(dispatchCount).toBe(2);
    });

    it("should call subscription cleanup functions on destroy", () => {
      document.body.innerHTML = '<div id="app"></div>';

      const cleanupFn = vi.fn();

      const appApi = Spriggan.app("#app", {
        init: () => ({}),
        update: (state) => state,
        view: () => "",
        subscriptions: () => cleanupFn,
      });

      appApi.destroy();
      expect(cleanupFn).toHaveBeenCalled();
    });

    it("should handle array of cleanup functions", () => {
      document.body.innerHTML = '<div id="app"></div>';

      const cleanup1 = vi.fn();
      const cleanup2 = vi.fn();

      const appApi = Spriggan.app("#app", {
        init: () => ({}),
        update: (state) => state,
        view: () => "",
        subscriptions: () => [cleanup1, cleanup2],
      });

      appApi.destroy();
      expect(cleanup1).toHaveBeenCalled();
      expect(cleanup2).toHaveBeenCalled();
    });
  });

  describe("DOM event delegation", () => {
    it("should handle click events on elements with data-msg", () => {
      document.body.innerHTML = '<div id="app"></div>';

      const appApi = Spriggan.app("#app", {
        init: () => ({ clicked: false }),
        update: (state, msg) => {
          if (msg.type === "Click") {
            return { clicked: true };
          }
          return state;
        },
        view: () => '<button data-msg=\'{"type":"Click"}\'>Click</button>',
      });

      const button = document.querySelector("#app button");
      button.click();

      expect(appApi.getState()).toEqual({ clicked: true });
    });

    it("should handle click events on nested elements via closest()", () => {
      document.body.innerHTML = '<div id="app"></div>';

      const appApi = Spriggan.app("#app", {
        init: () => ({ clicked: false }),
        update: (state, msg) => {
          if (msg.type === "Click") {
            return { clicked: true };
          }
          return state;
        },
        view: () =>
          '<button data-msg=\'{"type":"Click"}\'><span>Inner</span></button>',
      });

      const span = document.querySelector("#app span");
      span.click();

      expect(appApi.getState()).toEqual({ clicked: true });
    });

    it("should handle input events with data-model", () => {
      document.body.innerHTML = '<div id="app"></div>';

      const appApi = Spriggan.app("#app", {
        init: () => ({ text: "" }),
        update: (state, msg) => {
          if (msg.type === "FieldChanged" && msg.field === "text") {
            return { text: msg.value };
          }
          return state;
        },
        view: () => '<input data-model="text" />',
      });

      const input = document.querySelector("#app input");
      input.value = "hello";
      input.dispatchEvent(new Event("input", { bubbles: true }));

      expect(appApi.getState()).toEqual({ text: "hello" });
    });

    it("should handle change events for checkboxes", () => {
      document.body.innerHTML = '<div id="app"></div>';

      const appApi = Spriggan.app("#app", {
        init: () => ({ checked: false }),
        update: (state, msg) => {
          if (msg.type === "FieldChanged" && msg.field === "agree") {
            return { checked: msg.value };
          }
          return state;
        },
        view: () => '<input type="checkbox" data-model="agree" />',
      });

      const checkbox = document.querySelector("#app input");
      checkbox.checked = true;
      checkbox.dispatchEvent(new Event("change", { bubbles: true }));

      expect(appApi.getState()).toEqual({ checked: true });
    });

    it("should handle change events for select elements", () => {
      document.body.innerHTML = '<div id="app"></div>';

      const appApi = Spriggan.app("#app", {
        init: () => ({ choice: "" }),
        update: (state, msg) => {
          if (msg.type === "FieldChanged" && msg.field === "choice") {
            return { choice: msg.value };
          }
          return state;
        },
        view: () => `
          <select data-model="choice">
            <option value="">Select</option>
            <option value="a">A</option>
            <option value="b">B</option>
          </select>
        `,
      });

      const select = document.querySelector("#app select");
      select.value = "b";
      select.dispatchEvent(new Event("change", { bubbles: true }));

      expect(appApi.getState()).toEqual({ choice: "b" });
    });

    it("should handle submit events and prevent default", () => {
      document.body.innerHTML = '<div id="app"></div>';

      const appApi = Spriggan.app("#app", {
        init: () => ({ submitted: false }),
        update: (state, msg) => {
          if (msg.type === "Submit") {
            return { submitted: true };
          }
          return state;
        },
        view: () =>
          '<form data-msg=\'{"type":"Submit"}\'><button type="submit">Go</button></form>',
      });

      const form = document.querySelector("#app form");
      const event = new Event("submit", { bubbles: true, cancelable: true });
      form.dispatchEvent(event);

      expect(event.defaultPrevented).toBe(true);
      expect(appApi.getState()).toEqual({ submitted: true });
    });

    it("should handle malformed data-msg JSON gracefully", () => {
      document.body.innerHTML = '<div id="app"></div>';

      const appApi = Spriggan.app("#app", {
        init: () => ({ count: 0 }),
        update: (state, msg) => {
          if (msg.type === "Click") {
            return { count: state.count + 1 };
          }
          return state;
        },
        view: () => "<button data-msg='{invalid json}'>Click</button>",
      });

      const button = document.querySelector("#app button");
      button.click();

      expect(console.error).toHaveBeenCalledWith(
        "Spriggan: failed to parse data-msg",
        expect.any(Error),
      );
      expect(appApi.getState()).toEqual({ count: 0 });
    });

    it("should not dispatch for elements without data-msg", () => {
      document.body.innerHTML = '<div id="app"></div>';

      const appApi = Spriggan.app("#app", {
        init: () => ({ count: 0 }),
        update: (state, msg) => {
          if (msg.type === "Click") {
            return { count: state.count + 1 };
          }
          return state;
        },
        view: () => "<button>No data-msg</button>",
      });

      const button = document.querySelector("#app button");
      button.click();

      expect(appApi.getState()).toEqual({ count: 0 });
    });
  });

  describe("fn effect", () => {
    it("should execute custom function and dispatch onComplete", () => {
      document.body.innerHTML = '<div id="app"></div>';

      const appApi = Spriggan.app("#app", {
        init: () => ({ result: null }),
        update: (state, msg) => {
          if (msg.type === "RunFn") {
            return [
              state,
              {
                type: "fn",
                run: () => 42,
                onComplete: "FnComplete",
              },
            ];
          }
          if (msg.type === "FnComplete") {
            return { result: msg.result };
          }
          return state;
        },
        view: () => "",
      });

      appApi.dispatch({ type: "RunFn" });
      expect(appApi.getState()).toEqual({ result: 42 });
    });

    it("should handle function errors gracefully", () => {
      document.body.innerHTML = '<div id="app"></div>';

      const appApi = Spriggan.app("#app", {
        init: () => ({ result: null }),
        update: (state, msg) => {
          if (msg.type === "RunFn") {
            return [
              state,
              {
                type: "fn",
                run: () => {
                  throw new Error("Function error");
                },
              },
            ];
          }
          return state;
        },
        view: () => "",
      });

      appApi.dispatch({ type: "RunFn" });
      expect(console.error).toHaveBeenCalledWith(
        "Spriggan: fn effect failed",
        expect.any(Error),
      );
    });

    it("should warn if run is not a function", () => {
      document.body.innerHTML = '<div id="app"></div>';

      const appApi = Spriggan.app("#app", {
        init: () => ({}),
        update: (state, msg) => {
          if (msg.type === "RunFn") {
            return [state, { type: "fn", run: "not a function" }];
          }
          return state;
        },
        view: () => "",
      });

      appApi.dispatch({ type: "RunFn" });
      expect(console.warn).toHaveBeenCalledWith(
        "Spriggan: fn effect requires run property to be a function",
      );
    });
  });

  describe("storage effect - remove action", () => {
    it("should remove item from localStorage", () => {
      document.body.innerHTML = '<div id="app"></div>';

      const appApi = Spriggan.app("#app", {
        init: () => ({ removed: false }),
        update: (state, msg) => {
          if (msg.type === "RemoveData") {
            return [
              state,
              {
                type: "storage",
                action: "remove",
                key: "testKey",
                onSuccess: "DataRemoved",
              },
            ];
          }
          if (msg.type === "DataRemoved") {
            return { removed: true };
          }
          return state;
        },
        view: () => "",
      });

      appApi.dispatch({ type: "RemoveData" });
      expect(localStorageMock.removeItem).toHaveBeenCalledWith("testKey");
      expect(appApi.getState()).toEqual({ removed: true });
    });
  });

  describe("delay effect edge cases", () => {
    it("should warn if delay effect has no msg property", () => {
      document.body.innerHTML = '<div id="app"></div>';

      const appApi = Spriggan.app("#app", {
        init: () => ({}),
        update: (state, msg) => {
          if (msg.type === "Delay") {
            return [state, { type: "delay", ms: 100 }];
          }
          return state;
        },
        view: () => "",
      });

      appApi.dispatch({ type: "Delay" });
      expect(console.warn).toHaveBeenCalledWith(
        "Spriggan: delay effect requires msg property",
      );
    });
  });

  describe("unknown effect type", () => {
    it("should warn on unknown effect type", () => {
      document.body.innerHTML = '<div id="app"></div>';

      const appApi = Spriggan.app("#app", {
        init: () => ({}),
        update: (state, msg) => {
          if (msg.type === "Trigger") {
            return [state, { type: "unknownEffect" }];
          }
          return state;
        },
        view: () => "",
      });

      appApi.dispatch({ type: "Trigger" });
      expect(console.warn).toHaveBeenCalledWith(
        'Spriggan: unknown effect type "unknownEffect"',
      );
    });
  });

  describe("effect error sandboxing", () => {
    it("should catch errors in effect handlers and not crash the app", () => {
      document.body.innerHTML = '<div id="app"></div>';

      const appApi = Spriggan.app("#app", {
        init: () => ({ count: 0 }),
        update: (state, msg) => {
          if (msg.type === "Trigger") {
            return [{ count: state.count + 1 }, { type: "crashy" }];
          }
          if (msg.type === "Continue") {
            return { count: state.count + 100 };
          }
          return state;
        },
        view: () => "",
        effects: {
          crashy: () => {
            throw new Error("Effect crashed!");
          },
        },
      });

      expect(() => {
        appApi.dispatch({ type: "Trigger" });
      }).not.toThrow();

      expect(console.error).toHaveBeenCalledWith(
        'Spriggan: effect handler "crashy" threw an error',
        expect.any(Error),
      );

      expect(appApi.getState()).toEqual({ count: 1 });

      appApi.dispatch({ type: "Continue" });
      expect(appApi.getState()).toEqual({ count: 101 });
    });
  });

  describe("multiple effects", () => {
    it("should process multiple effects from a single update", () => {
      document.body.innerHTML = '<div id="app"></div>';

      vi.useFakeTimers();

      const appApi = Spriggan.app("#app", {
        init: () => ({ count: 0, delayed: false }),
        update: (state, msg) => {
          if (msg.type === "Trigger") {
            return [
              { ...state, count: state.count + 1 },
              { type: "delay", ms: 100, msg: { type: "Delayed" } },
              { type: "delay", ms: 200, msg: { type: "Delayed2" } },
            ];
          }
          if (msg.type === "Delayed") {
            return { ...state, delayed: true };
          }
          if (msg.type === "Delayed2") {
            return { ...state, delayed: true, count: state.count + 10 };
          }
          return state;
        },
        view: () => "",
      });

      appApi.dispatch({ type: "Trigger" });
      expect(appApi.getState()).toEqual({ count: 1, delayed: false });

      vi.advanceTimersByTime(100);
      expect(appApi.getState()).toEqual({ count: 1, delayed: true });

      vi.advanceTimersByTime(100);
      expect(appApi.getState()).toEqual({ count: 11, delayed: true });

      vi.useRealTimers();
    });

    it("should skip null/undefined effects in array", () => {
      document.body.innerHTML = '<div id="app"></div>';

      vi.useFakeTimers();

      const appApi = Spriggan.app("#app", {
        init: () => ({ count: 0 }),
        update: (state, msg) => {
          if (msg.type === "Trigger") {
            return [
              { count: state.count + 1 },
              null,
              { type: "delay", ms: 10, msg: { type: "Delayed" } },
              undefined,
            ];
          }
          if (msg.type === "Delayed") {
            return { count: state.count + 100 };
          }
          return state;
        },
        view: () => "",
      });

      appApi.dispatch({ type: "Trigger" });
      expect(appApi.getState()).toEqual({ count: 1 });

      vi.advanceTimersByTime(10);
      expect(appApi.getState()).toEqual({ count: 101 });

      vi.useRealTimers();
    });
  });

  describe("view edge cases", () => {
    it("should handle view returning DOM node directly", () => {
      document.body.innerHTML = '<div id="app"></div>';

      Spriggan.app("#app", {
        init: () => ({}),
        update: (state) => state,
        view: () => {
          const div = document.createElement("div");
          div.textContent = "Direct DOM";
          return div;
        },
      });

      expect(document.querySelector("#app").innerHTML).toBe(
        "<div>Direct DOM</div>",
      );
    });

    it("should handle view returning undefined gracefully", () => {
      document.body.innerHTML = '<div id="app"></div>';

      expect(() => {
        Spriggan.app("#app", {
          init: () => ({}),
          update: (state) => state,
          view: () => undefined,
        });
      }).not.toThrow();
    });
  });

  describe("update edge cases", () => {
    it("should handle update returning undefined as state", () => {
      document.body.innerHTML = '<div id="app"></div>';

      const appApi = Spriggan.app("#app", {
        init: () => ({ count: 0 }),
        update: (state, msg) => {
          if (msg.type === "Undefined") {
            return undefined;
          }
          return state;
        },
        view: () => "",
      });

      appApi.dispatch({ type: "Undefined" });
      expect(appApi.getState()).toBeUndefined();
    });

    it("should handle update returning null as state", () => {
      document.body.innerHTML = '<div id="app"></div>';

      const appApi = Spriggan.app("#app", {
        init: () => ({ count: 0 }),
        update: (state, msg) => {
          if (msg.type === "Null") {
            return null;
          }
          return state;
        },
        view: () => "",
      });

      appApi.dispatch({ type: "Null" });
      expect(appApi.getState()).toBeNull();
    });

    it("should warn in debug mode when update returns undefined", () => {
      document.body.innerHTML = '<div id="app"></div>';

      const appApi = Spriggan.app("#app", {
        init: () => ({ count: 0 }),
        update: (state, msg) => {
          if (msg.type === "Undefined") {
            return undefined;
          }
          return state;
        },
        view: () => "",
        debug: true,
      });

      appApi.dispatch({ type: "Undefined" });
      expect(console.warn).toHaveBeenCalledWith(
        "[Spriggan] update() returned undefined - this may be unintentional",
      );
    });
  });

  describe("debug mode with non-object state", () => {
    it("should handle primitive state in debug mode", () => {
      document.body.innerHTML = '<div id="app"></div>';

      expect(() => {
        Spriggan.app("#app", {
          init: () => 0,
          update: (state, msg) => {
            if (msg.type === "Inc") return state + 1;
            return state;
          },
          view: (state) => `<div>${state}</div>`,
          debug: true,
        });
      }).not.toThrow();
    });

    it("should handle null state in debug mode", () => {
      document.body.innerHTML = '<div id="app"></div>';

      expect(() => {
        Spriggan.app("#app", {
          init: () => null,
          update: (state, msg) => {
            if (msg.type === "Set") return { value: 1 };
            return state;
          },
          view: () => "",
          debug: true,
        });
      }).not.toThrow();
    });

    it("should handle primitive state transitions", () => {
      document.body.innerHTML = '<div id="app"></div>';

      const appApi = Spriggan.app("#app", {
        init: () => 0,
        update: (state, msg) => {
          if (msg.type === "Inc") return state + 1;
          return state;
        },
        view: (state) => `<div>${state}</div>`,
        debug: true,
      });

      expect(() => {
        appApi.dispatch({ type: "Inc" });
      }).not.toThrow();

      expect(appApi.getState()).toBe(1);
    });
  });

  describe("HTTP effect edge cases", () => {
    it("should handle network errors", async () => {
      document.body.innerHTML = '<div id="app"></div>';

      global.fetch.mockImplementation(() =>
        Promise.reject(new Error("Network error")),
      );

      const appApi = Spriggan.app("#app", {
        init: () => ({ error: null }),
        update: (state, msg) => {
          if (msg.type === "Fetch") {
            return [
              state,
              {
                type: "http",
                url: "/api/test",
                onError: "FetchError",
              },
            ];
          }
          if (msg.type === "FetchError") {
            return { error: msg.error };
          }
          return state;
        },
        view: () => "",
      });

      appApi.dispatch({ type: "Fetch" });

      await vi.waitFor(() => {
        expect(appApi.getState()).toEqual({ error: "Network error" });
      });
    });

    it("should send body as JSON string", async () => {
      document.body.innerHTML = '<div id="app"></div>';

      global.fetch.mockImplementation(() =>
        Promise.resolve({
          ok: true,
          json: () => ({ success: true }),
        }),
      );

      const appApi = Spriggan.app("#app", {
        init: () => ({}),
        update: (state, msg) => {
          if (msg.type === "Post") {
            return [
              state,
              {
                type: "http",
                url: "/api/test",
                method: "POST",
                body: { name: "test" },
              },
            ];
          }
          return state;
        },
        view: () => "",
      });

      appApi.dispatch({ type: "Post" });

      await vi.waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          "/api/test",
          expect.objectContaining({
            method: "POST",
            body: JSON.stringify({ name: "test" }),
          }),
        );
      });
    });

    it("should merge custom headers", async () => {
      document.body.innerHTML = '<div id="app"></div>';

      global.fetch.mockImplementation(() =>
        Promise.resolve({
          ok: true,
          json: () => ({ success: true }),
        }),
      );

      const appApi = Spriggan.app("#app", {
        init: () => ({}),
        update: (state, msg) => {
          if (msg.type === "Fetch") {
            return [
              state,
              {
                type: "http",
                url: "/api/test",
                headers: { "X-Custom": "value" },
              },
            ];
          }
          return state;
        },
        view: () => "",
      });

      appApi.dispatch({ type: "Fetch" });

      await vi.waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          "/api/test",
          expect.objectContaining({
            headers: expect.objectContaining({
              "Content-Type": "application/json",
              "X-Custom": "value",
            }),
          }),
        );
      });
    });
  });

  describe("storage effect errors", () => {
    it("should handle localStorage errors gracefully", () => {
      document.body.innerHTML = '<div id="app"></div>';

      localStorageMock.setItem.mockImplementation(() => {
        throw new Error("Quota exceeded");
      });

      const appApi = Spriggan.app("#app", {
        init: () => ({}),
        update: (state, msg) => {
          if (msg.type === "Save") {
            return [
              state,
              {
                type: "storage",
                action: "set",
                key: "test",
                value: "data",
              },
            ];
          }
          return state;
        },
        view: () => "",
      });

      appApi.dispatch({ type: "Save" });

      expect(console.error).toHaveBeenCalledWith(
        "Spriggan: storage effect failed",
        expect.any(Error),
      );
    });
  });

  describe("custom effect handlers", () => {
    it("should allow custom effect handlers", () => {
      document.body.innerHTML = '<div id="app"></div>';

      const customHandler = vi.fn();

      const appApi = Spriggan.app("#app", {
        init: () => ({}),
        update: (state, msg) => {
          if (msg.type === "Trigger") {
            return [state, { type: "custom", data: "test" }];
          }
          return state;
        },
        view: () => "",
        effects: {
          custom: customHandler,
        },
      });

      appApi.dispatch({ type: "Trigger" });

      expect(customHandler).toHaveBeenCalledWith(
        { type: "custom", data: "test" },
        expect.any(Function),
      );
    });
  });

  describe("custom effect runner", () => {
    it("should allow custom effect runner", () => {
      document.body.innerHTML = '<div id="app"></div>';

      const customRunner = vi.fn();

      const appApi = Spriggan.app("#app", {
        init: () => ({}),
        update: (state, msg) => {
          if (msg.type === "Trigger") {
            return [state, { type: "delay", ms: 100, msg: { type: "Done" } }];
          }
          return state;
        },
        view: () => "",
        effectRunner: customRunner,
      });

      appApi.dispatch({ type: "Trigger" });

      expect(customRunner).toHaveBeenCalled();
    });
  });

  describe("property tests - html function", () => {
    it("should embed any string value unchanged", () => {
      fc.assert(
        fc.property(fc.string(), (s) => {
          const result = Spriggan.html`<div>${s}</div>`;
          return result === `<div>${s}</div>`;
        }),
      );
    });

    it("should embed any number value as string", () => {
      fc.assert(
        fc.property(fc.integer(), (n) => {
          const result = Spriggan.html`<span>${n}</span>`;
          return result === `<span>${n}</span>`;
        }),
      );
    });

    it("should always produce empty string for null", () => {
      fc.assert(
        fc.property(fc.string(), (prefix, _suffix) => {
          const result = Spriggan.html`${null}${prefix}${null}`;
          return result === prefix;
        }),
      );
    });

    it("should always produce empty string for undefined", () => {
      fc.assert(
        fc.property(fc.string(), (s) => {
          const result = Spriggan.html`${undefined}${s}${undefined}`;
          return result === s;
        }),
      );
    });

    it("should join arrays by concatenating their string elements", () => {
      fc.assert(
        fc.property(fc.array(fc.string()), (arr) => {
          const result = Spriggan.html`<ul>${arr}</ul>`;
          return result === `<ul>${arr.join("")}</ul>`;
        }),
      );
    });

    it("should handle multiple string interpolations", () => {
      fc.assert(
        fc.property(fc.string(), fc.string(), fc.string(), (a, b, c) => {
          const result = Spriggan.html`${a}${b}${c}`;
          return result === `${a}${b}${c}`;
        }),
      );
    });

    it("should stringify message objects with valid JSON in single quotes", () => {
      fc.assert(
        fc.property(
          fc
            .string({ minLength: 1, maxLength: 20 })
            .filter((s) => s.length > 0),
          fc.option(fc.integer(), { nil: undefined }),
          (type, extra) => {
            const msg = extra !== undefined ? { type, extra } : { type };
            const result = Spriggan.html`<button data-msg=${msg}>Click</button>`;
            const expected = `'${JSON.stringify(msg)}'`;
            return result.includes(expected);
          },
        ),
      );
    });

    it("should produce valid HTML for nested templates", () => {
      fc.assert(
        fc.property(fc.string(), fc.string(), (inner, outer) => {
          const innerHtml = Spriggan.html`<span>${inner}</span>`;
          const outerHtml = Spriggan.html`<div>${innerHtml}${outer}</div>`;
          return outerHtml === `<div><span>${inner}</span>${outer}</div>`;
        }),
      );
    });

    it("should handle boolean false by producing empty string", () => {
      fc.assert(
        fc.property(fc.string(), (s) => {
          const result = Spriggan.html`${false}${s}${false}`;
          return result === s;
        }),
      );
    });

    it("should handle boolean true by producing empty string", () => {
      fc.assert(
        fc.property(fc.string(), (s) => {
          const result = Spriggan.html`${true}${s}${true}`;
          return result === s;
        }),
      );
    });
  });

  describe("property tests - state transitions", () => {
    it("should always produce a state after dispatch for any valid message", () => {
      fc.assert(
        fc.property(
          fc.record({ count: fc.integer() }),
          fc.string({ minLength: 1 }),
          (initialState, msgType) => {
            document.body.innerHTML = '<div id="app"></div>';

            const appApi = Spriggan.app("#app", {
              init: () => initialState,
              update: (state, _msg) => state,
              view: () => "<div>test</div>",
            });

            appApi.dispatch({ type: msgType });
            const state = appApi.getState();

            return state !== undefined && state.count === initialState.count;
          },
        ),
      );
    });

    it("should preserve state shape through multiple dispatches", () => {
      fc.assert(
        fc.property(
          fc.record({
            value: fc.integer({ min: -1000, max: 1000 }),
            name: fc.string({ maxLength: 10 }),
          }),
          fc.array(fc.string({ minLength: 1 }), { maxLength: 10 }),
          (initialState, messageTypes) => {
            document.body.innerHTML = '<div id="app"></div>';

            const appApi = Spriggan.app("#app", {
              init: () => ({ ...initialState }),
              update: (state, msg) => {
                if (msg.type === "inc")
                  return { ...state, value: state.value + 1 };
                if (msg.type === "dec")
                  return { ...state, value: state.value - 1 };
                return state;
              },
              view: () => "<div>test</div>",
            });

            messageTypes.forEach((type) => {
              appApi.dispatch({ type });
            });

            const finalState = appApi.getState();
            return (
              typeof finalState.value === "number" &&
              typeof finalState.name === "string"
            );
          },
        ),
      );
    });

    it("should handle state that is a primitive", () => {
      fc.assert(
        fc.property(
          fc.integer(),
          fc.string({ minLength: 1 }),
          (initialState, msgType) => {
            document.body.innerHTML = '<div id="app"></div>';

            const appApi = Spriggan.app("#app", {
              init: () => initialState,
              update: (state, msg) => {
                if (msg.type === "inc") return state + 1;
                return state;
              },
              view: (state) => `<div>${state}</div>`,
            });

            appApi.dispatch({ type: msgType });
            const state = appApi.getState();

            return typeof state === "number";
          },
        ),
      );
    });

    it("should handle effect tuples correctly", () => {
      fc.assert(
        fc.property(
          fc.record({ value: fc.integer() }),
          fc.string({ minLength: 1 }),
          (initialState, msgType) => {
            document.body.innerHTML = '<div id="app"></div>';
            vi.useFakeTimers();

            const appApi = Spriggan.app("#app", {
              init: () => initialState,
              update: (state, msg) => {
                if (msg.type === msgType) {
                  return [
                    { value: state.value + 1 },
                    { type: "delay", ms: 100, msg: { type: "noop" } },
                  ];
                }
                return state;
              },
              view: () => "<div>test</div>",
            });

            appApi.dispatch({ type: msgType });
            const stateBefore = appApi.getState();

            vi.advanceTimersByTime(150);
            const stateAfter = appApi.getState();

            vi.useRealTimers();

            return (
              stateBefore.value === stateAfter.value - 1 ||
              stateBefore.value === initialState.value + 1
            );
          },
        ),
      );
    });
  });

  describe("property tests - effect handling", () => {
    it("should process any effect with a string type", () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 20 }),
          fc.record({ data: fc.string() }),
          (effectType, payload) => {
            document.body.innerHTML = '<div id="app"></div>';

            let handlerCalled = false;
            const handler = vi.fn(() => {
              handlerCalled = true;
            });

            const appApi = Spriggan.app("#app", {
              init: () => ({}),
              update: (state, msg) => {
                if (msg.type === "trigger") {
                  return [state, { type: effectType, ...payload }];
                }
                return state;
              },
              view: () => "",
              effects: {
                [effectType]: handler,
              },
            });

            appApi.dispatch({ type: "trigger" });

            return handlerCalled || console.warn.mock.calls.length > 0;
          },
        ),
      );
    });
  });
});
