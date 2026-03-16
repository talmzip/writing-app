# Writing App — Design & Vision

## Essence

Writing is thinking slowed down. When you write by hand, your thoughts move at the speed of your pen — not the speed of your anxiety. This app recreates that feeling on a screen. You open it, you write, and for a few minutes the only thing that exists is the word you're forming right now.

The goal is a place where people come to calm down through writing. A blank page that asks nothing and gives nothing to manage. The output doesn't matter. The act of writing is the entire point.

## The Experience

### Opening

You open the app. A white screen. Centered in gray italic: *"what's on your mind?"* — a gentle nudge, not a command. Tap anywhere. The keyboard appears, the prompt fades, and you're writing.

> The prompt text is a placeholder — the concept stays, the words might change.

### Writing

Your first words appear large, filling most of the screen. It's intimate — just you and your words. Nothing else on screen.

As you type, the view slowly pulls back. Every character zooms out by a tiny amount, following an ease-out curve. Early characters cause noticeable movement (when the text is most intimate), later characters barely change anything. It feels like a camera gently pulling back as you fill a page.

The zoom is animated with a gentle lerp — no snapping, no jitter.

**The text always fills the screen edge to edge.** Words break mid-word at the line edge to maintain a dense, uniform monospace rectangle. This is intentional — typewriter/paper feel.

### Cursor

The cursor starts at vertical center when the page is empty, then gradually settles to the lower third as lines accumulate. Your latest words stay prominent and central.

### Line Drops

When a line fills up (character count reaches capacity minus one), the next space triggers a line drop instead of inserting a space. This makes the transition to a new line feel natural — you're always mid-thought when it happens.

### Enter = Breath

Enter creates a new line. Multiple consecutive Enters collapse into one — you can't create empty space. Enter-created lines intentionally don't stretch to fill the viewport. They stay short. A line break is a poetic choice, a pause, a breath. It should look different from a full line.

### Line Locking & Stretch

Each line is a separate DOM element. Once the cursor moves to the next line, the previous line locks — its content never changes again.

As the view zooms out, locked lines smoothly stretch (via letter-spacing) to keep filling the viewport edge to edge. The stretch animation is slow and subtle (~2-3 seconds to settle). Lines written earlier stretch more than recent ones. The active line has zero stretch — typing always feels like a fresh blank page.

### Max Zoom & Fade

At a certain point (~600 characters) the zoom maxes out. Beyond this, old content scrolls off the top.

Content leaving the screen **fades out gradually** — a smooth opacity gradient dissolves words as they approach the top edge. The feeling: your words existed, and now they're quietly letting go. Stay present.

### Responsive

Smaller screens get proportionally larger max-zoom text. The zoom range scales by viewport area relative to a desktop reference.

### Mobile

The virtual keyboard is always present during writing. All layout is calculated relative to the space above the keyboard. The experience should feel identical to desktop, just in a smaller canvas.

Keyboard open/close uses a spring-based animation (gentle lerp with subtle damping) so the viewport transition feels smooth, not jarring.

## Reading Mode

When the user folds the keyboard (or the textarea loses focus), the app enters **reading mode**:

- Cursor disappears
- Text expands to fill the full screen (no longer limited to above-keyboard area)
- The user can scroll through what they've written
- Tap anywhere to return to writing mode (keyboard reopens)

The visual transition must be smooth — text expanding from half-screen to full-screen. **The per-line stretch values and visual character of the text must be preserved.** Reading mode is not a reformat — it's the same beautiful text, just shown in a larger viewport.

> **Current status:** Implemented. Phased transitions with smooth viewport expansion and text settling.

## Transitions

### Writing to Reading

When the keyboard folds, the gap below the cursor follows it down, staying visible at the bottom of the screen. The cursor fades away. The text stays in place — only the space below it grows as the keyboard disappears.

Once the keyboard is gone and the screen is fully open, the text gently settles into its reading position. If there's enough text to fill the screen, it slides down to cover the space naturally. If not, it stays where it is with breathing room below.

The feeling: the page exhales. The keyboard slides away like a drawer closing, and the text stretches into the newly opened space.

### Reading to Writing

Tap anywhere. The keyboard begins to rise from the bottom, and the text slides upward to make room. The gap rides on top of the keyboard, maintaining its presence. Once the keyboard is settled and the text has found its place, the cursor appears — blinking, ready.

The feeling: the page inhales. It gathers itself, creates the intimate writing space, and waits.

### Principles

- Transitions are sequential, not simultaneous. Each step completes visually before the next begins.
- The gap is always present — it moves and resizes, but never vanishes completely.
- The cursor is the last thing to appear and the first thing to disappear.
- Nothing snaps. Everything lerps, slides, or fades.

### Status: Implemented

## Highlights

### The Gesture

The gap between the cursor and the bottom of the screen is an interaction zone. Swipe UP from the gap to highlight recently written text. The swipe velocity controls how much text is selected:

- **Slow swipe** — highlights a few words
- **Fast swipe** — highlights a larger chunk
- **Swipe again** — continues highlighting further back into the text

The gesture should feel physical — like dragging a highlighter pen backward through your own words.

### Visual Treatment

Highlighted text gets a colored background — subtle but clear. The highlight color should feel warm and analog, not digital-sterile. Think soft yellow or peach.

> Future possibility: brush-stroke texture instead of flat color. The highlight could look hand-drawn, matching the app's analog writing feel.

### Persistence

Highlights are saved to localStorage, tied to the session they came from. Each highlight stores the text range and the session reference.

### Un-highlight

In the highlights viewer, you can un-highlight text — removing the mark and returning it to normal session text. The un-highlight gesture should feel as satisfying as the highlight gesture.

### Status: Designed

## Zen Mode

Tap a highlight (in the highlights viewer) to enter **Zen Mode**. Everything else fades away. The highlighted text is the only thing on screen.

### The Transition In

The surrounding text dissolves. The highlighted words lift from their context — individual letters animate toward the center of the screen. They settle into a clean, centered layout. The animation should feel like the words are breathing free from the page.

### The Experience

Just the highlighted words, centered on a blank screen. Large, intimate, present. The same feeling as the first words of a new session — close and personal.

### The Transition Out

Tap to exit. The letters animate back to their original positions in the text. The surrounding context fades back in. The writer returns to where they were.

### Animation Philosophy

Zen Mode establishes a pattern that runs through the entire app: **text is alive.** Letters are not static glyphs locked in place — they can move, breathe, rearrange, dance. Every feature should treat text as a physical material that can be manipulated with smooth, organic animations.

This philosophy extends to future features: any time text needs to change state, appear, disappear, reorganize, or respond to interaction — it should do so with character-level animation that feels tactile and satisfying.

### Status: Designed

## Type-to-Navigate

At the start of a fresh session, certain words act as navigation triggers:

- Type **"past"** — the word smoothly transitions to bold. It becomes tappable. Tap it to open the past sessions viewer.
- Type **"highlight"** — same behavior, opens the highlights viewer.

### Behavior

- Only triggers on a **fresh session** (no prior text in the current session).
- The bold transition is animated — the weight increases smoothly over ~300ms.
- If the user keeps typing past the trigger word (e.g., "past experiences"), the word reverts to normal text and becomes part of the session.
- The trigger detection is case-insensitive.

### Why

The app has no visible UI chrome — no hamburger menus, no navigation bars. Everything is accessed through the writing surface itself. Typing a word to navigate is consistent with the app's philosophy: the act of writing IS the interface.

### Status: Designed

## The Gap

The space between the cursor and the bottom of the screen is prime real estate. It serves multiple purposes, activated by context:

### Highlight Swipe Zone
When the user swipes up from the gap, it triggers text highlighting (see Highlights section). This is the primary interaction.

### New Session Button
After 2.5 seconds of inactivity, a "New" button fades in. Tapping it saves the current session and starts fresh.

### Ambient Reactive Zone
When no interaction is happening, the gap can host ambient visuals that respond to writing behavior — speed, fluidity, pauses, rhythm. Imagine:

- Subtle visual feedback that reflects your writing state
- Generative visuals or shaders that pulse with your rhythm
- Data-driven elements that respond to writing patterns
- A space that feels alive while you write, without demanding attention

The ambient visuals yield to the highlight swipe — when the user touches the gap, the ambient state fades and the interaction takes priority. When the interaction ends, the ambient state gently returns.

This requires **writing behavior tracking**: typing speed, pause duration, burst patterns, session flow. The tracking infrastructure is a prerequisite. The gap UI is the creative application layer on top.

### Status: New Session button — Implemented. Highlight swipe — Designed. Ambient visuals — Concept.

## Sessions & Highlights Viewer

The viewer is a separate screen from the writing canvas. It has two tabs (or a toggle):

### Past Sessions
Sessions autosave to localStorage every 5 seconds. Only sessions with 3+ words are saved. Shows date, preview, word count, and duration. You can read or delete old sessions.

### Highlights
A scrollable collection of all highlights across sessions. Each highlight shows the text, the session it came from, and the date. You can:

- Tap a highlight to enter Zen Mode
- Un-highlight (remove the mark, text stays in the session)

The UI is minimal and consistent with the rest of the app — monospace, lots of whitespace, no visual noise.

### Access
The viewer is accessed by typing trigger words at session start (see Type-to-Navigate). The access point is deliberately invisible — it shouldn't distract from writing. Power users discover it naturally.

### Status: Past Sessions — Implemented. Highlights tab — Designed. Trigger word access — Designed.

## New Session

A "New" button appears in the gap between the cursor and the bottom of the screen after 2.5 seconds of inactivity. It fades in gently (0.6s ease-in). Tapping it saves the current session and starts fresh.

Every session starts blank. Always. The blank page is the ritual.

## Core Principles

- **Here and now.** The present moment is center stage. No scrolling back, no progress bars, no targets.
- **Stability.** Nothing changes quickly. The writer feels grounded at all times.
- **Smoothness.** Every transition is gradual and eased. Jarring changes break the meditative state.
- **Simplicity.** No UI to manage. No settings. Open and write.
- **Words fill the space.** Text is never small and lonely in a corner. Words always belong to the whole screen.
- **Text is alive.** Letters are physical material — they move, stretch, breathe, dance. Every state change is animated at the character level.
- **Everything is satisfying.** Every gesture, every transition, every interaction should feel tactile and rewarding. The app is a pleasure to use, not just a tool.

## Technical Stack

- Vanilla HTML/CSS/JS with ES modules. No framework at current scope.
- GitHub Pages — free, zero config, deploys from repo.
- No backend, no accounts, no server.
- Module-based file structure under `src/` (see Implementation Plan).

## Architecture

- **Input:** Hidden `<textarea>` captures all input (mobile + desktop). `input` event for text, `keydown` for Enter.
- **Rendering:** Text in `#text-display` as locked `<div class="line">` elements. Line breaking computed in JS. Font rendered at actual visual size (`BASE_FONT_SIZE * scale`).
- **Zoom:** Continuous font-size interpolation with ease-out curve. `currentScale` lerps toward `zoomTargetScale` each animation frame. No CSS scale transform — font-size is the only zoom mechanism.
- **Stretch:** Per-line `letter-spacing` with slow lerp animation. Active line = 0 spacing. Locked lines stretch toward target computed from current scale each frame.
- **Cursor:** Positioned via zero-width anchor `<span>`. Cursor div inside text-world.
- **Scroll:** Writing mode uses `translateY` to keep cursor at target vertical position. Reading mode uses native browser scroll.
- **Fade:** CSS gradient overlay, height tied to line height x scale. Appears when content scrolls off top.
- **Gestures:** Centralized gesture recognizer handles tap, swipe, and scroll detection. Works with the browser's native touch handling, not against it.
- **Animation:** Central `requestAnimationFrame` loop drives all lerps (zoom, stretch, scroll, viewport). Separate animation utilities for letter-level effects (Zen Mode, transitions).
- **Sessions:** `localStorage` autosave. Viewer with past sessions + highlights tabs.
- **Highlights:** Stored in `localStorage` with session references. Created via gap-swipe gesture.
- **RTL:** Auto-detected from Hebrew Unicode range. Flips direction and transform-origin.

---

## Changelog

- **2026-03-16** — Added: Transitions section (Writing↔Reading choreography, principles). Updated: Reading Mode status. Updated: Architecture (zoom mechanism). Status: Implemented.
- **2026-03-15** — Added: Highlights (gap-swipe, visual treatment, persistence, un-highlight). Added: Zen Mode (letter animation, isolated view). Added: Type-to-Navigate (trigger words at session start). Added: Text Animation Philosophy ("text is alive"). Updated: Gap section (highlight swipe + ambient visuals coexist). Updated: Sessions viewer (highlights tab). Updated: Architecture (gesture recognizer, animation system, modules). Updated: Core Principles (text is alive, everything is satisfying). Updated: Technical Stack (ES modules). Updated: Reading Mode status (implemented, not broken).
- **2026-03-14** — Added: Squeeze line-break mode (negative letter-spacing compression). Updated line locking details.
- **2026-03-14** — Added: Line Locking & Stretch mechanism. Added: Two line-break modes.
- **2026-03-13** — Added: Momentum-based animations. Reading mode concept.
- **2026-03-11** — Initial design document. Core writing experience, zoom, sessions.
