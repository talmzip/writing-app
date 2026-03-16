# Project Context

## What it is
A minimalist, distraction-free writing app for Morning Pages / stream-of-consciousness writing. Vanilla HTML/CSS/JS, hosted on GitHub Pages.

## Current state
- Writing experience: open, type, zoom-out effect as you write
- Zoom: continuous font-size lerp — `currentScale` lerps toward target each animation frame, no CSS scale transform
- Lines: each line is a locked DOM element — incremental DOM updates (only new lines inserted, active line updated)
- Stretch: per-line `letter-spacing` keeps text filling the viewport at all scales
- Squeeze mode (default): negative letter-spacing compresses active line when it exceeds cpl
- Two additional line-break modes (dev toggle Ctrl+Shift+J): Justified and Natural
- Cursor: positioned via anchor span, height/width scale with font size
- Fade: top gradient overlay when content scrolls off top
- Reading mode: keyboard close triggers native-scroll reading view; tap to resume writing
- Sessions: autosaved to localStorage, viewable via corner button
- RTL: auto-detected for Hebrew text
- Prompt overlay: "what's on your mind?" — tap to start

## Architecture
ES modules under `src/`. Entry point: `src/main.js`.

- `src/config.js` — CONFIG constants
- `src/animation.js` — AnimationLoop (central rAF, registered tick functions)
- `src/writing-engine.js` — WritingApp class (input, rendering, zoom, cursor, lines, sessions)
- `src/gesture-recognizer.js` — GestureRecognizer (touch/click classification)
- `src/mode-manager.js` — ModeManager (prompt/writing/reading state machine)
- `src/session-storage.js` — SessionStorage (localStorage wrapper)
- `src/sessions-ui.js` — sessionsUI (past sessions viewer)
- `src/main.js` — wiring and boot

Old `script.js` kept as reference (not loaded).

## Key files
- `index.html` — markup shell (`<script type="module" src="src/main.js">`)
- `styles.css` — all styling
- `WritingAppDesign.md` — design vision

## Known issues / next steps
- RTL with letter-spacing stretch untested
- Sessions toggle button hidden (will be replaced by type-to-navigate)
- Planned features: Highlights (gap-swipe), Type-to-Navigate, Zen Mode, gap ambient visuals
- See `ImplementationPlan.md` for full 6-phase plan and architecture recommendations
- See `WritingAppDesign.md` for design vision and feature specs
