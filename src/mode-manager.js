// State machine for mode transitions: prompt → writing ↔ reading.
// Owns all DOM state changes per mode. Wires gesture callbacks per mode.
// Transitions are phased — viewport expands first, then text settles, then native scroll.

import { CONFIG } from './config.js';

export class ModeManager {
    constructor(app, animation, gestures) {
        this.app = app;
        this.animation = animation;
        this.gestures = gestures;
        this._mode = 'prompt';
        this.readingModeBlocked = false;
        this.lastWritingViewportH = 0;
        this.transitionPhase = null; // null, 'viewport-expanding', 'text-sliding'
        this.readingTargetOffset = 0;
    }

    get mode() { return this._mode; }
    set mode(m) {
        this._mode = m;
        this.app.mode = m;
    }

    // ── Prompt ──

    setupPrompt() {
        const overlay = document.getElementById('prompt-overlay');
        if (!overlay) {
            this.enterWriting();
            return;
        }
        this.app.cursorEl.style.display = 'none';

        const activate = (e) => {
            e.preventDefault();
            this.app.hiddenInput.focus({ preventScroll: true });
            this.app.cursorEl.style.display = '';
            overlay.classList.add('hidden');
            setTimeout(() => overlay.remove(), 300);
            this.mode = 'writing';
            this.setWritingGestures();
        };
        overlay.addEventListener('click', activate);
        overlay.addEventListener('touchend', activate);
    }

    // ── Writing ──

    enterWriting() {
        if (this.mode === 'writing') return;

        // Cancel any in-progress reading transition
        if (this.transitionPhase) {
            this.animation.unregister('modeTransition');
            this.transitionPhase = null;
        }

        // Convert reading scroll position to writing offset
        const wasStatic = this.app.textWorld.style.position === 'static';
        if (wasStatic) {
            const readingScrollTop = this.app.viewport.scrollTop;
            this.app.currentOffsetY = -readingScrollTop;
        }
        // else: still in absolute mode (transition was interrupted), offset is already correct

        this.mode = 'writing';
        this.readingModeBlocked = true;
        setTimeout(() => { this.readingModeBlocked = false; }, 1500);

        // Restore writing DOM state
        this.app.textWorld.style.position = 'absolute';
        this.app.textWorld.style.paddingBottom = '';
        this.app.textWorld.style.paddingTop = '';
        this.app.viewport.style.overflowY = 'hidden';
        this.app.viewport.style.touchAction = 'none';
        this.app.viewport.scrollTop = 0;

        this.app.fadeOverlay.style.display = '';
        this.app.applyTransform();

        // Focus immediately (required for keyboard on mobile)
        this.app.hiddenInput.focus({ preventScroll: true });
        this.animation.wake();

        // Cursor appears after a short delay — keyboard and text settle first
        this.app.cursorEl.style.display = 'none';
        setTimeout(() => {
            this.app.cursorEl.style.display = '';
        }, 250);

        this.app.resetInactivityTimer();
        this.setWritingGestures();
    }

    // ── Reading ──

    enterReading() {
        if (this.mode === 'reading') return;
        if (this.readingModeBlocked) return;

        this.mode = 'reading';
        this.transitionPhase = 'viewport-expanding';

        // Visual: cursor hides, fade hides, inactivity hides
        this.app.cursorEl.style.display = 'none';
        this.app.newSessionBtn.classList.remove('visible');
        clearTimeout(this.app.inactivityTimer);
        this.app.fadeOverlay.style.display = 'none';

        // Save writing state
        this.lastWritingViewportH = this.app.renderedViewportH;

        // Update target viewport (full screen, keyboard gone)
        this.app.updateViewportSize();

        // Phase 1: stay in absolute mode, let viewport expand smoothly
        // Text stays in place — tickScroll won't run (mode is 'reading')
        // tickViewport handles the viewport height expansion
        this.animation.register('modeTransition', () => this.tickReadingTransition());
        this.animation.wake();
        this.setReadingGestures();
    }

    tickReadingTransition() {
        if (this.transitionPhase === 'viewport-expanding') {
            // Wait for viewport to settle at full height
            const settled = Math.abs(this.app.viewportH - this.app.renderedViewportH) < 2
                && Math.abs(this.app.viewportVelocity) < 0.5;
            if (settled) {
                this.app.renderedViewportH = this.app.viewportH;
                this.app.viewportVelocity = 0;
                this.app.viewport.style.height = this.app.viewportH + 'px';
                this.transitionPhase = 'text-sliding';
                this.readingTargetOffset = this.computeReadingOffset();
            }
            return false;
        }

        if (this.transitionPhase === 'text-sliding') {
            const diff = this.readingTargetOffset - this.app.currentOffsetY;
            if (Math.abs(diff) < 1) {
                this.app.currentOffsetY = this.readingTargetOffset;
                this.app.applyTransform();
                this.completeReadingSwitch();
                this.transitionPhase = null;
                this.animation.unregister('modeTransition');
                return true;
            }
            this.app.currentOffsetY += diff * 0.1;
            this.app.applyTransform();
            return false;
        }

        return true;
    }

    computeReadingOffset() {
        // Target: text fills the viewport nicely with a gap at the bottom
        const contentHeight = this.app.textDisplay.offsetHeight;
        const vh = this.app.renderedViewportH;
        const gapH = vh * 0.15;

        if (contentHeight <= vh - gapH) {
            // All content fits — top-aligned
            return 0;
        }
        // Content overflows — position last line above the gap
        return -(contentHeight - vh + gapH);
    }

    completeReadingSwitch() {
        const scrollTop = Math.max(0, -this.app.currentOffsetY);

        this.app.textWorld.style.position = 'static';
        this.app.textWorld.style.transform = '';
        this.app.textWorld.style.paddingTop = '5vh';
        this.app.textWorld.style.paddingBottom = '40vh';
        this.app.viewport.style.overflowY = 'auto';
        this.app.viewport.style.webkitOverflowScrolling = 'touch';
        this.app.viewport.style.touchAction = 'pan-y';
        this.app.viewport.scrollTop = scrollTop;
    }

    // ── Gesture wiring ──

    setWritingGestures() {
        // No preventDefault needed — CSS touch-action:none handles scroll prevention
        this.gestures.onTouchStart = () => {
            this.app.focusInput();
        };
        this.gestures.onTap = null;
        this.gestures.onClick = () => this.app.focusInput();
    }

    setReadingGestures() {
        this.gestures.onTouchStart = null;
        this.gestures.onTap = (e) => {
            this.enterWriting();
        };
        this.gestures.onClick = () => this.enterWriting();
    }

    // ── Resize ──

    handleResize() {
        const oldW = this.app.viewportW;
        const oldH = this.app.viewportH;
        this.app.updateViewportSize();

        if (this.mode === 'reading') {
            // If reading transition is in progress, viewport tick handles it
            if (this.transitionPhase) return;
            // Otherwise snap viewport
            this.app.renderedViewportH = this.app.viewportH;
            this.app.viewport.style.height = this.app.viewportH + 'px';
            return;
        }

        const sameWidth = this.app.viewportW === oldW;

        // During reading→writing transition, let animation track keyboard smoothly
        if (this.readingModeBlocked) {
            this.app.recalcZoom();
            this.animation.wake();
            return;
        }

        // Keyboard closing (height grew) → enter reading mode
        const heightGrew = this.app.viewportH > oldH + 50;
        if (heightGrew && sameWidth) {
            this.enterReading();
            return;
        }

        if (this.app.viewportW !== oldW) {
            // Width change → full reset
            this.app.renderedViewportH = this.app.viewportH;
            this.app.computeZoomScales();
            this.app.currentScale = this.app.getScale();
            this.app.zoomTargetScale = this.app.currentScale;
            this.app.applyVisualFontSize();
            this.app.setupTextWorld();
            this.app.lockedLines = [];
            this.app.lastLockedLineCount = 0;
            this.app.updateLines();
            this.app.render();
        } else {
            this.app.recalcZoom();
            this.animation.wake();
        }
    }
}
