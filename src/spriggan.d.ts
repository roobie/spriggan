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
 * Message type - must have a type property
 */
interface Message {
  type: string;
  [key: string]: unknown;
}

/**
 * Dispatch function type - parameterized by message type
 */
type Dispatch<M extends Message = Message> = (msg: M) => void;

/**
 * Initialize a Spriggan application
 * @param selector - CSS selector for the root element
 * @param config - Application configuration
 */
declare function app<T, M extends Message>(
  selector: string,
  config: AppConfig<T, M>,
): AppApi<T, M>;

/**
 * Application configuration
 */
interface AppConfig<T, M extends Message> {
  /** Initial state or function that returns initial state */
  init: T | (() => T);

  /** Update function that handles messages and returns new state */
  update: UpdateFunction<T, M>;

  /** View function that renders state to HTML string or DOM node */
  view: ViewFunction<T, M>;

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
type ViewFunction<T, M extends Message> = (
  state: T,
  dispatch: Dispatch<M>,
) => string | Node | undefined;

/**
 * Application API returned from app()
 */
interface AppApi<T, M extends Message = Message> {
  /** Dispatch a message to trigger state update */
  dispatch: Dispatch<M>;

  /** Get current state */
  getState: () => T | null;

  /** Destroy the app and clean up resources */
  destroy: () => void;

  /** Debug tools (only present when debug: true) */
  debug?: DebugTools<T, M>;
}

/**
 * Debug tools available on app instance when debug mode is enabled
 */
interface DebugTools<T, M extends Message = Message> {
  /** History of state changes */
  history: Array<{
    msg: M;
    state: T;
    timestamp: number;
  }>;

  /** Travel to a specific history entry */
  timeTravel: (index: number) => void;

  /** Clear all history */
  clearHistory: () => void;
}

/**
 * Subscription function - setup external event listeners
 * Returns cleanup function or array of cleanup functions
 */
type SubscriptionFunction<M extends Message> = (
  dispatch: Dispatch<M>,
) => CleanupFn | CleanupFn[] | undefined;

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
  dispatch: Dispatch<M>,
) => void;

/**
 * Effect runner function
 */
type EffectRunner<M extends Message> = (
  effect: Effect,
  dispatch: Dispatch<M>,
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
export type BuiltInEffect<M extends Message = Message> =
  | HttpEffect
  | DelayEffect<M>
  | StorageEffect
  | FnEffect;
