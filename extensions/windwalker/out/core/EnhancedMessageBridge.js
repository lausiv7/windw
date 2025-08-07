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
        this.historyTracker = await this.serviceRegistry.getService('ConversationHistoryTracker');
        // 3. 확장 메시지 핸들러 등록
        this.registerEnhancedHandlers();
        console.log('✅ EnhancedMessageBridge initialized with AI conversation capabilities and history tracking');
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
        this.messageHandlers.set('conversation:history', this.handleConversationHistory.bind(this));
        this.messageHandlers.set('conversation:rollback', this.handleConversationRollback.bind(this));
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
            const conversationId = this.generateConversationId();
            this.currentConversation = {
                conversationId,
                userId,
                projectType: this.inferProjectType(),
                previousIntents: [],
                userPreferences: {
                    preferredStyle: 'modern',
                    colorPreference: 'neutral',
                    complexityLevel: 'beginner'
                }
            };
            // 웹뷰에 대화 시작 알림
            await webview.postMessage({
                type: 'conversation:started',
                data: {
                    conversationId,
                    userId,
                    projectType: this.currentConversation.projectType
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
     * AI 대화 처리
     */
    async handleAIConversation(message, webview) {
        var _a, _b;
        if (!this.currentConversation)
            return;
        try {
            // 1. 사용자 의도 분석
            const userMessage = ((_a = message.data) === null || _a === void 0 ? void 0 : _a.content) || ((_b = message.data) === null || _b === void 0 ? void 0 : _b.message) || '';
            const intent = await this.conversationAI.analyzeUserIntent(userMessage, this.currentConversation);
            // 2. 의도 기반 AI 응답 생성
            const aiResponse = await this.conversationAI.generateResponse(intent, userMessage);
            // 3. 개인화된 응답으로 변환
            const personalizedResponse = this.conversationAI.personalizeResponse(aiResponse, this.currentConversation);
            // 4. 대화 컨텍스트 업데이트
            this.currentConversation = this.conversationAI.updateConversationContext(this.currentConversation, intent.primary, intent.entities);
            // 5. 대화 히스토리에 추가
            await this.historyTracker.addConversation({
                message: userMessage,
                intent: intent.primary,
                response: personalizedResponse.message,
                metadata: {
                    confidence: intent.confidence,
                    entities: intent.entities,
                    conversationId: this.currentConversation.conversationId
                }
            });
            // 6. 웹뷰에 AI 응답 전송
            await webview.postMessage({
                type: 'ai:response',
                data: Object.assign(Object.assign({}, personalizedResponse), { intent: intent.primary, confidence: intent.confidence, conversationId: this.currentConversation.conversationId }),
                timestamp: Date.now(),
                requestId: message.requestId
            });
            console.log(`✅ AI conversation processed: ${intent.primary} (confidence: ${intent.confidence.toFixed(2)})`);
        }
        catch (error) {
            console.error('[EnhancedMessageBridge] AI conversation error:', error);
            await webview.postMessage({
                type: 'ai:error',
                data: {
                    error: 'AI 처리 중 오류가 발생했습니다.',
                    conversationId: this.currentConversation.conversationId
                },
                timestamp: Date.now(),
                requestId: message.requestId
            });
        }
    }
    /**
     * 템플릿 적용 여부 판단
     */
    shouldApplyTemplate(message) {
        if (message.requiresTemplate || message.templateId) {
            return true;
        }
        // 템플릿 관련 메시지 타입들
        const templateTriggerTypes = ['template:apply', 'template:recommend'];
        return templateTriggerTypes.includes(message.type);
    }
    /**
     * 템플릿 적용 처리
     */
    async handleTemplateApplication(message, webview) {
        var _a;
        if (!message.templateId)
            return;
        try {
            const result = await this.templateManager.applyTemplate(message.templateId, (_a = message.data) === null || _a === void 0 ? void 0 : _a.customizations);
            await webview.postMessage({
                type: 'template:applied',
                data: result,
                timestamp: Date.now(),
                requestId: message.requestId
            });
            console.log(`✅ Template applied: ${message.templateId}`);
        }
        catch (error) {
            const errorMsg = error instanceof Error ? error.message : String(error);
            console.error('[EnhancedMessageBridge] Template application error:', error);
            await webview.postMessage({
                type: 'template:error',
                data: {
                    error: errorMsg,
                    templateId: message.templateId
                },
                timestamp: Date.now(),
                requestId: message.requestId
            });
        }
    }
    // === Enhanced Message Handlers ===
    async handleAIChat(message) {
        var _a, _b;
        const userMessage = ((_a = message.data) === null || _a === void 0 ? void 0 : _a.content) || ((_b = message.data) === null || _b === void 0 ? void 0 : _b.message) || '';
        if (!this.currentConversation) {
            throw new Error('No active conversation for AI chat');
        }
        const intent = await this.conversationAI.analyzeUserIntent(userMessage, this.currentConversation);
        const response = await this.conversationAI.generateResponse(intent, userMessage);
        return Object.assign(Object.assign({}, response), { intent: intent.primary, confidence: intent.confidence, conversationId: this.currentConversation.conversationId });
    }
    async handleIntentAnalyze(message) {
        var _a;
        const userMessage = ((_a = message.data) === null || _a === void 0 ? void 0 : _a.text) || '';
        if (!this.currentConversation) {
            throw new Error('No active conversation for intent analysis');
        }
        const intent = await this.conversationAI.analyzeUserIntent(userMessage, this.currentConversation);
        return {
            intent: intent.primary,
            secondaryIntents: intent.secondary,
            confidence: intent.confidence,
            entities: intent.entities,
            conversationId: this.currentConversation.conversationId
        };
    }
    async handleTemplateRecommend(message) {
        const { intent, userLevel, requirements, preferences } = message.data;
        const recommendations = await this.templateManager.recommendTemplates({
            intent,
            userLevel,
            requirements,
            preferences
        });
        return {
            templates: recommendations,
            count: recommendations.length,
            basedOn: 'user preferences and intent analysis'
        };
    }
    async handleTemplateApply(message) {
        const { templateId, customizations } = message.data;
        const result = await this.templateManager.applyTemplate(templateId, customizations);
        return result;
    }
    async handleTemplateList(message) {
        const { category } = message.data || {};
        if (category) {
            const templates = this.templateManager.getTemplatesByCategory(category);
            return {
                category,
                templates,
                count: templates.length
            };
        }
        else {
            const allTemplates = this.templateManager.getAllTemplates();
            return {
                templates: allTemplates,
                count: allTemplates.length
            };
        }
    }
    async handleConversationStart(message) {
        const { userId, projectType } = message.data;
        const conversationId = this.generateConversationId();
        this.currentConversation = {
            conversationId,
            userId: userId || 'anonymous',
            projectType: projectType || this.inferProjectType(),
            previousIntents: [],
            userPreferences: {
                preferredStyle: 'modern',
                colorPreference: 'neutral',
                complexityLevel: 'beginner'
            }
        };
        return {
            conversationId,
            projectType: this.currentConversation.projectType,
            message: 'New conversation started'
        };
    }
    async handleConversationEnd(message) {
        if (this.currentConversation) {
            const conversationId = this.currentConversation.conversationId;
            this.currentConversation = null;
            return {
                conversationId,
                message: 'Conversation ended successfully'
            };
        }
        return { message: 'No active conversation to end' };
    }
    async handleConversationHistory(message) {
        const { limit, sessionId } = message.data || {};
        if (limit && limit > 0) {
            const history = await this.historyTracker.getRecentConversations(limit);
            return {
                conversations: history,
                count: history.length,
                sessionId: await this.historyTracker.getSessionInfo().then(s => s.sessionId)
            };
        }
        else {
            const history = await this.historyTracker.getConversationHistory(sessionId);
            return {
                conversations: history,
                count: history.length,
                sessionId: sessionId || await this.historyTracker.getSessionInfo().then(s => s.sessionId)
            };
        }
    }
    async handleConversationRollback(message) {
        const { stepIndex, steps } = message.data || {};
        try {
            let targetIndex;
            if (stepIndex !== undefined) {
                targetIndex = stepIndex;
            }
            else if (steps && steps > 0) {
                const currentHistory = await this.historyTracker.getConversationHistory();
                targetIndex = Math.max(0, currentHistory.length - steps - 1);
            }
            else {
                throw new Error('Invalid rollback parameters: provide stepIndex or steps');
            }
            const rolledBackHistory = await this.historyTracker.rollbackToStep(targetIndex);
            return {
                success: true,
                rolledBackTo: targetIndex,
                remainingConversations: rolledBackHistory.length,
                message: `Successfully rolled back to step ${targetIndex}`
            };
        }
        catch (error) {
            const errorMsg = error instanceof Error ? error.message : String(error);
            return {
                success: false,
                error: errorMsg,
                message: 'Failed to rollback conversation'
            };
        }
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
    // === Helper Methods ===
    generateMessageId() {
        return `msg_${Date.now()}_${++this.messageIdCounter}_${Math.random().toString(36).substr(2, 6)}`;
    }
    generateConversationId() {
        return `conv_${Date.now()}_${Math.random().toString(36).substr(2, 8)}`;
    }
    inferProjectType() {
        var _a;
        // 워크스페이스에서 프로젝트 타입 추론
        const workspaceFolder = (_a = vscode.workspace.workspaceFolders) === null || _a === void 0 ? void 0 : _a[0];
        if (!workspaceFolder)
            return 'unknown';
        // package.json으로 프로젝트 타입 감지 (실제 구현은 파일 읽기 필요)
        return 'html-css-js'; // 기본값
    }
}
exports.EnhancedMessageBridge = EnhancedMessageBridge;
//# sourceMappingURL=EnhancedMessageBridge.js.map