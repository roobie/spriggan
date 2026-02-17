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
          run: () => triggerPrismHighlight(),
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
      ];

    case "TransitionEnd":
      return { ...state, isTransitioning: false };

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
    <div class="progress-bg"></div>
    <div class="progress-bar" style="width: ${progress}%"></div>
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
  const slideClass = `slide ${isActive ? "active" : ""}`;

  let slideContent;
  if (slide.content === "minimal") {
    const textClass = slide.centered ? "slide-text centered" : "slide-text";
    slideContent = html`
      <div class="slide-content">
        <h1 class="slide-title">${slide.title || ""}</h1>
        <h2 class="slide-subtitle">${slide.subtitle || ""}</h2>
        <p class="${textClass}">${slide.tagline || ""}</p>
      </div>
    `;
  } else {
    slideContent = html`
      <div class="slide-content">
        <h1 class="slide-title">${slide.title || ""}</h1>
        <div class="slide-text">${slide.content || ""}</div>
        ${slide.demo ? renderDemo(slide.demo, state, dispatch) : ""}
        ${
          slide.code
            ? html`<pre><code class="language-javascript">${escapeHtml(
                slide.code,
              )}</code></pre>`
            : ""
        }
        ${
          slide.cta
            ? html`<a href="${slide.cta.url}" class="cta-btn" target="_blank"
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
        <div class="demo-counter">
          <button data-msg=${{ type: "DemoDecrement" }}>-</button>
          <span>Count: ${state.demo.counter}</span>
          <button data-msg=${{ type: "DemoIncrement" }}>+</button>
          <p>${demo.description || ""}</p>
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
      class="nav-prev"
      data-msg=${{ type: "PrevSlide" }}
      ${prevDisabled ? "disabled" : ""}
      aria-label="Previous slide"
    >
      ‹
    </button>
    <button
      class="nav-next"
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
    <div class="control-bar">
      <button
        class="control-btn"
        data-msg=${{ type: "ToggleFullscreen" }}
        aria-label="Toggle fullscreen"
        title="Toggle fullscreen (F)"
      >
        ⛶
      </button>
      <button
        class="control-btn"
        data-msg=${{ type: "ToggleNotes" }}
        aria-label="Toggle speaker notes"
        title="Toggle speaker notes (N)"
      >
        📝
      </button>
      <button
        class="control-btn"
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
    <div class="speaker-notes">
      <strong>Speaker Notes:</strong> ${currentSlide.notes}
    </div>
  `;
}

/**
 * @param {State} state
 * @returns {string}
 */
function renderSlideNumber(state) {
  return html`
    <div class="slide-number">
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
    <div class="slideshow ${state.theme}" data-slide="${state.currentSlide}">
      ${renderProgressBar(state)}
      <div
        class="slide-container ${state.isOverview ? "overview" : ""}"
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
      e.target instanceof Element ? e.target.closest(".slide") : null;
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
  document.addEventListener("click", handleClickOverview);

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
  debug: false,
});
