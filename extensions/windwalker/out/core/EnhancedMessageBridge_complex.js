"use strict";
// [의도] 기존 MessageBridge의 확장 - AI 대화식 웹사이트 빌더 통합
// [책임] AI 대화식 웹사이트 빌더의 중앙 메시지 라우터, 템플릿 관리, 대화 AI 통합
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.EnhancedMessageBridge = void 0;
const vscode = __importStar(require("vscode"));
const MessageBridge_1 = require("./MessageBridge");
class EnhancedMessageBridge extends MessageBridge_1.MessageBridge {
    constructor(context, serviceRegistry) {
        super(context);
        this.name = 'EnhancedMessageBridge';
        this.currentConversation = null;
        this.messageIdCounter = 0;
        this.serviceRegistry = serviceRegistry;
        console.log('[EnhancedMessageBridge] Initialized with AI conversation capabilities');
    }
    async initialize() {
        // 1. 기본 서비스들 초기화
        this.featureFlagManager = await this.serviceRegistry.getService('FeatureFlagManager');
        // 2. AI 서비스들 초기화
        this.templateManager = await this.serviceRegistry.getService('TemplateManager');
        this.conversationAI = await this.serviceRegistry.getService('ConversationAI');
        // 3. 확장 메시지 핸들러 등록
        this.registerEnhancedHandlers();
        console.log('✅ EnhancedMessageBridge initialized with AI conversation capabilities');
    }
    dispose() {
        this.currentConversation = null;
        console.log('[EnhancedMessageBridge] Disposed');
    }
    /**
     * 확장된 메시지 처리 - AI 대화 워크플로우
     */
    async processMessage(message, webview) {
        try {
            // 대화 컨텍스트 확보
            await this.ensureConversationContext(message, webview);
            // 메시지 ID 생성
            if (!message.messageId) {
                message.messageId = this.generateMessageId();
            }
            console.log(`[EnhancedMessageBridge] Processing AI conversation message: ${message.type}`, {
                conversationId: message.conversationId,
                messageId: message.messageId,
                userId: message.userId
            });
            // AI 대화 처리 (chat:message의 경우)
            if (message.type === 'chat:message' && this.currentConversation) {
                await this.handleAIConversation(message, webview);
            }
            // 기존 MessageBridge 처리
            await super.processMessage(message, webview);
            // 템플릿 적용 처리
            if (this.shouldApplyTemplate(message)) {
                await this.handleTemplateApplication(message, webview);
            }
        }
        catch (error) {
            console.error(`[EnhancedMessageBridge] Enhanced processing error:`, error);
            throw error;
        }
    }
    /**
     * 확장 메시지 핸들러 등록
     */
    registerEnhancedHandlers() {
        // AI 대화 핸들러
        this.messageHandlers.set('ai:chat', this.handleAIChat.bind(this));
        this.messageHandlers.set('ai:intent-analyze', this.handleIntentAnalyze.bind(this));
        // 템플릿 핸들러
        this.messageHandlers.set('template:recommend', this.handleTemplateRecommend.bind(this));
        this.messageHandlers.set('template:apply', this.handleTemplateApply.bind(this));
        this.messageHandlers.set('template:list', this.handleTemplateList.bind(this));
        // 대화 관리 핸들러
        this.messageHandlers.set('conversation:start', this.handleConversationStart.bind(this));
        this.messageHandlers.set('conversation:end', this.handleConversationEnd.bind(this));
        // 기능 플래그 핸들러
        this.messageHandlers.set('feature:status', this.handleFeatureStatus.bind(this));
        this.messageHandlers.set('feature:toggle', this.handleFeatureToggle.bind(this));
    }
    /**
     * 대화 컨텍스트 확보
     */
    async ensureConversationContext(message, webview) {
        // 이미 활성 대화가 있으면 사용
        if (this.currentConversation && message.conversationId === this.currentConversation.conversationId) {
            return;
        }
        // 새 대화 시작
        if (!message.conversationId || !this.currentConversation) {
            const userId = message.userId || 'anonymous';
            const projectType = this.inferProjectType();
            const conversationId = await this.conversationDb.createConversation(userId, projectType, { templateUsed: 'default' });
            this.currentConversation = {
                conversationId,
                userId,
                projectType,
                messageHistory: []
            };
            // 웹뷰에 대화 시작 알림
            await webview.postMessage({
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
    }
    /**
     * 사용자 메시지 저장
     */
    async saveUserMessage(message) {
        if (!this.currentConversation)
            return;
        const messageId = await this.conversationDb.saveMessage(this.currentConversation.conversationId, 'user', message.data.content, {
            messageMetadata: {
                requestId: message.requestId,
                timestamp: message.timestamp,
                webviewType: 'chat'
            }
        });
        console.log(`✅ User message saved: ${messageId}`);
    }
    /**
     * AI 응답 저장 (기존 핸들러에서 호출)
     */
    async saveAIResponse(userMessage, aiResponse, aiMetadata) {
        if (!this.currentConversation) {
            throw new Error('No active conversation for AI response');
        }
        const messageId = await this.conversationDb.saveMessage(this.currentConversation.conversationId, 'ai', aiResponse.content || JSON.stringify(aiResponse), {
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
    async handleGitIntegration(message, webview) {
        var _a, _b, _c;
        if (!this.currentConversation)
            return;
        try {
            // Git 상태 확인
            const gitStatus = await this.gitManager.getStatus();
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
            const commitResult = await this.gitManager.createAIConversationCommit(this.currentConversation.conversationId, message.messageId || this.generateMessageId(), ((_a = message.data) === null || _a === void 0 ? void 0 : _a.content) || 'AI generated changes', 'AI response applied to codebase', message.filesChanged || gitStatus.files.map(f => f.path), aiMetadata);
            // Git 커밋 정보를 IndexedDB에 연결
            await this.conversationDb.linkGitCommit(this.currentConversation.conversationId, message.messageId || this.generateMessageId(), {
                commitHash: commitResult.commitHash,
                shortHash: commitResult.shortHash,
                message: commitResult.message,
                filesChanged: commitResult.filesChanged,
                timestamp: commitResult.timestamp
            }, `AI generated commit for: ${((_b = message.data) === null || _b === void 0 ? void 0 : _b.content) || 'changes'}`);
            // 웹뷰에 Git 커밋 완료 알림
            await webview.postMessage({
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
            await webview.postMessage({
                type: 'git:error',
                data: {
                    error: error.message,
                    conversationId: (_c = this.currentConversation) === null || _c === void 0 ? void 0 : _c.conversationId
                },
                timestamp: Date.now()
            });
        }
    }
    // === Enhanced Message Handlers ===
    async handleConversationStart(message) {
        const { userId, projectType } = message.data;
        const conversationId = await this.conversationDb.createConversation(userId, projectType || this.inferProjectType());
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
    }
    async handleConversationEnd(message) {
        if (this.currentConversation) {
            const result = await this.endCurrentConversation();
            return {
                conversationId: result.conversationId,
                totalMessages: result.totalMessages,
                duration: result.duration,
                message: 'Conversation ended successfully'
            };
        }
        return { message: 'No active conversation to end' };
    }
    async handleConversationHistory(message) {
        var _a;
        const { userId, limit = 20 } = message.data;
        const history = await this.conversationDb.getUserConversationHistory(userId || ((_a = this.currentConversation) === null || _a === void 0 ? void 0 : _a.userId) || 'anonymous', limit);
        return {
            conversations: history,
            totalCount: history.length,
            userId
        };
    }
    async handleGitCommit(message) {
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
    }
    async handleGitRevert(message) {
        var _a;
        if (!this.featureFlagManager.isEnabled('git-integration')) {
            throw new Error('Git integration is disabled');
        }
        const { conversationId, stepsBack } = message.data;
        const revertResult = await this.gitManager.revertToConversationState(conversationId || ((_a = this.currentConversation) === null || _a === void 0 ? void 0 : _a.conversationId), stepsBack);
        return {
            reverted: true,
            targetCommit: revertResult.targetCommit.substring(0, 8),
            stepsReverted: revertResult.stepsReverted,
            message: revertResult.commitMessage
        };
    }
    async handleGitStatus(message) {
        const status = await this.gitManager.getStatus();
        const currentCommit = await this.gitManager.getCurrentCommit();
        return {
            modified: status.files.length,
            files: status.files.map(f => ({ path: f.path, status: f.index })),
            currentCommit: {
                hash: currentCommit.hash.substring(0, 8),
                message: currentCommit.message
            }
        };
    }
    async handleGitHistory(message) {
        var _a, _b;
        const conversationId = ((_a = message.data) === null || _a === void 0 ? void 0 : _a.conversationId) || ((_b = this.currentConversation) === null || _b === void 0 ? void 0 : _b.conversationId);
        if (!conversationId) {
            throw new Error('No conversation ID provided for Git history');
        }
        const commits = await this.gitManager.getConversationCommits(conversationId);
        return {
            conversationId,
            commits: commits.all.map(commit => ({
                hash: commit.hash.substring(0, 8),
                message: commit.message,
                date: commit.date,
                author: commit.author_name
            }))
        };
    }
    async handlePersonalizationAnalyze(message) {
        var _a, _b;
        if (!this.featureFlagManager.isEnabled('personalization-engine')) {
            throw new Error('Personalization engine is disabled');
        }
        const userId = ((_a = message.data) === null || _a === void 0 ? void 0 : _a.userId) || ((_b = this.currentConversation) === null || _b === void 0 ? void 0 : _b.userId) || 'anonymous';
        const analysis = await this.conversationDb.analyzeUserPatterns(userId);
        return {
            userId,
            analysis,
            recommendations: this.generatePersonalizationRecommendations(analysis)
        };
    }
    async handlePersonalizationRecommend(message) {
        var _a;
        const { userRequest, context } = message.data;
        const userId = ((_a = this.currentConversation) === null || _a === void 0 ? void 0 : _a.userId) || 'anonymous';
        // 사용자 패턴 기반 개인화된 추천
        const patterns = await this.conversationDb.analyzeUserPatterns(userId);
        const recommendations = this.generateContextualRecommendations(userRequest, patterns, context);
        return {
            userRequest,
            personalizedRecommendations: recommendations,
            basedOnHistory: true,
            patternCount: patterns.totalConversations
        };
    }
    async handlePersonalizationProfile(message) {
        const { userId, profileUpdates } = message.data;
        if (profileUpdates) {
            await this.conversationDb.updateUserProfile(userId, profileUpdates);
        }
        const patterns = await this.conversationDb.analyzeUserPatterns(userId);
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
    }
    async handleFeatureStatus(message) {
        const allFlags = this.featureFlagManager.getAllFlags();
        const enabledFlags = this.featureFlagManager.getEnabledFlags();
        return {
            allFlags,
            enabledFlags,
            totalFlags: Object.keys(allFlags).length,
            enabledCount: enabledFlags.length
        };
    }
    async handleFeatureToggle(message) {
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
    }
    async handleConversationAnalytics(message) {
        const gitAnalytics = await this.gitManager.extractConversationAnalytics();
        return {
            totalConversations: gitAnalytics.length,
            uniqueUsers: [...new Set(gitAnalytics.map(a => a.conversationId))].length,
            averageConfidence: gitAnalytics.reduce((sum, a) => sum + a.confidence, 0) / gitAnalytics.length,
            popularModels: this.groupByModel(gitAnalytics),
            recentActivity: gitAnalytics.slice(-10)
        };
    }
    // === Helper Methods ===
    async endCurrentConversation() {
        if (!this.currentConversation) {
            throw new Error('No active conversation to end');
        }
        const conversation = await this.conversationDb.getConversation(this.currentConversation.conversationId);
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
//# sourceMappingURL=EnhancedMessageBridge_complex.js.map