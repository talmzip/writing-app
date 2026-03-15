# Dev Log

## 2026-03-15 — Prompt overlay, enter line behavior, stretch-zoom unification, cursor position
- Added "what's on your mind?" prompt overlay — italic, gray, centered. Tap anywhere to dismiss, focus textarea, show cursor. Solves mobile keyboard activation via user gesture.
- Enter-created lines (hasNewline) no longer stretch to fill viewport — kept at 0 letter-spacing to visually mark intentional line breaks.
- Removed separate stretch lerp animation. Spacing is now derived directly from current scale each frame — rides the zoom momentum, no visible separate animation.
- Cursor vertical position interpolates from center (0.5) at start to lower third (2/3) at max zoom, using same ramp/easing as zoom.
- Space-triggered line drop: fires when line has ≥ cpl-1 chars (unsqueezed capacity).
- Removed `autofocus` attribute from hidden textarea.

## 2026-03-14 — Graduated stretch + mobile keyboard
- Changed from uniform to graduated per-line stretch based on birth scale
- Active line always has 0 letter-spacing; older lines stretch more
- Graduated factor blends to uniform at max zoom
- Removed separate stretch animation — derived from scale each frame
- Added autofocus + document touchstart focus for mobile keyboard

## 2026-03-14 — Line locking + stretch mechanism
- Resolved text width vs. line stability challenge
- Each line is now a separate `<div class="line">` that locks permanently once the next line begins
- Added global `letter-spacing` stretch computed from current scale: `charW × (scaleStart/S − 1)`
- Scale and stretch both animate via momentum (velocity + decay) in a combined rAF loop
- Removed dynamic text-world width — now fixed at max stretch width
- Added dev toggle (Ctrl+Shift+J) for two line-break modes: Justified Flow and Natural Flow
- CSS: removed `white-space: pre-wrap` and `word-break: break-all` from `#text-display`, added `.line { white-space: pre }`

## 2026-03-13 — Momentum animations, RTL fix, responsive width fix
- Added momentum-based zoom and fade animations
- Fixed RTL positioning with translateX
- Fixed text overflow with dynamic text-world width (now superseded by line locking)

## 2026-03-11 — Continuous zoom + rectangle text
- Replaced staged zoom with continuous per-character zoom
- Changed to `word-break: break-all` for dense rectangle

## 2026-03-11 — Phase 1 implementation
- Complete rewrite: hidden textarea input, CSS transform zoom, cursor positioning, fade overlay, session autosave, sessions viewer, RTL support
