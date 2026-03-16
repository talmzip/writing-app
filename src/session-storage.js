export const SessionStorage = {
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
