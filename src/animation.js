// Central rAF loop. Register named update functions; each returns true when settled.
// Loop stops when all are settled. Call wake() to restart.

export class AnimationLoop {
    constructor() {
        this.updates = new Map();
        this.frameId = null;
    }

    register(name, fn) {
        this.updates.set(name, fn);
    }

    unregister(name) {
        this.updates.delete(name);
    }

    wake() {
        if (this.frameId) return;
        this.frameId = requestAnimationFrame(() => this.tick());
    }

    tick() {
        let allSettled = true;
        for (const fn of this.updates.values()) {
            if (!fn()) allSettled = false;
        }
        if (allSettled) {
            this.frameId = null;
            return;
        }
        this.frameId = requestAnimationFrame(() => this.tick());
    }
}
