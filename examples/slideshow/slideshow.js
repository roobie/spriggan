import { html } from "../../src/spriggan.js";
import createSpriggan from "../../src/spriggan.js";
import { slides } from "./slides.js";

const { app } = createSpriggan();

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
      return { ...state, isFullscreen: msg.value };

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
      return { ...state, touchStartX: msg.x, touchStartY: msg.y };

    case "TouchEnd": {
      const deltaX = msg.x - state.touchStartX;
      const deltaY = msg.y - state.touchStartY;
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
      return { ...state, demo: { ...state.demo, inputText: msg.value } };

    default:
      return state;
  }
}

function triggerPrismHighlight() {
  if (typeof Prism !== "undefined") {
    requestAnimationFrame(() => {
      Prism.highlightAll();
    });
  }
}

function renderProgressBar(state) {
  const progress = ((state.currentSlide + 1) / state.totalSlides) * 100;
  return html`
    <div class="progress-bg"></div>
    <div class="progress-bar" style="width: ${progress}%"></div>
  `;
}

function renderSlide(slide, index, state, dispatch) {
  const isActive = index === state.currentSlide;
  const slideClass = `slide ${isActive ? "active" : ""}`;

  let slideContent;
  if (slide.content === "minimal") {
    const textClass = slide.centered ? "slide-text centered" : "slide-text";
    slideContent = html`
      <div class="slide-content">
        <h1 class="slide-title">${slide.title}</h1>
        <h2 class="slide-subtitle">${slide.subtitle}</h2>
        <p class="${textClass}">${slide.tagline}</p>
      </div>
    `;
  } else {
    slideContent = html`
      <div class="slide-content">
        <h1 class="slide-title">${slide.title}</h1>
        <div class="slide-text">${slide.content}</div>
        ${slide.demo ? renderDemo(slide.demo, state, dispatch) : ""}
        ${slide.code
          ? html`<pre><code class="language-javascript">${escapeHtml(
              slide.code,
            )}</code></pre>`
          : ""}
        ${slide.cta
          ? html`<a href="${slide.cta.url}" class="cta-btn" target="_blank"
              >${slide.cta.text}</a
            >`
          : ""}
      </div>
    `;
  }

  return html`
    <section id="slide-${index}" class="${slideClass}" data-slide="${index}">
      ${slideContent}
    </section>
  `;
}

function escapeHtml(str) {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function renderDemo(demo, state, _dispatch) {
  switch (demo.type) {
    case "counter":
      return html`
        <div class="demo-counter">
          <button data-msg=${{ type: "DemoDecrement" }}>-</button>
          <span>Count: ${state.demo.counter}</span>
          <button data-msg=${{ type: "DemoIncrement" }}>+</button>
          <p>${demo.description}</p>
        </div>
      `;
    default:
      return "";
  }
}

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

function renderSpeakerNotes(state) {
  const currentSlide = slides[state.currentSlide];
  if (!currentSlide.notes) return "";

  return html`
    <div class="speaker-notes">
      <strong>Speaker Notes:</strong> ${currentSlide.notes}
    </div>
  `;
}

function renderSlideNumber(state) {
  return html`
    <div class="slide-number">
      ${state.currentSlide + 1} / ${state.totalSlides}
    </div>
  `;
}

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

function subscriptions(dispatch) {
  const handleKeydown = (e) => {
    if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA") return;

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

  const handleTouchStart = (e) => {
    const touch = e.touches[0];
    dispatch({ type: "TouchStart", x: touch.clientX, y: touch.clientY });
  };

  const handleTouchEnd = (e) => {
    const touch = e.changedTouches[0];
    dispatch({ type: "TouchEnd", x: touch.clientX, y: touch.clientY });
  };

  const handleFullscreenChange = () => {
    dispatch({
      type: "SetFullscreen",
      value: !!(document.fullscreenElement || document.webkitFullscreenElement),
    });
  };

  const handleClickOverview = (e) => {
    const slide = e.target.closest(".slide");
    if (slide?.dataset.slide) {
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

const customEffects = {
  fullscreen: (effect, _dispatch) => {
    const element = document.documentElement;
    if (effect.enter) {
      if (element.requestFullscreen) {
        element.requestFullscreen();
      } else if (element.webkitRequestFullscreen) {
        element.webkitRequestFullscreen();
      } else if (element.msRequestFullscreen) {
        element.msRequestFullscreen();
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      } else if (document.webkitExitFullscreen) {
        document.webkitExitFullscreen();
      } else if (document.msExitFullscreen) {
        document.msExitFullscreen();
      }
    }
  },

  announce: (effect, _dispatch) => {
    const announcer = document.getElementById("sr-announcer");
    if (announcer) {
      announcer.textContent = "";
      setTimeout(() => {
        announcer.textContent = effect.message;
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
