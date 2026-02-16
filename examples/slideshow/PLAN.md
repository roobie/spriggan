# Spriggan Interactive Slideshow - Implementation Plan

## Overview

A beautiful, interactive slideshow presentation about Spriggan that **uses Spriggan itself** to demonstrate the framework's capabilities. No build step required - pure vanilla JS with modern web platform features.

---

## Directory Structure

```
examples/slideshow/
├── index.html          # Entry point, loads all resources
├── slideshow.js        # Main Spriggan application (TEA architecture)
├── slideshow.css       # All styling with CSS custom properties
├── slides.js           # Slide content and configuration
└── PLAN.md             # This file
```

---

## Core Tenets Alignment

1. **No Build Step**: All code runs directly in the browser via ES modules and CDN resources
2. **Pure Functions**: Update function is completely pure, all side effects via effects system
3. **TEA Architecture**: Model-Update-View pattern throughout
4. **CSS Variables**: Extensive use for easy theming and tweaking
5. **Modern Web Platform**: CSS transforms, scroll-snap, custom properties, IntersectionObserver

---

## State Model (Model)

```javascript
const init = {
  // Navigation
  currentSlide: 0,
  totalSlides: 6,

  // UI State
  isFullscreen: false,
  isOverview: false,
  showNotes: false,
  isTransitioning: false,

  // Touch/Swipe
  touchStartX: 0,
  touchStartY: 0,

  // Progress
  visitedSlides: new Set([0]),

  // Demo state (for live code demos on slides)
  demo: {
    counter: 0,
    inputText: "",
  },

  // Theme
  theme: "dark", // 'dark' | 'light'
};
```

---

## Messages (Actions)

### Navigation Messages

```javascript
{ type: 'NextSlide' }
{ type: 'PrevSlide' }
{ type: 'GoToSlide', index: number }
{ type: 'TransitionStart' }
{ type: 'TransitionEnd' }
```

### UI Messages

```javascript
{ type: 'ToggleFullscreen' }
{ type: 'SetFullscreen', value: boolean }
{ type: 'ToggleOverview' }
{ type: 'ToggleNotes' }
{ type: 'ToggleTheme' }
```

### Touch Messages

```javascript
{ type: 'TouchStart', x: number, y: number }
{ type: 'TouchEnd', x: number, y: number }
```

### Demo Messages (for live demos)

```javascript
{ type: 'DemoIncrement' }
{ type: 'DemoDecrement' }
{ type: 'DemoInputChange', value: string }
```

---

## Update Function Logic

```javascript
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
        },
        {
          type: "dom",
          action: "focus",
          selector: "#slide-" + (state.currentSlide + 1),
        },
        { type: "delay", ms: 500, msg: { type: "TransitionEnd" } },
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
        { type: "delay", ms: 500, msg: { type: "TransitionEnd" } },
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
        { type: "delay", ms: 500, msg: { type: "TransitionEnd" } },
      ];

    case "TransitionEnd":
      return { ...state, isTransitioning: false };

    case "ToggleFullscreen":
      return [
        { ...state, isFullscreen: !state.isFullscreen },
        { type: "fn", run: () => toggleFullscreen() },
      ];

    case "SetFullscreen":
      return { ...state, isFullscreen: msg.value };

    case "ToggleOverview":
      return { ...state, isOverview: !state.isOverview };

    case "ToggleNotes":
      return { ...state, showNotes: !state.showNotes };

    case "ToggleTheme":
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

    case "TouchStart":
      return { ...state, touchStartX: msg.x, touchStartY: msg.y };

    case "TouchEnd":
      const deltaX = msg.x - state.touchStartX;
      const deltaY = msg.y - state.touchStartY;
      const minSwipeDistance = 50;

      // Horizontal swipe (left = next, right = prev)
      if (
        Math.abs(deltaX) > Math.abs(deltaY) &&
        Math.abs(deltaX) > minSwipeDistance
      ) {
        if (deltaX < 0) {
          return { type: "NextSlide" }; // Will be re-dispatched
        } else {
          return { type: "PrevSlide" };
        }
      }
      return state;

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
```

---

## View Function Structure

```javascript
function view(state, dispatch) {
  return html`
    <div class="slideshow ${state.theme}" data-slide="${state.currentSlide}">
      <!-- Progress Bar -->
      ${renderProgressBar(state)}

      <!-- Slide Container -->
      <div class="slide-container ${state.isOverview ? "overview" : ""}">
        ${slides.map((slide, index) =>
          renderSlide(slide, index, state, dispatch),
        )}
      </div>

      <!-- Navigation Controls -->
      ${renderNavigation(state, dispatch)}

      <!-- Control Bar (bottom) -->
      ${renderControlBar(state, dispatch)}

      <!-- Speaker Notes (if enabled) -->
      ${state.showNotes ? renderSpeakerNotes(state) : ""}
    </div>
  `;
}
```

---

## Slide Content Definitions

### Slide 1: Title Slide

```javascript
{
  id: 'title',
  title: '🌿 Spriggan',
  subtitle: 'A Tiny TEA-Inspired Framework',
  tagline: 'No build tools. Pure functions. Built for humans and LMs alike.',
  content: 'minimal', // Just centered title
  notes: 'Welcome to Spriggan - a 75-line framework bringing The Elm Architecture to vanilla JavaScript.',
  demo: null
}
```

### Slide 2: Core Concepts

```javascript
{
  id: 'concepts',
  title: 'Core Concepts',
  content: `
    ## The TEA Triad

    ### Model (State)
    Your application's single source of truth

    ### Update (Reducer)
    Pure function: (state, message) => newState

    ### View (Render)
    Pure function: (state, dispatch) => HTML
  `,
  demo: {
    type: 'counter',
    description: 'Live counter demonstrating Model-Update-View'
  },
  code: `
    const init = { count: 0 }

    function update(state, msg) {
      switch (msg.type) {
        case 'Increment':
          return { count: state.count + 1 }
        default:
          return state
      }
    }

    function view(state, dispatch) {
      return html\`
        <button data-msg=\${{ type: 'Increment' }}>
          Count: \${state.count}
        </button>
      \`
    }
  `,
  notes: 'The beauty of TEA: predictable, testable, debuggable. No hidden reactivity.'
}
```

### Slide 3: Messages & Effects

```javascript
{
  id: 'messages-effects',
  title: 'Messages & Effects',
  content: `
    ## Messages
    Plain objects describing **what happened**

    \`\`\`js
    { type: 'ButtonClicked' }
    { type: 'FieldChanged', field: 'email', value: 'user@example.com' }
    \`\`\`

    ## Effects
    Descriptions of side effects, **not the effects themselves**

    \`\`\`js
    // HTTP Request
    { type: 'http', url: '/api/data', onSuccess: 'DataLoaded' }

    // Delay
    { type: 'delay', ms: 1000, msg: { type: 'Timeout' } }

    // Storage
    { type: 'storage', action: 'set', key: 'user', value: data }
    \`\`\`
  `,
  notes: 'Effects as data enables testing, time-travel, and middleware patterns.',
  demo: null
}
```

### Slide 4: View & HTML

```javascript
{
  id: 'view-html',
  title: 'View & HTML Templates',
  content: `
    ## Tagged Template Literal

    \`\`\`js
    html\`
      <div>
        <h1>\${title}</h1>
        <button data-msg='\${{ type: "Save" }}'>
          Save
        </button>
      </div>
    \`
    \`\`\`

    ## Event Delegation

    | Attribute | Event | Message |
    |-----------|-------|---------|
    | \`data-msg\` | click | Custom JSON |
    | \`data-model\` | input | FieldChanged |
    | form submit | submit | Form JSON |
  `,
  notes: 'Event delegation means one listener per event type, not per element. Automatic cleanup.',
  demo: null
}
```

### Slide 5: Subscriptions & Debug

```javascript
{
  id: 'subscriptions-debug',
  title: 'Subscriptions & Debug Mode',
  content: `
    ## Subscriptions

    Handle external events: keyboard, WebSocket, timers, resize

    \`\`\`js
    subscriptions: (dispatch) => {
      const handler = (e) => {
        if (e.key === 'Escape') dispatch({ type: 'Close' })
      }
      document.addEventListener('keydown', handler)
      return () => document.removeEventListener('keydown', handler)
    }
    \`\`\`

    ## Debug Mode

    - Console logging of every message
    - State diff visualization
    - **Time-travel debugging** via \`window.__SPRIGGAN_DEBUG__\`
  `,
  notes: 'Subscriptions return cleanup functions - no memory leaks.',
  demo: null
}
```

### Slide 6: Get Started

```javascript
{
  id: 'get-started',
  title: 'Get Started',
  content: `
    ## Installation

    **CDN (no build):**
    \`\`\`html
    <script src="https://unpkg.com/spriggan/dist/spriggan.min.js"></script>
    \`\`\`

    **npm:**
    \`\`\`bash
    npm install spriggan
    \`\`\`

    ## Resources

    - [GitHub Repository](https://github.com/yourname/spriggan)
    - [Documentation](./README.md)
    - [Examples](./examples)

    ## Philosophy

    > Simplicity over features. Pure functions over clever abstractions.
    > Build tools should be optional. AI-first design.
  `,
  notes: 'This very slideshow is built with Spriggan. Meta!',
  demo: null,
  cta: { text: 'View on GitHub', url: 'https://github.com/yourname/spriggan' }
}
```

---

## CSS Architecture

### CSS Custom Properties

```css
:root {
  /* Colors - Dark Theme */
  --slide-bg: var(--gray-12);
  --slide-text: var(--gray-1);
  --slide-accent: var(--green-5);
  --slide-secondary: var(--blue-6);

  /* Colors - Light Theme */
  .light {
    --slide-bg: var(--gray-1);
    --slide-text: var(--gray-12);
    --slide-accent: var(--green-7);
    --slide-secondary: var(--blue-5);
  }

  /* Transitions */
  --slide-transition-duration: 0.5s;
  --slide-transition-easing: cubic-bezier(0.4, 0, 0.2, 1);
  --slide-fade-duration: 0.3s;

  /* Layout */
  --slide-min-height: 100vh;
  --slide-padding: 2rem;
  --slide-max-width: 1200px;

  /* Progress Bar */
  --progress-height: 4px;
  --progress-color: var(--slide-accent);
  --progress-bg: var(--gray-8);

  /* Code Blocks */
  --code-bg: var(--gray-10);
  --code-font: "Fira Code", "Monaco", monospace;

  /* Navigation */
  --nav-size: 48px;
  --nav-icon-color: var(--gray-4);
  --nav-hover-color: var(--slide-accent);
}
```

### Key CSS Classes

```css
/* Main Container */
.slideshow {
  background: var(--slide-bg);
  color: var(--slide-text);
  min-height: 100vh;
  overflow: hidden;
  transition: background var(--slide-transition-duration);
}

/* Slide Container */
.slide-container {
  display: flex;
  transition: transform var(--slide-transition-duration)
    var(--slide-transition-easing);
}

/* Individual Slide */
.slide {
  min-width: 100vw;
  min-height: 100vh;
  padding: var(--slide-padding);
  opacity: 0;
  transform: translateX(20px);
  transition:
    opacity var(--slide-fade-duration) var(--slide-transition-easing),
    transform var(--slide-transition-duration) var(--slide-transition-easing);
}

.slide.active {
  opacity: 1;
  transform: translateX(0);
}

/* Progress Bar */
.progress-bar {
  position: fixed;
  top: 0;
  left: 0;
  height: var(--progress-height);
  background: var(--progress-color);
  transition: width var(--slide-transition-duration)
    var(--slide-transition-easing);
  z-index: 100;
}

/* Navigation */
.nav-prev,
.nav-next {
  position: fixed;
  top: 50%;
  transform: translateY(-50%);
  width: var(--nav-size);
  height: var(--nav-size);
  color: var(--nav-icon-color);
  cursor: pointer;
  transition: color 0.2s;
}

.nav-prev:hover,
.nav-next:hover {
  color: var(--nav-hover-color);
}

/* Overview Mode */
.slide-container.overview {
  flex-wrap: wrap;
}

.slide-container.overview .slide {
  min-width: 33.333vw;
  min-height: 50vh;
  opacity: 0.7;
}

.slide-container.overview .slide.active {
  opacity: 1;
  outline: 2px solid var(--slide-accent);
}

/* Speaker Notes */
.speaker-notes {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  background: var(--gray-11);
  color: var(--gray-2);
  padding: 1rem;
  max-height: 30vh;
  overflow-y: auto;
}

/* Code Blocks */
pre,
code {
  font-family: var(--code-font);
  background: var(--code-bg);
  border-radius: 4px;
}

/* Control Bar */
.control-bar {
  position: fixed;
  bottom: 1rem;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  gap: 0.5rem;
  background: rgba(0, 0, 0, 0.5);
  padding: 0.5rem 1rem;
  border-radius: 999px;
}
```

---

## Subscriptions Implementation

```javascript
function subscriptions(dispatch) {
  // Keyboard navigation
  const handleKeydown = (e) => {
    // Ignore if typing in input
    if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA") return;

    switch (e.key) {
      case "ArrowRight":
      case "Space":
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
        dispatch({ type: "GoToSlide", index: totalSlides - 1 });
        break;
      // Number keys for direct slide access
      case "1":
      case "2":
      case "3":
      case "4":
      case "5":
      case "6":
        const slideNum = parseInt(e.key) - 1;
        dispatch({ type: "GoToSlide", index: slideNum });
        break;
    }
  };

  // Touch/swipe handling
  const handleTouchStart = (e) => {
    const touch = e.touches[0];
    dispatch({ type: "TouchStart", x: touch.clientX, y: touch.clientY });
  };

  const handleTouchEnd = (e) => {
    const touch = e.changedTouches[0];
    dispatch({ type: "TouchEnd", x: touch.clientX, y: touch.clientY });
  };

  // Fullscreen change detection
  const handleFullscreenChange = () => {
    dispatch({
      type: "SetFullscreen",
      value: !!(document.fullscreenElement || document.webkitFullscreenElement),
    });
  };

  // History navigation (optional)
  const handlePopState = (e) => {
    if (e.state && typeof e.state.slide === "number") {
      dispatch({ type: "GoToSlide", index: e.state.slide });
    }
  };

  // Register all listeners
  document.addEventListener("keydown", handleKeydown);
  document.addEventListener("touchstart", handleTouchStart, { passive: true });
  document.addEventListener("touchend", handleTouchEnd, { passive: true });
  document.addEventListener("fullscreenchange", handleFullscreenChange);
  document.addEventListener("webkitfullscreenchange", handleFullscreenChange);
  window.addEventListener("popstate", handlePopState);

  // Return cleanup
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
    () => window.removeEventListener("popstate", handlePopState),
  ];
}
```

---

## Custom Effects

```javascript
const customEffects = {
  // Fullscreen toggle
  fullscreen: (effect, dispatch) => {
    const element = document.documentElement;
    if (effect.enter) {
      if (element.requestFullscreen) {
        element.requestFullscreen();
      } else if (element.webkitRequestFullscreen) {
        element.webkitRequestFullscreen();
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      } else if (document.webkitExitFullscreen) {
        document.webkitExitFullscreen();
      }
    }
  },

  // History push
  history: (effect, dispatch) => {
    const state = { slide: effect.slide };
    const url = `#slide-${effect.slide + 1}`;
    history.pushState(state, "", url);
  },

  // Announce to screen readers
  announce: (effect, dispatch) => {
    const announcer = document.getElementById("sr-announcer");
    if (announcer) {
      announcer.textContent = effect.message;
    }
  },
};
```

---

## External Dependencies

All loaded via CDN, no build step:

```html
<!-- CSS Frameworks -->
<link
  rel="stylesheet"
  href="https://cdn.jsdelivr.net/npm/@picocss/pico@2/css/pico.min.css"
/>
<link
  rel="stylesheet"
  href="https://unpkg.com/basscss@8.0.2/css/basscss.min.css"
/>
<link rel="stylesheet" href="https://unpkg.com/open-props" />

<!-- DOM Morphing -->
<script src="https://unpkg.com/idiomorph@0.7.4/dist/idiomorph.min.js"></script>

<!-- Syntax Highlighting -->
<link
  rel="stylesheet"
  href="https://unpkg.com/prismjs@1.29.0/themes/prism-tomorrow.min.css"
/>
<script src="https://unpkg.com/prismjs@1.29.0/prism.min.js"></script>
<script src="https://unpkg.com/prismjs@1.29.0/components/prism-javascript.min.js"></script>

<!-- Spriggan -->
<script type="module" src="../../src/spriggan.js"></script>
```

---

## File Sizes (Estimated)

| File            | Size | Description    |
| --------------- | ---- | -------------- |
| `index.html`    | ~2KB | Entry point    |
| `slideshow.js`  | ~4KB | Main app logic |
| `slideshow.css` | ~6KB | All styles     |
| `slides.js`     | ~5KB | Slide content  |

**Total custom code: ~17KB** (before minification)

---

## Implementation Order

1. **index.html** - Basic structure, CDN imports
2. **slideshow.css** - All CSS with variables, base styles
3. **slides.js** - Slide content definitions
4. **slideshow.js** - Main application with TEA
   - Define init state
   - Implement update function
   - Build view functions
   - Add subscriptions
   - Register custom effects
5. **Testing & Polish** - Cross-browser, touch, keyboard
6. **Documentation** - Inline comments, README updates

---

## Accessibility Features

- Semantic HTML (`<main>`, `<section>`, `<nav>`)
- ARIA labels on interactive elements
- Keyboard navigation (full support)
- Screen reader announcements
- Focus management during transitions
- Color contrast ratios meet WCAG 2.1 AA
- Reduced motion support via `prefers-reduced-motion`

```css
@media (prefers-reduced-motion: reduce) {
  .slide,
  .progress-bar {
    transition: none;
  }
}
```

---

## Browser Support

- Chrome/Edge 90+
- Firefox 88+
- Safari 14+
- Mobile Safari iOS 14+
- Chrome for Android 90+

**Fallbacks:**

- CSS transitions → instant changes
- Fullscreen API → button hidden
- Touch events → click only

---

## Success Criteria

- [ ] All slides render correctly
- [ ] Keyboard navigation works (arrows, space, F, O, N, T)
- [ ] Touch/swipe navigation works on mobile
- [ ] Progress bar updates smoothly
- [ ] Fullscreen mode toggles correctly
- [ ] Overview mode shows all slides
- [ ] Speaker notes toggle correctly
- [ ] Theme toggle persists via localStorage
- [ ] Code syntax highlighting works
- [ ] Live counter demo on slide 2 works
- [ ] No console errors
- [ ] Accessible via keyboard only
- [ ] Works without JavaScript (graceful degradation)

---

## Future Enhancements (Not in Scope)

- Presenter view (separate window)
- PDF export
- Recording/playback
- Collaborative viewing
- Analytics tracking
- Custom themes system
- Slide branching
- Embedded iframes
- Laser pointer effect
- Drawing/annotation mode

---

## Notes

- The slideshow demonstrates Spriggan by **using Spriggan** - meta and educational
- All state is immutable, all updates are pure functions
- Effects are declarative, not imperative
- Subscriptions properly clean up on destroy
- CSS variables enable easy customization
- No build step - runs directly in browser
- LLM-friendly code structure
