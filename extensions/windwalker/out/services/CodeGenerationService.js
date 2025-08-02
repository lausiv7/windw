"use strict";
// [의도] 코드 생성, 분석, 리팩토링을 위한 AI 기반 서비스
// [책임] LLMService와 연동하여 다양한 코드 작업 수행
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
exports.CodeGenerationService = void 0;
const LLMService_1 = require("./LLMService");
class CodeGenerationService {
    constructor(apiKey) {
        this.llmService = new LLMService_1.LLMService(apiKey);
    }
    generateCode(request) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const context = this.buildContext(request);
                return yield this.llmService.generateCodeSuggestion(request.prompt, request.language, context);
            }
            catch (error) {
                console.error('[CodeGenerationService] Error generating code:', error);
                throw error;
            }
        });
    }
    analyzeCode(code, language) {
        return __awaiter(this, void 0, void 0, function* () {
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
                const response = yield this.llmService.generateResponse({ prompt: analysisPrompt });
                try {
                    const analysis = JSON.parse(response.content);
                    return {
                        explanation: analysis.explanation || 'No explanation provided',
                        suggestions: Array.isArray(analysis.suggestions) ? analysis.suggestions : [],
                        issues: Array.isArray(analysis.issues) ? analysis.issues : [],
                        complexity: ['low', 'medium', 'high'].includes(analysis.complexity) ? analysis.complexity : 'medium'
                    };
                }
                catch (parseError) {
                    // Fallback if JSON parsing fails
                    return {
                        explanation: response.content,
                        suggestions: [],
                        issues: [],
                        complexity: 'medium'
                    };
                }
            }
            catch (error) {
                console.error('[CodeGenerationService] Error analyzing code:', error);
                throw error;
            }
        });
    }
    refactorCode(request) {
        return __awaiter(this, void 0, void 0, function* () {
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
                return yield this.llmService.generateResponse({ prompt });
            }
            catch (error) {
                console.error('[CodeGenerationService] Error refactoring code:', error);
                throw error;
            }
        });
    }
    generateTests(code, language, testFramework) {
        return __awaiter(this, void 0, void 0, function* () {
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
                return yield this.llmService.generateResponse({ prompt });
            }
            catch (error) {
                console.error('[CodeGenerationService] Error generating tests:', error);
                throw error;
            }
        });
    }
    generateDocumentation(code, language) {
        return __awaiter(this, void 0, void 0, function* () {
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
                return yield this.llmService.generateResponse({ prompt });
            }
            catch (error) {
                console.error('[CodeGenerationService] Error generating documentation:', error);
                throw error;
            }
        });
    }
    fixCode(code, language, errorMessage) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const prompt = `Fix the following ${language} code:
            
            \`\`\`${language}
            ${code}
            \`\`\`
            
            ${errorMessage ? `Error message: ${errorMessage}` : ''}
            
            Please provide the corrected code with comments explaining the fixes.`;
                return yield this.llmService.generateResponse({ prompt });
            }
            catch (error) {
                console.error('[CodeGenerationService] Error fixing code:', error);
                throw error;
            }
        });
    }
    setApiKey(apiKey) {
        this.llmService.setApiKey(apiKey);
    }
    isReady() {
        return this.llmService.isReady();
    }
    buildContext(request) {
        let context = request.context || '';
        if (request.filePath) {
            context += `\nFile path: ${request.filePath}`;
        }
        if (request.selectedText) {
            context += `\nSelected code:\n${request.selectedText}`;
        }
        return context.trim();
    }
    detectTestFramework(language) {
        const frameworks = {
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
exports.CodeGenerationService = CodeGenerationService;
//# sourceMappingURL=CodeGenerationService.js.map