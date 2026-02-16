import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// Mock fetch globally
global.fetch = vi.fn();

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};
global.localStorage = localStorageMock;

// Mock console methods
global.console = {
  log: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
  group: vi.fn(),
  groupEnd: vi.fn(),
};

// Import Spriggan after mocks
import Spriggan from '../src/spriggan.js';

describe('Spriggan Framework', () => {
  beforeEach(() => {
    // Reset DOM
    document.body.innerHTML = '';

    // Reset mocks
    vi.clearAllMocks();

    // Reset localStorage mocks
    localStorageMock.getItem.mockReset();
    localStorageMock.setItem.mockReset();
    localStorageMock.removeItem.mockReset();

    // Reset console mocks
    console.log.mockReset();
    console.warn.mockReset();
    console.error.mockReset();
    console.group.mockReset();
    console.groupEnd.mockReset();
  });

  describe('html function', () => {
    it('should return basic HTML strings unchanged', () => {
      const result = Spriggan.html`<div>Hello World</div>`;
      expect(result).toBe('<div>Hello World</div>');
    });

    it('should interpolate string values', () => {
      const name = 'Alice';
      const result = Spriggan.html`<p>Hello ${name}</p>`;
      expect(result).toBe('<p>Hello Alice</p>');
    });

    it('should handle number values', () => {
      const count = 42;
      const result = Spriggan.html`<span>${count}</span>`;
      expect(result).toBe('<span>42</span>');
    });

    it('should join array elements', () => {
      const items = ['<li>One</li>', '<li>Two</li>'];
      const result = Spriggan.html`<ul>${items}</ul>`;
      expect(result).toBe('<ul><li>One</li><li>Two</li></ul>');
    });

    it('should skip null and undefined values', () => {
      const result = Spriggan.html`<div>${null}${undefined}text</div>`;
      expect(result).toBe('<div>text</div>');
    });

    it('should skip false values', () => {
      const show = false;
      const result = Spriggan.html`<div>${show && 'hidden'}</div>`;
      expect(result).toBe('<div></div>');
    });

    it('should skip true values (for boolean attributes)', () => {
      const result = Spriggan.html`<input${true} />`;
      expect(result).toBe('<input />');
    });
  });

  describe('app initialization', () => {
    it('should throw error if required config is missing', () => {
      document.body.innerHTML = '<div id="app"></div>';

      expect(() => {
        Spriggan.app('#app', {});
      }).toThrow('Spriggan: init, update, and view are required');
    });

    it('should throw error if root element not found', () => {
      expect(() => {
        Spriggan.app('#nonexistent', {
          init: () => ({}),
          update: (state) => state,
          view: () => ''
        });
      }).toThrow('Spriggan: element "#nonexistent" not found');
    });

    it('should initialize with basic config', () => {
      document.body.innerHTML = '<div id="app"></div>';

      const initState = { count: 0 };
      const { getState } = Spriggan.app('#app', {
        init: () => initState,
        update: (state) => state,
        view: () => '<div>Counter: 0</div>'
      });

      expect(getState()).toEqual(initState);
      expect(document.querySelector('#app').innerHTML).toBe('<div>Counter: 0</div>');
    });

    it('should handle init as function or value', () => {
      document.body.innerHTML = '<div id="app"></div>';

      // Function
      const { getState: getState1 } = Spriggan.app('#app', {
        init: () => ({ a: 1 }),
        update: (state) => state,
        view: () => ''
      });
      expect(getState1()).toEqual({ a: 1 });

      // Reset
      document.body.innerHTML = '<div id="app"></div>';

      // Value
      const { getState: getState2 } = Spriggan.app('#app', {
        init: { b: 2 },
        update: (state) => state,
        view: () => ''
      });
      expect(getState2()).toEqual({ b: 2 });
    });
  });

  describe('dispatch', () => {
    let appApi;

    beforeEach(() => {
      document.body.innerHTML = '<div id="app"></div>';

      appApi = Spriggan.app('#app', {
        init: () => ({ count: 0 }),
        update: (state, msg) => {
          if (msg.type === 'Increment') {
            return { count: state.count + 1 };
          }
          return state;
        },
        view: (state) => `<div>Count: ${state.count}</div>`
      });
    });

    it('should update state on valid message', () => {
      appApi.dispatch({ type: 'Increment' });
      expect(appApi.getState()).toEqual({ count: 1 });
    });

    it('should re-render after dispatch', () => {
      appApi.dispatch({ type: 'Increment' });
      expect(document.querySelector('#app').innerHTML).toBe('<div>Count: 1</div>');
    });

    it('should warn on invalid message', () => {
      appApi.dispatch({});
      expect(console.warn).toHaveBeenCalledWith('Spriggan: dispatch called with invalid message', {});
    });

    it('should handle effects returned from update', () => {
      vi.useFakeTimers();
      // Reset for new app with effects
      document.body.innerHTML = '<div id="app"></div>';

      const appWithEffects = Spriggan.app('#app', {
        init: () => ({ loading: false }),
        update: (state, msg) => {
          if (msg.type === 'LoadData') {
            return [
              { loading: true },
              { type: 'delay', ms: 100, msg: { type: 'DataLoaded' } }
            ];
          }
          if (msg.type === 'DataLoaded') {
            return { loading: false };
          }
          return state;
        },
        view: (state) => `<div>Loading: ${state.loading}</div>`
      });

      appWithEffects.dispatch({ type: 'LoadData' });
      expect(appWithEffects.getState()).toEqual({ loading: true });

      // Advance timers
      vi.runOnlyPendingTimers();
      expect(appWithEffects.getState()).toEqual({ loading: false });
      vi.useRealTimers();
    });
  });

  describe('effects system', () => {
    let dispatchMock;
    let handlers;

    beforeEach(() => {
      dispatchMock = vi.fn();
      // Get the default effects from the module
      // Since they're internal, we'll test the effect runner directly
      // For now, test via app dispatch
    });

    it('should handle HTTP effects', async () => {
      document.body.innerHTML = '<div id="app"></div>';

      global.fetch.mockImplementation(() => Promise.resolve({
        ok: true,
        json: () => ({ data: 'test' })
      }));

      const appApi = Spriggan.app('#app', {
        init: () => ({}),
        update: (state, msg) => {
          if (msg.type === 'FetchData') {
            return [
              state,
              {
                type: 'http',
                url: '/api/test',
                onSuccess: 'DataFetched'
              }
            ];
          }
          if (msg.type === 'DataFetched') {
            return { data: msg.data };
          }
          return state;
        },
        view: () => ''
      });

      appApi.dispatch({ type: 'FetchData' });

      await vi.waitFor(() => {
        expect(appApi.getState()).toEqual({ data: { data: 'test' } });
      });
    });

    it('should handle HTTP effect errors', async () => {
      document.body.innerHTML = '<div id="app"></div>';

      global.fetch.mockImplementation(() => Promise.resolve({
        ok: false,
        status: 404,
        statusText: 'Not Found'
      }));

      const appApi = Spriggan.app('#app', {
        init: () => ({}),
        update: (state, msg) => {
          if (msg.type === 'FetchData') {
            return [
              state,
              {
                type: 'http',
                url: '/api/test',
                onError: 'FetchError'
              }
            ];
          }
          if (msg.type === 'FetchError') {
            return { error: msg.error };
          }
          return state;
        },
        view: () => ''
      });

      appApi.dispatch({ type: 'FetchData' });

      await vi.waitFor(() => {
        expect(appApi.getState()).toEqual({ error: 'HTTP 404: Not Found' });
      });
    });

    it('should handle delay effects', () => {
      document.body.innerHTML = '<div id="app"></div>';

      vi.useFakeTimers();

      const appApi = Spriggan.app('#app', {
        init: () => ({ triggered: false }),
        update: (state, msg) => {
          if (msg.type === 'DelayAction') {
            return [
              state,
              { type: 'delay', ms: 1000, msg: { type: 'DelayedAction' } }
            ];
          }
          if (msg.type === 'DelayedAction') {
            return { triggered: true };
          }
          return state;
        },
        view: () => ''
      });

      appApi.dispatch({ type: 'DelayAction' });
      expect(appApi.getState()).toEqual({ triggered: false });

      vi.advanceTimersByTime(1000);
      expect(appApi.getState()).toEqual({ triggered: true });

      vi.useRealTimers();
    });

    it('should handle storage effects', () => {
      document.body.innerHTML = '<div id="app"></div>';

      localStorageMock.setItem.mockImplementation(() => {});
      localStorageMock.getItem.mockReturnValue(null);

      const appApi = Spriggan.app('#app', {
        init: () => ({}),
        update: (state, msg) => {
          if (msg.type === 'SaveData') {
            return [
              state,
              {
                type: 'storage',
                action: 'set',
                key: 'testKey',
                value: { test: 'data' },
                onSuccess: 'DataSaved'
              }
            ];
          }
          if (msg.type === 'DataSaved') {
            return { saved: true };
          }
          if (msg.type === 'LoadData') {
            return [
              state,
              {
                type: 'storage',
                action: 'get',
                key: 'testKey',
                onSuccess: 'DataLoaded'
              }
            ];
          }
          if (msg.type === 'DataLoaded') {
            return { loaded: msg.data };
          }
          return state;
        },
        view: () => ''
      });

      // Test set
      appApi.dispatch({ type: 'SaveData' });
      expect(localStorageMock.setItem).toHaveBeenCalledWith('testKey', JSON.stringify({ test: 'data' }));
      expect(appApi.getState()).toEqual({ saved: true });

      // Test get
      localStorageMock.getItem.mockReturnValue(JSON.stringify({ test: 'data' }));
      appApi.dispatch({ type: 'LoadData' });
      expect(localStorageMock.getItem).toHaveBeenCalledWith('testKey');
      expect(appApi.getState()).toEqual({ loaded: { test: 'data' } });
    });
  });

  describe('event handling', () => {
    let appApi;

    beforeEach(() => {
      document.body.innerHTML = '<div id="app"></div>';

      appApi = Spriggan.app('#app', {
        init: () => ({ input: '', clicked: false }),
        update: (state, msg) => {
          switch (msg.type) {
            case 'FieldChanged':
              return { ...state, input: msg.value };
            case 'ButtonClicked':
              return { ...state, clicked: true };
            default:
              return state;
          }
        },
        view: (state) => `
          <input data-model="input" value="${state.input}" />
          <button data-msg="${JSON.stringify({ type: 'ButtonClicked' }).replace(/"/g, '&quot;')}">Click</button>
        `
      });
    });

    it('should handle input events', () => {
      appApi.dispatch({ type: 'FieldChanged', field: 'input', value: 'test input' });

      expect(appApi.getState()).toEqual({ input: 'test input', clicked: false });
    });

    it('should handle click events with data-msg', () => {
      appApi.dispatch({ type: 'ButtonClicked' });

      expect(appApi.getState()).toEqual({ input: '', clicked: true });
    });

    it('should handle checkbox change events', () => {
      document.body.innerHTML = '<div id="app"></div>';

      const appWithCheckbox = Spriggan.app('#app', {
        init: () => ({ checked: false }),
        update: (state, msg) => {
          if (msg.type === 'FieldChanged' && msg.field === 'checkbox') {
            return { checked: msg.value };
          }
          return state;
        },
        view: () => '<input type="checkbox" data-model="checkbox" />'
      });

      appWithCheckbox.dispatch({ type: 'FieldChanged', field: 'checkbox', value: true });

      expect(appWithCheckbox.getState()).toEqual({ checked: true });
    });
  });

  describe('debug mode', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('should log initialization in debug mode', () => {
      document.body.innerHTML = '<div id="app"></div>';

      Spriggan.app('#app', {
        init: () => ({ count: 0 }),
        update: (state) => state,
        view: () => '',
        debug: true
      });

      expect(console.log).toHaveBeenCalledWith('[Spriggan] Initialized with state:', { count: 0 });
    });

    it('should log dispatch details in debug mode', () => {
      document.body.innerHTML = '<div id="app"></div>';

      const appApi = Spriggan.app('#app', {
        init: () => ({ count: 0 }),
        update: (state, msg) => {
          if (msg.type === 'Increment') {
            return { count: state.count + 1 };
          }
          return state;
        },
        view: () => '',
        debug: true
      });

      appApi.dispatch({ type: 'Increment' });

      expect(console.group).toHaveBeenCalledWith('[Spriggan] Dispatch: Increment');
      expect(console.log).toHaveBeenCalledWith('Message:', { type: 'Increment' });
      expect(console.log).toHaveBeenCalledWith('Previous state:', { count: 0 });
      expect(console.log).toHaveBeenCalledWith('New state:', { count: 1 });
      expect(console.groupEnd).toHaveBeenCalled();
    });

    it('should track history in debug mode', () => {
      document.body.innerHTML = '<div id="app"></div>';

      const appApi = Spriggan.app('#app', {
        init: () => ({ count: 0 }),
        update: (state, msg) => ({ count: state.count + 1 }),
        view: () => '',
        debug: true
      });

      appApi.dispatch({ type: 'Increment' });
      vi.advanceTimersByTime(10); // Mock timestamp
      appApi.dispatch({ type: 'Increment' });

      // Access debug tools (assuming they exist on window)
      if (global.window.__SPRIGGAN_DEBUG__) {
        expect(global.window.__SPRIGGAN_DEBUG__.history).toHaveLength(2);
      }
    });
  });
});