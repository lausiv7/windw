// [의도] Gemini API를 통한 LLM 서비스 제공
// [책임] AI 모델과의 통신, 프롬프트 처리, 응답 생성

import { GoogleGenerativeAI } from '@google/generative-ai';

export interface LLMRequest {
    prompt: string;
    context?: string;
    temperature?: number;
    maxTokens?: number;
}

export interface LLMResponse {
    content: string;
    usage?: {
        promptTokens: number;
        completionTokens: number;
        totalTokens: number;
    };
    model: string;
    timestamp: number;
}

export class LLMService {
    private genAI: GoogleGenerativeAI | null = null;
    private model: any = null;
    private isInitialized = false;

    constructor(private apiKey?: string) {
        if (apiKey) {
            this.initialize(apiKey);
        }
    }

    private async initialize(apiKey: string): Promise<void> {
        try {
            this.genAI = new GoogleGenerativeAI(apiKey);
            this.model = this.genAI.getGenerativeModel({ model: "gemini-pro" });
            this.isInitialized = true;
            console.log('[LLMService] Initialized with Gemini API');
        } catch (error) {
            console.error('[LLMService] Failed to initialize:', error);
            throw error;
        }
    }

    public async generateResponse(request: LLMRequest): Promise<LLMResponse> {
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
        } catch (error) {
            console.error('[LLMService] Error generating response:', error);
            throw error;
        }
    }

    public async generateCodeSuggestion(prompt: string, language: string, context?: string): Promise<LLMResponse> {
        const codePrompt = `Generate ${language} code for the following request. 
        Provide clean, production-ready code with appropriate comments.
        
        ${context ? `Context: ${context}\n` : ''}
        Request: ${prompt}
        
        Please provide only the code without additional explanation.`;

        return this.generateResponse({ prompt: codePrompt });
    }

    public async explainCode(code: string, language: string): Promise<LLMResponse> {
        const explainPrompt = `Explain the following ${language} code in detail:
        
        \`\`\`${language}
        ${code}
        \`\`\`
        
        Please provide a clear explanation of what this code does, how it works, and any important details.`;

        return this.generateResponse({ prompt: explainPrompt });
    }

    public async reviewCode(code: string, language: string): Promise<LLMResponse> {
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

    public setApiKey(apiKey: string): void {
        this.apiKey = apiKey;
        this.initialize(apiKey);
    }

    public isReady(): boolean {
        return this.isInitialized;
    }

    private estimateTokens(text: string): number {
        // Rough estimation: 1 token ≈ 4 characters for English text
        return Math.ceil(text.length / 4);
    }
}
