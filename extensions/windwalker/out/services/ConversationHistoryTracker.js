"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConversationHistoryTracker = void 0;
class ConversationHistoryTracker {
    constructor() {
        this.name = 'ConversationHistoryTracker';
        this.conversations = new Map();
        this.sessions = new Map();
        this.maxHistorySize = 100;
        this.sessionTimeout = 30 * 60 * 1000; // 30 minutes
        this.currentSessionId = this.generateSessionId();
        this.initializeSession(this.currentSessionId);
    }
    async initialize() {
        console.log('ConversationHistoryTracker initialized');
        this.startSessionCleanup();
    }
    generateSessionId() {
        return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
    initializeSession(sessionId) {
        this.sessions.set(sessionId, {
            sessionId,
            startTime: new Date(),
            lastActivity: new Date(),
            conversationCount: 0
        });
        this.conversations.set(sessionId, []);
    }
    async addConversation(entry) {
        const id = `conv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const conversationEntry = Object.assign({ id, timestamp: new Date() }, entry);
        const sessionConversations = this.conversations.get(this.currentSessionId) || [];
        sessionConversations.push(conversationEntry);
        // Maintain max history size
        if (sessionConversations.length > this.maxHistorySize) {
            sessionConversations.splice(0, sessionConversations.length - this.maxHistorySize);
        }
        this.conversations.set(this.currentSessionId, sessionConversations);
        this.updateSessionActivity();
        console.log(`Conversation added: ${id} (Session: ${this.currentSessionId})`);
        return id;
    }
    async getConversationHistory(sessionId) {
        const targetSessionId = sessionId || this.currentSessionId;
        return this.conversations.get(targetSessionId) || [];
    }
    async getRecentConversations(limit = 10) {
        const history = await this.getConversationHistory();
        return history.slice(-limit);
    }
    async searchConversations(query) {
        const history = await this.getConversationHistory();
        const lowercaseQuery = query.toLowerCase();
        return history.filter(conv => conv.message.toLowerCase().includes(lowercaseQuery) ||
            conv.response.toLowerCase().includes(lowercaseQuery) ||
            conv.intent.toLowerCase().includes(lowercaseQuery));
    }
    async getConversationContext(depth = 5) {
        const recent = await this.getRecentConversations(depth);
        return recent;
    }
    async rollbackToStep(stepIndex) {
        const history = await this.getConversationHistory();
        if (stepIndex < 0 || stepIndex >= history.length) {
            throw new Error(`Invalid step index: ${stepIndex}`);
        }
        const sessionConversations = this.conversations.get(this.currentSessionId) || [];
        sessionConversations.splice(stepIndex + 1);
        this.conversations.set(this.currentSessionId, sessionConversations);
        console.log(`Rolled back to step ${stepIndex} (${sessionConversations.length} conversations remaining)`);
        return sessionConversations;
    }
    async getSessionInfo() {
        const session = this.sessions.get(this.currentSessionId);
        if (!session) {
            throw new Error(`Session not found: ${this.currentSessionId}`);
        }
        return Object.assign({}, session);
    }
    async createNewSession() {
        this.currentSessionId = this.generateSessionId();
        this.initializeSession(this.currentSessionId);
        console.log(`New session created: ${this.currentSessionId}`);
        return this.currentSessionId;
    }
    async switchToSession(sessionId) {
        if (!this.sessions.has(sessionId)) {
            return false;
        }
        this.currentSessionId = sessionId;
        this.updateSessionActivity();
        console.log(`Switched to session: ${sessionId}`);
        return true;
    }
    async getAllSessions() {
        return Array.from(this.sessions.values()).sort((a, b) => b.lastActivity.getTime() - a.lastActivity.getTime());
    }
    async getConversationStats() {
        var _a;
        const currentHistory = await this.getConversationHistory();
        const allConversations = Array.from(this.conversations.values()).flat();
        const intentCounts = allConversations.reduce((acc, conv) => {
            acc[conv.intent] = (acc[conv.intent] || 0) + 1;
            return acc;
        }, {});
        const mostActiveIntent = ((_a = Object.entries(intentCounts)
            .sort(([, a], [, b]) => b - a)[0]) === null || _a === void 0 ? void 0 : _a[0]) || 'none';
        return {
            totalConversations: allConversations.length,
            currentSessionConversations: currentHistory.length,
            activeSessions: this.sessions.size,
            mostActiveIntent
        };
    }
    updateSessionActivity() {
        var _a;
        const session = this.sessions.get(this.currentSessionId);
        if (session) {
            session.lastActivity = new Date();
            session.conversationCount = ((_a = this.conversations.get(this.currentSessionId)) === null || _a === void 0 ? void 0 : _a.length) || 0;
        }
    }
    startSessionCleanup() {
        setInterval(() => {
            const now = Date.now();
            const expiredSessions = [];
            this.sessions.forEach((session, sessionId) => {
                if (now - session.lastActivity.getTime() > this.sessionTimeout) {
                    expiredSessions.push(sessionId);
                }
            });
            expiredSessions.forEach(sessionId => {
                if (sessionId !== this.currentSessionId) {
                    this.sessions.delete(sessionId);
                    this.conversations.delete(sessionId);
                    console.log(`Cleaned up expired session: ${sessionId}`);
                }
            });
        }, 5 * 60 * 1000); // Check every 5 minutes
    }
    dispose() {
        this.conversations.clear();
        this.sessions.clear();
        console.log('ConversationHistoryTracker disposed');
    }
    async cleanup() {
        this.conversations.clear();
        this.sessions.clear();
        console.log('ConversationHistoryTracker cleaned up');
    }
}
exports.ConversationHistoryTracker = ConversationHistoryTracker;
//# sourceMappingURL=ConversationHistoryTracker.js.map