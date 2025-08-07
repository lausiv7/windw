"use strict";
// [의도] AI 대화식 웹사이트 빌더의 자연어 처리 및 의도 분석 시스템
// [책임] 사용자 요청 분석, 의도 파악, 템플릿 추천, 대화 컨텍스트 관리
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConversationAI = void 0;
class ConversationAI {
    constructor(context) {
        this.name = 'ConversationAI';
        this.intentPatterns = new Map();
        this.entityPatterns = new Map();
        this.responseTemplates = new Map();
        this.context = context;
    }
    async initialize() {
        this.initializePatterns();
        this.initializeResponseTemplates();
        console.log('✅ ConversationAI initialized with natural language processing');
    }
    dispose() {
        this.intentPatterns.clear();
        this.entityPatterns.clear();
        this.responseTemplates.clear();
        console.log('✅ ConversationAI disposed');
    }
    /**
     * 사용자 메시지에서 의도 분석
     */
    async analyzeUserIntent(message, conversationContext) {
        console.log(`[ConversationAI] Analyzing user intent: "${message}"`);
        try {
            // 1. 의도 분류
            const primary = this.classifyPrimaryIntent(message);
            const secondary = this.classifySecondaryIntents(message);
            // 2. 개체명 인식
            const entities = this.extractEntities(message);
            // 3. 신뢰도 계산
            const confidence = this.calculateConfidence(message, primary, entities);
            const intent = {
                primary,
                secondary,
                confidence,
                entities,
                context: conversationContext
            };
            console.log(`✅ Intent analyzed: ${primary} (confidence: ${confidence.toFixed(2)})`);
            return intent;
        }
        catch (error) {
            console.error('[ConversationAI] Error analyzing intent:', error);
            // 폴백 의도 반환
            return {
                primary: 'help-request',
                confidence: 0.5,
                entities: [],
                context: conversationContext
            };
        }
    }
    /**
     * 의도 기반 AI 응답 생성
     */
    async generateResponse(intent, userMessage) {
        console.log(`[ConversationAI] Generating response for intent: ${intent.primary}`);
        try {
            // 1. 기본 응답 메시지 생성
            const message = this.generateResponseMessage(intent, userMessage);
            // 2. 제안 액션 생성
            const suggestedActions = this.generateSuggestedActions(intent);
            // 3. 템플릿 추천 (해당되는 경우)
            const templateRecommendations = this.generateTemplateRecommendations(intent);
            // 4. 후속 질문 생성
            const followUpQuestions = this.generateFollowUpQuestions(intent);
            const response = {
                message,
                suggestedActions,
                templateRecommendations,
                followUpQuestions,
                confidence: intent.confidence
            };
            console.log(`✅ Response generated for ${intent.primary}`);
            return response;
        }
        catch (error) {
            console.error('[ConversationAI] Error generating response:', error);
            return {
                message: "죄송합니다. 요청을 처리하는 중에 문제가 발생했습니다. 다시 시도해 주세요.",
                suggestedActions: [],
                followUpQuestions: ["어떤 종류의 웹사이트를 만들고 싶으신가요?"],
                confidence: 0.3
            };
        }
    }
    /**
     * 대화 컨텍스트 업데이트
     */
    updateConversationContext(context, newIntent, entities) {
        const updatedContext = Object.assign({}, context);
        // 이전 의도 기록 업데이트
        updatedContext.previousIntents = [
            newIntent,
            ...context.previousIntents.slice(0, 4) // 최근 5개만 유지
        ];
        // 엔티티에서 사용자 선호도 업데이트
        entities.forEach(entity => {
            switch (entity.type) {
                case 'template-style':
                    if (['modern', 'classic', 'creative', 'minimal'].includes(entity.value)) {
                        updatedContext.userPreferences.preferredStyle = entity.value;
                    }
                    break;
                case 'color':
                    this.updateColorPreference(updatedContext.userPreferences, entity.value);
                    break;
                case 'website-type':
                    updatedContext.projectType = entity.value;
                    break;
            }
        });
        return updatedContext;
    }
    /**
     * 사용자 선호도 기반 개인화
     */
    personalizeResponse(response, context) {
        const personalizedResponse = Object.assign({}, response);
        // 복잡도 레벨에 따른 응답 조정
        if (context.userPreferences.complexityLevel === 'beginner') {
            personalizedResponse.message = this.simplifyMessage(response.message);
            personalizedResponse.suggestedActions = response.suggestedActions.slice(0, 2); // 제안 액션 제한
        }
        else if (context.userPreferences.complexityLevel === 'advanced') {
            personalizedResponse.suggestedActions.push(...this.generateAdvancedActions());
        }
        // 이전 의도 기반 컨텍스트 추가
        if (context.previousIntents.length > 0) {
            const recentIntent = context.previousIntents[0];
            personalizedResponse.followUpQuestions.unshift(this.generateContextualQuestion(recentIntent));
        }
        return personalizedResponse;
    }
    // === Private Methods ===
    initializePatterns() {
        // 의도 분류 패턴들
        this.intentPatterns.set('create-website', [
            /(?:웹사이트|홈페이지|사이트).*(?:만들|생성|제작)/i,
            /(?:새로운?|신규).*(?:웹사이트|사이트)/i,
            /website.*(?:create|make|build)/i
        ]);
        this.intentPatterns.set('apply-template', [
            /템플릿.*(?:적용|사용|선택)/i,
            /(?:디자인|테마).*(?:바꾸|변경)/i,
            /template.*(?:apply|use|select)/i
        ]);
        this.intentPatterns.set('modify-design', [
            /(?:디자인|스타일).*(?:수정|변경|바꾸)/i,
            /(?:색상|컬러).*(?:바꾸|변경)/i,
            /design.*(?:change|modify|update)/i
        ]);
        this.intentPatterns.set('add-content', [
            /(?:내용|컨텐츠|콘텐츠|텍스트).*(?:추가|넣)/i,
            /(?:사진|이미지|그림).*(?:추가|넣)/i,
            /content.*(?:add|insert)/i
        ]);
        this.intentPatterns.set('help-request', [
            /(?:도움|도와|헬프)/i,
            /(?:모르|잘 모르|어떻게)/i,
            /help.*(?:me|please)/i
        ]);
        // 엔티티 추출 패턴들
        this.entityPatterns.set('website-type', [
            /(?:레스토랑|음식점|카페)/i,
            /(?:포트폴리오|작품집)/i,
            /(?:블로그|일기)/i,
            /(?:쇼핑몰|이커머스)/i,
            /(?:회사|기업|비즈니스)/i
        ]);
        this.entityPatterns.set('color', [
            /(?:빨간|빨강|red)/i,
            /(?:파란|파랑|blue)/i,
            /(?:녹색|초록|green)/i,
            /(?:검정|검은|black)/i,
            /(?:흰|흰색|white)/i,
            /(?:노란|노랑|yellow)/i
        ]);
        this.entityPatterns.set('template-style', [
            /(?:모던|현대적|modern)/i,
            /(?:클래식|고전적|classic)/i,
            /(?:미니멀|간단|minimal)/i,
            /(?:창의적|creative)/i
        ]);
    }
    initializeResponseTemplates() {
        this.responseTemplates.set('create-website', [
            "새로운 웹사이트를 만들어 드리겠습니다! 어떤 종류의 웹사이트를 원하시나요?",
            "웹사이트 제작을 시작해보겠습니다. 우선 템플릿을 선택해 주세요.",
            "멋진 웹사이트를 만들 준비가 되었습니다! 어떤 스타일을 선호하시나요?"
        ]);
        this.responseTemplates.set('apply-template', [
            "템플릿을 적용해 드리겠습니다. 선택하신 디자인으로 변경하고 있습니다.",
            "새로운 템플릿으로 변경 중입니다. 잠시만 기다려 주세요.",
            "템플릿이 적용되었습니다! 추가로 수정할 부분이 있나요?"
        ]);
        this.responseTemplates.set('modify-design', [
            "디자인을 수정해 드리겠습니다. 어떤 부분을 바꾸고 싶으신가요?",
            "스타일 변경을 진행하겠습니다. 구체적인 요청사항을 말씀해 주세요.",
            "디자인 수정이 완료되었습니다. 다른 변경사항이 있으신가요?"
        ]);
        this.responseTemplates.set('help-request', [
            "도와드리겠습니다! 무엇을 도와드릴까요?",
            "궁금한 점이 있으시면 언제든지 말씀해 주세요.",
            "어떤 도움이 필요하신지 구체적으로 알려주시면 더 정확히 도와드릴 수 있습니다."
        ]);
    }
    classifyPrimaryIntent(message) {
        let bestIntent = 'help-request';
        let maxScore = 0;
        for (const [intent, patterns] of this.intentPatterns.entries()) {
            const score = this.calculatePatternScore(message, patterns);
            if (score > maxScore) {
                maxScore = score;
                bestIntent = intent;
            }
        }
        return bestIntent;
    }
    classifySecondaryIntents(message) {
        const secondaryIntents = [];
        for (const [intent, patterns] of this.intentPatterns.entries()) {
            const score = this.calculatePatternScore(message, patterns);
            if (score > 0.3 && score < 0.8) { // 보조 의도 범위
                secondaryIntents.push(intent);
            }
        }
        return secondaryIntents.slice(0, 2); // 최대 2개
    }
    extractEntities(message) {
        const entities = [];
        for (const [entityType, patterns] of this.entityPatterns.entries()) {
            for (const pattern of patterns) {
                const matches = message.matchAll(new RegExp(pattern, 'gi'));
                for (const match of matches) {
                    if (match.index !== undefined) {
                        entities.push({
                            type: entityType,
                            value: match[0],
                            confidence: 0.8,
                            position: {
                                start: match.index,
                                end: match.index + match[0].length
                            }
                        });
                    }
                }
            }
        }
        return entities;
    }
    calculatePatternScore(text, patterns) {
        let totalScore = 0;
        for (const pattern of patterns) {
            if (pattern.test(text)) {
                totalScore += 1;
            }
        }
        return Math.min(totalScore / patterns.length, 1);
    }
    calculateConfidence(message, intent, entities) {
        let confidence = 0.5; // 기본값
        // 의도 패턴 매칭 점수
        const patterns = this.intentPatterns.get(intent) || [];
        const patternScore = this.calculatePatternScore(message, patterns);
        confidence += patternScore * 0.4;
        // 엔티티 존재 여부
        if (entities.length > 0) {
            confidence += Math.min(entities.length * 0.1, 0.3);
        }
        // 메시지 길이 (너무 짧으면 신뢰도 감소)
        if (message.length < 10) {
            confidence *= 0.8;
        }
        return Math.min(confidence, 1);
    }
    generateResponseMessage(intent, userMessage) {
        const templates = this.responseTemplates.get(intent.primary) || [
            "요청을 처리하고 있습니다."
        ];
        // 템플릿 중 랜덤 선택
        const template = templates[Math.floor(Math.random() * templates.length)];
        // 엔티티 기반 메시지 개인화
        let personalizedMessage = template;
        for (const entity of intent.entities) {
            if (entity.type === 'website-type') {
                personalizedMessage += ` ${entity.value} 웹사이트에 최적화된 기능들을 제안해 드릴게요.`;
            }
        }
        return personalizedMessage;
    }
    generateSuggestedActions(intent) {
        const actions = [];
        switch (intent.primary) {
            case 'create-website':
                actions.push({
                    id: 'select-template',
                    type: 'apply-template',
                    label: '템플릿 선택',
                    description: '프로젝트에 맞는 템플릿을 선택하세요',
                    parameters: { category: this.inferCategoryFromEntities(intent.entities) },
                    priority: 'high'
                });
                break;
            case 'modify-design':
                actions.push({
                    id: 'change-colors',
                    type: 'modify-style',
                    label: '색상 변경',
                    description: '웹사이트 색상 테마를 변경합니다',
                    parameters: { type: 'color-scheme' },
                    priority: 'high'
                });
                break;
            case 'add-content':
                actions.push({
                    id: 'add-text-content',
                    type: 'add-content',
                    label: '텍스트 추가',
                    description: '새로운 텍스트 내용을 추가합니다',
                    parameters: { contentType: 'text' },
                    priority: 'medium'
                });
                break;
        }
        return actions;
    }
    generateTemplateRecommendations(intent) {
        const recommendations = [];
        // 엔티티에서 웹사이트 타입 찾기
        const websiteTypeEntity = intent.entities.find(e => e.type === 'website-type');
        if (websiteTypeEntity) {
            const websiteType = websiteTypeEntity.value.toLowerCase();
            if (websiteType.includes('레스토랑') || websiteType.includes('음식')) {
                recommendations.push('restaurant-modern', 'restaurant-classic');
            }
            else if (websiteType.includes('포트폴리오')) {
                recommendations.push('portfolio-creative', 'portfolio-minimal');
            }
            else if (websiteType.includes('블로그')) {
                recommendations.push('blog-minimal', 'blog-modern');
            }
        }
        return recommendations;
    }
    generateFollowUpQuestions(intent) {
        const questions = [];
        switch (intent.primary) {
            case 'create-website':
                questions.push('어떤 색상 테마를 선호하시나요?', '웹사이트에 포함하고 싶은 페이지가 있나요?');
                break;
            case 'apply-template':
                questions.push('템플릿의 어떤 부분을 수정하고 싶으신가요?', '내용을 어떻게 변경할까요?');
                break;
            case 'modify-design':
                questions.push('다른 디자인 요소도 변경해 볼까요?', '레이아웃도 함께 조정하시겠어요?');
                break;
            default:
                questions.push('다른 도움이 필요하신가요?');
        }
        return questions.slice(0, 2); // 최대 2개
    }
    updateColorPreference(preferences, colorValue) {
        const colorLower = colorValue.toLowerCase();
        if (colorLower.includes('빨강') || colorLower.includes('red')) {
            preferences.colorPreference = 'bright';
        }
        else if (colorLower.includes('검정') || colorLower.includes('black')) {
            preferences.colorPreference = 'dark';
        }
        else if (colorLower.includes('흰') || colorLower.includes('white')) {
            preferences.colorPreference = 'neutral';
        }
    }
    simplifyMessage(message) {
        // 초보자를 위한 메시지 단순화
        return message
            .replace(/고급|전문적인|복잡한/g, '간단한')
            .replace(/커스터마이징|개인화/g, '맞춤 설정');
    }
    generateAdvancedActions() {
        return [
            {
                id: 'advanced-customization',
                type: 'modify-style',
                label: '고급 커스터마이징',
                description: 'CSS 및 고급 디자인 옵션을 설정합니다',
                parameters: { level: 'advanced' },
                priority: 'low'
            }
        ];
    }
    generateContextualQuestion(recentIntent) {
        switch (recentIntent) {
            case 'create-website':
                return '방금 만든 웹사이트를 더 개선해 볼까요?';
            case 'apply-template':
                return '적용한 템플릿이 마음에 드시나요?';
            default:
                return '이전 작업과 연관된 다른 작업이 필요하신가요?';
        }
    }
    inferCategoryFromEntities(entities) {
        const websiteTypeEntity = entities.find(e => e.type === 'website-type');
        if (websiteTypeEntity) {
            const value = websiteTypeEntity.value.toLowerCase();
            if (value.includes('레스토랑'))
                return 'restaurant';
            if (value.includes('포트폴리오'))
                return 'portfolio';
            if (value.includes('블로그'))
                return 'blog';
            if (value.includes('쇼핑'))
                return 'ecommerce';
            if (value.includes('회사'))
                return 'business';
        }
        return 'personal';
    }
}
exports.ConversationAI = ConversationAI;
//# sourceMappingURL=ConversationAI.js.map