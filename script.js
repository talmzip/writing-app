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
    ZOOM_TRANSITION_MS: 350,
    ZOOM_EASING: 'cubic-bezier(0.25, 0.1, 0.25, 1.0)',
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
    // Smooth zoom momentum
    ZOOM_ACCELERATION: 0.015,
    ZOOM_DECAY: 0.98,
    ZOOM_MIN_VELOCITY: 0.000002,
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
        this.textWorldWidth = 0;
        this.scaleStart = 1;
        this.scaleEnd = 1;

        // Smooth fade momentum
        this.fadeVelocity = 0;
        this.fadeCurrentHeight = 0;
        this.fadeTargetHeight = 0;
        this.fadeAnimationId = null;

        // Smooth zoom momentum
        this.zoomVelocity = 0;
        this.zoomTargetScale = 1;
        this.zoomAnimationId = null;

        this.init();
    }

    init() {
        this.measureFont();
        this.updateViewportSize();
        this.computeZoomScales();
        this.currentScale = this.scaleStart;
        this.zoomTargetScale = this.scaleStart;
        this.setupTextWorld();
        this.updateTextWorldWidth();
        this.setupEventListeners();
        this.render();
        this.focusInput();
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
        this.viewport.style.height = this.viewportH + 'px';
    }

    computeZoomScales() {
        const vw = this.viewportW;
        const vh = this.viewportH;
        const cw = this.charW;
        const lh = this.lineH;

        this.scaleStart = Math.min(1.0, Math.sqrt((vw * vh) / (CONFIG.ZOOM_START_CHARS * cw * lh)));
        this.scaleEnd = Math.min(1.0, Math.sqrt((vw * vh) / (CONFIG.ZOOM_END_CHARS * cw * lh)));
    }

    setupTextWorld() {
        this.textDisplay.style.fontFamily = CONFIG.FONT_FAMILY;
        this.textDisplay.style.fontSize = CONFIG.BASE_FONT_SIZE + 'px';
        this.textDisplay.style.lineHeight = String(CONFIG.LINE_HEIGHT);
    }

    updateTextWorldWidth() {
        // Width tracks current scale so text always fills the visible area
        const scale = this.currentScale;
        const visibleWidth = this.viewportW / scale;
        this.textWorldWidth = visibleWidth - 40;
        this.textDisplay.style.width = this.textWorldWidth + 'px';
        this.textWorld.style.width = (this.textWorldWidth + 40) + 'px';
    }

    setupEventListeners() {
        this.hiddenInput.addEventListener('input', () => this.handleInput());
        this.hiddenInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') this.handleEnter(e);
        });

        // Focus management — click anywhere to focus the textarea
        this.viewport.addEventListener('click', () => this.focusInput());
        this.viewport.addEventListener('touchstart', (e) => {
            e.preventDefault();
            this.focusInput();
        });
        // Refocus on blur, but not if sessions screen is open
        this.hiddenInput.addEventListener('blur', () => {
            setTimeout(() => {
                if (document.getElementById('sessions-screen').classList.contains('hidden')) {
                    this.focusInput();
                }
            }, 100);
        });

        // Resize
        const resizeHandler = () => this.handleResize();
        if (window.visualViewport) {
            window.visualViewport.addEventListener('resize', resizeHandler);
        }
        window.addEventListener('resize', resizeHandler);

        // Sessions toggle
        document.getElementById('sessions-toggle').addEventListener('click', (e) => {
            e.stopPropagation();
            this.saveCurrentSession();
            sessionsUI.show();
        });
    }

    focusInput() {
        this.hiddenInput.focus({ preventScroll: true });
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

    getScale() {
        // Continuous zoom: interpolate between scaleStart and scaleEnd
        // based on how much text has been written
        const charCount = this.text.length;
        const t = Math.min(charCount / CONFIG.ZOOM_RAMP_CHARS, 1.0);
        // Ease-out curve for smooth deceleration
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

    render() {
        this.zoomTargetScale = this.getScale();

        const escaped = this.escapeHtml(this.text);
        this.textDisplay.innerHTML = escaped + '<span id="cursor-anchor">\u200B</span>';

        this.positionCursor();
        // Kick zoom velocity toward target
        const diff = this.zoomTargetScale - this.currentScale;
        this.zoomVelocity += diff * CONFIG.ZOOM_ACCELERATION;
        this.startZoomAnimation();
        this.updateFade();
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

        const anchor = document.getElementById('cursor-anchor');
        if (!anchor) return;

        const cursorY = anchor.offsetTop;
        const cursorViewportY = cursorY * scale;
        const targetY = this.viewportH * CONFIG.CURSOR_VERTICAL_POSITION;
        const offsetY = targetY - cursorViewportY;
        const clampedOffsetY = Math.min(0, offsetY);

        let transform;
        if (this.isRTL) {
            // For RTL: position text-world so its right edge aligns with viewport right edge
            const textWorldTotalWidth = this.textWorldWidth + 40;
            const offsetX = this.viewportW - (textWorldTotalWidth * scale);
            transform = `translateX(${offsetX}px) translateY(${clampedOffsetY}px) scale(${scale})`;
        } else {
            transform = `translateY(${clampedOffsetY}px) scale(${scale})`;
        }

        this.textWorld.style.transform = transform;
        this.currentOffsetY = clampedOffsetY;
    }

    startZoomAnimation() {
        if (this.zoomAnimationId) return;
        const tick = () => {
            this.zoomVelocity *= CONFIG.ZOOM_DECAY;
            this.currentScale += this.zoomVelocity;
            this.updateTextWorldWidth();
            this.updateTransform();
            this.updateFade();
            // Stop when settled
            if (Math.abs(this.zoomVelocity) < CONFIG.ZOOM_MIN_VELOCITY &&
                Math.abs(this.currentScale - this.zoomTargetScale) < 0.0005) {
                this.currentScale = this.zoomTargetScale;
                this.updateTransform();
                this.updateFade();
                this.zoomAnimationId = null;
                return;
            }
            this.zoomAnimationId = requestAnimationFrame(tick);
        };
        this.zoomAnimationId = requestAnimationFrame(tick);
    }

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
        this.updateViewportSize();
        this.computeZoomScales();
        this.currentScale = this.getScale();
        this.zoomTargetScale = this.currentScale;
        this.setupTextWorld();
        this.updateTextWorldWidth();
        this.render();
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
