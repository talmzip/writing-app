// ── Configuration ──
// All tunable values in one place. Adjust these to change the feel.

const CONFIG = {
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
    ZOOM_LERP: 0.08,             // simple lerp — no momentum, no oscillation
    ZOOM_MIN_DIFF: 0.0001,
    // Stretch lerp for locked lines
    STRETCH_LERP: 0.008,         // very slow — ~2-3s settle, peripheral vision only
    // Viewport resize lerp (keyboard open/close)
    VIEWPORT_LERP: 0.08,         // smooth with gentle bounce
    VIEWPORT_BOUNCE: 0.12,       // overshoot amount (fraction of remaining distance)
    // Responsive zoom: reference viewport area (desktop ~1920x1080)
    ZOOM_REF_AREA: 1920 * 1080,
    // Line break mode: 'squeeze' (default), 'justified', or 'natural'
    LINE_BREAK_MODE: 'squeeze',
    // Squeeze: minimum char width ratio before safety-valve mid-word break
    SQUEEZE_MIN_RATIO: 0.5,
};


// ── Writing App ──

class WritingApp {
    constructor() {
        this.viewport = document.getElementById('viewport');
        this.fadeOverlay = document.getElementById('fade-overlay');
        this.textWorld = document.getElementById('text-world');
        this.textDisplay = document.getElementById('text-display');
        this.cursorEl = document.getElementById('cursor');
        this.hiddenInput = document.getElementById('hidden-input');

        this.text = '';
        this.wordCount = 0;
        this.isRTL = false;
        this.currentOffsetY = 0;
        this.currentScale = 1;
        this.sessionStartTime = Date.now();
        this.autosaveTimer = null;

        this.charW = 0;
        this.lineH = 0;
        this.viewportW = 0;
        this.viewportH = 0;
        this.renderedViewportH = 0; // lerps toward viewportH for smooth keyboard transitions
        this.scaleStart = 1;
        this.scaleEnd = 1;

        // Line state
        this.lockedLines = []; // { text, birthScale, hasNewline }
        this.activeLine = '';

        // Smooth fade momentum
        this.fadeVelocity = 0;
        this.fadeCurrentHeight = 0;
        this.fadeTargetHeight = 0;
        this.fadeAnimationId = null;

        // Smooth zoom lerp
        this.zoomTargetScale = 1;
        this.animationId = null;

        // Reading mode (keyboard closed)
        this.isReadingMode = false;
        this.viewportVelocity = 0;

        this.init();
    }

    init() {
        this.measureFont();
        this.updateViewportSize();
        this.renderedViewportH = this.viewportH; // start in sync
        this.computeZoomScales();
        this.currentScale = this.scaleStart;
        this.zoomTargetScale = this.scaleStart;
        this.setupTextWorld();
        this.setupEventListeners();
        this.render();
        this.setupPromptOverlay();
        this.startAutosave();
    }

    measureFont() {
        const temp = document.createElement('span');
        temp.style.cssText = `
            position: absolute; visibility: hidden;
            font-family: ${CONFIG.FONT_FAMILY};
            font-size: ${CONFIG.BASE_FONT_SIZE}px;
            white-space: pre; line-height: ${CONFIG.LINE_HEIGHT};
        `;
        temp.textContent = 'M';
        document.body.appendChild(temp);
        this.charW = temp.getBoundingClientRect().width;
        this.lineH = temp.getBoundingClientRect().height;
        document.body.removeChild(temp);
    }

    updateViewportSize() {
        if (window.visualViewport) {
            this.viewportW = window.visualViewport.width;
            this.viewportH = window.visualViewport.height;
        } else {
            this.viewportW = window.innerWidth;
            this.viewportH = window.innerHeight;
        }
        this.viewport.style.width = this.viewportW + 'px';
        // Height set via renderedViewportH (lerped) — only snap on init
        if (this.renderedViewportH === 0) {
            this.viewport.style.height = this.viewportH + 'px';
        }
    }

    computeZoomScales() {
        const vw = this.viewportW;
        const vh = this.viewportH;
        const cw = this.charW;
        const lh = this.lineH;

        // Scale ZOOM_END_CHARS by viewport area relative to desktop reference
        const areaRatio = (vw * vh) / CONFIG.ZOOM_REF_AREA;
        const endChars = Math.round(CONFIG.ZOOM_END_CHARS * Math.max(0.4, Math.min(1.0, areaRatio)));

        this.scaleStart = Math.min(1.0, Math.sqrt((vw * vh) / (CONFIG.ZOOM_START_CHARS * cw * lh)));
        this.scaleEnd = Math.min(1.0, Math.sqrt((vw * vh) / (endChars * cw * lh)));
    }

    getCharsPerLine(scale) {
        const width = (this.viewportW / scale) - 40;
        return Math.max(1, Math.floor(width / this.charW));
    }

    setupTextWorld() {
        this.textDisplay.style.fontFamily = CONFIG.FONT_FAMILY;
        this.textDisplay.style.fontSize = CONFIG.BASE_FONT_SIZE + 'px';
        this.textDisplay.style.lineHeight = String(CONFIG.LINE_HEIGHT);
        // Fixed width: accommodate max stretch at scaleEnd
        const maxWidth = this.viewportW / this.scaleEnd;
        this.textDisplay.style.width = maxWidth + 'px';
        this.textWorld.style.width = (maxWidth + 40) + 'px';
    }

    setupEventListeners() {
        this.hiddenInput.addEventListener('input', () => this.handleInput());
        this.hiddenInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') this.handleEnter(e);
        });

        // Tap to resume writing from reading mode, or refocus in writing mode
        this.viewport.addEventListener('click', () => {
            if (this.isReadingMode) {
                this.enterWritingMode();
            } else {
                this.focusInput();
            }
        });
        this.viewport.addEventListener('touchstart', (e) => {
            if (!this.isReadingMode) {
                e.preventDefault();
                this.focusInput();
            }
            // In reading mode, let touch events through for native scrolling
        });

        // On blur, check if keyboard was dismissed → enter reading mode
        this.hiddenInput.addEventListener('blur', () => {
            setTimeout(() => {
                const promptOpen = document.getElementById('prompt-overlay');
                if (promptOpen) return;
                // If viewport height grew, keyboard was dismissed
                const currentH = window.visualViewport ? window.visualViewport.height : window.innerHeight;
                if (currentH > this.renderedViewportH + 50) {
                    this.enterReadingMode();
                }
            }, 100);
        });

        // Resize
        const resizeHandler = () => this.handleResize();
        if (window.visualViewport) {
            window.visualViewport.addEventListener('resize', resizeHandler);
        }
        window.addEventListener('resize', resizeHandler);

        // Dev toggle: Ctrl+Shift+J switches line-break mode
        document.addEventListener('keydown', (e) => {
            if (e.ctrlKey && e.shiftKey && e.key === 'J') {
                e.preventDefault();
                const modes = ['squeeze', 'justified', 'natural'];
                CONFIG.LINE_BREAK_MODE = modes[(modes.indexOf(CONFIG.LINE_BREAK_MODE) + 1) % modes.length];
                this.lockedLines = [];
                this.updateLines();
                this.fullRender();
                this.positionCursor();
                this.updateTransform();
                console.log('Line break mode:', CONFIG.LINE_BREAK_MODE);
            }
        });

        // Sessions toggle
        document.getElementById('sessions-toggle').addEventListener('click', (e) => {
            e.stopPropagation();
            this.saveCurrentSession();
            sessionsUI.show();
        });
    }

    setupPromptOverlay() {
        const overlay = document.getElementById('prompt-overlay');
        if (!overlay) {
            this.focusInput();
            return;
        }
        // Hide cursor until activated
        this.cursorEl.style.display = 'none';
        // Tap/click anywhere — focus textarea (satisfies mobile user-activation), show cursor, fade out prompt
        const activate = (e) => {
            e.preventDefault();
            this.hiddenInput.focus({ preventScroll: true });
            this.cursorEl.style.display = '';
            overlay.classList.add('hidden');
            // Remove from DOM after fade
            setTimeout(() => overlay.remove(), 300);
        };
        overlay.addEventListener('click', activate);
        overlay.addEventListener('touchend', activate);
    }

    focusInput() {
        this.hiddenInput.focus({ preventScroll: true });
    }

    enterReadingMode() {
        this.isReadingMode = true;
        this.cursorEl.style.display = 'none';
        // Enable native scrolling
        this.viewport.style.overflow = 'auto';
        this.viewport.style.webkitOverflowScrolling = 'touch';
    }

    enterWritingMode() {
        this.isReadingMode = false;
        this.cursorEl.style.display = '';
        // Disable native scrolling
        this.viewport.style.overflow = 'hidden';
        // Refocus textarea (user gesture context)
        this.hiddenInput.focus({ preventScroll: true });
        // Viewport will resize when keyboard opens — animation handles it
    }

    handleInput() {
        let text = this.hiddenInput.value;

        // Collapse consecutive newlines into one
        text = text.replace(/\n{2,}/g, '\n');

        if (text !== this.hiddenInput.value) {
            this.hiddenInput.value = text;
        }

        this.text = text;
        this.wordCount = this.countWords();
        this.detectRTL();
        this.updateLines();
        this.render();
    }

    handleEnter(e) {
        if (this.text.endsWith('\n')) {
            e.preventDefault();
        }
    }

    countWords() {
        const trimmed = this.text.trim();
        if (!trimmed) return 0;
        return trimmed.split(/\s+/).length;
    }

    // ── Line Splitting ──

    getLockedCharCount() {
        let n = 0;
        for (const line of this.lockedLines) {
            n += line.text.length + (line.hasNewline ? 1 : 0) + (line.hasDropSpace ? 1 : 0);
        }
        return n;
    }

    updateLines() {
        const targetScale = this.getScale();
        const cpl = this.getCharsPerLine(targetScale);

        // Validate: if text was edited within locked region (select-all, paste), reset
        let consumed = this.getLockedCharCount();
        if (consumed > this.text.length) {
            // Backspace past locked boundary — pop lines
            while (this.lockedLines.length > 0 && consumed > this.text.length) {
                const popped = this.lockedLines.pop();
                consumed -= popped.text.length + (popped.hasNewline ? 1 : 0) + (popped.hasDropSpace ? 1 : 0);
            }
        } else if (this.lockedLines.length > 0) {
            // Spot-check last locked line still matches the text
            const last = this.lockedLines[this.lockedLines.length - 1];
            const end = consumed - (last.hasNewline ? 1 : 0) - (last.hasDropSpace ? 1 : 0);
            const start = end - last.text.length;
            if (start < 0 || this.text.slice(start, end) !== last.text) {
                this.lockedLines = [];
                consumed = 0;
            }
        }

        // Process remaining text
        const remaining = this.text.slice(consumed);

        if (CONFIG.LINE_BREAK_MODE === 'squeeze') {
            this.processRemainingSqueeze(remaining, cpl, targetScale);
        } else {
            this.processRemainingFlow(remaining, cpl, targetScale);
        }
    }

    makeLine(text, birthScale, hasNewline, hasDropSpace) {
        // Start at whatever the active line's spacing was (0 or squeeze)
        const currentSpacing = this.getActiveLineSpacing(birthScale);
        return { text, birthScale, hasNewline, hasDropSpace, currentSpacing };
    }

    processRemainingSqueeze(remaining, cpl, birthScale) {
        const refWidth = (this.viewportW / birthScale) - 40;
        const maxChars = Math.floor(refWidth / (this.charW * CONFIG.SQUEEZE_MIN_RATIO));
        let lineStart = 0;

        for (let i = 0; i < remaining.length; i++) {
            const ch = remaining[i];
            const lineLen = i - lineStart + 1;

            if (ch === '\n') {
                this.lockedLines.push(this.makeLine(
                    remaining.slice(lineStart, i), birthScale, true, false
                ));
                lineStart = i + 1;
                continue;
            }

            if (ch === ' ') {
                const textLen = i - lineStart;
                if (textLen >= cpl - 1) {
                    this.lockedLines.push(this.makeLine(
                        remaining.slice(lineStart, i), birthScale, false, true
                    ));
                    lineStart = i + 1;
                    continue;
                }
            }

            // Safety valve: force mid-word break at max squeeze
            if (lineLen > maxChars) {
                this.lockedLines.push(this.makeLine(
                    remaining.slice(lineStart, i), birthScale, false, false
                ));
                lineStart = i;
            }
        }

        this.activeLine = remaining.slice(lineStart);
    }

    processRemainingFlow(remaining, cpl, birthScale) {
        const paragraphs = remaining.split('\n');

        for (let p = 0; p < paragraphs.length - 1; p++) {
            const lines = this.wrapParagraph(paragraphs[p], cpl);
            for (let i = 0; i < lines.length; i++) {
                this.lockedLines.push(this.makeLine(
                    lines[i], birthScale, i === lines.length - 1, false
                ));
            }
        }

        const lastPara = paragraphs[paragraphs.length - 1];
        const lastLines = this.wrapParagraph(lastPara, cpl);
        for (let i = 0; i < lastLines.length - 1; i++) {
            this.lockedLines.push(this.makeLine(
                lastLines[i], birthScale, false, false
            ));
        }
        this.activeLine = lastLines[lastLines.length - 1] || '';
    }

    wrapParagraph(para, cpl) {
        if (para === '') return [''];

        if (CONFIG.LINE_BREAK_MODE === 'justified') {
            const lines = [];
            for (let i = 0; i < para.length; i += cpl) {
                lines.push(para.slice(i, i + cpl));
            }
            return lines;
        }

        // Natural word-boundary wrapping
        const lines = [];
        let remaining = para;
        while (remaining.length > cpl) {
            let breakAt = remaining.lastIndexOf(' ', cpl);
            if (breakAt <= 0) breakAt = cpl;
            lines.push(remaining.slice(0, breakAt));
            remaining = remaining.slice(breakAt).replace(/^ /, '');
        }
        lines.push(remaining);
        return lines;
    }

    // ── Zoom & Stretch ──

    getScale() {
        const charCount = this.text.length;
        const t = Math.min(charCount / CONFIG.ZOOM_RAMP_CHARS, 1.0);
        const eased = 1 - Math.pow(1 - t, 2);
        return this.scaleStart + (this.scaleEnd - this.scaleStart) * eased;
    }

    detectRTL() {
        const hasHebrew = /[\u0590-\u05FF]/.test(this.text);
        if (hasHebrew !== this.isRTL) {
            this.isRTL = hasHebrew;
            this.textDisplay.classList.toggle('rtl', this.isRTL);
            this.hiddenInput.dir = this.isRTL ? 'rtl' : 'ltr';
        }
    }

    // ── Rendering ──

    render() {
        this.zoomTargetScale = this.getScale();

        this.fullRender();
        this.positionCursor();

        // Always start animation — handles both zoom lerp and stretch lerp
        this.startAnimation();
        this.updateFade();
    }

    fullRender() {
        let html = '';
        for (const line of this.lockedLines) {
            html += `<div class="line" style="letter-spacing:${line.currentSpacing}px">` + (this.escapeHtml(line.text) || '&nbsp;') + '</div>';
        }
        const activeLS = this.getActiveLineSpacing(this.currentScale);
        html += `<div class="line active" style="letter-spacing:${activeLS}px">` + this.escapeHtml(this.activeLine) + '<span id="cursor-anchor">\u200B</span></div>';
        this.textDisplay.innerHTML = html;
    }

    getActiveLineSpacing(scale) {
        if (CONFIG.LINE_BREAK_MODE !== 'squeeze') return 0;
        const n = this.activeLine.length;
        if (n === 0) return 0;
        const cpl = this.getCharsPerLine(scale);
        if (n <= cpl) return 0;
        const refWidth = (this.viewportW / scale) - 40;
        return Math.max(refWidth / n - this.charW, -(this.charW * (1 - CONFIG.SQUEEZE_MIN_RATIO)));
    }

    escapeHtml(text) {
        return text
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;');
    }

    positionCursor() {
        const anchor = document.getElementById('cursor-anchor');
        if (!anchor) return;

        this.cursorEl.style.left = anchor.offsetLeft + 'px';
        this.cursorEl.style.top = anchor.offsetTop + 'px';
        this.cursorEl.style.height = this.lineH + 'px';
    }

    updateTransform() {
        const scale = this.currentScale;
        const vh = this.renderedViewportH;

        const anchor = document.getElementById('cursor-anchor');
        if (!anchor) return;

        const cursorY = anchor.offsetTop;
        const cursorViewportY = cursorY * scale;
        const targetY = vh * CONFIG.CURSOR_VERTICAL_POSITION;
        const offsetY = targetY - cursorViewportY;
        const clampedOffsetY = Math.min(0, offsetY);

        let transform;
        if (this.isRTL) {
            const textWorldTotalWidth = parseFloat(this.textWorld.style.width);
            const offsetX = this.viewportW - (textWorldTotalWidth * scale);
            transform = `translateX(${offsetX}px) translateY(${clampedOffsetY}px) scale(${scale})`;
        } else {
            transform = `translateY(${clampedOffsetY}px) scale(${scale})`;
        }

        this.textWorld.style.transform = transform;
        this.currentOffsetY = clampedOffsetY;
    }

    // ── Zoom Animation ──

    startAnimation() {
        if (this.animationId) return;
        const tick = () => {
            // Zoom: simple lerp toward target
            this.currentScale += (this.zoomTargetScale - this.currentScale) * CONFIG.ZOOM_LERP;
            const zoomSettled = Math.abs(this.currentScale - this.zoomTargetScale) < CONFIG.ZOOM_MIN_DIFF;
            if (zoomSettled) this.currentScale = this.zoomTargetScale;

            // Viewport height: spring lerp with gentle bounce
            const viewportDiff = this.viewportH - this.renderedViewportH;
            this.viewportVelocity += viewportDiff * CONFIG.VIEWPORT_LERP;
            this.viewportVelocity *= (1 - CONFIG.VIEWPORT_BOUNCE);
            this.renderedViewportH += this.viewportVelocity;
            const viewportSettled = Math.abs(viewportDiff) < 1 && Math.abs(this.viewportVelocity) < 0.5;
            if (viewportSettled) {
                this.renderedViewportH = this.viewportH;
                this.viewportVelocity = 0;
            }
            this.viewport.style.height = this.renderedViewportH + 'px';

            const stretchSettled = this.applyStretch();
            this.updateTransform();
            this.updateFade();

            if (zoomSettled && stretchSettled && viewportSettled) {
                this.animationId = null;
                return;
            }
            this.animationId = requestAnimationFrame(tick);
        };
        this.animationId = requestAnimationFrame(tick);
    }

    applyStretch() {
        const scale = this.currentScale;
        const targetWidth = (this.viewportW / scale) - 40;
        // Fast lerp during keyboard animation, slow lerp during normal writing
        const viewportAnimating = Math.abs(this.renderedViewportH - this.viewportH) > 1 || Math.abs(this.viewportVelocity) > 0.5;
        const lerpFactor = viewportAnimating ? 0.15 : CONFIG.STRETCH_LERP;
        let allSettled = true;

        const children = this.textDisplay.children;
        for (let i = 0; i < this.lockedLines.length && i < children.length; i++) {
            const line = this.lockedLines[i];
            const n = line.text.length;
            // Enter lines stay at 0, others stretch to fill current viewport width
            const target = (line.hasNewline || n === 0) ? 0 : targetWidth / n - this.charW;
            line.currentSpacing += (target - line.currentSpacing) * lerpFactor;
            if (Math.abs(line.currentSpacing - target) < 0.05) {
                line.currentSpacing = target;
            } else {
                allSettled = false;
            }
            children[i].style.letterSpacing = line.currentSpacing + 'px';
        }
        // Active line: 0 stretch, or squeeze if overflowing in squeeze mode
        if (children.length > 0) {
            const activeLS = this.getActiveLineSpacing(scale);
            children[children.length - 1].style.letterSpacing = activeLS + 'px';
        }
        return allSettled;
    }

    // ── Fade ──

    updateFade() {
        if (this.currentOffsetY < -1) {
            const fadeHeight = this.lineH * this.currentScale * CONFIG.FADE_LINE_FRACTION;
            this.fadeTargetHeight = Math.max(fadeHeight, 20);
        } else {
            this.fadeTargetHeight = 0;
        }
        // Kick velocity toward target
        const diff = this.fadeTargetHeight - this.fadeCurrentHeight;
        this.fadeVelocity += diff * CONFIG.FADE_ACCELERATION;
        this.startFadeAnimation();
    }

    startFadeAnimation() {
        if (this.fadeAnimationId) return;
        const tick = () => {
            this.fadeVelocity *= CONFIG.FADE_DECAY;
            this.fadeCurrentHeight += this.fadeVelocity;
            // Clamp to zero
            if (this.fadeCurrentHeight < 0.5 && this.fadeTargetHeight === 0) {
                this.fadeCurrentHeight = 0;
            }
            this.fadeOverlay.style.height = this.fadeCurrentHeight + 'px';
            // Stop when settled
            if (Math.abs(this.fadeVelocity) < CONFIG.FADE_MIN_VELOCITY &&
                Math.abs(this.fadeCurrentHeight - this.fadeTargetHeight) < 1) {
                this.fadeCurrentHeight = this.fadeTargetHeight;
                this.fadeOverlay.style.height = this.fadeCurrentHeight + 'px';
                this.fadeAnimationId = null;
                return;
            }
            this.fadeAnimationId = requestAnimationFrame(tick);
        };
        this.fadeAnimationId = requestAnimationFrame(tick);
    }

    handleResize() {
        const oldW = this.viewportW;
        this.updateViewportSize();
        this.computeZoomScales();
        this.zoomTargetScale = this.getScale();

        // Width change (orientation, window resize) — need to reset layout
        if (this.viewportW !== oldW) {
            this.renderedViewportH = this.viewportH;
            this.currentScale = this.zoomTargetScale;
            this.setupTextWorld();
            this.lockedLines = [];
            this.updateLines();
            this.render();
        } else {
            // Height-only change (keyboard open/close) — animate smoothly
            this.startAnimation();
        }
    }

    // ── Session Persistence ──

    startAutosave() {
        this.autosaveTimer = setInterval(() => {
            this.saveCurrentSession();
        }, CONFIG.AUTOSAVE_INTERVAL_MS);
    }

    saveCurrentSession() {
        if (this.wordCount < CONFIG.MIN_WORDS_TO_SAVE) return;

        const sessions = SessionStorage.loadAll();
        const existingIndex = sessions.findIndex(s => s.startTime === this.sessionStartTime);

        const sessionData = {
            startTime: this.sessionStartTime,
            lastModified: Date.now(),
            text: this.text,
            wordCount: this.wordCount,
        };

        if (existingIndex >= 0) {
            sessions[existingIndex] = sessionData;
        } else {
            sessions.unshift(sessionData);
        }

        SessionStorage.saveAll(sessions);
    }
}


// ── Session Storage ──

const SessionStorage = {
    KEY: 'writing-app-sessions',

    loadAll() {
        try {
            const raw = localStorage.getItem(this.KEY);
            return raw ? JSON.parse(raw) : [];
        } catch {
            return [];
        }
    },

    saveAll(sessions) {
        try {
            localStorage.setItem(this.KEY, JSON.stringify(sessions));
        } catch {
            // Storage full or unavailable
        }
    },

    deleteSession(startTime) {
        const sessions = this.loadAll().filter(s => s.startTime !== startTime);
        this.saveAll(sessions);
        return sessions;
    },
};


// ── Sessions UI ──

const sessionsUI = {
    screen: null,
    list: null,
    detail: null,
    detailText: null,
    detailDate: null,

    init() {
        this.screen = document.getElementById('sessions-screen');
        this.list = document.getElementById('sessions-list');
        this.detail = document.getElementById('session-detail');
        this.detailText = document.getElementById('session-detail-text');
        this.detailDate = document.getElementById('session-detail-date');

        document.getElementById('back-to-write').addEventListener('click', () => this.hide());
        document.getElementById('back-to-list').addEventListener('click', () => this.hideDetail());
        document.getElementById('delete-session').addEventListener('click', () => this.deleteCurrent());
    },

    show() {
        this.screen.classList.remove('hidden');
        this.detail.classList.add('hidden');
        this.renderList();
    },

    hide() {
        this.screen.classList.add('hidden');
        document.getElementById('hidden-input').focus({ preventScroll: true });
    },

    renderList() {
        const sessions = SessionStorage.loadAll();

        if (sessions.length === 0) {
            this.list.innerHTML = '<div class="sessions-empty">No past sessions yet.<br>Start writing and your sessions will appear here.</div>';
            return;
        }

        this.list.innerHTML = sessions.map(session => {
            const date = new Date(session.startTime);
            const dateStr = this.formatDate(date);
            const preview = session.text.slice(0, 120).replace(/\n/g, ' ');
            const words = session.wordCount || 0;
            const duration = session.lastModified ? this.formatDuration(session.lastModified - session.startTime) : '';

            return `
                <div class="session-card" data-start="${session.startTime}">
                    <div class="session-card-date">${dateStr}</div>
                    <div class="session-card-preview">${this.escapeHtml(preview)}</div>
                    <div class="session-card-meta">${words} words${duration ? ' · ' + duration : ''}</div>
                </div>
            `;
        }).join('');

        this.list.querySelectorAll('.session-card').forEach(card => {
            card.addEventListener('click', () => {
                const startTime = parseInt(card.dataset.start);
                this.showDetail(startTime);
            });
        });
    },

    showDetail(startTime) {
        const sessions = SessionStorage.loadAll();
        const session = sessions.find(s => s.startTime === startTime);
        if (!session) return;

        this.currentDetailStartTime = startTime;
        this.detailDate.textContent = this.formatDate(new Date(session.startTime));
        this.detailText.textContent = session.text;
        this.detail.classList.remove('hidden');
    },

    hideDetail() {
        this.detail.classList.add('hidden');
        this.currentDetailStartTime = null;
    },

    deleteCurrent() {
        if (!this.currentDetailStartTime) return;
        SessionStorage.deleteSession(this.currentDetailStartTime);
        this.hideDetail();
        this.renderList();
    },

    formatDate(date) {
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const sessionDay = new Date(date.getFullYear(), date.getMonth(), date.getDate());
        const diffDays = Math.floor((today - sessionDay) / 86400000);

        const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

        if (diffDays === 0) return 'Today, ' + timeStr;
        if (diffDays === 1) return 'Yesterday, ' + timeStr;
        if (diffDays < 7) return diffDays + ' days ago, ' + timeStr;

        return date.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' }) + ', ' + timeStr;
    },

    formatDuration(ms) {
        const minutes = Math.floor(ms / 60000);
        if (minutes < 1) return 'under a minute';
        if (minutes === 1) return '1 minute';
        if (minutes < 60) return minutes + ' minutes';
        const hours = Math.floor(minutes / 60);
        const remainingMin = minutes % 60;
        if (hours === 1) return remainingMin > 0 ? `1h ${remainingMin}m` : '1 hour';
        return remainingMin > 0 ? `${hours}h ${remainingMin}m` : `${hours} hours`;
    },

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    },
};


// ── Boot ──

document.addEventListener('DOMContentLoaded', () => {
    sessionsUI.init();
    new WritingApp();
});
