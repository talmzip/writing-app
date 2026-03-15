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

> **Current status:** Reading mode is fundamentally broken. CSS `transform: scale()` doesn't affect layout, so native scroll doesn't know the visual content size. The planned fix is to remove CSS transform scaling entirely and render at actual visual sizes (computed font-size + proportional letter-spacing). This is a rendering engine refactor.

## New Session

A "New" button appears in the gap between the cursor and the bottom of the screen after 2.5 seconds of inactivity. It fades in gently (0.6s ease-in). Tapping it saves the current session and starts fresh.

Every session starts blank. Always. The blank page is the ritual.

## Sessions

Sessions autosave to localStorage every 5 seconds. Only sessions with 3+ words are saved. A minimal viewer shows past sessions with date, preview, word count, and duration. You can read or delete old sessions.

The sessions viewer is a separate screen, not an overlay on the writing canvas. Access point is deliberately subtle — it shouldn't distract from writing.

## Future: The Gap

The space between the cursor and the bottom of the screen is prime real estate. Currently it holds the "New" button during inactivity. The vision is bigger:

**The gap becomes a reactive UI zone.** It responds to writing behavior — speed, fluidity, pauses, rhythm. Imagine:

- Subtle visual feedback that reflects your writing state
- Generative visuals or shaders that pulse with your rhythm
- Data-driven elements that respond to writing patterns
- A space that feels alive while you write, without demanding attention

This requires **writing behavior tracking**: typing speed, pause duration, burst patterns, session flow. The tracking infrastructure is a prerequisite. The gap UI is the creative application layer on top.

## Core Principles

- **Here and now.** The present moment is center stage. No scrolling back, no progress bars, no targets.
- **Stability.** Nothing changes quickly. The writer feels grounded at all times.
- **Smoothness.** Every transition is gradual and eased. Jarring changes break the meditative state.
- **Simplicity.** No UI to manage. No settings. Open and write.
- **Words fill the space.** Text is never small and lonely in a corner. Words always belong to the whole screen.

## Technical Stack

- Vanilla HTML/CSS/JS. No framework at current scope.
- GitHub Pages — free, zero config, deploys from repo.
- No backend, no accounts, no server.
- Three files: `index.html`, `styles.css`, `script.js`.

## Architecture

- **Input:** Hidden `<textarea>` captures all input (mobile + desktop). `input` event for text, `keydown` for Enter.
- **Rendering:** Text in `#text-display` as locked `<div class="line">` elements. Line breaking computed in JS.
- **Zoom:** Continuous CSS `transform: scale()` on `#text-world`. Base font 48px, scale interpolated with ease-out curve. *(Planned: replace with actual font-size rendering.)*
- **Stretch:** Per-line `letter-spacing` with slow lerp animation. Active line = 0 spacing. Locked lines stretch toward target computed from current scale each frame.
- **Cursor:** Positioned via zero-width anchor `<span>`. Cursor div inside text-world, scales with transform.
- **Scroll:** `translateY` keeps cursor at target vertical position. Clamped for short content.
- **Fade:** CSS gradient overlay, height tied to line height × scale. Appears when content scrolls off top.
- **Sessions:** `localStorage` autosave. Minimal viewer with list → detail → delete flow.
- **RTL:** Auto-detected from Hebrew Unicode range. Flips direction and transform-origin.
