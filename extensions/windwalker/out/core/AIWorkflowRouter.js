"use strict";
// [의도] AI 대화식 웹사이트 빌더 워크플로우 라우팅 시스템
// [책임] AI 워크플로우 메시지를 적절한 서비스로 라우팅, 워크플로우 단계 관리
Object.defineProperty(exports, "__esModule", { value: true });
exports.AIWorkflowRouter = void 0;
class AIWorkflowRouter {
    constructor(context) {
        this.name = 'AIWorkflowRouter';
        this.activeSessions = new Map();
        this.context = context;
        this.stepHandlers = new Map();
        this.initializeStepHandlers();
        console.log('[AIWorkflowRouter] Initialized');
    }
    async initialize() {
        // 활성 세션 복원 (필요시)
        await this.restoreActiveSessions();
        console.log(`✅ AIWorkflowRouter initialized with ${this.stepHandlers.size} step handlers`);
    }
    dispose() {
        // 모든 활성 세션 종료
        for (const [conversationId] of this.activeSessions) {
            this.endWorkflowSession(conversationId).catch(error => {
                console.error(`Error ending session ${conversationId}:`, error);
            });
        }
        this.activeSessions.clear();
        console.log('[AIWorkflowRouter] Disposed');
    }
    /**
     * 메인 라우팅 메소드 - Enhanced Message를 적절한 워크플로우로 라우팅
     */
    async route(message) {
        try {
            console.log(`[AIWorkflowRouter] Routing message: ${message.type}`);
            // 대화 세션 확인/생성
            let session = await this.getOrCreateSession(message);
            // 메시지 타입에 따른 워크플로우 단계 결정
            const workflowStep = this.determineWorkflowStep(message, session);
            if (!workflowStep) {
                return {
                    success: false,
                    error: `No workflow step found for message type: ${message.type}`
                };
            }
            // 워크플로우 단계 실행
            const result = await this.executeWorkflowStep(workflowStep, session);
            // 세션 업데이트
            await this.updateSession(session, workflowStep, result);
            return result;
        }
        catch (error) {
            console.error('[AIWorkflowRouter] Routing error:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : String(error)
            };
        }
    }
    /**
     * 워크플로우 세션 시작
     */
    async startWorkflowSession(conversationId, workflowType, initialRequest) {
        const session = {
            conversationId,
            workflowType,
            status: 'active',
            startTime: Date.now(),
            currentStep: 1,
            steps: [],
            context: {
                userRequest: initialRequest,
                customizations: []
            }
        };
        this.activeSessions.set(conversationId, session);
        console.log(`[AIWorkflowRouter] Started workflow session: ${conversationId} (${workflowType})`);
        return session;
    }
    /**
     * 워크플로우 세션 종료
     */
    async endWorkflowSession(conversationId) {
        const session = this.activeSessions.get(conversationId);
        if (!session) {
            return null;
        }
        session.status = 'completed';
        session.endTime = Date.now();
        // 세션 정리 (필요시 저장)
        this.activeSessions.delete(conversationId);
        console.log(`[AIWorkflowRouter] Ended workflow session: ${conversationId}`);
        return session;
    }
    /**
     * 활성 세션 조회
     */
    getActiveSession(conversationId) {
        return this.activeSessions.get(conversationId) || null;
    }
    /**
     * 모든 활성 세션 조회
     */
    getActiveSessions() {
        return Array.from(this.activeSessions.values());
    }
    // === Private Methods ===
    initializeStepHandlers() {
        this.stepHandlers.set('intent-analysis', this.handleIntentAnalysis.bind(this));
        this.stepHandlers.set('template-recommendation', this.handleTemplateRecommendation.bind(this));
        this.stepHandlers.set('template-application', this.handleTemplateApplication.bind(this));
        this.stepHandlers.set('customization-generation', this.handleCustomizationGeneration.bind(this));
        this.stepHandlers.set('customization-application', this.handleCustomizationApplication.bind(this));
        this.stepHandlers.set('preview-generation', this.handlePreviewGeneration.bind(this));
        this.stepHandlers.set('user-feedback', this.handleUserFeedback.bind(this));
        console.log(`[AIWorkflowRouter] Registered ${this.stepHandlers.size} step handlers`);
    }
    async restoreActiveSessions() {
        // VS Code 확장 상태에서 활성 세션 복원 (필요시)
        try {
            const saved = this.context.globalState.get('windwalker.activeSessions');
            if (saved && Array.isArray(saved)) {
                saved.forEach(session => {
                    this.activeSessions.set(session.conversationId, session);
                });
                console.log(`[AIWorkflowRouter] Restored ${saved.length} active sessions`);
            }
        }
        catch (error) {
            console.error('[AIWorkflowRouter] Failed to restore sessions:', error);
        }
    }
    async getOrCreateSession(message) {
        var _a, _b;
        const conversationId = message.conversationId || `conv-${Date.now()}`;
        let session = this.activeSessions.get(conversationId);
        if (!session) {
            // 새 세션 생성
            session = await this.startWorkflowSession(conversationId, this.inferWorkflowType(message), ((_a = message.data) === null || _a === void 0 ? void 0 : _a.content) || ((_b = message.data) === null || _b === void 0 ? void 0 : _b.userRequest) || 'New workflow');
        }
        return session;
    }
    determineWorkflowStep(message, session) {
        const stepType = this.mapMessageTypeToWorkflowStep(message.type);
        if (!stepType) {
            return null;
        }
        const step = {
            step: session.currentStep,
            type: stepType,
            input: message.data,
            status: 'pending',
            timestamp: Date.now()
        };
        return step;
    }
    mapMessageTypeToWorkflowStep(messageType) {
        const mapping = {
            'ai:analyze-intent': 'intent-analysis',
            'template:recommend': 'template-recommendation',
            'template:apply': 'template-application',
            'ai:customize': 'customization-generation',
            'customization:apply': 'customization-application',
            'preview:generate': 'preview-generation',
            'user:feedback': 'user-feedback'
        };
        return mapping[messageType] || null;
    }
    inferWorkflowType(message) {
        var _a, _b;
        // 메시지 내용을 분석하여 워크플로우 타입 추론
        const content = ((_a = message.data) === null || _a === void 0 ? void 0 : _a.content) || ((_b = message.data) === null || _b === void 0 ? void 0 : _b.userRequest) || '';
        const lowerContent = content.toLowerCase();
        if (lowerContent.includes('website') || lowerContent.includes('site')) {
            return 'website-builder';
        }
        else if (lowerContent.includes('template')) {
            return 'template-workflow';
        }
        else if (lowerContent.includes('customize') || lowerContent.includes('modify')) {
            return 'customization-workflow';
        }
        return 'general-workflow';
    }
    async executeWorkflowStep(step, session) {
        const startTime = Date.now();
        step.status = 'processing';
        try {
            const handler = this.stepHandlers.get(step.type);
            if (!handler) {
                throw new Error(`No handler found for workflow step: ${step.type}`);
            }
            const result = await handler(step, session);
            step.status = 'completed';
            step.output = result.data;
            step.processingTime = Date.now() - startTime;
            return result;
        }
        catch (error) {
            step.status = 'error';
            step.error = error instanceof Error ? error.message : String(error);
            step.processingTime = Date.now() - startTime;
            return {
                success: false,
                error: step.error
            };
        }
    }
    async updateSession(session, step, result) {
        // 단계를 세션에 추가
        session.steps.push(step);
        // 다음 단계 설정
        if (result.success && result.nextStep) {
            session.currentStep += 1;
        }
        // 세션 상태 업데이트
        if (step.status === 'error') {
            session.status = 'error';
        }
        // 세션 저장 (필요시)
        await this.saveSessionState();
    }
    async saveSessionState() {
        try {
            const sessions = Array.from(this.activeSessions.values());
            await this.context.globalState.update('windwalker.activeSessions', sessions);
        }
        catch (error) {
            console.error('[AIWorkflowRouter] Failed to save session state:', error);
        }
    }
    // === Workflow Step Handlers ===
    async handleIntentAnalysis(step, session) {
        const userRequest = step.input.userRequest || step.input.content;
        console.log(`[AIWorkflowRouter] Analyzing intent for: ${userRequest}`);
        // Phase 1: 간단한 키워드 기반 의도 분석
        const lowerRequest = userRequest.toLowerCase();
        let category = 'general';
        let confidence = 0.5;
        if (lowerRequest.includes('restaurant') || lowerRequest.includes('food') || lowerRequest.includes('menu')) {
            category = 'restaurant';
            confidence = 0.9;
        }
        else if (lowerRequest.includes('portfolio') || lowerRequest.includes('showcase')) {
            category = 'portfolio';
            confidence = 0.85;
        }
        else if (lowerRequest.includes('blog') || lowerRequest.includes('article')) {
            category = 'blog';
            confidence = 0.8;
        }
        else if (lowerRequest.includes('ecommerce') || lowerRequest.includes('shop') || lowerRequest.includes('store')) {
            category = 'ecommerce';
            confidence = 0.88;
        }
        else if (lowerRequest.includes('business') || lowerRequest.includes('company')) {
            category = 'business';
            confidence = 0.75;
        }
        // 세션 컨텍스트 업데이트
        session.context.templateCategory = category;
        return {
            success: true,
            data: {
                intent: category,
                confidence: confidence,
                keywords: this.extractKeywords(userRequest),
                suggestedNext: 'template-recommendation'
            },
            nextStep: 'template-recommendation',
            metadata: {
                processingTime: Date.now() - step.timestamp,
                confidence: confidence,
                source: 'AIWorkflowRouter'
            }
        };
    }
    async handleTemplateRecommendation(step, session) {
        const category = session.context.templateCategory || 'general';
        console.log(`[AIWorkflowRouter] Recommending templates for category: ${category}`);
        // Phase 1: Mock template recommendations
        const templates = this.getTemplatesForCategory(category);
        return {
            success: true,
            data: {
                category: category,
                recommendations: templates,
                total: templates.length
            },
            nextStep: 'template-application',
            metadata: {
                processingTime: Date.now() - step.timestamp,
                confidence: 0.9,
                source: 'TemplateManager'
            }
        };
    }
    async handleTemplateApplication(step, session) {
        const templateId = step.input.templateId;
        console.log(`[AIWorkflowRouter] Applying template: ${templateId}`);
        // 세션 컨텍스트 업데이트
        session.context.selectedTemplate = templateId;
        // Phase 1: Mock template application
        const result = {
            templateId: templateId,
            status: 'applied',
            files: [
                'index.html',
                'styles.css',
                'script.js'
            ],
            previewUrl: 'http://localhost:3000'
        };
        return {
            success: true,
            data: result,
            nextStep: 'customization-generation',
            metadata: {
                processingTime: Date.now() - step.timestamp,
                confidence: 1.0,
                source: 'TemplateManager'
            }
        };
    }
    async handleCustomizationGeneration(step, session) {
        const customizationRequest = step.input.customizationRequest || step.input.content;
        console.log(`[AIWorkflowRouter] Generating customizations for: ${customizationRequest}`);
        // Phase 1: Mock customization options
        const options = [
            {
                level: 'conservative',
                description: 'Subtle changes that maintain the original design',
                changes: { colors: { primary: '#2c5f4f' }, typography: { fontSize: '16px' } }
            },
            {
                level: 'balanced',
                description: 'Moderate improvements to modernize the design',
                changes: { colors: { primary: '#1976d2' }, layout: { spacing: 'relaxed' } }
            },
            {
                level: 'bold',
                description: 'Complete design overhaul with modern elements',
                changes: { colors: { primary: '#e91e63' }, layout: { grid: 'masonry' } }
            }
        ];
        return {
            success: true,
            data: {
                request: customizationRequest,
                options: options,
                total: options.length
            },
            nextStep: 'customization-application',
            metadata: {
                processingTime: Date.now() - step.timestamp,
                confidence: 0.85,
                source: 'CustomizationEngine'
            }
        };
    }
    async handleCustomizationApplication(step, session) {
        const selectedCustomization = step.input.selectedCustomization;
        console.log(`[AIWorkflowRouter] Applying customization: ${selectedCustomization === null || selectedCustomization === void 0 ? void 0 : selectedCustomization.level}`);
        // 세션 컨텍스트 업데이트
        session.context.customizations.push(selectedCustomization);
        return {
            success: true,
            data: {
                applied: selectedCustomization,
                previewUrl: 'http://localhost:3000',
                changedFiles: ['styles.css', 'script.js']
            },
            nextStep: 'preview-generation',
            metadata: {
                processingTime: Date.now() - step.timestamp,
                confidence: 0.95,
                source: 'CustomizationEngine'
            }
        };
    }
    async handlePreviewGeneration(step, session) {
        console.log(`[AIWorkflowRouter] Generating preview for session: ${session.conversationId}`);
        // Phase 1: Mock preview generation
        const previews = [
            {
                type: 'desktop',
                url: 'http://localhost:3000',
                screenshot: '/previews/desktop.png'
            },
            {
                type: 'mobile',
                url: 'http://localhost:3000',
                screenshot: '/previews/mobile.png'
            }
        ];
        return {
            success: true,
            data: {
                previews: previews,
                ready: true,
                generatedAt: Date.now()
            },
            nextStep: 'user-feedback',
            metadata: {
                processingTime: Date.now() - step.timestamp,
                confidence: 1.0,
                source: 'PreviewGenerator'
            }
        };
    }
    async handleUserFeedback(step, session) {
        const feedback = step.input.feedback;
        console.log(`[AIWorkflowRouter] Processing user feedback: ${feedback === null || feedback === void 0 ? void 0 : feedback.type}`);
        // 피드백 유형에 따라 다음 단계 결정
        let nextStep;
        if ((feedback === null || feedback === void 0 ? void 0 : feedback.type) === 'customize') {
            nextStep = 'customization-generation';
        }
        else if ((feedback === null || feedback === void 0 ? void 0 : feedback.type) === 'template') {
            nextStep = 'template-recommendation';
        }
        return {
            success: true,
            data: {
                feedback: feedback,
                processed: true,
                suggestedNext: nextStep
            },
            nextStep: nextStep,
            metadata: {
                processingTime: Date.now() - step.timestamp,
                confidence: 0.8,
                source: 'FeedbackProcessor'
            }
        };
    }
    // === Helper Methods ===
    extractKeywords(text) {
        if (!text)
            return [];
        const stopWords = ['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by'];
        const words = text.toLowerCase().split(/\W+/).filter(word => word.length > 2 && !stopWords.includes(word));
        return [...new Set(words)];
    }
    getTemplatesForCategory(category) {
        const templateMap = {
            restaurant: [
                { id: 'restaurant-modern', name: 'Modern Restaurant', description: 'Clean modern design', confidence: 0.95 },
                { id: 'restaurant-classic', name: 'Classic Restaurant', description: 'Traditional elegant style', confidence: 0.87 },
                { id: 'cafe-minimal', name: 'Minimal Cafe', description: 'Minimalist cafe design', confidence: 0.78 }
            ],
            portfolio: [
                { id: 'portfolio-creative', name: 'Creative Portfolio', description: 'For creative professionals', confidence: 0.92 },
                { id: 'portfolio-minimal', name: 'Minimal Portfolio', description: 'Clean minimal design', confidence: 0.85 },
                { id: 'portfolio-showcase', name: 'Showcase Portfolio', description: 'Highlight your work', confidence: 0.88 }
            ],
            blog: [
                { id: 'blog-magazine', name: 'Magazine Style', description: 'Magazine-inspired layout', confidence: 0.90 },
                { id: 'blog-minimal', name: 'Minimal Blog', description: 'Focus on content', confidence: 0.83 },
                { id: 'blog-personal', name: 'Personal Blog', description: 'Personal storytelling', confidence: 0.86 }
            ],
            ecommerce: [
                { id: 'ecommerce-modern', name: 'Modern Store', description: 'Contemporary online store', confidence: 0.94 },
                { id: 'ecommerce-classic', name: 'Classic Store', description: 'Traditional store layout', confidence: 0.89 },
                { id: 'marketplace', name: 'Marketplace', description: 'Multi-vendor platform', confidence: 0.81 }
            ],
            general: [
                { id: 'landing-modern', name: 'Modern Landing', description: 'Modern landing page', confidence: 0.85 },
                { id: 'landing-minimal', name: 'Minimal Landing', description: 'Simple clean design', confidence: 0.80 },
                { id: 'business-professional', name: 'Business Pro', description: 'Professional business site', confidence: 0.88 }
            ]
        };
        return templateMap[category] || templateMap.general;
    }
}
exports.AIWorkflowRouter = AIWorkflowRouter;
//# sourceMappingURL=AIWorkflowRouter.js.map