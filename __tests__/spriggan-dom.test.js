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

describe("Spriggan Framework - DOM Tests", () => {
  let Spriggan;

  beforeEach(() => {
    vi.spyOn(window, "requestAnimationFrame").mockImplementation((cb) => cb());

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

  afterEach(() => {
    window.requestAnimationFrame.mockRestore();
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

  describe("dom effect", () => {
    it("should call focus on element when found", async () => {
      document.body.innerHTML = '<input id="target" /><div id="app"></div>';

      let focusCalled = false;
      const element = document.querySelector("#target");
      element.focus = () => {
        focusCalled = true;
      };

      const appApi = Spriggan.app("#app", {
        init: () => ({}),
        update: (state, msg) => {
          if (msg.type === "Focus") {
            return [
              state,
              { type: "dom", action: "focus", selector: "#target" },
            ];
          }
          return state;
        },
        view: () => "",
      });

      appApi.dispatch({ type: "Focus" });

      await vi.waitFor(() => {
        expect(focusCalled).toBe(true);
      });
    });

    it("should call blur on element when found", async () => {
      document.body.innerHTML = '<input id="target" /><div id="app"></div>';

      let blurCalled = false;
      const element = document.querySelector("#target");
      element.blur = () => {
        blurCalled = true;
      };

      const appApi = Spriggan.app("#app", {
        init: () => ({}),
        update: (state, msg) => {
          if (msg.type === "Blur") {
            return [
              state,
              { type: "dom", action: "blur", selector: "#target" },
            ];
          }
          return state;
        },
        view: () => "",
      });

      appApi.dispatch({ type: "Blur" });

      await vi.waitFor(() => {
        expect(blurCalled).toBe(true);
      });
    });

    it("should call scrollIntoView on element", async () => {
      document.body.innerHTML = '<div id="target"></div><div id="app"></div>';

      let scrollOptions = null;
      const element = document.querySelector("#target");
      element.scrollIntoView = (options) => {
        scrollOptions = options;
      };

      const appApi = Spriggan.app("#app", {
        init: () => ({}),
        update: (state, msg) => {
          if (msg.type === "Scroll") {
            return [
              state,
              {
                type: "dom",
                action: "scrollIntoView",
                selector: "#target",
                options: { behavior: "smooth" },
              },
            ];
          }
          return state;
        },
        view: () => "",
      });

      appApi.dispatch({ type: "Scroll" });

      await vi.waitFor(() => {
        expect(scrollOptions).toEqual({ behavior: "smooth" });
      });
    });

    it("should set attribute on element", async () => {
      document.body.innerHTML = '<input id="target" /><div id="app"></div>';

      const appApi = Spriggan.app("#app", {
        init: () => ({}),
        update: (state, msg) => {
          if (msg.type === "SetAttr") {
            return [
              state,
              {
                type: "dom",
                action: "setAttribute",
                selector: "#target",
                name: "data-test",
                value: "hello",
              },
            ];
          }
          return state;
        },
        view: () => "",
      });

      appApi.dispatch({ type: "SetAttr" });

      await vi.waitFor(() => {
        const el = document.querySelector("#target");
        expect(el).not.toBeNull();
        expect(el.getAttribute("data-test")).toBe("hello");
      });
    });

    it("should remove attribute from element", async () => {
      document.body.innerHTML =
        '<input id="target" disabled /><div id="app"></div>';

      const appApi = Spriggan.app("#app", {
        init: () => ({}),
        update: (state, msg) => {
          if (msg.type === "RemoveAttr") {
            return [
              state,
              {
                type: "dom",
                action: "removeAttribute",
                selector: "#target",
                name: "disabled",
              },
            ];
          }
          return state;
        },
        view: () => "",
      });

      const el = document.querySelector("#target");
      expect(el.hasAttribute("disabled")).toBe(true);

      appApi.dispatch({ type: "RemoveAttr" });

      await vi.waitFor(() => {
        expect(el.hasAttribute("disabled")).toBe(false);
      });
    });

    it("should add class to element", async () => {
      document.body.innerHTML = '<div id="target"></div><div id="app"></div>';

      const appApi = Spriggan.app("#app", {
        init: () => ({}),
        update: (state, msg) => {
          if (msg.type === "AddClass") {
            return [
              state,
              {
                type: "dom",
                action: "addClass",
                selector: "#target",
                value: "active",
              },
            ];
          }
          return state;
        },
        view: () => "",
      });

      appApi.dispatch({ type: "AddClass" });

      await vi.waitFor(() => {
        const el = document.querySelector("#target");
        expect(el).not.toBeNull();
        expect(el.classList.contains("active")).toBe(true);
      });
    });

    it("should remove class from element", async () => {
      document.body.innerHTML =
        '<div id="target" class="active"></div><div id="app"></div>';

      const appApi = Spriggan.app("#app", {
        init: () => ({}),
        update: (state, msg) => {
          if (msg.type === "RemoveClass") {
            return [
              state,
              {
                type: "dom",
                action: "removeClass",
                selector: "#target",
                value: "active",
              },
            ];
          }
          return state;
        },
        view: () => "",
      });

      appApi.dispatch({ type: "RemoveClass" });

      await vi.waitFor(() => {
        const el = document.querySelector("#target");
        expect(el).not.toBeNull();
        expect(el.classList.contains("active")).toBe(false);
      });
    });

    it("should toggle class on element", async () => {
      document.body.innerHTML = '<div id="target"></div><div id="app"></div>';

      const appApi = Spriggan.app("#app", {
        init: () => ({}),
        update: (state, msg) => {
          if (msg.type === "ToggleClass") {
            return [
              state,
              {
                type: "dom",
                action: "toggleClass",
                selector: "#target",
                value: "active",
              },
            ];
          }
          return state;
        },
        view: () => "",
      });

      appApi.dispatch({ type: "ToggleClass" });

      await vi.waitFor(() => {
        const el = document.querySelector("#target");
        expect(el).not.toBeNull();
        expect(el.classList.contains("active")).toBe(true);
      });

      appApi.dispatch({ type: "ToggleClass" });

      await vi.waitFor(() => {
        const el = document.querySelector("#target");
        expect(el).not.toBeNull();
        expect(el.classList.contains("active")).toBe(false);
      });
    });

    it("should set property on element", async () => {
      document.body.innerHTML = '<input id="target" /><div id="app"></div>';

      const appApi = Spriggan.app("#app", {
        init: () => ({}),
        update: (state, msg) => {
          if (msg.type === "SetValue") {
            return [
              state,
              {
                type: "dom",
                action: "setProperty",
                selector: "#target",
                name: "value",
                value: "test value",
              },
            ];
          }
          return state;
        },
        view: () => "",
      });

      appApi.dispatch({ type: "SetValue" });

      await vi.waitFor(() => {
        const el = document.querySelector("#target");
        expect(el).not.toBeNull();
        expect(el.value).toBe("test value");
      });
    });

    it("should warn if element not found", async () => {
      document.body.innerHTML = '<div id="app"></div>';

      const appApi = Spriggan.app("#app", {
        init: () => ({}),
        update: (state, msg) => {
          if (msg.type === "Focus") {
            return [
              state,
              { type: "dom", action: "focus", selector: "#nonexistent" },
            ];
          }
          return state;
        },
        view: () => "",
      });

      appApi.dispatch({ type: "Focus" });

      await vi.waitFor(() => {
        expect(console.warn).toHaveBeenCalledWith(
          'Spriggan: dom effect - element not found: "#nonexistent"',
        );
      });
    });

    it("should warn on unknown action", async () => {
      document.body.innerHTML = '<div id="target"></div><div id="app"></div>';

      const appApi = Spriggan.app("#app", {
        init: () => ({}),
        update: (state, msg) => {
          if (msg.type === "Unknown") {
            return [
              state,
              { type: "dom", action: "unknownAction", selector: "#target" },
            ];
          }
          return state;
        },
        view: () => "",
      });

      appApi.dispatch({ type: "Unknown" });

      await vi.waitFor(() => {
        expect(console.warn).toHaveBeenCalledWith(
          'Spriggan: dom effect - unknown action "unknownAction"',
        );
      });
    });

    it("should support delay parameter", async () => {
      document.body.innerHTML = '<input id="target" /><div id="app"></div>';

      let focusCalled = false;
      const element = document.querySelector("#target");
      element.focus = () => {
        focusCalled = true;
      };

      const appApi = Spriggan.app("#app", {
        init: () => ({}),
        update: (state, msg) => {
          if (msg.type === "Focus") {
            return [
              state,
              { type: "dom", action: "focus", selector: "#target", delay: 50 },
            ];
          }
          return state;
        },
        view: () => "",
      });

      appApi.dispatch({ type: "Focus" });
      expect(focusCalled).toBe(false);

      await vi.waitFor(
        () => {
          expect(focusCalled).toBe(true);
        },
        { timeout: 200 },
      );
    });
  });
});
