// Core writing experience: input, rendering, zoom, cursor, lines, sessions.

import { CONFIG } from './config.js';
import { SessionStorage } from './session-storage.js';

export class WritingApp {
    constructor(animation) {
        this.animation = animation;

        this.viewport = document.getElementById('viewport');
        this.fadeOverlay = document.getElementById('fade-overlay');
        this.textWorld = document.getElementById('text-world');
        this.textDisplay = document.getElementById('text-display');
        this.cursorEl = document.getElementById('cursor');
        this.hiddenInput = document.getElementById('hidden-input');
        this.newSessionBtn = document.getElementById('new-session-btn');

        this.text = '';
        this.wordCount = 0;
        this.isRTL = false;
        this.currentOffsetY = 0;
        this.currentScale = 1;
        this.zoomTargetScale = 1;
        this.sessionStartTime = Date.now();
        this.autosaveTimer = null;
        this.inactivityTimer = null;

        this.charW = 0;
        this.lineH = 0;
        this.viewportW = 0;
        this.viewportH = 0;
        this.renderedViewportH = 0;
        this.scaleStart = 1;
        this.scaleEnd = 1;

        // Line state
        this.lockedLines = [];
        this.activeLine = '';
        this.lastLockedLineCount = 0;

        // Smooth fade momentum
        this.fadeVelocity = 0;
        this.fadeCurrentHeight = 0;
        this.fadeTargetHeight = 0;

        // Viewport spring
        this.viewportVelocity = 0;

        // Mode — set by ModeManager
        this.mode = 'prompt';

        this.init();
    }

    init() {
        this.measureFont();
        this.updateViewportSize();
        this.renderedViewportH = this.viewportH;
        this.computeZoomScales();
        this.currentScale = this.scaleStart;
        this.zoomTargetScale = this.scaleStart;
        this.setupTextWorld();
        this.registerAnimations();
        this.render();
        this.startAutosave();
    }

    // ── Setup ──

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
        if (this.renderedViewportH === 0) {
            this.viewport.style.height = this.viewportH + 'px';
        }
    }

    computeZoomScales() {
        const vw = this.viewportW;
        const vh = this.viewportH;
        const cw = this.charW;
        const lh = this.lineH;

        const areaRatio = (vw * vh) / CONFIG.ZOOM_REF_AREA;
        const endChars = Math.round(CONFIG.ZOOM_END_CHARS * Math.max(0.4, Math.min(1.0, areaRatio)));

        this.scaleStart = Math.min(1.0, Math.sqrt((vw * vh) / (CONFIG.ZOOM_START_CHARS * cw * lh)));
        this.scaleEnd = Math.min(1.0, Math.sqrt((vw * vh) / (endChars * cw * lh)));
    }

    getCharsPerLine(scale) {
        const width = this.viewportW - 40;
        return Math.max(1, Math.floor(width / (this.charW * scale)));
    }

    setupTextWorld() {
        this.textDisplay.style.fontFamily = CONFIG.FONT_FAMILY;
        this.textDisplay.style.lineHeight = String(CONFIG.LINE_HEIGHT);
        this.applyVisualFontSize();
        this.textDisplay.style.width = (this.viewportW - 40) + 'px';
        this.textWorld.style.width = this.viewportW + 'px';
    }

    applyVisualFontSize() {
        const fontSize = CONFIG.BASE_FONT_SIZE * this.currentScale;
        this.textDisplay.style.fontSize = fontSize + 'px';
    }

    focusInput() {
        this.hiddenInput.focus({ preventScroll: true });
    }

    // ── Input ──

    handleInput() {
        let text = this.hiddenInput.value;
        text = text.replace(/\n{2,}/g, '\n');
        if (text !== this.hiddenInput.value) {
            this.hiddenInput.value = text;
        }

        this.text = text;
        this.wordCount = this.countWords();
        this.detectRTL();
        this.zoomTargetScale = this.getScale();
        this.updateLines();
        this.render();
        this.resetInactivityTimer();
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

    detectRTL() {
        const hasHebrew = /[\u0590-\u05FF]/.test(this.text);
        if (hasHebrew !== this.isRTL) {
            this.isRTL = hasHebrew;
            this.textDisplay.classList.toggle('rtl', this.isRTL);
            this.hiddenInput.dir = this.isRTL ? 'rtl' : 'ltr';
        }
    }

    // ── Inactivity / New Session ──

    resetInactivityTimer() {
        this.newSessionBtn.classList.remove('visible');
        clearTimeout(this.inactivityTimer);
        if (this.text.length > 0) {
            this.inactivityTimer = setTimeout(() => {
                if (this.mode !== 'writing') return;
                this.positionNewSessionBtn();
                this.newSessionBtn.classList.add('visible');
            }, 2500);
        }
    }

    positionNewSessionBtn() {
        const anchor = document.getElementById('cursor-anchor');
        if (!anchor) return;
        const visualLineH = this.lineH * this.currentScale;
        const cursorScreenY = anchor.offsetTop + this.currentOffsetY;
        const gapTop = cursorScreenY + visualLineH;
        const gapBottom = this.renderedViewportH;
        const btnY = gapTop + (gapBottom - gapTop) / 2;
        this.newSessionBtn.style.top = btnY + 'px';
        this.newSessionBtn.style.left = '50%';
        this.newSessionBtn.style.transform = 'translateX(-50%)';
    }

    startNewSession() {
        this.saveCurrentSession();
        this.newSessionBtn.classList.remove('visible');
        clearTimeout(this.inactivityTimer);
        this.text = '';
        this.hiddenInput.value = '';
        this.wordCount = 0;
        this.lockedLines = [];
        this.activeLine = '';
        this.lastLockedLineCount = 0;
        this.sessionStartTime = Date.now();
        this.currentScale = this.scaleStart;
        this.zoomTargetScale = this.scaleStart;
        this.applyVisualFontSize();
        this.render();
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

        let consumed = this.getLockedCharCount();
        if (consumed > this.text.length) {
            while (this.lockedLines.length > 0 && consumed > this.text.length) {
                const popped = this.lockedLines.pop();
                consumed -= popped.text.length + (popped.hasNewline ? 1 : 0) + (popped.hasDropSpace ? 1 : 0);
            }
        } else if (this.lockedLines.length > 0) {
            const last = this.lockedLines[this.lockedLines.length - 1];
            const end = consumed - (last.hasNewline ? 1 : 0) - (last.hasDropSpace ? 1 : 0);
            const start = end - last.text.length;
            if (start < 0 || this.text.slice(start, end) !== last.text) {
                this.lockedLines = [];
                consumed = 0;
            }
        }

        const remaining = this.text.slice(consumed);

        if (CONFIG.LINE_BREAK_MODE === 'squeeze') {
            this.processRemainingSqueeze(remaining, cpl, targetScale);
        } else {
            this.processRemainingFlow(remaining, cpl, targetScale);
        }
    }

    makeLine(text, birthScale, hasNewline, hasDropSpace) {
        const currentSpacing = this.getActiveLineSpacing(birthScale);
        return { text, birthScale, hasNewline, hasDropSpace, currentSpacing };
    }

    processRemainingSqueeze(remaining, cpl, birthScale) {
        const refWidth = this.viewportW - 40;
        const visualCharW = this.charW * birthScale;
        const maxChars = Math.floor(refWidth / (visualCharW * CONFIG.SQUEEZE_MIN_RATIO));
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

    // ── Zoom ──

    getScale() {
        const charCount = this.text.length;
        const t = Math.min(charCount / CONFIG.ZOOM_RAMP_CHARS, 1.0);
        const eased = 1 - Math.pow(1 - t, 2);
        return this.scaleStart + (this.scaleEnd - this.scaleStart) * eased;
    }

    // Recalculate zoom after resize or other external change
    recalcZoom() {
        this.computeZoomScales();
        this.zoomTargetScale = this.getScale();
    }

    // ── Rendering ──

    render() {
        this.incrementalRender();
        this.positionCursor();
        this.animation.wake();
    }

    incrementalRender() {
        const container = this.textDisplay;
        const oldCount = this.lastLockedLineCount;
        const newCount = this.lockedLines.length;

        // Incremental possible when: only new locked lines added, DOM structure intact
        const canIncremental = container.children.length > 0
            && newCount >= oldCount
            && container.children.length === oldCount + 1;

        if (!canIncremental) {
            this.fullRender();
            this.lastLockedLineCount = newCount;
            return;
        }

        // Insert new locked line divs before the active div (last child)
        const activeDiv = container.lastElementChild;
        for (let i = oldCount; i < newCount; i++) {
            const line = this.lockedLines[i];
            const div = document.createElement('div');
            div.className = 'line';
            div.style.letterSpacing = line.currentSpacing + 'px';
            div.innerHTML = this.escapeHtml(line.text) || '&nbsp;';
            container.insertBefore(div, activeDiv);
        }

        // Update active line content
        const activeLS = this.getActiveLineSpacing(this.currentScale);
        activeDiv.style.letterSpacing = activeLS + 'px';
        activeDiv.className = 'line active';
        activeDiv.innerHTML = this.escapeHtml(this.activeLine) + '<span id="cursor-anchor">\u200B</span>';

        this.lastLockedLineCount = newCount;
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
        const refWidth = this.viewportW - 40;
        const visualCharW = this.charW * scale;
        return Math.max(refWidth / n - visualCharW, -(visualCharW * (1 - CONFIG.SQUEEZE_MIN_RATIO)));
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
        this.cursorEl.style.height = (this.lineH * this.currentScale) + 'px';
        this.cursorEl.style.width = Math.max(1.5, 2.5 * this.currentScale) + 'px';
    }

    updateTransform() {
        const vh = this.renderedViewportH;
        const anchor = document.getElementById('cursor-anchor');
        if (!anchor) return true;

        const cursorY = anchor.offsetTop;
        const targetY = vh * CONFIG.CURSOR_VERTICAL_POSITION;
        const targetOffsetY = Math.min(0, targetY - cursorY);

        const diff = targetOffsetY - this.currentOffsetY;
        if (Math.abs(diff) < 0.5) {
            this.currentOffsetY = targetOffsetY;
        } else {
            this.currentOffsetY += diff * 0.22;
        }

        this.applyTransform();
        return Math.abs(diff) < 0.5;
    }

    applyTransform() {
        let transform;
        if (this.isRTL) {
            const textWorldW = parseFloat(this.textWorld.style.width);
            const offsetX = this.viewportW - textWorldW;
            transform = `translateX(${offsetX}px) translateY(${this.currentOffsetY}px)`;
        } else {
            transform = `translateY(${this.currentOffsetY}px)`;
        }
        this.textWorld.style.transform = transform;
    }

    // ── Animation Ticks ──

    registerAnimations() {
        this.animation.register('zoom', () => this.tickZoom());
        this.animation.register('stretch', () => this.tickStretch());
        this.animation.register('scroll', () => this.tickScroll());
        this.animation.register('viewport', () => this.tickViewport());
        this.animation.register('fade', () => this.tickFade());
    }

    tickZoom() {
        if (this.mode !== 'writing') return true;
        const diff = this.zoomTargetScale - this.currentScale;
        if (Math.abs(diff) < CONFIG.ZOOM_MIN_DIFF) {
            this.currentScale = this.zoomTargetScale;
            return true;
        }
        this.currentScale += diff * CONFIG.ZOOM_LERP;
        this.applyVisualFontSize();
        this.positionCursor();
        return false;
    }

    tickStretch() {
        if (this.mode !== 'writing') return true;

        const scale = this.currentScale;
        const targetWidth = this.viewportW - 40;
        const visualCharW = this.charW * scale;
        const viewportAnimating = Math.abs(this.renderedViewportH - this.viewportH) > 1 || Math.abs(this.viewportVelocity) > 0.5;
        const lerpFactor = viewportAnimating ? 0.15 : CONFIG.STRETCH_LERP;
        let allSettled = true;

        const children = this.textDisplay.children;
        for (let i = 0; i < this.lockedLines.length && i < children.length; i++) {
            const line = this.lockedLines[i];
            const n = line.text.length;
            const target = (line.hasNewline || n === 0) ? 0 : targetWidth / n - visualCharW;
            line.currentSpacing += (target - line.currentSpacing) * lerpFactor;
            if (Math.abs(line.currentSpacing - target) < 0.05) {
                line.currentSpacing = target;
            } else {
                allSettled = false;
            }
            children[i].style.letterSpacing = line.currentSpacing + 'px';
        }
        // Active line spacing
        if (children.length > 0) {
            const activeLS = this.getActiveLineSpacing(scale);
            children[children.length - 1].style.letterSpacing = activeLS + 'px';
        }
        return allSettled;
    }

    tickScroll() {
        if (this.mode !== 'writing') return true;
        return this.updateTransform();
    }

    tickViewport() {
        const viewportDiff = this.viewportH - this.renderedViewportH;

        if (this.mode === 'reading') {
            this.viewportVelocity += viewportDiff * CONFIG.VIEWPORT_LERP;
            this.viewportVelocity *= (1 - CONFIG.VIEWPORT_BOUNCE);
            this.renderedViewportH += this.viewportVelocity;
        } else {
            const keyboardOpening = viewportDiff < 0;
            if (keyboardOpening) {
                this.renderedViewportH += viewportDiff * 0.12;
                this.viewportVelocity = 0;
            } else {
                this.viewportVelocity += viewportDiff * CONFIG.VIEWPORT_LERP;
                this.viewportVelocity *= (1 - CONFIG.VIEWPORT_BOUNCE);
                this.renderedViewportH += this.viewportVelocity;
            }
        }

        const settled = Math.abs(viewportDiff) < 1 && Math.abs(this.viewportVelocity) < 0.5;
        if (settled) {
            this.renderedViewportH = this.viewportH;
            this.viewportVelocity = 0;
        }
        this.viewport.style.height = this.renderedViewportH + 'px';
        return settled;
    }

    tickFade() {
        if (this.mode !== 'writing') return true;

        if (this.currentOffsetY < -1) {
            const fadeHeight = (this.lineH * this.currentScale) * CONFIG.FADE_LINE_FRACTION;
            this.fadeTargetHeight = Math.max(fadeHeight, 20);
        } else {
            this.fadeTargetHeight = 0;
        }

        const diff = this.fadeTargetHeight - this.fadeCurrentHeight;
        this.fadeVelocity += diff * CONFIG.FADE_ACCELERATION;
        this.fadeVelocity *= CONFIG.FADE_DECAY;
        this.fadeCurrentHeight += this.fadeVelocity;

        if (this.fadeCurrentHeight < 0.5 && this.fadeTargetHeight === 0) {
            this.fadeCurrentHeight = 0;
        }
        this.fadeOverlay.style.height = this.fadeCurrentHeight + 'px';

        const settled = Math.abs(this.fadeVelocity) < CONFIG.FADE_MIN_VELOCITY
            && Math.abs(this.fadeCurrentHeight - this.fadeTargetHeight) < 1;
        if (settled) {
            this.fadeCurrentHeight = this.fadeTargetHeight;
            this.fadeOverlay.style.height = this.fadeCurrentHeight + 'px';
        }
        return settled;
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
