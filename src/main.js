// Entry point — wires all modules and boots the app.

import { CONFIG } from './config.js';
import { AnimationLoop } from './animation.js';
import { WritingApp } from './writing-engine.js';
import { GestureRecognizer } from './gesture-recognizer.js';
import { ModeManager } from './mode-manager.js';
import { sessionsUI } from './sessions-ui.js';

document.addEventListener('DOMContentLoaded', () => {
    sessionsUI.init();

    const animation = new AnimationLoop();
    const app = new WritingApp(animation);
    const gestures = new GestureRecognizer(app.viewport);
    const modes = new ModeManager(app, animation, gestures);

    // Let app and modes know about each other
    app.mode = 'prompt';

    // Prompt overlay setup
    modes.setupPrompt();

    // Input events
    app.hiddenInput.addEventListener('input', () => app.handleInput());
    app.hiddenInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') app.handleEnter(e);
    });

    // Resize
    const resizeHandler = () => modes.handleResize();
    if (window.visualViewport) {
        window.visualViewport.addEventListener('resize', resizeHandler);
    }
    window.addEventListener('resize', resizeHandler);

    // Dev toggle: Ctrl+Shift+J switches line-break mode
    document.addEventListener('keydown', (e) => {
        if (e.ctrlKey && e.shiftKey && e.key === 'J') {
            e.preventDefault();
            const modeList = ['squeeze', 'justified', 'natural'];
            CONFIG.LINE_BREAK_MODE = modeList[(modeList.indexOf(CONFIG.LINE_BREAK_MODE) + 1) % modeList.length];
            app.lockedLines = [];
            app.lastLockedLineCount = 0;
            app.updateLines();
            app.fullRender();
            app.lastLockedLineCount = app.lockedLines.length;
            app.positionCursor();
            app.updateTransform();
            console.log('Line break mode:', CONFIG.LINE_BREAK_MODE);
        }
    });

    // Sessions toggle
    document.getElementById('sessions-toggle').addEventListener('click', (e) => {
        e.stopPropagation();
        app.saveCurrentSession();
        sessionsUI.show();
    });

    // New session button
    app.newSessionBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        app.startNewSession();
    });
});
