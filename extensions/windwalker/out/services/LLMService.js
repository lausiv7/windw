"use strict";
// [의도] Gemini API를 통한 LLM 서비스 제공
// [책임] AI 모델과의 통신, 프롬프트 처리, 응답 생성
Object.defineProperty(exports, "__esModule", { value: true });
exports.LLMService = void 0;
const generative_ai_1 = require("@google/generative-ai");
class LLMService {
    constructor(apiKey) {
        this.apiKey = apiKey;
        this.genAI = null;
        this.model = null;
        this.isInitialized = false;
        if (apiKey) {
            this.initialize(apiKey);
        }
    }
    async initialize(apiKey) {
        try {
            this.genAI = new generative_ai_1.GoogleGenerativeAI(apiKey);
            this.model = this.genAI.getGenerativeModel({ model: "gemini-pro" });
            this.isInitialized = true;
            console.log('[LLMService] Initialized with Gemini API');
        }
        catch (error) {
            console.error('[LLMService] Failed to initialize:', error);
            throw error;
        }
    }
    async generateResponse(request) {
        if (!this.isInitialized || !this.model) {
            throw new Error('LLMService not initialized. Please provide API key.');
        }
        try {
            const fullPrompt = request.context
                ? `Context: ${request.context}\n\nUser: ${request.prompt}`
                : request.prompt;
            const result = await this.model.generateContent(fullPrompt);
            const response = await result.response;
            const text = response.text();
            return {
                content: text,
                model: 'gemini-pro',
                timestamp: Date.now(),
                usage: {
                    promptTokens: this.estimateTokens(fullPrompt),
                    completionTokens: this.estimateTokens(text),
                    totalTokens: this.estimateTokens(fullPrompt + text)
                }
            };
        }
        catch (error) {
            console.error('[LLMService] Error generating response:', error);
            throw error;
        }
    }
    async generateCodeSuggestion(prompt, language, context) {
        const codePrompt = `Generate ${language} code for the following request. 
        Provide clean, production-ready code with appropriate comments.
        
        ${context ? `Context: ${context}\n` : ''}
        Request: ${prompt}
        
        Please provide only the code without additional explanation.`;
        return this.generateResponse({ prompt: codePrompt });
    }
    async explainCode(code, language) {
        const explainPrompt = `Explain the following ${language} code in detail:
        
        \`\`\`${language}
        ${code}
        \`\`\`
        
        Please provide a clear explanation of what this code does, how it works, and any important details.`;
        return this.generateResponse({ prompt: explainPrompt });
    }
    async reviewCode(code, language) {
        const reviewPrompt = `Review the following ${language} code and provide feedback:
        
        \`\`\`${language}
        ${code}
        \`\`\`
        
        Please check for:
        1. Code quality and best practices
        2. Potential bugs or issues
        3. Performance considerations
        4. Security concerns
        5. Suggestions for improvement`;
        return this.generateResponse({ prompt: reviewPrompt });
    }
    setApiKey(apiKey) {
        this.apiKey = apiKey;
        this.initialize(apiKey);
    }
    isReady() {
        return this.isInitialized;
    }
    estimateTokens(text) {
        // Rough estimation: 1 token ≈ 4 characters for English text
        return Math.ceil(text.length / 4);
    }
}
exports.LLMService = LLMService;
//# sourceMappingURL=LLMService.js.map