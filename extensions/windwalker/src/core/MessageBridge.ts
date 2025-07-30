// [의도] WindWalker 확장의 중앙 메시지 라우터. 모든 WebView와 Extension 간의 통신을 중계하고, 메시지 타입에 따라 적절한 관리자(Manager)에게 작업을 위임합니다.
// [책임] 메시지 타입 분석, 라우팅, 에러 처리, 로깅

import * as vscode from 'vscode';
import { FileManager } from './FileManager';
import { BuildManager } from './BuildManager';

export interface WindWalkerMessage {
    type: string;
    data?: any;
    timestamp?: number;
    requestId?: string;
}

export class MessageBridge {
    private fileManager: FileManager;
    private buildManager: BuildManager;
    private messageHandlers: Map<string, (message: WindWalkerMessage) => Promise<any>>;

    constructor(context: vscode.ExtensionContext) {
        // Initialize managers
        this.fileManager = new FileManager(context);
        this.buildManager = new BuildManager(context);
        
        // Setup message handlers
        this.messageHandlers = new Map();
        this.initializeHandlers();
    }

    private initializeHandlers() {
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
    }

    // Main message processing method
    async processMessage(message: WindWalkerMessage, webview: vscode.Webview): Promise<void> {
        try {
            console.log(`[MessageBridge] Processing message: ${message.type}`, message);

            // Add timestamp if not present
            if (!message.timestamp) {
                message.timestamp = Date.now();
            }

            // Get handler for message type
            const handler = this.messageHandlers.get(message.type);
            
            if (handler) {
                const result = await handler(message);
                
                // Send response back to webview
                await webview.postMessage({
                    type: `${message.type}:response`,
                    data: result,
                    requestId: message.requestId,
                    timestamp: Date.now()
                });

                console.log(`[MessageBridge] Successfully processed: ${message.type}`);
            } else {
                throw new Error(`Unknown message type: ${message.type}`);
            }

        } catch (error) {
            console.error(`[MessageBridge] Error processing message:`, error);
            
            // Send error response
            await webview.postMessage({
                type: 'error',
                data: {
                    originalType: message.type,
                    error: error.message,
                    requestId: message.requestId
                },
                timestamp: Date.now()
            });
        }
    }

    // File system handlers
    private async handleFileRead(message: WindWalkerMessage): Promise<any> {
        const { path } = message.data;
        return await this.fileManager.readFile(path);
    }

    private async handleFileWrite(message: WindWalkerMessage): Promise<any> {
        const { path, content } = message.data;
        return await this.fileManager.writeFile(path, content);
    }

    private async handleFileCreate(message: WindWalkerMessage): Promise<any> {
        const { path, content = '' } = message.data;
        return await this.fileManager.createFile(path, content);
    }

    private async handleFileDelete(message: WindWalkerMessage): Promise<any> {
        const { path } = message.data;
        return await this.fileManager.deleteFile(path);
    }

    private async handleFileList(message: WindWalkerMessage): Promise<any> {
        const { path = '' } = message.data || {};
        return await this.fileManager.listFiles(path);
    }

    // Build handlers
    private async handleBuildStart(message: WindWalkerMessage): Promise<any> {
        const { command = 'npm run dev' } = message.data || {};
        return await this.buildManager.startBuild(command);
    }

    private async handleBuildStop(message: WindWalkerMessage): Promise<any> {
        return await this.buildManager.stopBuild();
    }

    private async handleBuildRestart(message: WindWalkerMessage): Promise<any> {
        return await this.buildManager.restartBuild();
    }

    // Chat handlers
    private async handleChatReady(message: WindWalkerMessage): Promise<any> {
        return {
            type: 'system:info',
            data: 'Welcome to WindWalker! I can help you create and modify files. Try saying: "Create a new React component called Button"'
        };
    }

    private async handleChatMessage(message: WindWalkerMessage): Promise<any> {
        const { content } = message.data;
        
        // For Phase 2, we'll implement simple command parsing
        // Later phases will integrate with AI services
        return await this.parseAndExecuteCommand(content);
    }

    // Code generation handlers
    private async handleCodeGenerate(message: WindWalkerMessage): Promise<any> {
        const { prompt, language = 'javascript' } = message.data;
        
        // Phase 2: Simple code generation
        // Phase 3: Will integrate with AI services
        return {
            code: this.generateSimpleCode(prompt, language),
            language,
            explanation: `Generated ${language} code for: ${prompt}`
        };
    }

    private async handleCodeApply(message: WindWalkerMessage): Promise<any> {
        const { code, path } = message.data;
        return await this.fileManager.writeFile(path, code);
    }

    // Helper methods
    private async parseAndExecuteCommand(command: string): Promise<any> {
        const lowerCommand = command.toLowerCase();

        // Simple command parsing for Phase 2
        if (lowerCommand.includes('create') && lowerCommand.includes('file')) {
            return await this.handleSimpleFileCreation(command);
        }
        
        if (lowerCommand.includes('list') && lowerCommand.includes('file')) {
            return await this.fileManager.listFiles('');
        }

        if (lowerCommand.includes('start') && lowerCommand.includes('server')) {
            return await this.buildManager.startBuild('npm run dev');
        }

        // Default response
        return {
            type: 'chat:response',
            data: `I understand you want to: "${command}". Available commands: create file, list files, start server`
        };
    }

    private async handleSimpleFileCreation(command: string): Promise<any> {
        // Extract filename from command (simple regex)
        const fileMatch = command.match(/create.*file.*["']([^"']+)["']/i) || 
                         command.match(/create.*["']([^"']+)["'].*file/i) ||
                         command.match(/file.*["']([^"']+)["']/i);
        
        if (fileMatch) {
            const filename = fileMatch[1];
            const defaultContent = `// Generated file: ${filename}\n// Created by WindWalker\n\nexport default function() {\n  return <div>Hello from ${filename}!</div>;\n}\n`;
            
            await this.fileManager.createFile(`src/${filename}`, defaultContent);
            
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
    }

    private generateSimpleCode(prompt: string, language: string): string {
        // Simple code generation for Phase 2
        const templates = {
            javascript: `// Generated JavaScript code for: ${prompt}\nfunction generatedFunction() {\n  console.log('${prompt}');\n  return true;\n}\n\nexport default generatedFunction;`,
            typescript: `// Generated TypeScript code for: ${prompt}\ninterface GeneratedInterface {\n  prompt: string;\n}\n\nfunction generatedFunction(): GeneratedInterface {\n  return { prompt: '${prompt}' };\n}\n\nexport default generatedFunction;`,
            react: `// Generated React component for: ${prompt}\nimport React from 'react';\n\ninterface Props {\n  title?: string;\n}\n\nconst GeneratedComponent: React.FC<Props> = ({ title = '${prompt}' }) => {\n  return (\n    <div className="generated-component">\n      <h2>{title}</h2>\n      <p>This component was generated for: ${prompt}</p>\n    </div>\n  );\n};\n\nexport default GeneratedComponent;`
        };

        return templates[language] || templates.javascript;
    }
}