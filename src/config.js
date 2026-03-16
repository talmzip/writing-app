// All tunable values in one place. Adjust these to change the feel.

export const CONFIG = {
    // Zoom range: how many characters fit on screen at min zoom (start) and max zoom (end)
    ZOOM_START_CHARS: 30,     // ~5 words visible at start
    ZOOM_END_CHARS: 600,      // ~100 words visible at max
    // How many characters of content before we reach max zoom
    ZOOM_RAMP_CHARS: 360,     // ~60 words written = fully zoomed out
    AVG_CHARS_PER_WORD: 6,
    BASE_FONT_SIZE: 48,
    CURSOR_VERTICAL_POSITION: 2 / 3,
    FADE_LINE_FRACTION: 0.5,
    FONT_FAMILY: "'Courier New', monospace",
    LINE_HEIGHT: 1.4,
    AUTOSAVE_INTERVAL_MS: 5000,
    MIN_WORDS_TO_SAVE: 3,
    // Smooth fade momentum
    FADE_ACCELERATION: 0.15,
    FADE_DECAY: 0.92,
    FADE_MIN_VELOCITY: 0.3,
    // Smooth zoom
    ZOOM_LERP: 0.13,
    ZOOM_MIN_DIFF: 0.0001,
    // Stretch lerp for locked lines
    STRETCH_LERP: 0.008,
    // Viewport resize lerp (keyboard open/close)
    VIEWPORT_LERP: 0.06,
    VIEWPORT_BOUNCE: 0.35,
    // Responsive zoom: reference viewport area (desktop ~1920x1080)
    ZOOM_REF_AREA: 1920 * 1080,
    // Line break mode: 'squeeze' (default), 'justified', or 'natural'
    LINE_BREAK_MODE: 'squeeze',
    // Squeeze: minimum char width ratio before safety-valve mid-word break
    SQUEEZE_MIN_RATIO: 0.5,
};
