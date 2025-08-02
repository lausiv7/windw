"use strict";
// [의도] WindWalker 확장의 중앙 메시지 라우터. 모든 WebView와 Extension 간의 통신을 중계하고, 메시지 타입에 따라 적절한 관리자(Manager)에게 작업을 위임합니다.
// [책임] 메시지 타입 분석, 라우팅, 에러 처리, 로깅
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
exports.MessageBridge = void 0;
const vscode = __importStar(require("vscode"));
const FileManager_1 = require("./FileManager");
const BuildManager_1 = require("./BuildManager");
const LLMService_1 = require("../services/LLMService");
const CodeGenerationService_1 = require("../services/CodeGenerationService");
class MessageBridge {
    constructor(context) {
        // Initialize managers
        this.fileManager = new FileManager_1.FileManager(context);
        this.buildManager = new BuildManager_1.BuildManager(context);
        // Initialize AI services
        const apiKey = vscode.workspace.getConfiguration('windwalker').get('geminiApiKey');
        this.llmService = new LLMService_1.LLMService(apiKey);
        this.codeGenerationService = new CodeGenerationService_1.CodeGenerationService(apiKey);
        // Setup message handlers
        this.messageHandlers = new Map();
        this.initializeHandlers();
    }
    initializeHandlers() {
        // File system operations
        this.messageHandlers.set('file:read', this.handleFileRead.bind(this));
        this.messageHandlers.set('file:write', this.handleFileWrite.bind(this));
        this.messageHandlers.set('file:create', this.handleFileCreate.bind(this));
        this.messageHandlers.set('file:delete', this.handleFileDelete.bind(this));
        this.messageHandlers.set('file:list', this.handleFileList.bind(this));
        // Build operations
        this.messageHandlers.set('build:start', this.handleBuildStart.bind(this));
        this.messageHandlers.set('build:stop', this.handleBuildStop.bind(this));
        this.messageHandlers.set('build:restart', this.handleBuildRestart.bind(this));
        // Chat operations
        this.messageHandlers.set('chat:ready', this.handleChatReady.bind(this));
        this.messageHandlers.set('chat:message', this.handleChatMessage.bind(this));
        // Code generation operations
        this.messageHandlers.set('code:generate', this.handleCodeGenerate.bind(this));
        this.messageHandlers.set('code:apply', this.handleCodeApply.bind(this));
        this.messageHandlers.set('code:analyze', this.handleCodeAnalyze.bind(this));
        this.messageHandlers.set('code:refactor', this.handleCodeRefactor.bind(this));
        this.messageHandlers.set('code:fix', this.handleCodeFix.bind(this));
        this.messageHandlers.set('code:test', this.handleCodeTest.bind(this));
        this.messageHandlers.set('code:document', this.handleCodeDocument.bind(this));
        // Preview operations  
        this.messageHandlers.set('preview:ready', this.handlePreviewReady.bind(this));
        this.messageHandlers.set('preview:reload', this.handlePreviewReload.bind(this));
        this.messageHandlers.set('preview:changeUrl', this.handlePreviewChangeUrl.bind(this));
    }
    // Main message processing method
    processMessage(message, webview) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                console.log(`[MessageBridge] Processing message: ${message.type}`, message);
                // Add timestamp if not present
                if (!message.timestamp) {
                    message.timestamp = Date.now();
                }
                // Get handler for message type
                const handler = this.messageHandlers.get(message.type);
                if (handler) {
                    const result = yield handler(message);
                    // Send response back to webview
                    yield webview.postMessage({
                        type: `${message.type}:response`,
                        data: result,
                        requestId: message.requestId,
                        timestamp: Date.now()
                    });
                    console.log(`[MessageBridge] Successfully processed: ${message.type}`);
                }
                else {
                    throw new Error(`Unknown message type: ${message.type}`);
                }
            }
            catch (error) {
                console.error(`[MessageBridge] Error processing message:`, error);
                const errorMessage = error instanceof Error ? error.message : String(error);
                // Send error response
                yield webview.postMessage({
                    type: 'error',
                    data: {
                        originalType: message.type,
                        error: errorMessage,
                        requestId: message.requestId
                    },
                    timestamp: Date.now()
                });
            }
        });
    }
    // File system handlers
    handleFileRead(message) {
        return __awaiter(this, void 0, void 0, function* () {
            const { path } = message.data;
            return yield this.fileManager.readFile(path);
        });
    }
    handleFileWrite(message) {
        return __awaiter(this, void 0, void 0, function* () {
            const { path, content } = message.data;
            return yield this.fileManager.writeFile(path, content);
        });
    }
    handleFileCreate(message) {
        return __awaiter(this, void 0, void 0, function* () {
            const { path, content = '' } = message.data;
            return yield this.fileManager.createFile(path, content);
        });
    }
    handleFileDelete(message) {
        return __awaiter(this, void 0, void 0, function* () {
            const { path } = message.data;
            return yield this.fileManager.deleteFile(path);
        });
    }
    handleFileList(message) {
        return __awaiter(this, void 0, void 0, function* () {
            const { path = '' } = message.data || {};
            return yield this.fileManager.listFiles(path);
        });
    }
    // Build handlers
    handleBuildStart(message) {
        return __awaiter(this, void 0, void 0, function* () {
            const { command = 'npm run dev' } = message.data || {};
            return yield this.buildManager.startBuild(command);
        });
    }
    handleBuildStop(message) {
        return __awaiter(this, void 0, void 0, function* () {
            return yield this.buildManager.stopBuild();
        });
    }
    handleBuildRestart(message) {
        return __awaiter(this, void 0, void 0, function* () {
            return yield this.buildManager.restartBuild();
        });
    }
    // Chat handlers
    handleChatReady(message) {
        return __awaiter(this, void 0, void 0, function* () {
            return {
                type: 'system:info',
                data: 'Welcome to WindWalker! I can help you create and modify files. Try saying: "Create a new React component called Button"'
            };
        });
    }
    handleChatMessage(message) {
        return __awaiter(this, void 0, void 0, function* () {
            const { content, context } = message.data;
            try {
                // Phase 4: Use LLM service for intelligent responses
                if (this.llmService.isReady()) {
                    const response = yield this.llmService.generateResponse({
                        prompt: content,
                        context: context || this.buildWorkspaceContext()
                    });
                    return {
                        type: 'chat:response',
                        data: {
                            content: response.content,
                            model: response.model,
                            timestamp: response.timestamp
                        }
                    };
                }
                else {
                    // Fallback to command parsing if AI is not available
                    return yield this.parseAndExecuteCommand(content);
                }
            }
            catch (error) {
                console.error('[MessageBridge] Error in chat message handling:', error);
                const errorMessage = error instanceof Error ? error.message : String(error);
                // Try fallback command parsing
                return yield this.parseAndExecuteCommand(content);
            }
        });
    }
    // Code generation handlers
    handleCodeGenerate(message) {
        return __awaiter(this, void 0, void 0, function* () {
            const { prompt, language = 'javascript', context, filePath, selectedText } = message.data;
            try {
                if (this.codeGenerationService.isReady()) {
                    const response = yield this.codeGenerationService.generateCode({
                        prompt,
                        language,
                        context,
                        filePath,
                        selectedText
                    });
                    return {
                        code: response.content,
                        language,
                        explanation: `Generated ${language} code using AI`,
                        model: response.model,
                        timestamp: response.timestamp
                    };
                }
                else {
                    // Fallback to simple code generation
                    return {
                        code: this.generateSimpleCode(prompt, language),
                        language,
                        explanation: `Generated ${language} code for: ${prompt}`
                    };
                }
            }
            catch (error) {
                console.error('[MessageBridge] Error generating code:', error);
                throw error;
            }
        });
    }
    handleCodeApply(message) {
        return __awaiter(this, void 0, void 0, function* () {
            const { code, path } = message.data;
            return yield this.fileManager.writeFile(path, code);
        });
    }
    handleCodeAnalyze(message) {
        return __awaiter(this, void 0, void 0, function* () {
            const { code, language } = message.data;
            try {
                if (this.codeGenerationService.isReady()) {
                    return yield this.codeGenerationService.analyzeCode(code, language);
                }
                else {
                    throw new Error('AI service not available for code analysis');
                }
            }
            catch (error) {
                console.error('[MessageBridge] Error analyzing code:', error);
                throw error;
            }
        });
    }
    handleCodeRefactor(message) {
        return __awaiter(this, void 0, void 0, function* () {
            const { code, language, refactorType, target } = message.data;
            try {
                if (this.codeGenerationService.isReady()) {
                    const response = yield this.codeGenerationService.refactorCode({
                        code,
                        language,
                        refactorType,
                        target
                    });
                    return {
                        code: response.content,
                        language,
                        refactorType,
                        explanation: `Refactored code using ${refactorType} strategy`,
                        model: response.model,
                        timestamp: response.timestamp
                    };
                }
                else {
                    throw new Error('AI service not available for code refactoring');
                }
            }
            catch (error) {
                console.error('[MessageBridge] Error refactoring code:', error);
                throw error;
            }
        });
    }
    handleCodeFix(message) {
        return __awaiter(this, void 0, void 0, function* () {
            const { code, language, errorMessage } = message.data;
            try {
                if (this.codeGenerationService.isReady()) {
                    const response = yield this.codeGenerationService.fixCode(code, language, errorMessage);
                    return {
                        code: response.content,
                        language,
                        explanation: 'Fixed code using AI analysis',
                        model: response.model,
                        timestamp: response.timestamp
                    };
                }
                else {
                    throw new Error('AI service not available for code fixing');
                }
            }
            catch (error) {
                console.error('[MessageBridge] Error fixing code:', error);
                throw error;
            }
        });
    }
    handleCodeTest(message) {
        return __awaiter(this, void 0, void 0, function* () {
            const { code, language, testFramework } = message.data;
            try {
                if (this.codeGenerationService.isReady()) {
                    const response = yield this.codeGenerationService.generateTests(code, language, testFramework);
                    return {
                        tests: response.content,
                        language,
                        framework: testFramework,
                        explanation: 'Generated tests using AI',
                        model: response.model,
                        timestamp: response.timestamp
                    };
                }
                else {
                    throw new Error('AI service not available for test generation');
                }
            }
            catch (error) {
                console.error('[MessageBridge] Error generating tests:', error);
                throw error;
            }
        });
    }
    handleCodeDocument(message) {
        return __awaiter(this, void 0, void 0, function* () {
            const { code, language } = message.data;
            try {
                if (this.codeGenerationService.isReady()) {
                    const response = yield this.codeGenerationService.generateDocumentation(code, language);
                    return {
                        documentation: response.content,
                        language,
                        explanation: 'Generated documentation using AI',
                        model: response.model,
                        timestamp: response.timestamp
                    };
                }
                else {
                    throw new Error('AI service not available for documentation generation');
                }
            }
            catch (error) {
                console.error('[MessageBridge] Error generating documentation:', error);
                throw error;
            }
        });
    }
    // Helper methods
    parseAndExecuteCommand(command) {
        return __awaiter(this, void 0, void 0, function* () {
            const lowerCommand = command.toLowerCase();
            // Simple command parsing for Phase 2
            if (lowerCommand.includes('create') && lowerCommand.includes('file')) {
                return yield this.handleSimpleFileCreation(command);
            }
            if (lowerCommand.includes('list') && lowerCommand.includes('file')) {
                return yield this.fileManager.listFiles('');
            }
            if (lowerCommand.includes('start') && lowerCommand.includes('server')) {
                return yield this.buildManager.startBuild('npm run dev');
            }
            // Default response
            return {
                type: 'chat:response',
                data: `I understand you want to: "${command}". Available commands: create file, list files, start server`
            };
        });
    }
    handleSimpleFileCreation(command) {
        return __awaiter(this, void 0, void 0, function* () {
            // Extract filename from command (simple regex)
            const fileMatch = command.match(/create.*file.*["']([^"']+)["']/i) ||
                command.match(/create.*["']([^"']+)["'].*file/i) ||
                command.match(/file.*["']([^"']+)["']/i);
            if (fileMatch) {
                const filename = fileMatch[1];
                const defaultContent = `// Generated file: ${filename}\n// Created by WindWalker\n\nexport default function() {\n  return <div>Hello from ${filename}!</div>;\n}\n`;
                yield this.fileManager.createFile(`src/${filename}`, defaultContent);
                return {
                    type: 'file:created',
                    data: {
                        path: `src/${filename}`,
                        message: `Successfully created ${filename}`
                    }
                };
            }
            return {
                type: 'error',
                data: 'Could not parse filename from command. Try: "Create file MyComponent.tsx"'
            };
        });
    }
    // Preview handlers
    handlePreviewReady(message) {
        return __awaiter(this, void 0, void 0, function* () {
            console.log('[MessageBridge] Preview WebView is ready');
            return {
                type: 'system:info',
                data: 'Preview panel ready. Waiting for build server...'
            };
        });
    }
    handlePreviewReload(message) {
        return __awaiter(this, void 0, void 0, function* () {
            console.log('[MessageBridge] Preview reload requested');
            // 실제로는 PreviewWebViewProvider에서 직접 처리하므로 확인 메시지만 반환
            return {
                type: 'preview:reloaded',
                data: { success: true, timestamp: Date.now() }
            };
        });
    }
    handlePreviewChangeUrl(message) {
        return __awaiter(this, void 0, void 0, function* () {
            const { url } = message.data;
            console.log(`[MessageBridge] Preview URL change requested: ${url}`);
            // URL 유효성 검사
            try {
                new URL(url);
                return {
                    type: 'preview:urlChanged',
                    data: { success: true, url, timestamp: Date.now() }
                };
            }
            catch (error) {
                return {
                    type: 'error',
                    data: `Invalid URL: ${url}`
                };
            }
        });
    }
    generateSimpleCode(prompt, language) {
        // Simple code generation for Phase 2
        const templates = {
            javascript: `// Generated JavaScript code for: ${prompt}\nfunction generatedFunction() {\n  console.log('${prompt}');\n  return true;\n}\n\nexport default generatedFunction;`,
            typescript: `// Generated TypeScript code for: ${prompt}\ninterface GeneratedInterface {\n  prompt: string;\n}\n\nfunction generatedFunction(): GeneratedInterface {\n  return { prompt: '${prompt}' };\n}\n\nexport default generatedFunction;`,
            react: `// Generated React component for: ${prompt}\nimport React from 'react';\n\ninterface Props {\n  title?: string;\n}\n\nconst GeneratedComponent: React.FC<Props> = ({ title = '${prompt}' }) => {\n  return (\n    <div className="generated-component">\n      <h2>{title}</h2>\n      <p>This component was generated for: ${prompt}</p>\n    </div>\n  );\n};\n\nexport default GeneratedComponent;`
        };
        return templates[language] || templates.javascript;
    }
    buildWorkspaceContext() {
        var _a;
        try {
            const workspaceFolder = (_a = vscode.workspace.workspaceFolders) === null || _a === void 0 ? void 0 : _a[0];
            if (!workspaceFolder) {
                return 'No workspace folder available';
            }
            const activeEditor = vscode.window.activeTextEditor;
            let context = `Workspace: ${workspaceFolder.name}\n`;
            if (activeEditor) {
                const document = activeEditor.document;
                context += `Current file: ${document.fileName}\n`;
                context += `Language: ${document.languageId}\n`;
                const selection = activeEditor.selection;
                if (!selection.isEmpty) {
                    const selectedText = document.getText(selection);
                    context += `Selected code:\n${selectedText}\n`;
                }
            }
            return context;
        }
        catch (error) {
            console.error('[MessageBridge] Error building workspace context:', error);
            return 'Unable to build workspace context';
        }
    }
    updateApiKey(apiKey) {
        this.llmService.setApiKey(apiKey);
        this.codeGenerationService.setApiKey(apiKey);
        console.log('[MessageBridge] API key updated for all services');
    }
    getServiceStatus() {
        return {
            llm: this.llmService.isReady(),
            codeGeneration: this.codeGenerationService.isReady()
        };
    }
}
exports.MessageBridge = MessageBridge;
//# sourceMappingURL=MessageBridge.js.map