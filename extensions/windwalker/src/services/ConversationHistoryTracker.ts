import { ServiceInterface } from '../core/ServiceRegistry';

export interface ConversationEntry {
    id: string;
    message: string;
    timestamp: Date;
    intent: string;
    response: string;
    metadata: any;
}

export interface SessionContext {
    sessionId: string;
    userId?: string;
    startTime: Date;
    lastActivity: Date;
    conversationCount: number;
}

export class ConversationHistoryTracker implements ServiceInterface {
    name = 'ConversationHistoryTracker';
    private conversations: Map<string, ConversationEntry[]> = new Map();
    private sessions: Map<string, SessionContext> = new Map();
    private currentSessionId: string;
    private readonly maxHistorySize = 100;
    private readonly sessionTimeout = 30 * 60 * 1000; // 30 minutes

    constructor() {
        this.currentSessionId = this.generateSessionId();
        this.initializeSession(this.currentSessionId);
    }

    async initialize(): Promise<void> {
        console.log('ConversationHistoryTracker initialized');
        this.startSessionCleanup();
    }

    private generateSessionId(): string {
        return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    private initializeSession(sessionId: string): void {
        this.sessions.set(sessionId, {
            sessionId,
            startTime: new Date(),
            lastActivity: new Date(),
            conversationCount: 0
        });
        this.conversations.set(sessionId, []);
    }

    async addConversation(entry: Omit<ConversationEntry, 'id' | 'timestamp'>): Promise<string> {
        const id = `conv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const conversationEntry: ConversationEntry = {
            id,
            timestamp: new Date(),
            ...entry
        };

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

    async getConversationHistory(sessionId?: string): Promise<ConversationEntry[]> {
        const targetSessionId = sessionId || this.currentSessionId;
        return this.conversations.get(targetSessionId) || [];
    }

    async getRecentConversations(limit: number = 10): Promise<ConversationEntry[]> {
        const history = await this.getConversationHistory();
        return history.slice(-limit);
    }

    async searchConversations(query: string): Promise<ConversationEntry[]> {
        const history = await this.getConversationHistory();
        const lowercaseQuery = query.toLowerCase();
        
        return history.filter(conv => 
            conv.message.toLowerCase().includes(lowercaseQuery) ||
            conv.response.toLowerCase().includes(lowercaseQuery) ||
            conv.intent.toLowerCase().includes(lowercaseQuery)
        );
    }

    async getConversationContext(depth: number = 5): Promise<ConversationEntry[]> {
        const recent = await this.getRecentConversations(depth);
        return recent;
    }

    async rollbackToStep(stepIndex: number): Promise<ConversationEntry[]> {
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

    async getSessionInfo(): Promise<SessionContext> {
        const session = this.sessions.get(this.currentSessionId);
        if (!session) {
            throw new Error(`Session not found: ${this.currentSessionId}`);
        }
        return { ...session };
    }

    async createNewSession(): Promise<string> {
        this.currentSessionId = this.generateSessionId();
        this.initializeSession(this.currentSessionId);
        console.log(`New session created: ${this.currentSessionId}`);
        return this.currentSessionId;
    }

    async switchToSession(sessionId: string): Promise<boolean> {
        if (!this.sessions.has(sessionId)) {
            return false;
        }
        this.currentSessionId = sessionId;
        this.updateSessionActivity();
        console.log(`Switched to session: ${sessionId}`);
        return true;
    }

    async getAllSessions(): Promise<SessionContext[]> {
        return Array.from(this.sessions.values()).sort((a, b) => 
            b.lastActivity.getTime() - a.lastActivity.getTime()
        );
    }

    async getConversationStats(): Promise<{
        totalConversations: number;
        currentSessionConversations: number;
        activeSessions: number;
        mostActiveIntent: string;
    }> {
        const currentHistory = await this.getConversationHistory();
        const allConversations = Array.from(this.conversations.values()).flat();
        
        const intentCounts = allConversations.reduce((acc, conv) => {
            acc[conv.intent] = (acc[conv.intent] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);

        const mostActiveIntent = Object.entries(intentCounts)
            .sort(([, a], [, b]) => b - a)[0]?.[0] || 'none';

        return {
            totalConversations: allConversations.length,
            currentSessionConversations: currentHistory.length,
            activeSessions: this.sessions.size,
            mostActiveIntent
        };
    }

    private updateSessionActivity(): void {
        const session = this.sessions.get(this.currentSessionId);
        if (session) {
            session.lastActivity = new Date();
            session.conversationCount = this.conversations.get(this.currentSessionId)?.length || 0;
        }
    }

    private startSessionCleanup(): void {
        setInterval(() => {
            const now = Date.now();
            const expiredSessions: string[] = [];

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

    dispose(): void {
        this.conversations.clear();
        this.sessions.clear();
        console.log('ConversationHistoryTracker disposed');
    }

    async cleanup(): Promise<void> {
        this.conversations.clear();
        this.sessions.clear();
        console.log('ConversationHistoryTracker cleaned up');
    }
}