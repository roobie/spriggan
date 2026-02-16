/**
 * Spriggan - A minimal TEA-inspired framework
 * TypeScript type definitions
 */

/**
 * Create a new Spriggan instance
 * @returns SprigganInstance with app and html functions
 */
declare function createSpriggan(): SprigganInstance;

export default createSpriggan;

/**
 * Tagged template literal for HTML generation
 * @example html`<div class="${className}">${content}</div>`
 */
export function html(
  strings: TemplateStringsArray,
  ...values: HtmlValue[]
): string;

interface SprigganInstance {
  app: typeof app;
  html: typeof html;
}

type HtmlValue =
  | string
  | number
  | boolean
  | null
  | undefined
  | HtmlValue[]
  | (() => HtmlValue)
  | Message;

/**
 * Initialize a Spriggan application
 * @param selector - CSS selector for the root element
 * @param config - Application configuration
 */
declare function app<T, M extends Message>(
  selector: string,
  config: AppConfig<T, M>,
): AppApi<T>;

/**
 * Application configuration
 */
interface AppConfig<T, M extends Message> {
  /** Initial state or function that returns initial state */
  init: T | (() => T);

  /** Update function that handles messages and returns new state */
  update: UpdateFunction<T, M>;

  /** View function that renders state to HTML string or DOM node */
  view: ViewFunction<T>;

  /** Custom effect handlers (merged with defaults) */
  effects?: Record<string, EffectHandler<M>>;

  /** Custom effect runner (replaces default) */
  effectRunner?: EffectRunner<M>;

  /** Subscription setup function for external event sources */
  subscriptions?: SubscriptionFunction<M>;

  /** Enable debug mode with logging and time-travel */
  debug?: boolean;
}

/**
 * Message type - must have a type property
 */
interface Message {
  type: string;
  [key: string]: unknown;
}

/**
 * Update function type
 * Returns either new state, or [newState, ...effects] tuple
 */
type UpdateFunction<T, M extends Message> = (
  state: T,
  msg: M,
) => T | [T, ...Effect[]];

/**
 * View function type
 * Returns HTML string, DOM Node, or undefined
 */
type ViewFunction<T> = (state: T, dispatch: Dispatch) => string | Node | void;

/**
 * Dispatch function type
 */
type Dispatch = <M extends Message>(msg: M) => void;

/**
 * Application API returned from app()
 */
interface AppApi<T> {
  /** Dispatch a message to trigger state update */
  dispatch: Dispatch;

  /** Get current state */
  getState: () => T | null;

  /** Destroy the app and clean up resources */
  destroy: () => void;
}

/**
 * Subscription function - setup external event listeners
 * Returns cleanup function or array of cleanup functions
 */
type SubscriptionFunction<M extends Message> = (
  dispatch: Dispatch,
) => CleanupFn | CleanupFn[] | void;

type CleanupFn = () => void;

/**
 * Effect object - must have a type property
 */
interface Effect {
  type: string;
  [key: string]: unknown;
}

/**
 * Effect handler function
 */
type EffectHandler<M extends Message> = (
  effect: Effect,
  dispatch: Dispatch,
) => void;

/**
 * Effect runner function
 */
type EffectRunner<M extends Message> = (
  effect: Effect,
  dispatch: Dispatch,
  handlers: Record<string, EffectHandler<M>>,
) => void;

// ============================================================================
// Built-in Effect Types
// ============================================================================

/**
 * HTTP effect - make HTTP requests
 */
interface HttpEffect extends Effect {
  type: "http";
  url: string;
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: unknown;
  headers?: Record<string, string>;
  onSuccess?: string;
  onError?: string;
}

/**
 * Delay effect - dispatch a message after a delay
 */
interface DelayEffect<M extends Message = Message> extends Effect {
  type: "delay";
  ms: number;
  msg: M;
}

/**
 * Storage effect - interact with localStorage
 */
interface StorageEffect extends Effect {
  type: "storage";
  action: "get" | "set" | "remove";
  key: string;
  value?: unknown;
  onSuccess?: string;
}

/**
 * Function effect - execute a custom function
 */
interface FnEffect extends Effect {
  type: "fn";
  run: () => unknown;
  onComplete?: string;
}

/**
 * Built-in effect types
 */
type BuiltInEffect<M extends Message = Message> =
  | HttpEffect
  | DelayEffect<M>
  | StorageEffect
  | FnEffect;

// ============================================================================
// Debug Tools
// ============================================================================

/**
 * Debug tools available on globalThis.__SPRIGGAN_DEBUG__ when debug mode is enabled
 */
interface SprigganDebugTools<T> {
  /** Get current state */
  getState: () => T;

  /** Dispatch a message */
  dispatch: Dispatch;

  /** History of state changes */
  history: Array<{
    msg: Message;
    state: T;
    timestamp: number;
  }>;

  /** Travel to a specific history entry */
  timeTravel: (index: number) => void;

  /** Clear all history */
  clearHistory: () => void;
}

declare global {
  var __SPRIGGAN_DEBUG__: SprigganDebugTools<unknown> | undefined;
}
