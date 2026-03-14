# Decisions

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
