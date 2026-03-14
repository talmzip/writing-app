# Project Context

## What it is
A minimalist, distraction-free writing app for Morning Pages / stream-of-consciousness writing. Vanilla HTML/CSS/JS, hosted on GitHub Pages.

## Current state
- Writing experience: open, type, zoom-out effect as you write
- Zoom: continuous CSS `transform: scale()` with momentum-based animation
- Lines: each line is a locked DOM element — no reflow during zoom
- Stretch: global `letter-spacing` keeps text filling the viewport at all scales
- Two line-break modes (dev toggle Ctrl+Shift+J): Justified (break-all) and Natural (word-wrap)
- Cursor: positioned via anchor span, scales with text-world
- Fade: top gradient overlay when content scrolls off top
- Sessions: autosaved to localStorage, viewable via corner button
- RTL: auto-detected for Hebrew text

## Key files
- `index.html` — markup shell
- `styles.css` — all styling
- `script.js` — `WritingApp` class, `SessionStorage`, `sessionsUI`
- `WritingAppDesign.md` — design vision and changelog

## Known issues / next steps
- Momentum CONFIG values (zoom, stretch, fade) need in-browser tuning
- RTL with letter-spacing stretch untested
