// @ts-check
import createSpriggan, { html } from "../../src/spriggan.js";
import { slides } from "./slides.js";

const { app } = createSpriggan();

/** @typedef {{ type: string, [key: string]: unknown }} Msg */

/**
 * @typedef {{
 *   currentSlide: number;
 *   totalSlides: number;
 *   isFullscreen: boolean;
 *   isOverview: boolean;
 *   showNotes: boolean;
 *   isTransitioning: boolean;
 *   touchStartX: number;
 *   touchStartY: number;
 *   visitedSlides: Set<number>;
 *   demo: { counter: number; inputText: string };
 *   theme: 'dark' | 'light';
 * }} State
 */

/** @type {State} */
const init = {
  currentSlide: 0,
  totalSlides: slides.length,
  isFullscreen: false,
  isOverview: false,
  showNotes: false,
  isTransitioning: false,
  touchStartX: 0,
  touchStartY: 0,
  visitedSlides: new Set([0]),
  demo: {
    counter: 0,
    inputText: "",
  },
  theme: "dark",
};

/** @typedef {{ type: string; [key: string]: unknown }} Effect */

/**
 * @param {State} state
 * @param {Msg} msg
 * @returns {State | [State, ...Effect[]]}
 */
function update(state, msg) {
  switch (msg.type) {
    case "NextSlide":
      if (state.currentSlide >= state.totalSlides - 1) return state;
      if (state.isTransitioning) return state;
      return [
        {
          ...state,
          currentSlide: state.currentSlide + 1,
          isTransitioning: true,
          visitedSlides: new Set([
            ...state.visitedSlides,
            state.currentSlide + 1,
          ]),
        },
        {
          type: "delay",
          ms: 600,
          msg: { type: "TransitionEnd" },
        },
        {
          type: "fn",
          run: () => requestAnimationFrame(() => triggerPrismHighlight()),
        },
      ];

    case "PrevSlide":
      if (state.currentSlide <= 0) return state;
      if (state.isTransitioning) return state;
      return [
        {
          ...state,
          currentSlide: state.currentSlide - 1,
          isTransitioning: true,
        },
        { type: "delay", ms: 600, msg: { type: "TransitionEnd" } },
        {
          type: "fn",
          run: () => requestAnimationFrame(() => triggerPrismHighlight()),
        },
      ];

    case "GoToSlide":
      if (typeof msg.index !== "number") return state;
      if (msg.index < 0 || msg.index >= state.totalSlides) return state;
      if (state.isTransitioning) return state;
      return [
        {
          ...state,
          currentSlide: msg.index,
          isTransitioning: true,
          visitedSlides: new Set([...state.visitedSlides, msg.index]),
        },
        { type: "delay", ms: 600, msg: { type: "TransitionEnd" } },
        {
          type: "announce",
          message: `Slide ${msg.index + 1} of ${state.totalSlides}`,
        },
        {
          type: "fn",
          run: () => requestAnimationFrame(() => triggerPrismHighlight()),
        },
      ];

    case "TransitionEnd":
      return [
        { ...state, isTransitioning: false },
        {
          type: "fn",
          run: () => {
            requestAnimationFrame(() => {
              triggerPrismHighlight();
            });
          },
        },
      ];

    case "ToggleFullscreen":
      return [
        { ...state, isFullscreen: !state.isFullscreen },
        { type: "fullscreen", enter: !state.isFullscreen },
      ];

    case "SetFullscreen":
      return { ...state, isFullscreen: Boolean(msg.value) };

    case "ToggleOverview":
      return { ...state, isOverview: !state.isOverview };

    case "ToggleNotes":
      return { ...state, showNotes: !state.showNotes };

    case "ToggleTheme": {
      const newTheme = state.theme === "dark" ? "light" : "dark";
      return [
        { ...state, theme: newTheme },
        {
          type: "storage",
          action: "set",
          key: "slideshow-theme",
          value: newTheme,
        },
      ];
    }

    case "TouchStart":
      return {
        ...state,
        touchStartX: typeof msg.x === "number" ? msg.x : 0,
        touchStartY: typeof msg.y === "number" ? msg.y : 0,
      };

    case "TouchEnd": {
      const x = typeof msg.x === "number" ? msg.x : 0;
      const y = typeof msg.y === "number" ? msg.y : 0;
      const deltaX = x - state.touchStartX;
      const deltaY = y - state.touchStartY;
      const minSwipeDistance = 50;

      if (
        Math.abs(deltaX) > Math.abs(deltaY) &&
        Math.abs(deltaX) > minSwipeDistance
      ) {
        if (deltaX < 0 && state.currentSlide < state.totalSlides - 1) {
          return [
            {
              ...state,
              currentSlide: state.currentSlide + 1,
              isTransitioning: true,
            },
            { type: "delay", ms: 600, msg: { type: "TransitionEnd" } },
          ];
        } else if (deltaX > 0 && state.currentSlide > 0) {
          return [
            {
              ...state,
              currentSlide: state.currentSlide - 1,
              isTransitioning: true,
            },
            { type: "delay", ms: 600, msg: { type: "TransitionEnd" } },
          ];
        }
      }
      return state;
    }

    case "DemoIncrement":
      return {
        ...state,
        demo: { ...state.demo, counter: state.demo.counter + 1 },
      };

    case "DemoDecrement":
      return {
        ...state,
        demo: { ...state.demo, counter: state.demo.counter - 1 },
      };

    case "DemoInputChange":
      return {
        ...state,
        demo: {
          ...state.demo,
          inputText: typeof msg.value === "string" ? msg.value : "",
        },
      };

    default:
      return state;
  }
}

function triggerPrismHighlight() {
  /** @type {{ highlightAll?: () => void }} */
  const prism = /** @type {*} */ (
    typeof window !== "undefined" ? window.Prism : undefined
  );
  if (prism && typeof prism.highlightAll === "function") {
    requestAnimationFrame(() => {
      prism.highlightAll?.();
    });
  }
}

/**
 * @param {State} state
 * @returns {string}
 */
function renderProgressBar(state) {
  const progress = ((state.currentSlide + 1) / state.totalSlides) * 100;
  return html`
    <div class="fixed top-0 left-0 right-0 h-[3px] bg-slate-700 z-[99]"></div>
    <div
      class="gradient-bar fixed top-0 left-0 h-[3px] z-[100] transition-all duration-600 ease-[cubic-bezier(0.65,0,0.35,1)]"
      style="width: ${progress}%"
    ></div>
  `;
}

/**
 * @param {{ id?: string; title?: string; subtitle?: string; tagline?: string; content?: string; centered?: boolean; demo?: { type: string; description?: string } | null; code?: string; cta?: { text: string; url: string }; notes?: string }} slide
 * @param {number} index
 * @param {State} state
 * @param {(msg: Msg) => void} dispatch
 * @returns {string}
 */
function renderSlide(slide, index, state, dispatch) {
  const isActive = index === state.currentSlide;
  const slideClass = isActive
    ? "min-w-screen min-h-screen p-4 md:p-8 lg:p-12 flex flex-col justify-center items-center text-center relative shrink-0"
    : "min-w-screen min-h-screen p-4 md:p-8 lg:p-12 flex flex-col justify-center items-center text-center relative shrink-0";

  let slideContent;
  if (slide.content === "minimal") {
    slideContent = html`
      <div
        class="slide-content relative z-[2] max-h-[85vh] overflow-y-auto pr-2"
      >
        <h1
          class="text-[clamp(2.5rem,6vw,4rem)] font-extrabold mb-2 gradient-title leading-tight animate-fade-in-up animate-delay-100"
        >
          ${slide.title || ""}
        </h1>
        <h2
          class="text-[clamp(1.2rem,3vw,1.8rem)] mb-8 opacity-85 font-medium text-secondary animate-fade-in-up animate-delay-200"
        >
          ${slide.subtitle || ""}
        </h2>
        <p
          class="text-[clamp(1rem,2vw,1.25rem)] leading-relaxed mb-6 text-left max-w-3xl ${
            slide.centered ? "!text-center" : ""
          } animate-fade-in-up animate-delay-300"
        >
          ${slide.tagline || ""}
        </p>
      </div>
    `;
  } else {
    slideContent = html`
      <div
        class="slide-content relative z-[2] max-h-[85vh] overflow-y-auto pr-2"
      >
        <h1
          class="text-[clamp(2.5rem,6vw,4rem)] font-extrabold mb-2 gradient-title leading-tight animate-fade-in-up animate-delay-100"
        >
          ${slide.title || ""}
        </h1>
        <div
          class="text-[clamp(1rem,2vw,1.25rem)] leading-relaxed mb-6 text-left max-w-3xl animate-fade-in-up animate-delay-200"
        >
          ${slide.content || ""}
        </div>
        ${slide.demo ? renderDemo(slide.demo, state, dispatch) : ""}
        ${
          slide.code
            ? html`<pre
              class="animate-fade-in-up animate-delay-400"
            ><code class="language-javascript">${escapeHtml(
              slide.code,
            )}</code></pre>`
            : ""
        }
        ${
          slide.cta
            ? html`<a
              href="${slide.cta.url}"
              class="inline-block mt-8 mb-20 px-10 py-4 gradient-bar text-white no-underline rounded-full font-semibold text-lg transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_8px_30px_rgba(100,200,150,0.4)] animate-fade-in-up animate-delay-500"
              target="_blank"
              >${slide.cta.text}</a
            >`
            : ""
        }
      </div>
    `;
  }

  return html`
    <section id="slide-${index}" class="${slideClass}" data-slide="${index}">
      ${slideContent}
    </section>
  `;
}

/**
 * @param {string} str
 * @returns {string}
 */
function escapeHtml(str) {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

/**
 * @param {{ type: string; description?: string }} demo
 * @param {State} state
 * @param {(msg: Msg) => void} _dispatch
 * @returns {string}
 */
function renderDemo(demo, state, _dispatch) {
  switch (demo.type) {
    case "counter":
      return html`
        <div
          class="inline-flex flex-col md:flex-row items-center gap-3 md:gap-4 my-6 md:my-8 bg-code p-4 md:p-6 md:px-8 rounded-2xl border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.2)] animate-fade-in-up animate-delay-300"
        >
          <div class="flex items-center gap-3 md:gap-4">
            <button
              data-msg=${{ type: "DemoDecrement" }}
              class="w-10 h-10 md:w-12 md:h-12 rounded-full border-2 border-emerald-400 bg-transparent text-accent text-xl md:text-2xl cursor-pointer transition-all hover:bg-accent hover:text-[var(--slide-bg)] hover:scale-110"
            >
              -
            </button>
            <span
              class="text-2xl md:text-3xl font-bold min-w-[80px] md:min-w-[100px]"
              >${state.demo.counter}</span
            >
            <button
              data-msg=${{ type: "DemoIncrement" }}
              class="w-10 h-10 md:w-12 md:h-12 rounded-full border-2 border-emerald-400 bg-transparent text-accent text-xl md:text-2xl cursor-pointer transition-all hover:bg-accent hover:text-[var(--slide-bg)] hover:scale-110"
            >
              +
            </button>
          </div>
          <p class="m-0 opacity-70 text-xs md:text-sm">
            ${demo.description || ""}
          </p>
        </div>
      `;
    default:
      return "";
  }
}

/**
 * @param {State} state
 * @param {(msg: Msg) => void} _dispatch
 * @returns {string}
 */
function renderNavigation(state, _dispatch) {
  const prevDisabled = state.currentSlide <= 0;
  const nextDisabled = state.currentSlide >= state.totalSlides - 1;

  return html`
    <button
      class="fixed top-1/2 -translate-y-1/2 w-10 h-10 md:w-12 md:h-12 lg:w-14 lg:h-14 text-nav-icon cursor-pointer bg-black/30 backdrop-blur-lg border border-white/10 rounded-full text-xl md:text-2xl lg:text-3xl flex items-center justify-center z-50 transition-all duration-300 opacity-60 hover:text-accent hover:opacity-100 hover:-translate-y-1/2 hover:scale-110 hover:shadow-[0_0_20px_var(--glow-color)] left-3 md:left-5 lg:left-6 ${
        prevDisabled
          ? "opacity-20 cursor-not-allowed hover:-translate-y-1/2 hover:scale-100 hover:shadow-none"
          : ""
      } ${state.isOverview ? "hidden" : ""}"
      data-msg=${{ type: "PrevSlide" }}
      ${prevDisabled ? "disabled" : ""}
      aria-label="Previous slide"
    >
      ‹
    </button>
    <button
      class="fixed top-1/2 -translate-y-1/2 w-10 h-10 md:w-12 md:h-12 lg:w-14 lg:h-14 text-nav-icon cursor-pointer bg-black/30 backdrop-blur-lg border border-white/10 rounded-full text-xl md:text-2xl lg:text-3xl flex items-center justify-center z-50 transition-all duration-300 opacity-60 hover:text-accent hover:opacity-100 hover:-translate-y-1/2 hover:scale-110 hover:shadow-[0_0_20px_var(--glow-color)] right-3 md:right-5 lg:right-6 ${
        nextDisabled
          ? "opacity-20 cursor-not-allowed hover:-translate-y-1/2 hover:scale-100 hover:shadow-none"
          : ""
      } ${state.isOverview ? "hidden" : ""}"
      data-msg=${{ type: "NextSlide" }}
      ${nextDisabled ? "disabled" : ""}
      aria-label="Next slide"
    >
      ›
    </button>
  `;
}

/**
 * @param {State} state
 * @param {(msg: Msg) => void} _dispatch
 * @returns {string}
 */
function renderControlBar(state, _dispatch) {
  return html`
    <div
      class="fixed bottom-4 md:bottom-6 left-1/2 -translate-x-1/2 flex gap-2 md:gap-3 bg-black/40 backdrop-blur-xl p-2 md:p-2.5 px-3 md:px-5 rounded-full z-30 border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.3)]"
    >
      <button
        class="bg-transparent border-none text-slate-400 cursor-pointer text-base md:text-xl px-2 md:px-3 py-1 md:py-2 rounded-lg transition-all hover:bg-white/10 hover:text-accent hover:-translate-y-0.5 focus:outline-2 focus:outline-accent focus:outline-offset-[3px]"
        data-msg=${{ type: "ToggleFullscreen" }}
        aria-label="Toggle fullscreen"
        title="Toggle fullscreen (F)"
      >
        ⛶
      </button>
      <button
        class="bg-transparent border-none text-slate-400 cursor-pointer text-base md:text-xl px-2 md:px-3 py-1 md:py-2 rounded-lg transition-all hover:bg-white/10 hover:text-accent hover:-translate-y-0.5 focus:outline-2 focus:outline-accent focus:outline-offset-[3px]"
        data-msg=${{ type: "ToggleNotes" }}
        aria-label="Toggle speaker notes"
        title="Toggle speaker notes (N)"
      >
        📝
      </button>
      <button
        class="bg-transparent border-none text-slate-400 cursor-pointer text-base md:text-xl px-2 md:px-3 py-1 md:py-2 rounded-lg transition-all hover:bg-white/10 hover:text-accent hover:-translate-y-0.5 focus:outline-2 focus:outline-accent focus:outline-offset-[3px]"
        data-msg=${{ type: "ToggleTheme" }}
        aria-label="Toggle theme"
        title="Toggle theme (T)"
      >
        ${state.theme === "dark" ? "☀️" : "🌙"}
      </button>
    </div>
  `;
}

/**
 * @param {State} state
 * @returns {string}
 */
function renderSpeakerNotes(state) {
  const currentSlide = slides[state.currentSlide];
  if (!currentSlide?.notes) return "";

  return html`
    <div
      class="fixed bottom-0 left-0 right-0 bg-gradient-to-t from-slate-800 to-[rgba(30,30,40,0.95)] backdrop-blur-xl text-slate-200 p-4 md:p-6 md:px-8 max-h-[25vh] overflow-y-auto z-40 border-t border-white/10 text-sm md:text-base"
    >
      <strong class="text-accent mr-2">Speaker Notes:</strong>
      ${currentSlide.notes}
    </div>
  `;
}

/**
 * @param {State} state
 * @returns {string}
 */
function renderSlideNumber(state) {
  return html`
    <div
      class="fixed bottom-4 md:bottom-6 right-4 md:right-8 text-xs md:text-sm text-slate-500 z-25 font-[Fira_Code,Monaco,monospace]"
    >
      ${state.currentSlide + 1} / ${state.totalSlides}
    </div>
  `;
}

/**
 * @param {State} state
 * @param {(msg: Msg) => void} dispatch
 * @returns {string}
 */
function view(state, dispatch) {
  const translateX = -state.currentSlide * 100;
  const containerStyle = state.isOverview
    ? ""
    : `transform: translateX(${translateX}vw)`;

  return html`
    <div
      class="bg-slide text-slide min-h-screen overflow-hidden relative font-[Inter,system-ui,-apple-system,sans-serif] transition-colors duration-400 ${state.theme}"
      data-slide="${state.currentSlide}"
    >
      <div
        class="content-[''] fixed inset-0 pointer-events-none z-[1]"
        style="background: radial-gradient(ellipse at 20% 20%, var(--glow-color) 0%, transparent 50%), radial-gradient(ellipse at 80% 80%, rgba(100,100,255,0.08) 0%, transparent 50%)"
      ></div>
      ${renderProgressBar(state)}
      <div
        class="flex h-screen transition-transform duration-600 ease-[cubic-bezier(0.65,0,0.35,1)] will-change-transform ${
          state.isOverview ? "flex-wrap h-auto min-h-screen" : ""
        }"
        style="${containerStyle}"
      >
        ${slides.map((slide, index) =>
          renderSlide(slide, index, state, dispatch),
        )}
      </div>
      ${renderNavigation(state, dispatch)} ${renderControlBar(state, dispatch)}
      ${renderSlideNumber(state)}
      ${state.showNotes ? renderSpeakerNotes(state) : ""}
    </div>
  `;
}

/**
 * @param {(msg: Msg) => void} dispatch
 * @returns {(() => void)[]}
 */
function subscriptions(dispatch) {
  /**
   * @param {KeyboardEvent} e
   */
  const handleKeydown = (e) => {
    if (
      e.target instanceof HTMLInputElement ||
      e.target instanceof HTMLTextAreaElement
    )
      return;

    switch (e.key) {
      case "ArrowRight":
      case " ":
      case "Enter":
        e.preventDefault();
        dispatch({ type: "NextSlide" });
        break;
      case "ArrowLeft":
        e.preventDefault();
        dispatch({ type: "PrevSlide" });
        break;
      case "f":
      case "F":
        dispatch({ type: "ToggleFullscreen" });
        break;
      case "o":
      case "O":
        dispatch({ type: "ToggleOverview" });
        break;
      case "n":
      case "N":
        dispatch({ type: "ToggleNotes" });
        break;
      case "t":
      case "T":
        dispatch({ type: "ToggleTheme" });
        break;
      case "Home":
        dispatch({ type: "GoToSlide", index: 0 });
        break;
      case "End":
        dispatch({ type: "GoToSlide", index: slides.length - 1 });
        break;
      case "1":
      case "2":
      case "3":
      case "4":
      case "5":
      case "6": {
        const slideNum = parseInt(e.key, 10) - 1;
        if (slideNum < slides.length) {
          dispatch({ type: "GoToSlide", index: slideNum });
        }
        break;
      }
      case "Escape":
        dispatch({ type: "ToggleOverview" });
        break;
    }
  };

  /**
   * @param {TouchEvent} e
   */
  const handleTouchStart = (e) => {
    const touch = e.touches[0];
    if (touch) {
      dispatch({ type: "TouchStart", x: touch.clientX, y: touch.clientY });
    }
  };

  /**
   * @param {TouchEvent} e
   */
  const handleTouchEnd = (e) => {
    const touch = e.changedTouches[0];
    if (touch) {
      dispatch({ type: "TouchEnd", x: touch.clientX, y: touch.clientY });
    }
  };

  const handleFullscreenChange = () => {
    const doc =
      /** @type {{ fullscreenElement?: Element; webkitFullscreenElement?: Element }} */ (
        document
      );
    dispatch({
      type: "SetFullscreen",
      value: !!(document.fullscreenElement || doc.webkitFullscreenElement),
    });
  };

  /**
   * @param {MouseEvent} e
   */
  const handleClickOverview = (e) => {
    const slide =
      e.target instanceof Element ? e.target.closest(".slide, section") : null;
    if (slide && slide instanceof HTMLElement && slide.dataset.slide) {
      const index = parseInt(slide.dataset.slide, 10);
      dispatch({ type: "GoToSlide", index });
    }
  };

  document.addEventListener("keydown", handleKeydown);
  document.addEventListener("touchstart", handleTouchStart, { passive: true });
  document.addEventListener("touchend", handleTouchEnd, { passive: true });
  document.addEventListener("fullscreenchange", handleFullscreenChange);
  document.addEventListener("webkitfullscreenchange", handleFullscreenChange);

  const savedTheme = localStorage.getItem("slideshow-theme");
  if (savedTheme) {
    dispatch({ type: "ToggleTheme" });
    if (savedTheme === "dark") {
      dispatch({ type: "ToggleTheme" });
    }
  }

  setTimeout(triggerPrismHighlight, 100);

  return [
    () => document.removeEventListener("keydown", handleKeydown),
    () => document.removeEventListener("touchstart", handleTouchStart),
    () => document.removeEventListener("touchend", handleTouchEnd),
    () =>
      document.removeEventListener("fullscreenchange", handleFullscreenChange),
    () =>
      document.removeEventListener(
        "webkitfullscreenchange",
        handleFullscreenChange,
      ),
    () => document.removeEventListener("click", handleClickOverview),
  ];
}

/** @type {Record<string, (effect: { [key: string]: unknown }, _dispatch: (msg: Msg) => void) => void>} */
const customEffects = {
  fullscreen: (effect, _dispatch) => {
    const element = document.documentElement;
    /** @type {{ requestFullscreen?: () => void; webkitRequestFullscreen?: () => void; msRequestFullscreen?: () => void }} */
    const el = /** @type {*} */ (element);
    if (effect.enter) {
      if (el.requestFullscreen) {
        el.requestFullscreen();
      } else if (el.webkitRequestFullscreen) {
        el.webkitRequestFullscreen();
      } else if (el.msRequestFullscreen) {
        el.msRequestFullscreen();
      }
    } else {
      /** @type {{ exitFullscreen?: () => void; webkitExitFullscreen?: () => void; msExitFullscreen?: () => void }} */
      const doc = /** @type {*} */ (document);
      if (doc.exitFullscreen) {
        doc.exitFullscreen();
      } else if (doc.webkitExitFullscreen) {
        doc.webkitExitFullscreen();
      } else if (doc.msExitFullscreen) {
        doc.msExitFullscreen();
      }
    }
  },

  announce: (effect, _dispatch) => {
    const announcer = document.getElementById("sr-announcer");
    if (announcer && effect.message) {
      announcer.textContent = "";
      setTimeout(() => {
        announcer.textContent = String(effect.message || "");
      }, 50);
    }
  },
};

app("#app", {
  init,
  update,
  view,
  subscriptions,
  effects: customEffects,
  debug: location.href.includes("localhost"),
});
