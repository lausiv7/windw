"use strict";
// [의도] AI 대화식 웹사이트 빌더의 IndexedDB 기반 대화 저장소
// [책임] 대화 세션, 메시지, 사용자 패턴, Git 연결 매핑 관리
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConversationDatabase = void 0;
class ConversationDatabase {
    constructor() {
        this.db = null;
        this.dbName = 'WindWalkerConversations';
        this.version = 1;
    }
    /**
     * IndexedDB 초기화
     */
    async initialize() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbName, this.version);
            request.onerror = () => reject(new Error(`IndexedDB 초기화 실패: ${request.error}`));
            request.onsuccess = () => {
                this.db = request.result;
                console.log('✅ WindWalker 대화 DB 초기화 완료');
                resolve();
            };
            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                // 대화 세션 스토어
                if (!db.objectStoreNames.contains('conversations')) {
                    const conversationStore = db.createObjectStore('conversations', {
                        keyPath: 'conversationId'
                    });
                    conversationStore.createIndex('userId', 'userId', { unique: false });
                    conversationStore.createIndex('projectType', 'projectType', { unique: false });
                    conversationStore.createIndex('createdAt', 'createdAt', { unique: false });
                    conversationStore.createIndex('status', 'status', { unique: false });
                }
                // 메시지 스토어
                if (!db.objectStoreNames.contains('messages')) {
                    const messageStore = db.createObjectStore('messages', {
                        keyPath: 'messageId'
                    });
                    messageStore.createIndex('conversationId', 'conversationId', { unique: false });
                    messageStore.createIndex('timestamp', 'timestamp', { unique: false });
                    messageStore.createIndex('sender', 'sender', { unique: false });
                }
                // 사용자 프로필 스토어
                if (!db.objectStoreNames.contains('userProfiles')) {
                    db.createObjectStore('userProfiles', {
                        keyPath: 'userId'
                    });
                }
                // Git 매핑 스토어 (대화 ↔ 커밋 연결)
                if (!db.objectStoreNames.contains('conversationGitMappings')) {
                    const mappingStore = db.createObjectStore('conversationGitMappings', {
                        keyPath: 'mappingId'
                    });
                    mappingStore.createIndex('conversationId', 'conversationId', { unique: false });
                    mappingStore.createIndex('messageId', 'messageId', { unique: false });
                    mappingStore.createIndex('gitCommitHash', 'gitCommitHash', { unique: false });
                    mappingStore.createIndex('createdAt', 'createdAt', { unique: false });
                }
            };
        });
    }
    /**
     * 새 대화 세션 생성
     */
    async createConversation(userId, projectType, initialContext) {
        if (!this.db)
            throw new Error('Database not initialized');
        const conversationId = `conv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const conversation = Object.assign({ conversationId,
            userId, projectId: `proj_${conversationId}`, createdAt: new Date(), updatedAt: new Date(), status: 'active', projectType, totalMessages: 0, totalGitCommits: 0, completionRate: 0, averageResponseTime: 0, templateUsed: initialContext === null || initialContext === void 0 ? void 0 : initialContext.templateUsed }, initialContext);
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['conversations'], 'readwrite');
            const store = transaction.objectStore('conversations');
            const request = store.add(conversation);
            request.onsuccess = () => {
                console.log(`✅ 새 대화 세션 생성: ${conversationId}`);
                resolve(conversationId);
            };
            request.onerror = () => reject(request.error);
        });
    }
    /**
     * 메시지 저장 (AI/사용자 구분)
     */
    async saveMessage(conversationId, sender, content, metadata) {
        if (!this.db)
            throw new Error('Database not initialized');
        const messageId = `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const message = Object.assign({ messageId,
            conversationId,
            sender,
            content, timestamp: new Date() }, metadata);
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['messages', 'conversations'], 'readwrite');
            // 메시지 저장
            const messageStore = transaction.objectStore('messages');
            const messageRequest = messageStore.add(message);
            messageRequest.onsuccess = async () => {
                // 대화 세션 통계 업데이트
                const conversationStore = transaction.objectStore('conversations');
                const getRequest = conversationStore.get(conversationId);
                getRequest.onsuccess = () => {
                    var _a;
                    const conversation = getRequest.result;
                    if (conversation) {
                        conversation.totalMessages += 1;
                        conversation.updatedAt = new Date();
                        // AI 응답 시간 평균 계산
                        if (sender === 'ai' && ((_a = metadata === null || metadata === void 0 ? void 0 : metadata.aiMetadata) === null || _a === void 0 ? void 0 : _a.processingTime)) {
                            const currentTotal = conversation.averageResponseTime * (conversation.totalMessages - 1);
                            conversation.averageResponseTime = (currentTotal + metadata.aiMetadata.processingTime) / conversation.totalMessages;
                        }
                        const updateRequest = conversationStore.put(conversation);
                        updateRequest.onsuccess = () => {
                            console.log(`✅ 메시지 저장 완료: ${messageId} (${sender})`);
                            resolve(messageId);
                        };
                        updateRequest.onerror = () => reject(updateRequest.error);
                    }
                    else {
                        reject(new Error(`Conversation not found: ${conversationId}`));
                    }
                };
                getRequest.onerror = () => reject(getRequest.error);
            };
            messageRequest.onerror = () => reject(messageRequest.error);
        });
    }
    /**
     * Git 커밋과 대화 연결 저장
     */
    async linkGitCommit(conversationId, messageId, gitCommitResult, changeDescription) {
        if (!this.db)
            throw new Error('Database not initialized');
        const mappingId = `map_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const mapping = {
            mappingId,
            conversationId,
            messageId,
            gitCommitHash: gitCommitResult.commitHash,
            gitShortHash: gitCommitResult.shortHash,
            gitBranch: 'main', // 현재 브랜치 감지 로직 추가 필요
            filesChanged: gitCommitResult.filesChanged,
            changeDescription,
            changeType: this.inferChangeType(changeDescription),
            createdAt: new Date(),
            linesAdded: 0, // Git diff 분석으로 계산 필요
            linesRemoved: 0 // Git diff 분석으로 계산 필요
        };
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['conversationGitMappings', 'conversations'], 'readwrite');
            // 매핑 정보 저장
            const mappingStore = transaction.objectStore('conversationGitMappings');
            const mappingRequest = mappingStore.add(mapping);
            mappingRequest.onsuccess = () => {
                // 대화 세션의 Git 커밋 카운트 업데이트
                const conversationStore = transaction.objectStore('conversations');
                const getRequest = conversationStore.get(conversationId);
                getRequest.onsuccess = () => {
                    const conversation = getRequest.result;
                    if (conversation) {
                        conversation.totalGitCommits += 1;
                        conversation.updatedAt = new Date();
                        const updateRequest = conversationStore.put(conversation);
                        updateRequest.onsuccess = () => {
                            console.log(`✅ Git 커밋 연결 완료: ${gitCommitResult.shortHash} ↔ ${messageId}`);
                            resolve();
                        };
                        updateRequest.onerror = () => reject(updateRequest.error);
                    }
                    else {
                        reject(new Error(`Conversation not found: ${conversationId}`));
                    }
                };
                getRequest.onerror = () => reject(getRequest.error);
            };
            mappingRequest.onerror = () => reject(mappingRequest.error);
        });
    }
    /**
     * 대화 히스토리 조회 (개인화용)
     */
    async getUserConversationHistory(userId, limit = 50, projectType) {
        if (!this.db)
            throw new Error('Database not initialized');
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['conversations'], 'readonly');
            const store = transaction.objectStore('conversations');
            const index = store.index('userId');
            const conversations = [];
            const request = index.openCursor(IDBKeyRange.only(userId));
            request.onsuccess = (event) => {
                const cursor = event.target.result;
                if (cursor && conversations.length < limit) {
                    const conversation = cursor.value;
                    // 프로젝트 타입 필터링
                    if (!projectType || conversation.projectType === projectType) {
                        conversations.push(conversation);
                    }
                    cursor.continue();
                }
                else {
                    // 최신순으로 정렬
                    conversations.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
                    resolve(conversations);
                }
            };
            request.onerror = () => reject(request.error);
        });
    }
    /**
     * 대화 세션 조회
     */
    async getConversation(conversationId) {
        if (!this.db)
            throw new Error('Database not initialized');
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['conversations'], 'readonly');
            const store = transaction.objectStore('conversations');
            const request = store.get(conversationId);
            request.onsuccess = () => {
                resolve(request.result || null);
            };
            request.onerror = () => reject(request.error);
        });
    }
    /**
     * 대화의 모든 메시지 조회
     */
    async getConversationMessages(conversationId) {
        if (!this.db)
            throw new Error('Database not initialized');
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['messages'], 'readonly');
            const store = transaction.objectStore('messages');
            const index = store.index('conversationId');
            const messages = [];
            const request = index.openCursor(IDBKeyRange.only(conversationId));
            request.onsuccess = (event) => {
                const cursor = event.target.result;
                if (cursor) {
                    messages.push(cursor.value);
                    cursor.continue();
                }
                else {
                    // 시간순으로 정렬
                    messages.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
                    resolve(messages);
                }
            };
            request.onerror = () => reject(request.error);
        });
    }
    /**
     * 사용자 패턴 분석 (개인화 추천용)
     */
    async analyzeUserPatterns(userId) {
        if (!this.db)
            throw new Error('Database not initialized');
        const conversations = await this.getUserConversationHistory(userId, 100);
        const messages = await this.getUserMessages(userId, 500);
        // 1. 선호 프로젝트 타입 분석
        const projectTypeCount = new Map();
        conversations.forEach(conv => {
            projectTypeCount.set(conv.projectType, (projectTypeCount.get(conv.projectType) || 0) + 1);
        });
        // 2. 자주 사용하는 요청 패턴 분석
        const requestPatterns = this.extractRequestPatterns(messages.filter(m => m.sender === 'user'));
        // 3. 성공적인 AI 응답 패턴 분석
        const successfulResponses = messages.filter(m => {
            var _a, _b;
            return m.sender === 'ai' &&
                ((_a = m.aiMetadata) === null || _a === void 0 ? void 0 : _a.confidence) &&
                m.aiMetadata.confidence > 0.8 &&
                ((_b = m.userFeedback) === null || _b === void 0 ? void 0 : _b.helpful) !== false;
        });
        // 4. 활동 시간 패턴 분석
        const activityHours = messages.map(m => m.timestamp.getHours());
        const peakHours = this.findPeakHours(activityHours);
        return {
            userId,
            preferredProjectTypes: Array.from(projectTypeCount.entries())
                .sort((a, b) => b[1] - a[1])
                .map(([type, count]) => ({ type, count })),
            commonRequestPatterns: requestPatterns,
            successfulAIPatterns: this.analyzeSuccessfulPatterns(successfulResponses),
            peakActivityHours: peakHours,
            averageSessionLength: this.calculateAverageSessionLength(conversations),
            totalConversations: conversations.length,
            totalMessages: messages.length,
            lastAnalyzedAt: new Date()
        };
    }
    /**
     * 사용자 프로필 업데이트
     */
    async updateUserProfile(userId, profileUpdates) {
        if (!this.db)
            throw new Error('Database not initialized');
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['userProfiles'], 'readwrite');
            const store = transaction.objectStore('userProfiles');
            // 기존 프로필 조회
            const getRequest = store.get(userId);
            getRequest.onsuccess = () => {
                const existingProfile = getRequest.result;
                const updatedProfile = Object.assign(Object.assign({ userId, designPreferences: {
                        colors: [],
                        styles: [],
                        layouts: []
                    }, technicalPreferences: {
                        frameworks: [],
                        cssApproach: 'tailwind',
                        complexity: 'intermediate'
                    }, usagePatterns: {
                        preferredSessionLength: 30,
                        frequentRequests: [],
                        peakUsageHours: []
                    }, learnedBehaviors: {
                        commonMistakes: [],
                        successfulPatterns: [],
                        improvementAreas: []
                    } }, existingProfile), profileUpdates);
                const putRequest = store.put(updatedProfile);
                putRequest.onsuccess = () => resolve();
                putRequest.onerror = () => reject(putRequest.error);
            };
            getRequest.onerror = () => reject(getRequest.error);
        });
    }
    /**
     * 사용자 패턴 저장
     */
    async saveUserPatterns(userId, patterns) {
        // 패턴 저장 로직 구현 (필요시)
        console.log(`Saving patterns for user: ${userId}`, patterns);
    }
    // === Private Utility Methods ===
    inferChangeType(description) {
        const desc = description.toLowerCase();
        if (desc.includes('생성') || desc.includes('추가') || desc.includes('새로'))
            return 'feature';
        if (desc.includes('수정') || desc.includes('변경') || desc.includes('업데이트'))
            return 'update';
        if (desc.includes('삭제') || desc.includes('제거'))
            return 'remove';
        if (desc.includes('스타일') || desc.includes('색상') || desc.includes('디자인'))
            return 'style';
        if (desc.includes('버그') || desc.includes('오류') || desc.includes('수정'))
            return 'fix';
        return 'misc';
    }
    extractRequestPatterns(userMessages) {
        const patterns = new Map();
        userMessages.forEach(message => {
            const keywords = this.extractKeywords(message.content);
            keywords.forEach(keyword => {
                patterns.set(keyword, (patterns.get(keyword) || 0) + 1);
            });
        });
        return Array.from(patterns.entries())
            .sort((a, b) => b[1] - a[1])
            .slice(0, 20)
            .map(([pattern, frequency]) => ({ pattern, frequency }));
    }
    extractKeywords(text) {
        const keywords = [];
        const lowerText = text.toLowerCase();
        // UI 요소
        if (lowerText.includes('버튼'))
            keywords.push('버튼');
        if (lowerText.includes('헤더'))
            keywords.push('헤더');
        if (lowerText.includes('푸터'))
            keywords.push('푸터');
        if (lowerText.includes('메뉴'))
            keywords.push('메뉴');
        // 색상
        if (lowerText.includes('색') || lowerText.includes('컬러'))
            keywords.push('색상변경');
        if (lowerText.includes('파란') || lowerText.includes('빨간') || lowerText.includes('초록'))
            keywords.push('색상변경');
        // 레이아웃
        if (lowerText.includes('크기'))
            keywords.push('크기조정');
        if (lowerText.includes('위치') || lowerText.includes('배치'))
            keywords.push('레이아웃');
        // 액션
        if (lowerText.includes('추가') || lowerText.includes('만들'))
            keywords.push('요소추가');
        if (lowerText.includes('삭제') || lowerText.includes('제거'))
            keywords.push('요소제거');
        if (lowerText.includes('수정') || lowerText.includes('바꿔'))
            keywords.push('요소수정');
        return keywords;
    }
    findPeakHours(hours) {
        const hourCounts = new Array(24).fill(0);
        hours.forEach(hour => hourCounts[hour]++);
        return hourCounts
            .map((count, hour) => ({ hour, count }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 3)
            .map(item => item.hour);
    }
    analyzeSuccessfulPatterns(responses) {
        const modelPerformance = new Map();
        responses.forEach(msg => {
            var _a, _b;
            if (((_a = msg.aiMetadata) === null || _a === void 0 ? void 0 : _a.model) && ((_b = msg.aiMetadata) === null || _b === void 0 ? void 0 : _b.confidence)) {
                const model = msg.aiMetadata.model;
                const current = modelPerformance.get(model) || { total: 0, avgConfidence: 0 };
                current.total += 1;
                current.avgConfidence = ((current.avgConfidence * (current.total - 1)) + msg.aiMetadata.confidence) / current.total;
                modelPerformance.set(model, current);
            }
        });
        return Array.from(modelPerformance.entries()).map(([model, stats]) => ({
            aiModel: model,
            successRate: stats.avgConfidence,
            totalUses: stats.total
        }));
    }
    calculateAverageSessionLength(conversations) {
        if (conversations.length === 0)
            return 0;
        const sessionLengths = conversations.map(conv => {
            const duration = conv.updatedAt.getTime() - conv.createdAt.getTime();
            return Math.round(duration / (1000 * 60)); // 분 단위
        });
        return sessionLengths.reduce((sum, length) => sum + length, 0) / sessionLengths.length;
    }
    async getUserMessages(userId, limit) {
        // 사용자의 모든 대화에서 메시지 조회
        const conversations = await this.getUserConversationHistory(userId, 100);
        const allMessages = [];
        for (const conv of conversations.slice(0, 10)) { // 최근 10개 대화만
            const messages = await this.getConversationMessages(conv.conversationId);
            allMessages.push(...messages);
        }
        return allMessages
            .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
            .slice(0, limit);
    }
}
exports.ConversationDatabase = ConversationDatabase;
//# sourceMappingURL=ConversationDatabase.js.map