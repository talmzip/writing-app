# Project Context

## What it is
A minimalist, distraction-free writing app for Morning Pages / stream-of-consciousness writing. Vanilla HTML/CSS/JS, hosted on GitHub Pages.

## Current state
- Writing experience: open, type, zoom-out effect as you write
- Zoom: continuous — text rendered at actual visual font size (BASE_FONT_SIZE * scale), no CSS transform scale
- Lines: each line is a locked DOM element — no reflow during zoom
- Stretch: per-line `letter-spacing` keeps text filling the viewport at all scales
- Squeeze mode (default): negative letter-spacing compresses active line when it exceeds cpl
- Two additional line-break modes (dev toggle Ctrl+Shift+J): Justified and Natural
- Cursor: positioned via anchor span, height/width scale with font size
- Fade: top gradient overlay when content scrolls off top
- Reading mode: keyboard close triggers native-scroll reading view; tap to resume writing
- Sessions: autosaved to localStorage, viewable via corner button
- RTL: auto-detected for Hebrew text
- Prompt overlay: "what's on your mind?" — tap to start

## Key files
- `index.html` — markup shell
- `styles.css` — all styling
- `script.js` — `WritingApp` class, `SessionStorage`, `sessionsUI`
- `WritingAppDesign.md` — design vision

## Known issues / next steps
- RTL with letter-spacing stretch untested
- Sessions toggle button hidden (will be replaced by type-to-navigate)
- Next: module split (Phase 1 of ImplementationPlan.md), then gesture recognizer + mode state machine (Phase 2)
- Planned features: Highlights (gap-swipe), Type-to-Navigate, Zen Mode, gap ambient visuals
- See `ImplementationPlan.md` for full 6-phase plan and architecture recommendations
- See `WritingAppDesign.md` for design vision and feature specs
