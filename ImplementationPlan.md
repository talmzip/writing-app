# Implementation Plan

## Table of Contents

1. [Architecture Review](#architecture-review)
2. [Why Basic Things Were Hard](#why-basic-things-were-hard)
3. [Recommended Architecture](#recommended-architecture)
4. [Module Structure](#module-structure)
5. [Implementation Phases](#implementation-phases)
6. [Cross-Platform Strategy](#cross-platform-strategy)
7. [Explained Simply](#explained-simply)

---

## Architecture Review

### What we have now

The app is a single file (`script.js`) with three pieces:

- **`WritingApp`** — the core writing experience (~830 lines). Handles input, rendering, zoom, cursor, line locking, stretch, fade, reading mode, sessions.
- **`SessionStorage`** — a thin localStorage wrapper.
- **`sessionsUI`** — past sessions viewer (list → detail → delete).

Rendering uses a **dual system**:
- **Writing mode:** Text is inside a `position: absolute` container (`#text-world`). We position it with `translateY()` to keep the cursor visible. Overflow is hidden. No native scrolling.
- **Reading mode:** We flip `#text-world` to `position: static`, enable `overflow-y: auto` on the viewport, and let the browser handle scrolling natively.

### What works well

- **Font-size rendering** — text is rendered at its actual visual size (`BASE_FONT_SIZE * scale`), not scaled via CSS transform. This means the browser sees real dimensions. Letter-spacing, cursor positioning, and line breaking all work naturally.
- **Line locking** — once a line is complete, it becomes an immutable DOM element. This prevents reflow during zoom and enables per-line stretch animation.
- **Squeeze mode** — elegant solution for edge-to-edge text without word-wrap. Negative letter-spacing compresses the active line when it overflows, then locks and stretches on the next line.
- **Animation loop** — single `requestAnimationFrame` loop drives zoom, stretch, scroll, viewport height, and fade. Clean and efficient.

### What doesn't work well

- **Mode transitions** — switching between the two rendering systems (transform-based vs. native scroll) is inherently fragile. Every property must be toggled correctly, in the right order, at the right time. We spent most of our debugging time here.
- **Keyboard detection via resize** — we infer "keyboard opened" or "keyboard closed" from viewport height changes. This is a heuristic, not a fact. It breaks when: the address bar appears/disappears, orientation changes, split-screen resizes, or the keyboard is a floating keyboard.
- **Touch-action management** — toggling `touch-action` between `none` (writing) and `pan-y` (reading) creates timing windows where the wrong mode is active.
- **Single-file complexity** — 830+ lines in one class. Adding highlights, zen mode, and type-to-navigate will push this past maintainability.

### Verdict

The rendering approach is solid. The problems were all in the **transitions and gesture handling** — areas where we're fighting the browser instead of working with it. The fix is not to change the rendering engine, but to:

1. Centralize gesture recognition (one place that decides what a touch means)
2. Simplify mode transitions (fewer properties to toggle, clearer state machine)
3. Split into modules (each feature in its own file, imported by the main app)

---

## Why Basic Things Were Hard

This section explains why tap detection and scrolling — things that "should just work" — caused so many bugs.

### The fundamental tension

The app needs two contradictory things:
- **Writing mode:** The browser must NOT scroll the page when you touch it. Touch = focus the textarea. All positioning is manual.
- **Reading mode:** The browser MUST scroll the page when you touch it. Touch = native scroll gesture.

In a normal web page, you pick one. We need both, and we need to switch between them smoothly.

### Why tap detection broke

1. **`touch-action: none`** tells the browser "I'll handle all touch gestures myself." This is necessary in writing mode (otherwise the page bounces when you tap), but it completely kills native scrolling in reading mode.

2. We had `touch-action: none` on `html, body` — global. Even when we switched to reading mode, the browser was still suppressing scroll gestures at the document level. Fix: moved it to `#viewport` only and toggle it per-mode.

3. **Tap vs. scroll detection:** On mobile, a "tap" and a "scroll" both start as `touchstart`. The difference is: did the finger move? But on overscroll bounce (top or bottom of scroll), the finger barely moves even during a scroll. Our first approach (boolean `touchMoved`) broke because micro-movements during a tap registered as scrolls. Fix: distance threshold (< 15px) + time threshold (< 300ms).

### Why scrolling broke

1. **Stuck scrolling:** When you scroll to the very top and try to overscroll-bounce, the finger doesn't travel far. Our tap detector saw the small movement + short time and fired `enterWritingMode()`, which killed scrolling. The user was stuck. Fix: the time threshold catches this — a scroll at the top is slow (held down), a tap is fast.

2. **Re-entry to reading mode:** After tapping to enter writing mode, the keyboard opens. This triggers a `resize` event (viewport shrinks). Later, when the keyboard animation finishes, another `resize` fires (viewport settles). Our heuristic (`heightGrew > 50px`) saw this as "keyboard closed" and immediately entered reading mode. The user saw: tap → writing mode → instant snap back to reading mode. Fix: `_readingModeBlocked` flag with 1500ms timeout, checked BEFORE the height-grew check.

3. **Viewport snapping:** We tried to force `renderedViewportH` to the correct value during transitions. This caused visual snapping instead of smooth animation. Fix: let the animation loop handle it naturally — just update the target and let the lerp converge.

### The lesson

Browser touch handling is designed for one paradigm at a time. When you switch paradigms mid-session, you're working in the gaps between browser APIs. Every edge case (overscroll, keyboard animation, address bar, split-screen) creates a new failure mode. The current solution works, but it's the kind of code that breaks when you're not looking at it. A centralized gesture system (Phase 2) will make this more robust.

---

## Recommended Architecture

### Module structure (ES Modules, no bundler)

Split `script.js` into focused modules. Each module exports a single class or object. The main entry point imports and wires them together.

```
src/
├── main.js                 # Entry point — imports, wires, boots
├── config.js               # CONFIG object
├── writing-engine.js       # WritingApp core (input, rendering, zoom, cursor)
├── mode-manager.js         # Reading/writing mode state machine + transitions
├── gesture-recognizer.js   # Touch/click → intent (tap, scroll, swipe)
├── animation.js            # Central rAF loop + lerp utilities
├── line-manager.js         # Line splitting, locking, squeeze logic
├── session-storage.js      # localStorage wrapper
├── sessions-ui.js          # Past sessions + highlights viewer
├── highlights.js           # Highlight creation, storage, rendering
├── zen-mode.js             # Zen mode transitions + letter animation
├── type-navigate.js        # Trigger word detection at session start
└── gap-ui.js               # Gap area: new-session button, swipe zone, ambient visuals
```

Keep `index.html` pointing to `<script type="module" src="src/main.js">`. No bundler needed — ES modules work natively in all target browsers.

### State machine for modes

Replace boolean flags with an explicit state machine:

```
States: PROMPT → WRITING → READING → ZEN
                    ↕          ↑
                    └──────────┘
                    ↕
               SESSIONS_VIEW

Transitions:
  PROMPT → WRITING:    tap overlay
  WRITING → READING:   keyboard close (viewport height grew)
  READING → WRITING:   tap (quick, minimal movement)
  WRITING → ZEN:       trigger from highlights viewer
  ZEN → WRITING:       tap to exit
  WRITING → SESSIONS:  type "past" / type "highlight"
  SESSIONS → WRITING:  back button
```

Each state defines:
- Which touch behavior is active (`touch-action` value)
- Which elements are visible/hidden
- Which animations are running
- How resize events are interpreted

Transitions are explicit functions with clear before/after. No property toggling scattered across the code.

### Gesture recognizer

One module that listens to `touchstart`, `touchmove`, `touchend`, and `click`. It classifies each gesture and emits intents:

| Gesture | Reading mode | Writing mode | Gap area |
|---------|-------------|-------------|----------|
| Quick tap (< 300ms, < 15px) | Enter writing | Focus textarea | — |
| Vertical scroll | Native scroll | Blocked | — |
| Swipe up from gap | — | — | Start highlighting |
| Long press | — | — | — (future) |

The recognizer doesn't know about modes — it just reports what happened. The mode manager decides what to do with it.

---

## Module Structure

### `config.js`

All tunable constants. Exported as a single object.

### `writing-engine.js`

The core of the app. Owns:
- Hidden textarea input handling
- Text state (`this.text`, `this.wordCount`)
- Line management (delegates to `line-manager.js`)
- Rendering (`fullRender`, `applyVisualFontSize`, `positionCursor`)
- Zoom (`getScale`, `computeZoomScales`)
- Scroll (`updateTransform`)
- Fade overlay
- RTL detection

Does NOT own: mode transitions, gesture handling, session persistence, UI overlays.

### `mode-manager.js`

Owns the state machine. Knows about all modes and transitions. Calls into `writing-engine` for rendering changes and into `gesture-recognizer` for touch behavior changes.

### `gesture-recognizer.js`

Owns all `touchstart`/`touchmove`/`touchend`/`click` listeners. Classifies gestures. Emits callbacks:

```javascript
onTap(x, y)
onSwipeUp(velocity, startY)
onScrollStart()
onScrollEnd()
```

The mode manager registers handlers for each gesture. Different handlers for different modes.

### `animation.js`

Owns the `requestAnimationFrame` loop. Provides:

```javascript
animation.register('zoom', (dt) => { /* lerp zoom */ });
animation.register('stretch', (dt) => { /* lerp stretch */ });
animation.register('viewport', (dt) => { /* lerp viewport height */ });
animation.start();
```

Each registered animation returns `true` when settled. The loop stops when all animations are settled. This replaces the monolithic `tick()` function.

### `line-manager.js`

Line splitting, locking, squeeze. Extracted from `WritingApp.updateLines()` and related methods. Pure logic — no DOM access.

### `session-storage.js`

What we have now, as a standalone module. Add highlight storage:

```javascript
SessionStorage.loadHighlights()
SessionStorage.saveHighlight({ text, sessionStartTime, range })
SessionStorage.deleteHighlight(id)
```

### `sessions-ui.js`

The past sessions viewer. Add a second tab for highlights. Both tabs use the same card-list pattern.

### `highlights.js`

Highlight creation via gap-swipe gesture. Stores highlighted text ranges. Renders highlight backgrounds on locked lines.

Key logic:
- Swipe velocity → character count (slow = few words, fast = many)
- Map character count backward from cursor to get a text range
- Apply `background-color` to the highlighted span within locked lines
- Save to localStorage

### `zen-mode.js`

The letter animation system. When a highlight is tapped in the viewer:

1. Get the bounding rect of each character in the highlight
2. Create individual `<span>` elements for each character, positioned absolutely at their current locations
3. Fade out all other text
4. Animate each character to its target position (centered layout)
5. On exit, reverse the animation

This module owns the concept of "text as physical material that can move."

### `type-navigate.js`

Watches input at session start. When the text matches a trigger word ("past", "highlight") and nothing else has been typed:

1. Apply bold styling (animated weight transition over ~300ms)
2. Make the word tappable
3. If tapped → navigate to sessions/highlights viewer
4. If user keeps typing → revert to normal text

### `gap-ui.js`

Manages the space between cursor and viewport bottom:
- New session button (current implementation, extracted)
- Swipe-up zone for highlights (delegates to `gesture-recognizer`)
- Future: ambient reactive visuals

---

## Implementation Phases

### Phase 1: Module split (no new features)

**Goal:** Split `script.js` into ES modules without changing any behavior.

Steps:
1. Create `src/` directory
2. Extract `config.js` — move CONFIG object
3. Extract `session-storage.js` — move SessionStorage
4. Extract `sessions-ui.js` — move sessionsUI
5. Extract `line-manager.js` — extract line splitting/locking logic
6. Extract `animation.js` — extract rAF loop
7. Move remaining WritingApp into `writing-engine.js`
8. Create `main.js` — imports, wiring, boot
9. Update `index.html` to use `<script type="module" src="src/main.js">`
10. Test: everything works exactly as before

**Risk:** Low. Pure refactor, no logic changes.

### Phase 2: Gesture recognizer + mode state machine

**Goal:** Centralize touch handling, make mode transitions explicit and robust.

Steps:
1. Create `gesture-recognizer.js` — absorb all touch/click listeners from writing-engine
2. Create `mode-manager.js` — absorb `enterReadingMode`, `enterWritingMode`, `handleResize` mode logic, `_readingModeBlocked`
3. Define state machine with explicit transitions
4. Each mode registers its own gesture handlers
5. Remove touch-action toggling from inline styles — mode manager owns this
6. Test: all transitions work, tap/scroll/swipe all correct

**Risk:** Medium. This is where the previous bugs lived. Must test exhaustively on mobile (iOS Safari, Chrome Android, Samsung Internet).

### Phase 3: Highlights

**Goal:** Implement the highlight-via-swipe feature and highlights viewer.

Steps:
1. Create `highlights.js`
2. Add swipe-up detection to gesture recognizer (gap area only)
3. Map swipe velocity → character count
4. Walk backward from cursor through locked lines to build highlight range
5. Render highlighted text with warm background color (e.g., `rgba(255, 213, 128, 0.4)`)
6. Store highlights in localStorage (linked to session)
7. Add highlights tab to sessions viewer
8. Add un-highlight action in viewer
9. Create `gap-ui.js` — extract new-session button, add swipe zone

**Depends on:** Phase 2 (gesture recognizer for swipe detection)

### Phase 4: Type-to-Navigate

**Goal:** Trigger words at session start open viewers.

Steps:
1. Create `type-navigate.js`
2. Watch `handleInput` — if session is fresh (no locked lines) and text matches a trigger word exactly
3. Apply bold transition (CSS `font-weight` animation over 300ms)
4. Make the word tappable (wrap in a `<span>` with click handler)
5. If text extends past the trigger word → revert to normal
6. Wire triggers: "past" → sessions viewer, "highlight" → highlights tab
7. Hide the sessions toggle button (☰) — no longer needed

**Depends on:** Phase 3 (highlights viewer must exist for "highlight" trigger)

### Phase 5: Zen Mode

**Goal:** Isolated highlight viewing with letter-level animation.

Steps:
1. Create `zen-mode.js`
2. Build letter animation engine:
   - Given a DOM node with text, create individual `<span>` per character
   - Calculate start position (current layout) and end position (centered layout)
   - Animate each character independently with staggered timing
3. Transition in: fade surrounding text, animate highlight characters to center
4. Zen display: characters centered on blank screen, large font, no other elements
5. Transition out: animate characters back to original positions, fade context back in
6. Wire: tap highlight in viewer → zen mode

**Depends on:** Phase 3 (highlights must exist)

### Phase 6: Gap ambient visuals

**Goal:** Reactive visual zone between cursor and viewport bottom.

Steps:
1. Add writing behavior tracking to writing-engine (typing speed, pause duration, burst patterns)
2. Create ambient visualization (canvas or CSS-based) in the gap area
3. Visualization responds to writing metrics (pulse with rhythm, etc.)
4. Ambient state yields to highlight swipe (fade out on touch, fade in on release)

**Depends on:** Phase 3 (highlight swipe must coexist)

This phase is more creative/experimental. Define the visual treatment separately.

---

## Cross-Platform Strategy

### Current target: Web app (all platforms)

The app works in any modern browser. Primary targets:
- **Mobile Safari (iOS)** — the most restrictive. Virtual keyboard behavior, `visualViewport` API, touch-action quirks.
- **Chrome (Android)** — most users. Generally well-behaved.
- **Chrome/Firefox/Safari (desktop)** — physical keyboard, no touch concerns.

### PWA (Progressive Web App)

Add a service worker and manifest to make the app installable:

```json
// manifest.json
{
  "name": "Writing",
  "short_name": "Writing",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#ffffff",
  "theme_color": "#ffffff"
}
```

Benefits: full-screen (no browser chrome), home screen icon, offline support. Zero code changes to the app itself.

**When:** After Phase 2 (when the app is stable).

### Native apps (future)

If native app store presence is needed:

1. **Capacitor** (recommended) — wraps the web app in a native WebView. One codebase, deploy to iOS and Android. The app stays vanilla web, Capacitor just provides the native shell.

2. **TWA (Trusted Web Activity)** — Android only. Packages a PWA as an Android app. Even less overhead than Capacitor but Android-only.

3. **Full native rewrite** — only if the WebView approach can't deliver the required performance or platform features. Unlikely for this app.

**Recommendation:** PWA first (free, immediate). Capacitor later if app store presence matters. The writing experience is not computationally demanding — a WebView will perform fine.

---

## Explained Simply

*This section is for people who don't build websites. It explains the app's architecture and the problems we solved in plain language.*

### What the app is

A blank screen where you type. As you type more, the view slowly pulls back like a camera, so your early words get smaller and your new words stay prominent. When you stop typing and close the keyboard, you can scroll through what you wrote. Tap to start writing again.

There's no save button, no menus, no settings. Your writing saves automatically. The app is meant to feel like a blank piece of paper.

### How it works inside

The app is built with three web technologies that every browser understands:

- **HTML** — the structure (a text area, a container for displayed text, a cursor)
- **CSS** — the visual style (fonts, colors, animations)
- **JavaScript** — the behavior (what happens when you type, how zoom works, where the cursor goes)

Everything runs in the browser. There's no server, no database, no account system. Your writing is stored on your device in the browser's local storage (like cookies, but for data).

### How text appears on screen

You don't actually type into a visible text box. There's a hidden text area that captures your keystrokes. JavaScript reads what you typed and creates visible text elements on screen. This gives us total control over how text looks and behaves — we can zoom it, stretch it, animate it, position a custom cursor, and more.

Each line of text becomes its own element. Once you move to the next line, the previous line is "locked" — it never changes again. This is important because as the view zooms out, locked lines need to stretch wider (via letter spacing) to keep filling the screen edge to edge.

### The zoom effect

When you start typing, the text is large — maybe 5 words fit on screen. As you type more, the text gets smaller. After about 60 words, the text reaches its smallest size and stays there.

This isn't a camera zooming out. The text is literally rendered at different sizes. When you've typed 10 characters, the font is large. When you've typed 200 characters, the font is smaller. The size change is gradual (animated) so it feels smooth, not jumpy.

### The two modes

The app has two ways of working:

**Writing mode:** The keyboard is open. You're typing. The app manually positions the text to keep your cursor visible. The page doesn't scroll — the app moves the text up as you type more lines.

**Reading mode:** The keyboard is closed. You're reading what you wrote. Now the browser handles scrolling naturally — you swipe up and down like any web page.

These two modes use different systems internally. Switching between them means changing several settings at once (scroll behavior, touch responses, element positioning). Getting this switch to feel smooth was the hardest part of building the app.

### Why scrolling was tricky

In a normal website, you touch the screen and the page scrolls. Simple. But in our app, when you're writing, we *don't* want the page to scroll — touching the screen should focus the keyboard. When you're reading, we *do* want scrolling.

The browser doesn't easily support switching between these two behaviors. We have to tell it "ignore touch gestures" in writing mode and "handle touch gestures normally" in reading mode. The timing of this switch, especially when the keyboard is animating open or closed, created bugs where:

- Scrolling got stuck (the browser was still in "ignore touches" mode)
- Tapping to write again didn't work (the browser thought you were scrolling)
- The app flickered between reading and writing mode (it misread a keyboard animation as the keyboard closing)

Each of these was fixed, but they're examples of why the two-mode system is fragile. It works now, but new features need to be careful about this boundary.

### What's coming next

**Highlights:** While writing, you can swipe up from the bottom of the screen to highlight your recent words. Like dragging a highlighter pen backward through your text. The highlighted words get saved separately so you can review them later.

**Zen Mode:** Tap a saved highlight and everything else fades away. The highlighted words float to the center of the screen, each letter animating individually. Just your words, isolated, breathing on a blank screen.

**Type-to-Navigate:** Instead of menu buttons, you type where you want to go. Type "past" and the word becomes bold and tappable — tap it to see your past writing sessions. Type "highlight" to see your highlights. If you keep typing (like "past experience"), it becomes normal text. The keyboard is the only interface.

### The file structure

Right now, all the code is in one file (`script.js`). As we add features, we'll split it into separate files — one for the writing engine, one for gesture handling, one for highlights, etc. Each file handles one concern. They're connected through JavaScript's module system (importing and exporting).

This is like organizing a workshop: instead of one giant toolbox, you have labeled drawers. Easier to find things, easier to fix things, easier to add new things.
