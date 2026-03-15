# Dev Log

## 2026-03-15 — Centered cursor start, responsive zoom, smooth keyboard transition
- Cursor starts at vertical center (0.5) and interpolates to lower third (2/3) as writing progresses
- Text-world pushed down via positive translateY so cursor sits mid-screen early on; as lines fill upward toward top edge, clamp kicks in and normal scrolling begins
- Responsive ZOOM_END_CHARS: scales by viewport area ratio vs desktop reference (1920x1080), clamped to 0.4-1.0x. Smaller screens get larger max-zoom text
- Smooth keyboard transitions: renderedViewportH lerps toward actual viewportH (factor 0.15). Height-only resizes (keyboard) animate; width changes (orientation) snap immediately
- Replaced momentum-based zoom (velocity + decay, caused oscillation) with simple lerp (factor 0.08)
- Stretch lerp slowed to 0.008 (~2-3s settle) for subtlety

## 2026-03-15 — Prompt overlay, enter line behavior, stretch animation
- Added "what's on your mind?" prompt overlay — italic, gray, centered. Tap anywhere to dismiss, focus textarea, show cursor. Solves mobile keyboard activation via user gesture.
- Enter-created lines (hasNewline) no longer stretch to fill viewport — kept at 0 letter-spacing to visually mark intentional line breaks.
- Stretch uses per-line currentSpacing that lerps toward target (computed from currentScale each frame). Locked lines start at their active-line spacing and slowly expand.
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
