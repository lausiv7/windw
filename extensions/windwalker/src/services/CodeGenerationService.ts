// [의도] 코드 생성, 분석, 리팩토링을 위한 AI 기반 서비스
// [책임] LLMService와 연동하여 다양한 코드 작업 수행

import { LLMService, LLMResponse } from './LLMService';
import * as vscode from 'vscode';

export interface CodeGenerationRequest {
    prompt: string;
    language: string;
    context?: string;
    filePath?: string;
    selectedText?: string;
}

export interface CodeAnalysisResult {
    explanation: string;
    suggestions: string[];
    issues: string[];
    complexity: 'low' | 'medium' | 'high';
}

export interface RefactorRequest {
    code: string;
    language: string;
    refactorType: 'optimize' | 'simplify' | 'modernize' | 'extract-function' | 'rename';
    target?: string;
}

export class CodeGenerationService {
    private llmService: LLMService;

    constructor(apiKey?: string) {
        this.llmService = new LLMService(apiKey);
    }

    public async generateCode(request: CodeGenerationRequest): Promise<LLMResponse> {
        try {
            const context = this.buildContext(request);
            return await this.llmService.generateCodeSuggestion(request.prompt, request.language, context);
        } catch (error) {
            console.error('[CodeGenerationService] Error generating code:', error);
            throw error;
        }
    }

    public async analyzeCode(code: string, language: string): Promise<CodeAnalysisResult> {
        try {
            const analysisPrompt = `Analyze the following ${language} code and provide:
            1. A clear explanation of what the code does
            2. Suggestions for improvement
            3. Any issues or potential problems
            4. Complexity assessment (low/medium/high)
            
            Code:
            \`\`\`${language}
            ${code}
            \`\`\`
            
            Please format your response as JSON with the following structure:
            {
                "explanation": "...",
                "suggestions": ["...", "..."],
                "issues": ["...", "..."],
                "complexity": "low|medium|high"
            }`;

            const response = await this.llmService.generateResponse({ prompt: analysisPrompt });
            
            try {
                const analysis = JSON.parse(response.content);
                return {
                    explanation: analysis.explanation || 'No explanation provided',
                    suggestions: Array.isArray(analysis.suggestions) ? analysis.suggestions : [],
                    issues: Array.isArray(analysis.issues) ? analysis.issues : [],
                    complexity: ['low', 'medium', 'high'].includes(analysis.complexity) ? analysis.complexity : 'medium'
                };
            } catch (parseError) {
                // Fallback if JSON parsing fails
                return {
                    explanation: response.content,
                    suggestions: [],
                    issues: [],
                    complexity: 'medium'
                };
            }
        } catch (error) {
            console.error('[CodeGenerationService] Error analyzing code:', error);
            throw error;
        }
    }

    public async refactorCode(request: RefactorRequest): Promise<LLMResponse> {
        try {
            const refactorPrompts = {
                optimize: `Optimize the following ${request.language} code for better performance and efficiency:`,
                simplify: `Simplify the following ${request.language} code to make it more readable and maintainable:`,
                modernize: `Modernize the following ${request.language} code to use current best practices and language features:`,
                'extract-function': `Extract reusable functions from the following ${request.language} code:`,
                rename: `Rename variables and functions in the following ${request.language} code to be more descriptive:`
            };

            const prompt = `${refactorPrompts[request.refactorType]}
            
            \`\`\`${request.language}
            ${request.code}
            \`\`\`
            
            ${request.target ? `Focus on: ${request.target}` : ''}
            
            Please provide only the refactored code with comments explaining the changes.`;

            return await this.llmService.generateResponse({ prompt });
        } catch (error) {
            console.error('[CodeGenerationService] Error refactoring code:', error);
            throw error;
        }
    }

    public async generateTests(code: string, language: string, testFramework?: string): Promise<LLMResponse> {
        try {
            const framework = testFramework || this.detectTestFramework(language);
            
            const prompt = `Generate comprehensive unit tests for the following ${language} code using ${framework}:
            
            \`\`\`${language}
            ${code}
            \`\`\`
            
            Please include:
            1. Test cases for normal operation
            2. Edge cases and error conditions
            3. Mock setup if needed
            4. Clear test descriptions
            
            Provide only the test code.`;

            return await this.llmService.generateResponse({ prompt });
        } catch (error) {
            console.error('[CodeGenerationService] Error generating tests:', error);
            throw error;
        }
    }

    public async generateDocumentation(code: string, language: string): Promise<LLMResponse> {
        try {
            const prompt = `Generate comprehensive documentation for the following ${language} code:
            
            \`\`\`${language}
            ${code}
            \`\`\`
            
            Please include:
            1. Overview of what the code does
            2. Parameter descriptions
            3. Return value details
            4. Usage examples
            5. Any important notes or warnings
            
            Format the documentation appropriately for ${language} (JSDoc, Python docstrings, etc.).`;

            return await this.llmService.generateResponse({ prompt });
        } catch (error) {
            console.error('[CodeGenerationService] Error generating documentation:', error);
            throw error;
        }
    }

    public async fixCode(code: string, language: string, errorMessage?: string): Promise<LLMResponse> {
        try {
            const prompt = `Fix the following ${language} code:
            
            \`\`\`${language}
            ${code}
            \`\`\`
            
            ${errorMessage ? `Error message: ${errorMessage}` : ''}
            
            Please provide the corrected code with comments explaining the fixes.`;

            return await this.llmService.generateResponse({ prompt });
        } catch (error) {
            console.error('[CodeGenerationService] Error fixing code:', error);
            throw error;
        }
    }

    public setApiKey(apiKey: string): void {
        this.llmService.setApiKey(apiKey);
    }

    public isReady(): boolean {
        return this.llmService.isReady();
    }

    private buildContext(request: CodeGenerationRequest): string {
        let context = request.context || '';
        
        if (request.filePath) {
            context += `\nFile path: ${request.filePath}`;
        }
        
        if (request.selectedText) {
            context += `\nSelected code:\n${request.selectedText}`;
        }
        
        return context.trim();
    }

    private detectTestFramework(language: string): string {
        const frameworks: { [key: string]: string } = {
            javascript: 'Jest',
            typescript: 'Jest',
            python: 'pytest',
            java: 'JUnit',
            csharp: 'NUnit',
            go: 'Go testing package',
            rust: 'Rust built-in testing',
            php: 'PHPUnit'
        };
        
        return frameworks[language.toLowerCase()] || 'appropriate testing framework';
    }
}
