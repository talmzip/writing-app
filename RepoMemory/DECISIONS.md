# Decisions

## 2026-03-16 — Reverted to per-frame font-size lerp (no CSS scale for zoom)
Decision: Revert compensatingScale/CSS-scale zoom. Use per-frame font-size lerp (currentScale lerps toward target, applyVisualFontSize each frame).
Reason: CSS scale from transform-origin 0,0 caused visible position jumps — text and cursor shifted because scale didn't center on the focal point. Per-frame font-size change is cheap enough for the DOM complexity of this app.
Impact: Zoom is smooth again. No CSS scale() in the transform — only translateY (and translateX for RTL).

## 2026-03-16 — Incremental DOM rendering for locked lines
Decision: Reuse existing DOM nodes for locked lines, only insert new ones. Active line always updates. Fall back to full innerHTML rebuild when locked lines are invalidated.
Reason: Full innerHTML rebuild on every input caused unnecessary DOM thrashing. Most keystrokes only affect the active line or add one new locked line.
Impact: Most input events now touch only 1-2 DOM nodes instead of rebuilding all of them.

## 2026-03-15 — ES module split planned, no bundler
Decision: Split script.js into ~12 ES modules under `src/`. Use native ES module imports (`<script type="module">`), no bundler.
Reason: Single 830-line file is approaching maintainability limits. New features (highlights, zen mode, type-to-navigate) will push it further. ES modules work natively in all target browsers.
Impact: Phase 1 of implementation plan. Pure refactor, no behavior changes. index.html switches from `<script src="script.js">` to `<script type="module" src="src/main.js">`.

## 2026-03-15 — Centralized gesture recognizer + mode state machine
Decision: Replace scattered touch handlers and boolean flags with a gesture recognizer module and explicit state machine for mode transitions.
Reason: The dual rendering system (transform vs native scroll) caused most bugs. Touch handling was spread across multiple event listeners with implicit state. Mode transitions toggled many properties in fragile sequences.
Impact: Phase 2 of implementation plan. Medium risk — this is where previous bugs lived. Must test exhaustively on mobile.

## 2026-03-15 — Web-first, PWA, then Capacitor for native
Decision: Ship as PWA first. Use Capacitor for native app store presence later if needed. No full native rewrite.
Reason: The app is not computationally demanding. A WebView performs fine. PWA gives installability and offline for free. Capacitor wraps the same codebase in a native shell with minimal overhead.
Impact: No code changes needed for PWA (just manifest + service worker). Capacitor is additive — the web app stays the same.

## 2026-03-14 — Line locking + letter-spacing stretch for text stability
Decision: Render each line as a separate locked DOM element. Use global `letter-spacing` to stretch text to fill the viewport at any scale. Compute line breaks in JS, not CSS.
Reason: CSS-based text wrapping reflows when container width changes during zoom. By locking lines and using letter-spacing for visual fill, text never reflows while always filling the viewport edge-to-edge.
Impact: Resolves the text width vs. line stability challenge. Text-world width is now fixed. Line breaking is manual (JS), not browser-driven. Two modes supported: justified (break-all) and natural (word-wrap).

## 2026-03-13 — Momentum-based animations instead of CSS transitions
Decision: Use velocity + decay via requestAnimationFrame for zoom and fade animations.
Reason: CSS transitions feel mechanical. Momentum gives natural acceleration when typing and smooth deceleration when stopping.
Impact: Zoom and fade now animate independently with configurable acceleration/decay. More organic feel.

## 2026-03-11 — CSS transform scale for zoom instead of font-size changes
Decision: Render text at fixed 48px font size, use CSS `transform: scale()` to zoom.
Reason: Changing font size causes layout recalculation. CSS scale is a GPU-composited operation — cheaper and maintains the "camera pulling back" metaphor.
Impact: Text-world is a fixed-size canvas that gets scaled. All positioning (cursor, scroll) happens in unscaled coordinates.
