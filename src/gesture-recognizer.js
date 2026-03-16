// Classifies touch/click gestures.
// Touchstart is passive — scroll prevention handled by CSS touch-action, not preventDefault.

export class GestureRecognizer {
    constructor(element) {
        this.onTouchStart = null; // (event) => void
        this.onTap = null;        // (event) => void
        this.onClick = null;      // (event) => void
        this.isTouchDevice = false;
        this.setup(element);
    }

    setup(el) {
        let startY = 0;
        let startTime = 0;

        el.addEventListener('touchstart', (e) => {
            this.isTouchDevice = true;
            startY = e.touches[0].clientY;
            startTime = Date.now();
            if (this.onTouchStart) this.onTouchStart(e);
        }, { passive: true });

        el.addEventListener('touchend', (e) => {
            const endY = e.changedTouches[0].clientY;
            const elapsed = Date.now() - startTime;
            if (elapsed < 300 && Math.abs(endY - startY) < 15) {
                if (this.onTap) this.onTap(e);
            }
        });

        el.addEventListener('click', (e) => {
            if (this.isTouchDevice) return;
            if (this.onClick) this.onClick(e);
        });
    }
}
