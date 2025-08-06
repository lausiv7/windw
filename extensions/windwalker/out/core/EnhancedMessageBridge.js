"use strict";
// [의도] 기존 MessageBridge의 확장 - Git+IndexedDB 통합 기능 추가
// [책임] AI 대화식 웹사이트 빌더의 중앙 메시지 라우터, Git 커밋 자동화, 대화 히스토리 관리
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
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
exports.EnhancedMessageBridge = void 0;
const vscode = __importStar(require("vscode"));
const MessageBridge_1 = require("./MessageBridge");
const GitIntegrationManager_1 = require("./GitIntegrationManager");
const ConversationDatabase_1 = require("./ConversationDatabase");
class EnhancedMessageBridge extends MessageBridge_1.MessageBridge {
    constructor(context, serviceRegistry) {
        super(context);
        this.name = 'EnhancedMessageBridge';
        this.currentConversation = null;
        this.messageIdCounter = 0;
        this.serviceRegistry = serviceRegistry;
        this.gitManager = new GitIntegrationManager_1.GitIntegrationManager(context);
        this.conversationDb = new ConversationDatabase_1.ConversationDatabase();
        console.log('[EnhancedMessageBridge] Initialized with Git+IndexedDB integration');
    }
    initialize() {
        return __awaiter(this, void 0, void 0, function* () {
            // 1. 기본 서비스들 초기화
            this.featureFlagManager = yield this.serviceRegistry.getService('FeatureFlagManager');
            // 2. IndexedDB 초기화
            yield this.conversationDb.initialize();
            // 3. 확장 메시지 핸들러 등록
            this.registerEnhancedHandlers();
            console.log('✅ EnhancedMessageBridge initialized with enhanced capabilities');
        });
    }
    dispose() {
        if (this.currentConversation) {
            this.endCurrentConversation().catch(error => {
                console.error('[EnhancedMessageBridge] Error ending conversation:', error);
            });
        }
        console.log('[EnhancedMessageBridge] Disposed');
    }
    /**
     * 확장된 메시지 처리 (기존 + Git/DB 통합)
     */
    processMessage(message, webview) {
        const _super = Object.create(null, {
            processMessage: { get: () => super.processMessage }
        });
        return __awaiter(this, void 0, void 0, function* () {
            try {
                // 대화 컨텍스트 확보
                yield this.ensureConversationContext(message, webview);
                // 메시지 ID 생성
                if (!message.messageId) {
                    message.messageId = this.generateMessageId();
                }
                // 사용자 메시지 저장 (IndexedDB)
                if (message.type === 'chat:message' && this.currentConversation) {
                    yield this.saveUserMessage(message);
                }
                console.log(`[EnhancedMessageBridge] Processing enhanced message: ${message.type}`, {
                    conversationId: message.conversationId,
                    messageId: message.messageId,
                    userId: message.userId
                });
                // 기존 MessageBridge 처리
                yield _super.processMessage.call(this, message, webview);
                // Git 통합 처리 (응답 후)
                if (this.shouldCreateGitCommit(message)) {
                    yield this.handleGitIntegration(message, webview);
                }
            }
            catch (error) {
                console.error(`[EnhancedMessageBridge] Enhanced processing error:`, error);
                throw error;
            }
        });
    }
    /**
     * 확장 메시지 핸들러 등록
     */
    registerEnhancedHandlers() {
        // 대화 관리 핸들러
        this.messageHandlers.set('conversation:start', this.handleConversationStart.bind(this));
        this.messageHandlers.set('conversation:end', this.handleConversationEnd.bind(this));
        this.messageHandlers.set('conversation:history', this.handleConversationHistory.bind(this));
        this.messageHandlers.set('conversation:analytics', this.handleConversationAnalytics.bind(this));
        // Git 통합 핸들러
        this.messageHandlers.set('git:commit', this.handleGitCommit.bind(this));
        this.messageHandlers.set('git:revert', this.handleGitRevert.bind(this));
        this.messageHandlers.set('git:status', this.handleGitStatus.bind(this));
        this.messageHandlers.set('git:history', this.handleGitHistory.bind(this));
        // 개인화 핸들러
        this.messageHandlers.set('personalization:analyze', this.handlePersonalizationAnalyze.bind(this));
        this.messageHandlers.set('personalization:recommend', this.handlePersonalizationRecommend.bind(this));
        this.messageHandlers.set('personalization:profile', this.handlePersonalizationProfile.bind(this));
        // 기능 플래그 핸들러
        this.messageHandlers.set('feature:status', this.handleFeatureStatus.bind(this));
        this.messageHandlers.set('feature:toggle', this.handleFeatureToggle.bind(this));
    }
    /**
     * 대화 컨텍스트 확보
     */
    ensureConversationContext(message, webview) {
        return __awaiter(this, void 0, void 0, function* () {
            // 이미 활성 대화가 있으면 사용
            if (this.currentConversation && message.conversationId === this.currentConversation.conversationId) {
                return;
            }
            // 새 대화 시작
            if (!message.conversationId || !this.currentConversation) {
                const userId = message.userId || 'anonymous';
                const projectType = this.inferProjectType();
                const conversationId = yield this.conversationDb.createConversation(userId, projectType, { templateUsed: 'default' });
                this.currentConversation = {
                    conversationId,
                    userId,
                    projectType,
                    messageHistory: []
                };
                // 웹뷰에 대화 시작 알림
                yield webview.postMessage({
                    type: 'conversation:started',
                    data: {
                        conversationId,
                        userId,
                        projectType
                    },
                    timestamp: Date.now()
                });
                console.log(`✅ New conversation started: ${conversationId} for user: ${userId}`);
            }
            // 메시지에 대화 정보 추가
            message.conversationId = this.currentConversation.conversationId;
            message.userId = this.currentConversation.userId;
        });
    }
    /**
     * 사용자 메시지 저장
     */
    saveUserMessage(message) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this.currentConversation)
                return;
            const messageId = yield this.conversationDb.saveMessage(this.currentConversation.conversationId, 'user', message.data.content, {
                messageMetadata: {
                    requestId: message.requestId,
                    timestamp: message.timestamp,
                    webviewType: 'chat'
                }
            });
            console.log(`✅ User message saved: ${messageId}`);
        });
    }
    /**
     * AI 응답 저장 (기존 핸들러에서 호출)
     */
    saveAIResponse(userMessage, aiResponse, aiMetadata) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this.currentConversation) {
                throw new Error('No active conversation for AI response');
            }
            const messageId = yield this.conversationDb.saveMessage(this.currentConversation.conversationId, 'ai', aiResponse.content || JSON.stringify(aiResponse), {
                aiMetadata: aiMetadata || {
                    model: aiResponse.model || 'default',
                    confidence: aiResponse.confidence || 0.8,
                    processingTime: Date.now() - (userMessage.timestamp || Date.now()),
                    tokenCount: aiResponse.tokenCount
                },
                messageMetadata: {
                    requestId: userMessage.requestId,
                    responseType: aiResponse.type || 'text'
                }
            });
            return messageId;
        });
    }
    /**
     * Git 커밋 여부 판단
     */
    shouldCreateGitCommit(message) {
        // 기능 플래그 확인
        if (!this.featureFlagManager.isEnabled('git-integration')) {
            return false;
        }
        // 명시적 Git 커밋 요청
        if (message.requiresGitCommit) {
            return true;
        }
        // 파일 변경 작업들
        const gitTriggerTypes = [
            'file:write', 'file:create', 'file:delete',
            'code:apply', 'code:generate'
        ];
        return gitTriggerTypes.includes(message.type);
    }
    /**
     * Git 통합 처리
     */
    handleGitIntegration(message, webview) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b, _c;
            if (!this.currentConversation)
                return;
            try {
                // Git 상태 확인
                const gitStatus = yield this.gitManager.getStatus();
                if (gitStatus.files.length === 0) {
                    console.log('[EnhancedMessageBridge] No changes to commit');
                    return;
                }
                // AI 응답 메타데이터 구성
                const aiMetadata = message.aiMetadata || {
                    model: 'windwalker-default',
                    confidence: 0.8,
                    processingTime: 500,
                    tokenCount: 100
                };
                // Git 커밋 생성
                const commitResult = yield this.gitManager.createAIConversationCommit(this.currentConversation.conversationId, message.messageId || this.generateMessageId(), ((_a = message.data) === null || _a === void 0 ? void 0 : _a.content) || 'AI generated changes', 'AI response applied to codebase', message.filesChanged || gitStatus.files.map(f => f.path), aiMetadata);
                // Git 커밋 정보를 IndexedDB에 연결
                yield this.conversationDb.linkGitCommit(this.currentConversation.conversationId, message.messageId || this.generateMessageId(), {
                    commitHash: commitResult.commitHash,
                    shortHash: commitResult.shortHash,
                    message: commitResult.message,
                    filesChanged: commitResult.filesChanged,
                    timestamp: commitResult.timestamp
                }, `AI generated commit for: ${((_b = message.data) === null || _b === void 0 ? void 0 : _b.content) || 'changes'}`);
                // 웹뷰에 Git 커밋 완료 알림
                yield webview.postMessage({
                    type: 'git:committed',
                    data: {
                        commitHash: commitResult.shortHash,
                        message: commitResult.message,
                        filesChanged: commitResult.filesChanged.length,
                        conversationId: this.currentConversation.conversationId
                    },
                    timestamp: Date.now()
                });
                console.log(`✅ Git commit created and linked: ${commitResult.shortHash}`);
            }
            catch (error) {
                console.error('[EnhancedMessageBridge] Git integration error:', error);
                // 에러를 웹뷰에 알림
                yield webview.postMessage({
                    type: 'git:error',
                    data: {
                        error: error.message,
                        conversationId: (_c = this.currentConversation) === null || _c === void 0 ? void 0 : _c.conversationId
                    },
                    timestamp: Date.now()
                });
            }
        });
    }
    // === Enhanced Message Handlers ===
    handleConversationStart(message) {
        return __awaiter(this, void 0, void 0, function* () {
            const { userId, projectType } = message.data;
            const conversationId = yield this.conversationDb.createConversation(userId, projectType || this.inferProjectType());
            this.currentConversation = {
                conversationId,
                userId,
                projectType: projectType || this.inferProjectType(),
                messageHistory: []
            };
            return {
                conversationId,
                projectType: this.currentConversation.projectType,
                message: 'New conversation started'
            };
        });
    }
    handleConversationEnd(message) {
        return __awaiter(this, void 0, void 0, function* () {
            if (this.currentConversation) {
                const result = yield this.endCurrentConversation();
                return {
                    conversationId: result.conversationId,
                    totalMessages: result.totalMessages,
                    duration: result.duration,
                    message: 'Conversation ended successfully'
                };
            }
            return { message: 'No active conversation to end' };
        });
    }
    handleConversationHistory(message) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            const { userId, limit = 20 } = message.data;
            const history = yield this.conversationDb.getUserConversationHistory(userId || ((_a = this.currentConversation) === null || _a === void 0 ? void 0 : _a.userId) || 'anonymous', limit);
            return {
                conversations: history,
                totalCount: history.length,
                userId
            };
        });
    }
    handleGitCommit(message) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            if (!this.featureFlagManager.isEnabled('git-integration')) {
                throw new Error('Git integration is disabled');
            }
            // 수동 Git 커밋 요청 처리
            message.requiresGitCommit = true;
            return {
                message: 'Manual Git commit will be processed',
                conversationId: (_a = this.currentConversation) === null || _a === void 0 ? void 0 : _a.conversationId
            };
        });
    }
    handleGitRevert(message) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            if (!this.featureFlagManager.isEnabled('git-integration')) {
                throw new Error('Git integration is disabled');
            }
            const { conversationId, stepsBack } = message.data;
            const revertResult = yield this.gitManager.revertToConversationState(conversationId || ((_a = this.currentConversation) === null || _a === void 0 ? void 0 : _a.conversationId), stepsBack);
            return {
                reverted: true,
                targetCommit: revertResult.targetCommit.substring(0, 8),
                stepsReverted: revertResult.stepsReverted,
                message: revertResult.commitMessage
            };
        });
    }
    handleGitStatus(message) {
        return __awaiter(this, void 0, void 0, function* () {
            const status = yield this.gitManager.getStatus();
            const currentCommit = yield this.gitManager.getCurrentCommit();
            return {
                modified: status.files.length,
                files: status.files.map(f => ({ path: f.path, status: f.index })),
                currentCommit: {
                    hash: currentCommit.hash.substring(0, 8),
                    message: currentCommit.message
                }
            };
        });
    }
    handleGitHistory(message) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b;
            const conversationId = ((_a = message.data) === null || _a === void 0 ? void 0 : _a.conversationId) || ((_b = this.currentConversation) === null || _b === void 0 ? void 0 : _b.conversationId);
            if (!conversationId) {
                throw new Error('No conversation ID provided for Git history');
            }
            const commits = yield this.gitManager.getConversationCommits(conversationId);
            return {
                conversationId,
                commits: commits.all.map(commit => ({
                    hash: commit.hash.substring(0, 8),
                    message: commit.message,
                    date: commit.date,
                    author: commit.author_name
                }))
            };
        });
    }
    handlePersonalizationAnalyze(message) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b;
            if (!this.featureFlagManager.isEnabled('personalization-engine')) {
                throw new Error('Personalization engine is disabled');
            }
            const userId = ((_a = message.data) === null || _a === void 0 ? void 0 : _a.userId) || ((_b = this.currentConversation) === null || _b === void 0 ? void 0 : _b.userId) || 'anonymous';
            const analysis = yield this.conversationDb.analyzeUserPatterns(userId);
            return {
                userId,
                analysis,
                recommendations: this.generatePersonalizationRecommendations(analysis)
            };
        });
    }
    handlePersonalizationRecommend(message) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            const { userRequest, context } = message.data;
            const userId = ((_a = this.currentConversation) === null || _a === void 0 ? void 0 : _a.userId) || 'anonymous';
            // 사용자 패턴 기반 개인화된 추천
            const patterns = yield this.conversationDb.analyzeUserPatterns(userId);
            const recommendations = this.generateContextualRecommendations(userRequest, patterns, context);
            return {
                userRequest,
                personalizedRecommendations: recommendations,
                basedOnHistory: true,
                patternCount: patterns.totalConversations
            };
        });
    }
    handlePersonalizationProfile(message) {
        return __awaiter(this, void 0, void 0, function* () {
            const { userId, profileUpdates } = message.data;
            if (profileUpdates) {
                yield this.conversationDb.updateUserProfile(userId, profileUpdates);
            }
            const patterns = yield this.conversationDb.analyzeUserPatterns(userId);
            return {
                userId,
                profile: {
                    totalConversations: patterns.totalConversations,
                    totalMessages: patterns.totalMessages,
                    preferredProjectTypes: patterns.preferredProjectTypes,
                    commonPatterns: patterns.commonRequestPatterns.slice(0, 5),
                    peakHours: patterns.peakActivityHours
                }
            };
        });
    }
    handleFeatureStatus(message) {
        return __awaiter(this, void 0, void 0, function* () {
            const allFlags = this.featureFlagManager.getAllFlags();
            const enabledFlags = this.featureFlagManager.getEnabledFlags();
            return {
                allFlags,
                enabledFlags,
                totalFlags: Object.keys(allFlags).length,
                enabledCount: enabledFlags.length
            };
        });
    }
    handleFeatureToggle(message) {
        return __awaiter(this, void 0, void 0, function* () {
            const { flagName, enabled } = message.data;
            if (enabled !== undefined) {
                if (enabled) {
                    this.featureFlagManager.enableFlag(flagName);
                }
                else {
                    this.featureFlagManager.disableFlag(flagName);
                }
            }
            else {
                this.featureFlagManager.toggleFlag(flagName);
            }
            const isEnabled = this.featureFlagManager.isEnabled(flagName);
            return {
                flagName,
                enabled: isEnabled,
                message: `Feature '${flagName}' is now ${isEnabled ? 'enabled' : 'disabled'}`
            };
        });
    }
    handleConversationAnalytics(message) {
        return __awaiter(this, void 0, void 0, function* () {
            const gitAnalytics = yield this.gitManager.extractConversationAnalytics();
            return {
                totalConversations: gitAnalytics.length,
                uniqueUsers: [...new Set(gitAnalytics.map(a => a.conversationId))].length,
                averageConfidence: gitAnalytics.reduce((sum, a) => sum + a.confidence, 0) / gitAnalytics.length,
                popularModels: this.groupByModel(gitAnalytics),
                recentActivity: gitAnalytics.slice(-10)
            };
        });
    }
    // === Helper Methods ===
    endCurrentConversation() {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this.currentConversation) {
                throw new Error('No active conversation to end');
            }
            const conversation = yield this.conversationDb.getConversation(this.currentConversation.conversationId);
            if (conversation) {
                const duration = Date.now() - conversation.createdAt.getTime();
                // 대화 완료 상태로 업데이트 (실제 업데이트 메소드 필요)
                console.log(`✅ Conversation ended: ${this.currentConversation.conversationId}`);
                const result = {
                    conversationId: this.currentConversation.conversationId,
                    totalMessages: conversation.totalMessages,
                    duration: Math.round(duration / 60000) // 분 단위
                };
                this.currentConversation = null;
                return result;
            }
            throw new Error('Failed to end conversation');
        });
    }
    generateMessageId() {
        return `msg_${Date.now()}_${++this.messageIdCounter}_${Math.random().toString(36).substr(2, 6)}`;
    }
    inferProjectType() {
        var _a;
        // 워크스페이스에서 프로젝트 타입 추론
        const workspaceFolder = (_a = vscode.workspace.workspaceFolders) === null || _a === void 0 ? void 0 : _a[0];
        if (!workspaceFolder)
            return 'unknown';
        // package.json으로 프로젝트 타입 감지
        try {
            const packageJsonPath = vscode.Uri.joinPath(workspaceFolder.uri, 'package.json');
            // 실제로는 파일 읽기 필요
            return 'react'; // 기본값
        }
        catch (_b) {
            return 'html-css-js';
        }
    }
    generatePersonalizationRecommendations(analysis) {
        const recommendations = [];
        // 선호 프로젝트 타입 기반
        if (analysis.preferredProjectTypes.length > 0) {
            const topType = analysis.preferredProjectTypes[0].type;
            recommendations.push(`Continue with ${topType} projects for better personalization`);
        }
        // 자주 사용하는 패턴 기반
        if (analysis.commonRequestPatterns.length > 0) {
            const topPattern = analysis.commonRequestPatterns[0].pattern;
            recommendations.push(`Try advanced ${topPattern} features`);
        }
        return recommendations;
    }
    generateContextualRecommendations(userRequest, patterns, context) {
        const recommendations = [];
        // 컨텍스트 기반 개인화 추천 로직
        const requestLower = userRequest.toLowerCase();
        if (requestLower.includes('색상') || requestLower.includes('color')) {
            recommendations.push('Based on your history, try using your preferred color palette');
        }
        if (requestLower.includes('버튼') || requestLower.includes('button')) {
            recommendations.push('Consider your frequently used button styles');
        }
        return recommendations;
    }
    groupByModel(analytics) {
        const modelGroups = {};
        analytics.forEach(item => {
            modelGroups[item.aiModel] = (modelGroups[item.aiModel] || 0) + 1;
        });
        return modelGroups;
    }
}
exports.EnhancedMessageBridge = EnhancedMessageBridge;
//# sourceMappingURL=EnhancedMessageBridge.js.map