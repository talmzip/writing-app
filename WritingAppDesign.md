# Writing App — Design & Vision
Status: Partially Implemented

## Essence

Writing is thinking slowed down. When you write by hand, your thoughts move at the speed of your pen — not the speed of your anxiety. This app exists to recreate that feeling on a screen. You open it, you write, and for a few minutes the only thing that exists is the word you're forming right now. Not what you wrote before. Not what you'll write next. Just this word, here, now.

The goal is a place where people come to calm down through writing. A blank page that asks nothing of you and gives you nothing to manage. The output doesn't matter. The act of writing is the entire point.

## Overview

A minimalist, distraction-free writing app inspired by the *Morning Pages* practice from "The Artist's Way." The app is a digital blank page for stream-of-consciousness brain-dump. The experience should feel like putting pen to paper: immediate, private, and frictionless. No UI chrome, no distractions, no features that invite overthinking.

Accessible from both PC and mobile browser. Hosted for free (GitHub Pages). No accounts, no backend.

## Writing Experience

### Start State
You open the app. A blank page. You start typing. Your first words appear large — filling most of the screen, roughly 5–6 words visible. The text is intimate. It's just you and your words. There is nothing else on screen.

### The Zoom
As you write more, the "camera" slowly pulls back. You don't see the text change — you see more of it. The text stays laid out the same way, but the viewport gradually reveals more words on screen. This creates a sense of gentle progression: you're filling a space, building something, without anything being taken away.

The zoom is **continuous**, not staged. Every character you type zooms out by a tiny amount. The zoom follows an ease-out curve so early characters cause more noticeable zoom (when the text is most intimate) and later characters barely change anything (the view has settled). This feels natural — like a camera gently pulling back as you fill the page.

**Zoom parameters** (configurable in `CONFIG`):
- Start: ~30 characters visible (~5 words)
- End: ~600 characters visible (~100 words)
- Ramp: reaches max zoom after ~360 characters (~60 words written)

The text itself always maintains a **solid rectangle shape** — words break mid-word at the line edge (`word-break: break-all`). This is intentional: the monospace grid stays perfectly dense and uniform, reinforcing the typewriter/paper feel.

### Max State and Fade
At a certain point the zoom reaches its maximum — the screen fits a defined amount of content and won't zoom out further. Beyond this, old content begins to scroll off the top of the screen.

The content that leaves the screen **fades out gradually**. Not a hard cut, not a jump. A smooth opacity gradient covers the top half of the topmost visible line — words gently dissolve as they approach the edge. Smoothness is the absolute top priority for this effect. The feeling should be that your words were here, they existed, and now they're quietly letting go — reinforcing that the past doesn't matter, stay present.

Start with per-line fade. If it feels too chunky, explore per-word fade. The right answer will come from feeling it in the browser.

### Cursor Position
The cursor sits in the **lower third** of the screen. Your latest words are prominent and central to your attention, but not pushed to the very edge. There is visual ground below — the writing area feels grounded, not precarious.

### Mobile
The virtual keyboard is always present during a session. The writing area is the viewport space **above the keyboard** — all layout, zoom stages, and cursor positioning are calculated relative to this available space, not the full screen. The experience should feel identical to desktop, just in a smaller canvas.

### Line Breaks
Enter works. A line break is a breath, a shift, a poetic choice. It carries meaning about the writer's mental state. Single Enter creates a new line. Multiple consecutive Enters collapse into one — you can't skip lines or create empty space. This keeps the flow honest and the visual effect clean.

### Session
Every session starts blank. Always. There is no "continue where you left off." The blank page is the ritual.

Sessions are **autosaved to localStorage** every 5 seconds (configurable). Only sessions with 3+ words are saved. A minimal sessions viewer is accessible via a nearly-invisible button in the top-right corner — deliberately low-key so it doesn't distract from writing. The viewer shows past sessions with date, preview, word count, and duration. You can read or delete old sessions. The sessions screen is a separate view, not an overlay on the writing canvas.

Future ideas include analytics and insights built on top of saved sessions.

## Core Principles
- **Here and now.** The app puts the present moment in the center. No scrolling back, no future targets, no progress bars.
- **Stability.** Nothing changes quickly. The writer should feel grounded at all times.
- **Smoothness.** Every visual transition is gradual and eased. Jarring changes break the meditative state.
- **Simplicity.** No UI to manage. No settings to fiddle with. Open and write.
- **Words fill the space.** The text is never small and lonely in a corner. Words always feel like they belong to the whole screen.

## Technical Notes

### Stack & Hosting
- Vanilla HTML/CSS/JS. No framework needed at current scope.
- Hosted on GitHub Pages — free, zero config, deploys from the repo.
- No backend, no accounts, no server.

### Implementation Architecture
- **Input:** Hidden `<textarea>` captures all input (works on mobile + desktop). `input` event for text, `keydown` for Enter handling.
- **Rendering:** Text rendered into `#text-display` with `white-space: pre-wrap` and `word-break: break-all`. Words split mid-word to maintain a solid rectangle text block.
- **Lines:** Each line is a separate `<div class="line">` with `white-space: pre`. Lines are "locked" once the next line begins — content never changes. Line breaking is computed in JS (not CSS wrapping).
- **Zoom:** Continuous. CSS `transform: scale(S)` on `#text-world` container. Text always rendered at `BASE_FONT_SIZE` (48px). Scale interpolated between start/end values based on character count with ease-out curve.
- **Stretch:** Per-line `letter-spacing` based on each line's birth scale. Graduated during zoom-out (active line = 0 stretch, older lines = more stretch), settling to uniform at max zoom. Derived from current scale each frame — no separate animation.
- **Cursor:** Positioned via a zero-width anchor `<span>` at end of text. `offsetLeft`/`offsetTop` give exact position within text-world. Cursor div inside text-world, so it scales automatically.
- **Scroll:** `translateY` offset keeps cursor at lower third. Clamped so text starts at top on short content.
- **Fade:** CSS gradient overlay on `#viewport`, height tied to line height × scale. Only appears when content scrolls off top.
- **Sessions:** Autosaved to `localStorage` every 5s. Minimal viewer UI with list → detail → delete flow.
- **RTL:** Detected from Hebrew Unicode range. Toggles `direction: rtl`, `transform-origin` flips to `100% 0`.

## Remaining Design Questions
- Should there be any subtle ambient feedback (e.g. a barely-visible word count)?
- Fade smoothness tuning — test in browser.
- Zoom transition feel tuning — test in browser.

## Resolved: Text Width vs. Line Stability — Line Locking + Stretch

The zoom system scales a fixed-width text-world via CSS `transform: scale()`. The challenge was: as scale changes, either the text reflows (dynamic width) or it shrinks away from the edges (fixed width).

**Solution: locked lines + global letter-spacing stretch.**

Each line of text is a separate DOM element (`<div class="line">`). Once the cursor moves to the next line, the previous line's content is permanently locked — it never reflows regardless of scale or container width changes.

As scale decreases, the text block would shrink away from the screen edges. To prevent this, we apply **graduated letter-spacing stretch** based on each line's birth scale — the scale at which it was the active line.

**Graduated stretch:** Each locked line remembers what scale it was written at. The stretch applied to that line is proportional to the difference between its birth scale and the current scale. Lines written early (large birth scale) accumulate more stretch. The active line's birth scale equals current scale, so its stretch is always zero — typing always feels like a fresh blank page.

As zoom-out completes (scale reaches scaleEnd), the graduated factor eases to 0 and all locked lines settle to the same uniform stretch, filling the viewport edge-to-edge.

Scale target updates per character typed. Actual rendered scale lerps toward its target via momentum (velocity + decay) for smooth ease-out. Per-line stretch is derived directly from the current scale each animation frame.

**Two line-breaking modes** (dev toggle via Ctrl+Shift+J):
- **Justified Flow** (`break-all`): Characters break at exact `charsPerLine` boundaries. Dense rectangle.
- **Natural Flow** (`word-wrap`): Break at word boundaries. Ragged right edge.

Both use the same stretch mechanism. Default is Justified Flow.

## Next Step
Tune zoom, stretch, and fade momentum CONFIG values by feel in the browser.

---
## Changelog
### 2026-03-14 — Graduated stretch + mobile keyboard fix
- Changed from uniform stretch to graduated per-line stretch based on birth scale.
- Each locked line stores its birth scale. Stretch = `charW × (birthScale / currentScale − 1)`.
- Active line always has 0 letter-spacing — typing feels like a fresh page.
- Graduated factor eases from 1 (fully graduated) to 0 (uniform) as scale approaches scaleEnd.
- Removed separate stretch momentum animation — stretch is now derived from scale each frame.
- Added `autofocus` to hidden textarea and document-level touchstart focus for mobile keyboard.
- Reduced blur-refocus delay from 100ms to 50ms for snappier keyboard recovery.
- Status: Partially Implemented (needs in-browser tuning)

### 2026-03-14 — Line locking + stretch (text width stability resolved)
- Resolved the Open Design Challenge: text no longer reflows during zoom.
- Each line rendered as a separate `<div class="line">` that locks once the next line begins.
- Added letter-spacing stretch computed from scale so full lines always fill the viewport.
- Zoom animates via momentum (acceleration + decay) for smooth ease-out.
- Removed dynamic text-world width updates — width is now fixed at max stretch case.
- Added two line-breaking modes as dev toggle (Ctrl+Shift+J): Justified Flow (break-all) and Natural Flow (word-wrap).
- Line splitting computed in JS; CSS `white-space: pre` on each line div prevents browser reflow.

### 2026-03-13 — Momentum animations, RTL fix, responsive width fix
- Added momentum-based zoom animation (acceleration + decay via rAF). Zoom now glides smoothly when typing and decays gently when stopping.
- Added momentum-based fade animation for the top gradient overlay.
- Fixed RTL: removed broken transform-origin flip, replaced with translateX positioning that aligns text-world right edge to viewport.
- Fixed text overflow: text-world width now tracks current scale so text stays within visible area at all zoom levels.
- Known issue: dynamic width causes line reflow during zoom (text rewraps as width changes). See "Open Design Challenge" section.
- Clipboard operations (Ctrl+A/C/V) work via the hidden textarea.
- Status: Partially Implemented (text width stability unresolved)

### 2026-03-11 — Switched to continuous zoom + rectangle text
- Replaced staged zoom with continuous zoom (ease-out interpolation per character)
- Removed zoom-animating CSS class — scale updates instantly every keystroke
- Changed `overflow-wrap: break-word` to `word-break: break-all` — words split mid-word to maintain solid rectangle text block
- Updated CONFIG: replaced STAGES array with ZOOM_START_CHARS, ZOOM_END_CHARS, ZOOM_RAMP_CHARS
- Removed stage tracking logic (currentStageIndex, getCurrentStageIndex, etc.)

### 2026-03-11 — Phase 1 implemented
- Complete rewrite of all three files (index.html, styles.css, script.js)
- Hidden textarea input for cross-platform compatibility (desktop + mobile)
- CSS transform-based zoom with 5 configurable stages
- Words no longer split mid-word (overflow-wrap: break-word replaces fixed-char slicing)
- Cursor positioned via anchor span, scales with text-world automatically
- Zoom transitions only animate on stage change, scroll tracking is instant
- Fade overlay appears when content scrolls off top
- Session autosave to localStorage every 5s
- Minimal past-sessions viewer (list, detail, delete) accessible via corner button
- RTL support preserved with transform-origin flip
- Status: Partially Implemented (needs in-browser tuning)

### 2026-03-11 — Design parameters finalized
- Set zoom stages: 5 → 15 → 30 → 60 → 100 words-per-screen
- Max state: ~100 words visible on screen
- Fade: top half of the topmost line, smooth gradient
- Mobile: layout calculated for space above keyboard
- Zoom transition: subtle ease, fast enough for continuous writing
- Confirmed vanilla HTML/CSS/JS + GitHub Pages as final stack
- Status moved to Designed, next step is implementation

### 2026-03-11 — Full design documented
- Added Essence section capturing the philosophy and final goal
- Defined the complete writing experience: start state, zoom stages, max state with fade, cursor position, line breaks, session model
- Established core design principles (here and now, stability, smoothness, simplicity)
- Documented zoom implementation approach (CSS transform scaling)
- Moved resolved questions into the design, kept remaining unknowns that need prototyping
- Separated phase 1 (writing experience) from phase 2 (saving, analytics)

### 2026-03-11 — Brainstorm session, intent defined
- Established morning pages / writing-meditation as the core intent
- Confirmed mobile support as a first-class requirement
- Decided on vanilla JS + GitHub Pages as the stack

### 2026-03-11 — File created
- Documented current state and open design questions
