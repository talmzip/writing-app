import { SessionStorage } from './session-storage.js';

export const sessionsUI = {
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
