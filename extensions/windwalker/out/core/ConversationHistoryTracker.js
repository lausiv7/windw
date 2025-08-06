"use strict";
// [의도] Git과 IndexedDB 사이의 브리지 역할 - 대화와 코드 변경을 연결하는 통합 추적 시스템
// [책임] 대화-커밋 매핑, 히스토리 추적, 개인화 데이터 연결, 되돌리기 지원
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConversationHistoryTracker = void 0;
const GitIntegrationManager_1 = require("./GitIntegrationManager");
const ConversationDatabase_1 = require("./ConversationDatabase");
class ConversationHistoryTracker {
    constructor(context) {
        this.name = 'ConversationHistoryTracker';
        this.historyCache = new Map();
        this.context = context;
        this.gitManager = new GitIntegrationManager_1.GitIntegrationManager(context);
        this.conversationDb = new ConversationDatabase_1.ConversationDatabase();
        console.log('[ConversationHistoryTracker] Initialized');
    }
    initialize() {
        return __awaiter(this, void 0, void 0, function* () {
            // IndexedDB 초기화
            yield this.conversationDb.initialize();
            // 기존 히스토리 캐시 로드
            yield this.loadHistoryCache();
            console.log('✅ ConversationHistoryTracker initialized');
        });
    }
    dispose() {
        this.historyCache.clear();
        console.log('[ConversationHistoryTracker] Disposed');
    }
    /**
     * 대화-코드 변경 연결 추적
     */
    trackConversationChange(conversationId_1, messageId_1, userId_1, userRequest_1, aiResponse_1, filesChanged_1) {
        return __awaiter(this, arguments, void 0, function* (conversationId, messageId, userId, userRequest, aiResponse, filesChanged, changeType = 'update') {
            try {
                console.log(`[ConversationHistoryTracker] Tracking change for conversation: ${conversationId}`);
                // 1. Git 상태 분석
                const gitStatus = yield this.gitManager.getStatus();
                const hasChanges = gitStatus.files.length > 0;
                // 2. 히스토리 엔트리 생성
                const entryId = this.generateEntryId();
                const entry = {
                    entryId,
                    conversationId,
                    messageId,
                    userId,
                    userRequest,
                    aiResponse,
                    codeChanges: {
                        filesAffected: filesChanged,
                        linesAdded: yield this.countLinesChanged(filesChanged, 'added'),
                        linesRemoved: yield this.countLinesChanged(filesChanged, 'removed'),
                        changeType
                    },
                    timestamp: new Date(),
                    success: hasChanges
                };
                // 3. Git 커밋이 있는 경우 연결
                if (hasChanges) {
                    try {
                        const commitResult = yield this.createLinkedCommit(conversationId, messageId, userRequest, aiResponse, filesChanged);
                        entry.gitCommit = {
                            hash: commitResult.commitHash,
                            shortHash: commitResult.shortHash,
                            message: commitResult.message,
                            filesChanged: commitResult.filesChanged,
                            timestamp: commitResult.timestamp
                        };
                        console.log(`✅ Git commit linked: ${commitResult.shortHash}`);
                    }
                    catch (error) {
                        console.warn(`[ConversationHistoryTracker] Git commit failed:`, error);
                        entry.success = false;
                    }
                }
                // 4. 히스토리에 추가
                yield this.addToHistory(entry);
                // 5. 개인화 데이터 업데이트
                yield this.updatePersonalizationData(userId, entry);
                return entry;
            }
            catch (error) {
                console.error(`[ConversationHistoryTracker] Error tracking change:`, error);
                throw new Error(`Failed to track conversation change: ${error.message}`);
            }
        });
    }
    /**
     * 특정 단계로 되돌리기 (안전한 되돌리기)
     */
    revertToStep(conversationId, stepsBack) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                console.log(`[ConversationHistoryTracker] Reverting ${stepsBack} steps for conversation: ${conversationId}`);
                // 1. 되돌리기 미리보기
                const preview = yield this.previewRevert(conversationId, stepsBack);
                if (!preview.canRevert) {
                    throw new Error(`Cannot revert: ${preview.safetyWarnings.join(', ')}`);
                }
                // 2. Git 되돌리기 수행
                const revertResult = yield this.gitManager.revertToConversationState(conversationId, stepsBack);
                // 3. IndexedDB에 되돌리기 기록
                yield this.recordRevertAction(conversationId, revertResult, stepsBack);
                return {
                    success: true,
                    revertedTo: revertResult.targetCommit.substring(0, 8),
                    message: `Successfully reverted ${stepsBack} steps`
                };
            }
            catch (error) {
                console.error(`[ConversationHistoryTracker] Revert failed:`, error);
                return {
                    success: false,
                    revertedTo: '',
                    message: `Revert failed: ${error.message}`
                };
            }
        });
    }
    /**
     * 되돌리기 미리보기 (안전성 검사)
     */
    previewRevert(conversationId, stepsBack) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                // Git 커밋 히스토리 조회
                const commits = yield this.gitManager.getConversationCommits(conversationId);
                if (commits.all.length === 0) {
                    return {
                        targetCommit: '',
                        stepsToRevert: 0,
                        affectedFiles: [],
                        conversationContext: 'No commits found',
                        safetyWarnings: ['No Git history available'],
                        canRevert: false
                    };
                }
                if (stepsBack > commits.all.length) {
                    return {
                        targetCommit: '',
                        stepsToRevert: 0,
                        affectedFiles: [],
                        conversationContext: 'Steps exceed available history',
                        safetyWarnings: [`Only ${commits.all.length} steps available`],
                        canRevert: false
                    };
                }
                const targetIndex = Math.max(0, commits.all.length - stepsBack);
                const targetCommit = commits.all[targetIndex];
                // 영향받을 파일들 분석
                const affectedFiles = yield this.getAffectedFilesSince(targetCommit.hash);
                // 안전성 경고 생성
                const warnings = [];
                if (affectedFiles.length > 10) {
                    warnings.push(`Many files will be affected (${affectedFiles.length})`);
                }
                // 현재 작업 중인 변경사항 확인
                const currentStatus = yield this.gitManager.getStatus();
                if (currentStatus.files.length > 0) {
                    warnings.push('Uncommitted changes will be lost');
                }
                return {
                    targetCommit: targetCommit.hash,
                    stepsToRevert: stepsBack,
                    affectedFiles,
                    conversationContext: targetCommit.message,
                    safetyWarnings: warnings,
                    canRevert: warnings.length === 0 || warnings.every(w => !w.includes('lost'))
                };
            }
            catch (error) {
                return {
                    targetCommit: '',
                    stepsToRevert: 0,
                    affectedFiles: [],
                    conversationContext: 'Error analyzing revert',
                    safetyWarnings: [`Analysis failed: ${error.message}`],
                    canRevert: false
                };
            }
        });
    }
    /**
     * 사용자별 개인화 인사이트 생성
     */
    generatePersonalizationInsights(userId) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                // IndexedDB에서 사용자 패턴 분석
                const patterns = yield this.conversationDb.analyzeUserPatterns(userId);
                // Git에서 성공/실패 패턴 분석
                const gitAnalytics = yield this.gitManager.extractConversationAnalytics();
                const userGitData = gitAnalytics.filter(a => a.conversationId.includes(userId));
                // 히스토리에서 워크플로우 패턴 분석
                const userHistory = yield this.getUserHistory(userId);
                const insights = {
                    userId,
                    preferredWorkflows: this.extractWorkflowPatterns(userHistory),
                    successfulPatterns: this.analyzeSuccessPatterns(userHistory, userGitData),
                    commonMistakes: this.identifyCommonMistakes(userHistory),
                    recommendedNextActions: yield this.generateRecommendations(userId, patterns),
                    timeBasedPreferences: {
                        peakHours: patterns.peakActivityHours,
                        averageSessionLength: patterns.averageSessionLength,
                        preferredProjectTypes: patterns.preferredProjectTypes.map(p => p.type)
                    }
                };
                // 인사이트를 IndexedDB에 캐시
                yield this.cachePersonalizationInsights(userId, insights);
                return insights;
            }
            catch (error) {
                console.error(`[ConversationHistoryTracker] Error generating insights:`, error);
                throw new Error(`Failed to generate personalization insights: ${error.message}`);
            }
        });
    }
    /**
     * 대화별 전체 히스토리 조회
     */
    getConversationHistory(conversationId) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b;
            // 캐시에서 먼저 확인
            if (this.historyCache.has(conversationId)) {
                return this.historyCache.get(conversationId);
            }
            // DB에서 조회
            const messages = yield this.conversationDb.getConversationMessages(conversationId);
            const history = [];
            for (const message of messages) {
                if (message.sender === 'user') {
                    // 다음 AI 응답 찾기
                    const nextAIMessage = messages.find(m => m.sender === 'ai' &&
                        m.timestamp > message.timestamp);
                    if (nextAIMessage) {
                        const entry = {
                            entryId: `entry_${message.messageId}`,
                            conversationId,
                            messageId: message.messageId,
                            userId: 'unknown', // ConversationSession에서 가져와야 함
                            userRequest: message.content,
                            aiResponse: nextAIMessage.content,
                            codeChanges: {
                                filesAffected: ((_a = nextAIMessage.codeGeneration) === null || _a === void 0 ? void 0 : _a.fileName) ? [nextAIMessage.codeGeneration.fileName] : [],
                                linesAdded: 0, // Git diff에서 계산 필요
                                linesRemoved: 0,
                                changeType: 'update'
                            },
                            timestamp: message.timestamp,
                            success: true,
                            userFeedback: nextAIMessage.userFeedback
                        };
                        // Git 커밋 정보가 있는 경우 추가
                        if ((_b = nextAIMessage.codeGeneration) === null || _b === void 0 ? void 0 : _b.gitCommitHash) {
                            entry.gitCommit = {
                                hash: nextAIMessage.codeGeneration.gitCommitHash,
                                shortHash: nextAIMessage.codeGeneration.gitCommitHash.substring(0, 8),
                                message: 'AI generated commit',
                                filesChanged: [nextAIMessage.codeGeneration.fileName],
                                timestamp: nextAIMessage.timestamp
                            };
                        }
                        history.push(entry);
                    }
                }
            }
            // 캐시에 저장
            this.historyCache.set(conversationId, history);
            return history;
        });
    }
    /**
     * 사용자별 히스토리 조회
     */
    getUserHistory(userId_1) {
        return __awaiter(this, arguments, void 0, function* (userId, limit = 50) {
            const conversations = yield this.conversationDb.getUserConversationHistory(userId, 20);
            const allHistory = [];
            for (const conversation of conversations) {
                const history = yield this.getConversationHistory(conversation.conversationId);
                allHistory.push(...history);
            }
            return allHistory
                .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
                .slice(0, limit);
        });
    }
    // === Private Methods ===
    loadHistoryCache() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const cached = this.context.globalState.get('windwalker.historyCache');
                if (cached) {
                    for (const [conversationId, entries] of Object.entries(cached)) {
                        this.historyCache.set(conversationId, entries);
                    }
                    console.log(`[ConversationHistoryTracker] Loaded ${Object.keys(cached).length} cached conversations`);
                }
            }
            catch (error) {
                console.error('[ConversationHistoryTracker] Error loading cache:', error);
            }
        });
    }
    saveHistoryCache() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const cacheObject = {};
                for (const [conversationId, entries] of this.historyCache) {
                    // 최근 10개 엔트리만 캐시
                    cacheObject[conversationId] = entries.slice(-10);
                }
                yield this.context.globalState.update('windwalker.historyCache', cacheObject);
            }
            catch (error) {
                console.error('[ConversationHistoryTracker] Error saving cache:', error);
            }
        });
    }
    createLinkedCommit(conversationId, messageId, userRequest, aiResponse, filesChanged) {
        return __awaiter(this, void 0, void 0, function* () {
            const aiMetadata = {
                model: 'windwalker-tracker',
                confidence: 0.85,
                processingTime: 100,
                tokenCount: userRequest.length + aiResponse.length
            };
            const commitResult = yield this.gitManager.createAIConversationCommit(conversationId, messageId, userRequest, aiResponse, filesChanged, aiMetadata);
            // IndexedDB에 Git 연결 정보 저장
            yield this.conversationDb.linkGitCommit(conversationId, messageId, {
                commitHash: commitResult.commitHash,
                shortHash: commitResult.shortHash,
                message: commitResult.message,
                filesChanged: commitResult.filesChanged,
                timestamp: commitResult.timestamp
            }, `Tracked change: ${userRequest}`);
            return commitResult;
        });
    }
    addToHistory(entry) {
        return __awaiter(this, void 0, void 0, function* () {
            // 메모리 캐시에 추가
            const conversationHistory = this.historyCache.get(entry.conversationId) || [];
            conversationHistory.push(entry);
            this.historyCache.set(entry.conversationId, conversationHistory);
            // 캐시를 디스크에 저장
            yield this.saveHistoryCache();
            console.log(`✅ History entry added: ${entry.entryId}`);
        });
    }
    updatePersonalizationData(userId, entry) {
        return __awaiter(this, void 0, void 0, function* () {
            // 사용자 패턴 데이터 업데이트를 위한 메타데이터 저장
            yield this.conversationDb.saveUserPatterns(userId, {
                lastAction: entry.codeChanges.changeType,
                success: entry.success,
                filesAffected: entry.codeChanges.filesAffected.length,
                timestamp: entry.timestamp
            });
        });
    }
    recordRevertAction(conversationId, revertResult, stepsBack) {
        return __awaiter(this, void 0, void 0, function* () {
            // IndexedDB에 되돌리기 액션 기록
            yield this.conversationDb.saveMessage(conversationId, 'system', `Reverted ${stepsBack} steps to commit ${revertResult.targetCommit.substring(0, 8)}`, {
                revertOperation: {
                    stepsReverted: stepsBack,
                    targetCommitHash: revertResult.targetCommit,
                    revertedAt: new Date(),
                    requestedBy: 'user'
                }
            });
        });
    }
    countLinesChanged(files, type) {
        return __awaiter(this, void 0, void 0, function* () {
            // Git diff를 사용해 라인 수 계산 (간단 구현)
            try {
                const status = yield this.gitManager.getStatus();
                return status.files.length * 5; // 평균 추정값
            }
            catch (_a) {
                return 0;
            }
        });
    }
    getAffectedFilesSince(commitHash) {
        return __awaiter(this, void 0, void 0, function* () {
            // 특정 커밋 이후 변경된 파일 목록
            try {
                const currentCommit = yield this.gitManager.getCurrentCommitHash();
                // 실제로는 git diff --name-only 사용
                return ['file1.ts', 'file2.tsx']; // 예시
            }
            catch (_a) {
                return [];
            }
        });
    }
    extractWorkflowPatterns(history) {
        const patterns = new Map();
        history.forEach(entry => {
            const workflow = `${entry.codeChanges.changeType}->${entry.success ? 'success' : 'fail'}`;
            patterns.set(workflow, (patterns.get(workflow) || 0) + 1);
        });
        return Array.from(patterns.entries())
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5)
            .map(([pattern]) => pattern);
    }
    analyzeSuccessPatterns(history, gitData) {
        const patterns = new Map();
        history.forEach(entry => {
            const pattern = entry.codeChanges.changeType;
            const current = patterns.get(pattern) || { success: 0, total: 0 };
            current.total += 1;
            if (entry.success)
                current.success += 1;
            patterns.set(pattern, current);
        });
        return Array.from(patterns.entries()).map(([pattern, stats]) => ({
            pattern,
            successRate: stats.total > 0 ? stats.success / stats.total : 0,
            frequency: stats.total
        }));
    }
    identifyCommonMistakes(history) {
        const mistakes = [];
        const failedEntries = history.filter(entry => !entry.success);
        const failurePatterns = new Map();
        failedEntries.forEach(entry => {
            const pattern = `${entry.codeChanges.changeType}_failure`;
            failurePatterns.set(pattern, (failurePatterns.get(pattern) || 0) + 1);
        });
        for (const [pattern, frequency] of failurePatterns) {
            mistakes.push({
                mistake: pattern.replace('_failure', ' operations often fail'),
                frequency,
                solution: this.getSolutionForPattern(pattern)
            });
        }
        return mistakes.sort((a, b) => b.frequency - a.frequency);
    }
    getSolutionForPattern(pattern) {
        const solutions = {
            'create_failure': 'Check file permissions and path validity',
            'update_failure': 'Verify file exists before updating',
            'delete_failure': 'Ensure file is not in use before deletion',
            'refactor_failure': 'Test changes in smaller increments'
        };
        return solutions[pattern] || 'Review the request and try again';
    }
    generateRecommendations(userId, patterns) {
        return __awaiter(this, void 0, void 0, function* () {
            const recommendations = [];
            // 활동 패턴 기반 추천
            if (patterns.peakActivityHours.length > 0) {
                const peakHour = patterns.peakActivityHours[0];
                recommendations.push(`Best productivity around ${peakHour}:00 - consider complex tasks then`);
            }
            // 프로젝트 타입 기반 추천
            if (patterns.preferredProjectTypes.length > 0) {
                const topType = patterns.preferredProjectTypes[0];
                recommendations.push(`Try advanced ${topType.type} features - you're experienced with this type`);
            }
            // 요청 패턴 기반 추천
            if (patterns.commonRequestPatterns.length > 0) {
                const topPattern = patterns.commonRequestPatterns[0];
                recommendations.push(`Explore variations of '${topPattern.pattern}' - it's your most used pattern`);
            }
            return recommendations;
        });
    }
    cachePersonalizationInsights(userId, insights) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const cacheKey = `windwalker.personalization.${userId}`;
                yield this.context.globalState.update(cacheKey, Object.assign(Object.assign({}, insights), { cachedAt: new Date().toISOString() }));
            }
            catch (error) {
                console.error('[ConversationHistoryTracker] Error caching insights:', error);
            }
        });
    }
    generateEntryId() {
        return `entry_${Date.now()}_${Math.random().toString(36).substr(2, 8)}`;
    }
}
exports.ConversationHistoryTracker = ConversationHistoryTracker;
//# sourceMappingURL=ConversationHistoryTracker.js.map