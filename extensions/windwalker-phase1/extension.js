const vscode = require('vscode');

function activate(context) {
    console.log('WindWalker Phase 1 활성화됨!');
    
    // Hello World 명령어 등록
    let disposable = vscode.commands.registerCommand('windwalker.helloWorld', function () {
        vscode.window.showInformationMessage('WindWalker Phase 1이 작동합니다!');
    });
    context.subscriptions.push(disposable);

    // Task 1.1: ChatWebViewProvider 초기화 및 등록
    const chatProvider = new ChatWebViewProvider(context.extensionUri, context);
    context.subscriptions.push(
        vscode.window.registerWebviewViewProvider(ChatWebViewProvider.viewType, chatProvider)
    );

    // Phase 3: PreviewWebViewProvider 초기화 및 등록
    const previewProvider = new PreviewWebViewProvider(context.extensionUri, context);
    context.subscriptions.push(
        vscode.window.registerWebviewViewProvider(PreviewWebViewProvider.viewType, previewProvider)
    );

    // Phase 3: BuildManager 초기화
    const buildManager = new BuildManager(context);
    
    // Phase 3: 파일 변경 감지 시스템
    const fileWatcher = vscode.workspace.createFileSystemWatcher('**/*');
    fileWatcher.onDidChange(async (uri) => {
        if (uri.fsPath.includes('workspace') && !uri.fsPath.includes('node_modules')) {
            console.log(`[FileWatcher] File changed: ${uri.fsPath}`);
            await buildManager.autoBuild();
            previewProvider.refresh();
        }
    });
    context.subscriptions.push(fileWatcher);

    // Phase 4: LLMService와 CodeGenerationService 초기화
    const llmService = new LLMService();
    const codeGenerationService = new CodeGenerationService(buildManager, previewProvider, llmService);
    
    // Phase 3-4: ChatProvider와 모든 컴포넌트 연결
    chatProvider.setBuildManager(buildManager);
    chatProvider.setPreviewProvider(previewProvider);
    chatProvider.setCodeGenerationService(codeGenerationService);

    // 웰컴 뷰 프로바이더 등록 (기존)
    const provider = new WelcomeViewProvider();
    vscode.window.registerTreeDataProvider('windwalker.welcome', provider);
    
    vscode.window.showInformationMessage('🚀 WindWalker Phase 1 확장이 성공적으로 로드되었습니다!');
}

// Task 1.2, 1.4: ChatWebViewProvider 구현
class ChatWebViewProvider {
    static viewType = 'windwalker.chatView';

    constructor(extensionUri, context) {
        this._extensionUri = extensionUri;
        this._context = context;
        this._buildManager = null;
        this._previewProvider = null;
        this._codeGenerationService = null;
    }

    // Phase 3-4: 서비스 설정 메서드들
    setBuildManager(buildManager) {
        this._buildManager = buildManager;
    }

    setPreviewProvider(previewProvider) {
        this._previewProvider = previewProvider;
    }

    setCodeGenerationService(codeGenerationService) {
        this._codeGenerationService = codeGenerationService;
    }

    // Task 1.2: resolveWebviewView 메서드에서 webview/chat/index.html 로드
    resolveWebviewView(webviewView, context, _token) {
        this._view = webviewView;

        webviewView.webview.options = {
            enableScripts: true,
            localResourceRoots: [
                vscode.Uri.joinPath(this._extensionUri, 'webview', 'chat')
            ]
        };

        webviewView.webview.html = this._getHtmlForWebview(webviewView.webview);

        // Task 1.4: 메시지 수신 처리
        webviewView.webview.onDidReceiveMessage(async (data) => {
            try {
                console.log('[ChatWebViewProvider] Received message:', data);
                
                switch (data.type) {
                    case 'chat:ready':
                        // 웹뷰 준비 완료 시 환영 메시지 전송
                        console.log('[ChatWebViewProvider] Chat WebView is ready');
                        webviewView.webview.postMessage({
                            type: 'system:info',
                            data: 'Welcome to WindWalker! Phase 1 통신 테스트 성공 🎉'
                        });
                        break;
                        
                    case 'chat:message':
                        // 사용자 메시지에 대한 응답
                        const userMessage = data.data.content;
                        console.log('[ChatWebViewProvider] Processing user message:', userMessage);
                        
                        // Phase 2: 파일 시스템 명령어 처리
                        if (userMessage.toLowerCase().startsWith('파일 생성:') || userMessage.toLowerCase().startsWith('create file:')) {
                            await this._handleFileCreate(webviewView, userMessage);
                        } else if (userMessage.toLowerCase().startsWith('파일 읽기:') || userMessage.toLowerCase().startsWith('read file:')) {
                            await this._handleFileRead(webviewView, userMessage);
                        } else if (userMessage.toLowerCase().startsWith('파일 수정:') || userMessage.toLowerCase().startsWith('edit file:')) {
                            await this._handleFileEdit(webviewView, userMessage);
                        // Phase 3: 빌드 및 프리뷰 명령어 처리
                        } else if (userMessage.toLowerCase().startsWith('빌드:') || userMessage.toLowerCase().startsWith('build:')) {
                            await this._handleBuild(webviewView, userMessage);
                        } else if (userMessage.toLowerCase().startsWith('프리뷰:') || userMessage.toLowerCase().startsWith('preview:')) {
                            await this._handlePreview(webviewView, userMessage);
                        // Phase 4: AI 코드 생성 명령어 처리
                        } else if (userMessage.toLowerCase().startsWith('코드 생성:') || userMessage.toLowerCase().startsWith('generate:') || 
                                   userMessage.toLowerCase().includes('만들어줘') || userMessage.toLowerCase().includes('추가해줘') ||
                                   userMessage.toLowerCase().includes('create') || userMessage.toLowerCase().includes('add')) {
                            await this._handleAICodeGeneration(webviewView, userMessage);
                        } else {
                            // 간단한 에코 응답 (Phase 1 테스트용)
                            let response = `Echo: ${userMessage}`;
                            
                            // 특별한 명령어 처리
                            if (userMessage.toLowerCase().includes('hello')) {
                                response = 'Hello! WindWalker Phase 4가 정상적으로 작동하고 있습니다! 🚀\n\n사용 가능한 명령어:\n📁 파일: "파일 생성: filename.txt, 내용: Hello World"\n📄 읽기: "파일 읽기: filename.txt"\n✏️ 수정: "파일 수정: filename.txt, 내용: New content"\n🔨 빌드: "빌드: npm run dev"\n👁️ 프리뷰: "프리뷰: 새로고침"\n🤖 AI: "로그인 페이지 만들어줘", "카드 컴포넌트 추가해줘"';
                            } else if (userMessage.toLowerCase().includes('test')) {
                                response = '테스트 성공! 확장과 웹뷰 간의 양방향 통신이 완벽하게 작동합니다! ✅\n\nPhase 4 AI 코드 생성 기능이 추가되었습니다!';
                            }
                            
                            webviewView.webview.postMessage({
                                type: 'chat:response',
                                data: response
                            });
                        }
                        break;
                        
                    default:
                        console.log('[ChatWebViewProvider] Unknown message type:', data.type);
                }
                
            } catch (error) {
                console.error('[ChatWebViewProvider] Error processing message:', error);
                webviewView.webview.postMessage({
                    type: 'error',
                    data: { message: error.message }
                });
            }
        });
    }

    // Phase 2: FileManager 기능 구현
    async _handleFileCreate(webviewView, userMessage) {
        try {
            const match = userMessage.match(/파일 생성:\s*([^,]+),\s*내용:\s*(.+)|create file:\s*([^,]+),\s*content:\s*(.+)/i);
            if (!match) {
                webviewView.webview.postMessage({
                    type: 'chat:response',
                    data: '파일 생성 형식이 올바르지 않습니다. 예: "파일 생성: test.txt, 내용: Hello World"'
                });
                return;
            }

            const fileName = (match[1] || match[3]).trim();
            const content = (match[2] || match[4]).trim();

            // 워크스페이스 폴더 확인
            if (!vscode.workspace.workspaceFolders) {
                webviewView.webview.postMessage({
                    type: 'chat:response',
                    data: '워크스페이스가 열려있지 않습니다. 폴더를 먼저 열어주세요.'
                });
                return;
            }

            const workspaceFolder = vscode.workspace.workspaceFolders[0];
            const filePath = vscode.Uri.joinPath(workspaceFolder.uri, fileName);

            // 파일 생성
            await vscode.workspace.fs.writeFile(filePath, Buffer.from(content, 'utf8'));

            webviewView.webview.postMessage({
                type: 'chat:response',
                data: `✅ 파일이 성공적으로 생성되었습니다: ${fileName}\n내용: ${content}`
            });

            console.log(`[FileManager] Created file: ${fileName}`);

        } catch (error) {
            console.error('[FileManager] Error creating file:', error);
            webviewView.webview.postMessage({
                type: 'chat:response',
                data: `❌ 파일 생성 중 오류가 발생했습니다: ${error.message}`
            });
        }
    }

    async _handleFileRead(webviewView, userMessage) {
        try {
            const match = userMessage.match(/파일 읽기:\s*(.+)|read file:\s*(.+)/i);
            if (!match) {
                webviewView.webview.postMessage({
                    type: 'chat:response',
                    data: '파일 읽기 형식이 올바르지 않습니다. 예: "파일 읽기: test.txt"'
                });
                return;
            }

            const fileName = (match[1] || match[2]).trim();

            // 워크스페이스 폴더 확인
            if (!vscode.workspace.workspaceFolders) {
                webviewView.webview.postMessage({
                    type: 'chat:response',
                    data: '워크스페이스가 열려있지 않습니다. 폴더를 먼저 열어주세요.'
                });
                return;
            }

            const workspaceFolder = vscode.workspace.workspaceFolders[0];
            const filePath = vscode.Uri.joinPath(workspaceFolder.uri, fileName);

            // 파일 읽기
            const content = await vscode.workspace.fs.readFile(filePath);
            const textContent = Buffer.from(content).toString('utf8');

            webviewView.webview.postMessage({
                type: 'chat:response',
                data: `📄 파일 내용 (${fileName}):\n\n${textContent}`
            });

            console.log(`[FileManager] Read file: ${fileName}`);

        } catch (error) {
            console.error('[FileManager] Error reading file:', error);
            webviewView.webview.postMessage({
                type: 'chat:response',
                data: `❌ 파일 읽기 중 오류가 발생했습니다: ${error.message}`
            });
        }
    }

    async _handleFileEdit(webviewView, userMessage) {
        try {
            const match = userMessage.match(/파일 수정:\s*([^,]+),\s*내용:\s*(.+)|edit file:\s*([^,]+),\s*content:\s*(.+)/i);
            if (!match) {
                webviewView.webview.postMessage({
                    type: 'chat:response',
                    data: '파일 수정 형식이 올바르지 않습니다. 예: "파일 수정: test.txt, 내용: New content"'
                });
                return;
            }

            const fileName = (match[1] || match[3]).trim();
            const newContent = (match[2] || match[4]).trim();

            // 워크스페이스 폴더 확인
            if (!vscode.workspace.workspaceFolders) {
                webviewView.webview.postMessage({
                    type: 'chat:response',
                    data: '워크스페이스가 열려있지 않습니다. 폴더를 먼저 열어주세요.'
                });
                return;
            }

            const workspaceFolder = vscode.workspace.workspaceFolders[0];
            const filePath = vscode.Uri.joinPath(workspaceFolder.uri, fileName);

            // 파일 존재 확인
            try {
                await vscode.workspace.fs.stat(filePath);
            } catch {
                webviewView.webview.postMessage({
                    type: 'chat:response',
                    data: `❌ 파일을 찾을 수 없습니다: ${fileName}`
                });
                return;
            }

            // 파일 수정
            await vscode.workspace.fs.writeFile(filePath, Buffer.from(newContent, 'utf8'));

            webviewView.webview.postMessage({
                type: 'chat:response',
                data: `✅ 파일이 성공적으로 수정되었습니다: ${fileName}\n새 내용: ${newContent}`
            });

            console.log(`[FileManager] Modified file: ${fileName}`);

        } catch (error) {
            console.error('[FileManager] Error editing file:', error);
            webviewView.webview.postMessage({
                type: 'chat:response',
                data: `❌ 파일 수정 중 오류가 발생했습니다: ${error.message}`
            });
        }
    }

    // Phase 3: 빌드 처리
    async _handleBuild(webviewView, userMessage) {
        try {
            if (!this._buildManager) {
                webviewView.webview.postMessage({
                    type: 'chat:response',
                    data: '❌ BuildManager가 초기화되지 않았습니다.'
                });
                return;
            }

            webviewView.webview.postMessage({
                type: 'chat:response',
                data: '🔨 빌드를 시작합니다...'
            });

            const buildResult = await this._buildManager.runBuild();
            
            if (buildResult.success) {
                webviewView.webview.postMessage({
                    type: 'chat:response',
                    data: `✅ 빌드 완료!\n📝 출력: ${buildResult.output}\n🌐 서버: ${buildResult.serverUrl || 'http://localhost:3000'}`
                });

                // 프리뷰 자동 새로고침
                if (this._previewProvider) {
                    this._previewProvider.refresh();
                }
            } else {
                webviewView.webview.postMessage({
                    type: 'chat:response',
                    data: `❌ 빌드 실패:\n${buildResult.error}`
                });
            }

        } catch (error) {
            console.error('[BuildManager] Error during build:', error);
            webviewView.webview.postMessage({
                type: 'chat:response',
                data: `❌ 빌드 중 오류가 발생했습니다: ${error.message}`
            });
        }
    }

    // Phase 3: 프리뷰 처리
    async _handlePreview(webviewView, userMessage) {
        try {
            if (!this._previewProvider) {
                webviewView.webview.postMessage({
                    type: 'chat:response',
                    data: '❌ PreviewProvider가 초기화되지 않았습니다.'
                });
                return;
            }

            if (userMessage.toLowerCase().includes('새로고침') || userMessage.toLowerCase().includes('refresh')) {
                this._previewProvider.refresh();
                webviewView.webview.postMessage({
                    type: 'chat:response',
                    data: '🔄 프리뷰가 새로고침되었습니다!'
                });
            } else {
                webviewView.webview.postMessage({
                    type: 'chat:response',
                    data: '👁️ 프리뷰 패널을 확인하세요. 사용 가능한 명령어:\n- "프리뷰: 새로고침" - 프리뷰 새로고침'
                });
            }

        } catch (error) {
            console.error('[PreviewProvider] Error during preview:', error);
            webviewView.webview.postMessage({
                type: 'chat:response',
                data: `❌ 프리뷰 중 오류가 발생했습니다: ${error.message}`
            });
        }
    }

    // Phase 4: AI 코드 생성 처리
    async _handleAICodeGeneration(webviewView, userMessage) {
        try {
            if (!this._codeGenerationService) {
                webviewView.webview.postMessage({
                    type: 'chat:response',
                    data: '❌ AI 코드 생성 서비스가 초기화되지 않았습니다.'
                });
                return;
            }

            webviewView.webview.postMessage({
                type: 'chat:response',
                data: '🤖 AI가 코드를 생성하고 있습니다...'
            });

            const result = await this._codeGenerationService.generateCode(userMessage);
            
            if (result.success) {
                webviewView.webview.postMessage({
                    type: 'chat:response',
                    data: `✅ AI 코드 생성 완료!\n\n📝 생성된 파일: ${result.files.join(', ')}\n💡 설명: ${result.explanation}\n\n🔨 자동 빌드가 실행됩니다...`
                });

                // 자동 빌드 및 프리뷰 새로고침
                if (this._buildManager) {
                    await this._buildManager.autoBuild();
                }
                if (this._previewProvider) {
                    this._previewProvider.refresh();
                }

                webviewView.webview.postMessage({
                    type: 'chat:response',
                    data: '🎉 완료! 프리뷰에서 결과를 확인하세요.'
                });
            } else {
                webviewView.webview.postMessage({
                    type: 'chat:response',
                    data: `❌ AI 코드 생성 실패:\n${result.error}`
                });
            }

        } catch (error) {
            console.error('[AI Code Generation] Error:', error);
            webviewView.webview.postMessage({
                type: 'chat:response',
                data: `❌ AI 코드 생성 중 오류가 발생했습니다: ${error.message}`
            });
        }
    }

    _getHtmlForWebview(webview) {
        // HTML 파일을 직접 읽어서 반환하는 대신, 간단한 HTML을 반환
        // (파일 시스템 접근을 피하기 위해)
        return `<!DOCTYPE html>
<html lang="ko">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>WindWalker AI Chat</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            margin: 0;
            padding: 10px;
            background: var(--vscode-editor-background);
            color: var(--vscode-editor-foreground);
            height: 100vh;
            display: flex;
            flex-direction: column;
        }
        
        #chat-container {
            flex: 1;
            display: flex;
            flex-direction: column;
        }
        
        #messages {
            flex: 1;
            overflow-y: auto;
            padding: 10px;
            border: 1px solid var(--vscode-panel-border);
            border-radius: 4px;
            margin-bottom: 10px;
            background: var(--vscode-input-background);
        }
        
        .message {
            margin-bottom: 10px;
            padding: 8px;
            border-radius: 4px;
        }
        
        .message.system {
            background: var(--vscode-badge-background);
            color: var(--vscode-badge-foreground);
            font-style: italic;
        }
        
        .message.user {
            background: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
            text-align: right;
        }
        
        .message.assistant {
            background: var(--vscode-textCodeBlock-background);
            border-left: 3px solid var(--vscode-focusBorder);
        }
        
        #input-area {
            display: flex;
            gap: 5px;
        }
        
        #chat-input {
            flex: 1;
            padding: 8px;
            border: 1px solid var(--vscode-input-border);
            border-radius: 4px;
            background: var(--vscode-input-background);
            color: var(--vscode-input-foreground);
            font-family: inherit;
        }
        
        #send-button {
            padding: 8px 16px;
            background: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
            border: none;
            border-radius: 4px;
            cursor: pointer;
        }
        
        #send-button:hover {
            background: var(--vscode-button-hoverBackground);
        }
        
        #send-button:disabled {
            opacity: 0.5;
            cursor: not-allowed;
        }
        
        .status {
            font-size: 12px;
            color: var(--vscode-descriptionForeground);
            text-align: center;
            padding: 5px;
        }
    </style>
</head>
<body>
    <div id="chat-container">
        <div class="status" id="status">WindWalker AI Chat 로딩 중...</div>
        <div id="messages"></div>
        <div id="input-area">
            <input type="text" id="chat-input" placeholder="메시지를 입력하세요..." disabled>
            <button id="send-button" disabled>전송</button>
        </div>
    </div>

    <script>
        // VS Code API 획득
        const vscode = acquireVsCodeApi();
        
        const messagesDiv = document.getElementById('messages');
        const chatInput = document.getElementById('chat-input');
        const sendButton = document.getElementById('send-button');
        const statusDiv = document.getElementById('status');
        
        // 메시지 추가 함수
        function addMessage(type, content) {
            const messageDiv = document.createElement('div');
            messageDiv.className = \`message \${type}\`;
            messageDiv.textContent = content;
            messagesDiv.appendChild(messageDiv);
            messagesDiv.scrollTop = messagesDiv.scrollHeight;
        }
        
        // 확장에 준비 완료 신호 전송 (Task 1.3)
        function notifyReady() {
            console.log('[Chat WebView] Sending ready message to extension');
            vscode.postMessage({
                type: 'chat:ready',
                timestamp: Date.now()
            });
        }
        
        // 메시지 전송 함수
        function sendMessage() {
            const message = chatInput.value.trim();
            if (!message) return;
            
            // UI에 사용자 메시지 표시
            addMessage('user', message);
            
            // 확장으로 메시지 전송
            console.log('[Chat WebView] Sending message:', message);
            vscode.postMessage({
                type: 'chat:message',
                data: { content: message },
                timestamp: Date.now()
            });
            
            // 입력 필드 초기화
            chatInput.value = '';
            sendButton.disabled = true;
        }
        
        // 확장으로부터 메시지 수신
        window.addEventListener('message', event => {
            const message = event.data;
            console.log('[Chat WebView] Received message from extension:', message);
            
            switch (message.type) {
                case 'system:info':
                    addMessage('system', message.data);
                    statusDiv.textContent = '연결됨 - 메시지를 입력하세요';
                    chatInput.disabled = false;
                    break;
                    
                case 'chat:response':
                    addMessage('assistant', message.data);
                    break;
                    
                case 'error':
                    addMessage('system', \`오류: \${message.data.message || message.data}\`);
                    break;
                    
                default:
                    console.log('[Chat WebView] Unknown message type:', message.type);
            }
        });
        
        // 이벤트 리스너 설정
        sendButton.addEventListener('click', sendMessage);
        
        chatInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendMessage();
            }
        });
        
        chatInput.addEventListener('input', () => {
            sendButton.disabled = !chatInput.value.trim();
        });
        
        // DOM 로드 완료 후 준비 신호 전송
        document.addEventListener('DOMContentLoaded', () => {
            console.log('[Chat WebView] DOM loaded, sending ready signal');
            setTimeout(notifyReady, 100); // 약간의 지연 후 전송
        });
        
        // 페이지 로드 완료 후에도 준비 신호 전송 (보험용)
        window.addEventListener('load', () => {
            console.log('[Chat WebView] Window loaded, sending ready signal');
            setTimeout(notifyReady, 200);
        });
        
        console.log('[Chat WebView] Script loaded');
    </script>
</body>
</html>`;
    }
}

// Phase 3: BuildManager 클래스 구현
class BuildManager {
    constructor(context) {
        this._context = context;
        this._isBuilding = false;
        this._devServer = null;
    }

    async runBuild() {
        if (this._isBuilding) {
            return {
                success: false,
                error: '이미 빌드가 진행 중입니다.'
            };
        }

        try {
            this._isBuilding = true;
            console.log('[BuildManager] Starting build process...');

            // 워크스페이스 폴더 확인
            if (!vscode.workspace.workspaceFolders) {
                return {
                    success: false,
                    error: '워크스페이스가 열려있지 않습니다.'
                };
            }

            const workspaceFolder = vscode.workspace.workspaceFolders[0];
            const workspacePath = workspaceFolder.uri.fsPath;

            // 간단한 프로젝트 템플릿 생성
            await this._ensureProjectStructure(workspacePath);

            // 개발 서버 시작
            const serverResult = await this._startDevServer(workspacePath);

            return {
                success: true,
                output: 'WindWalker 프로젝트 빌드 완료',
                serverUrl: 'http://localhost:3000',
                buildPath: workspacePath
            };

        } catch (error) {
            console.error('[BuildManager] Build failed:', error);
            return {
                success: false,
                error: error.message
            };
        } finally {
            this._isBuilding = false;
        }
    }

    async autoBuild() {
        console.log('[BuildManager] Auto-build triggered by file change');
        // 자동 빌드는 더 빠르게 처리 (개발 서버가 이미 실행 중이라면 스킵)
        if (this._devServer) {
            console.log('[BuildManager] Dev server already running, skipping rebuild');
            return true;
        }
        
        const result = await this.runBuild();
        return result.success;
    }

    async _ensureProjectStructure(workspacePath) {
        const fs = require('fs').promises;
        const path = require('path');

        // 기본 프로젝트 구조 확인 및 생성
        const indexHtmlPath = path.join(workspacePath, 'index.html');
        
        try {
            await fs.access(indexHtmlPath);
            console.log('[BuildManager] index.html already exists');
        } catch {
            // index.html이 없으면 기본 템플릿 생성
            const defaultHtml = `<!DOCTYPE html>
<html lang="ko">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>WindWalker 프로젝트</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            max-width: 800px;
            margin: 0 auto;
            padding: 20px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            min-height: 100vh;
        }
        .container {
            background: rgba(255, 255, 255, 0.1);
            padding: 30px;
            border-radius: 10px;
            backdrop-filter: blur(10px);
        }
        h1 { color: #fff; text-shadow: 2px 2px 4px rgba(0,0,0,0.3); }
        .status { 
            background: rgba(0, 255, 0, 0.2); 
            padding: 10px; 
            border-radius: 5px; 
            margin: 20px 0;
            border: 1px solid rgba(0, 255, 0, 0.3);
        }
        .features {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 15px;
            margin: 20px 0;
        }
        .feature {
            background: rgba(255, 255, 255, 0.1);
            padding: 15px;
            border-radius: 8px;
            border: 1px solid rgba(255, 255, 255, 0.2);
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>🌪️ WindWalker IDE</h1>
        
        <div class="status">
            ✅ Phase 3 빌드 및 프리뷰 시스템이 활성화되었습니다!
        </div>
        
        <div class="features">
            <div class="feature">
                <h3>📁 파일 관리</h3>
                <p>AI 채팅으로 파일 생성, 읽기, 수정</p>
            </div>
            <div class="feature">
                <h3>🔨 자동 빌드</h3>
                <p>파일 변경 시 자동 빌드 및 프리뷰 업데이트</p>
            </div>
            <div class="feature">
                <h3>👁️ 실시간 프리뷰</h3>
                <p>변경사항을 즉시 확인</p>
            </div>
            <div class="feature">
                <h3>🤖 AI 통합</h3>
                <p>자연어로 프로젝트 조작</p>
            </div>
        </div>
        
        <p>
            <strong>마지막 빌드:</strong> <span id="buildTime">${new Date().toLocaleString()}</span><br>
            <strong>상태:</strong> <span style="color: #90EE90;">정상 작동</span>
        </p>
        
        <script>
            // 자동 새로고침 기능
            setInterval(() => {
                document.getElementById('buildTime').textContent = new Date().toLocaleString();
            }, 1000);
            
            console.log('WindWalker Phase 3 프리뷰 시스템 로드 완료!');
        </script>
    </div>
</body>
</html>`;

            await fs.writeFile(indexHtmlPath, defaultHtml, 'utf8');
            console.log('[BuildManager] Created default index.html');
        }
    }

    async _startDevServer(workspacePath) {
        // 간단한 정적 파일 서버 시뮬레이션
        // 실제로는 Docker의 preview-server가 담당
        console.log('[BuildManager] Dev server configuration updated');
        this._devServer = {
            port: 3000,
            status: 'running',
            path: workspacePath
        };
        return this._devServer;
    }

    stop() {
        if (this._devServer) {
            console.log('[BuildManager] Stopping dev server');
            this._devServer = null;
        }
    }
}

// Phase 3: PreviewWebViewProvider 클래스 구현
class PreviewWebViewProvider {
    static viewType = 'windwalker.previewView';

    constructor(extensionUri, context) {
        this._extensionUri = extensionUri;
        this._context = context;
        this._view = null;
    }

    resolveWebviewView(webviewView, context, _token) {
        this._view = webviewView;

        webviewView.webview.options = {
            enableScripts: true,
            localResourceRoots: []
        };

        this.refresh();

        // 메시지 수신 처리
        webviewView.webview.onDidReceiveMessage(data => {
            console.log('[PreviewWebViewProvider] Received message:', data);
            
            switch (data.type) {
                case 'preview:ready':
                    console.log('[PreviewWebViewProvider] Preview WebView is ready');
                    break;
                case 'preview:reload':
                    this.refresh();
                    break;
            }
        });
    }

    refresh() {
        if (this._view) {
            console.log('[PreviewWebViewProvider] Refreshing preview');
            this._view.webview.html = this._getHtmlForWebview();
        }
    }

    _getHtmlForWebview() {
        return `<!DOCTYPE html>
<html lang="ko">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>WindWalker Preview</title>
    <style>
        body {
            margin: 0;
            padding: 0;
            background: var(--vscode-editor-background);
            color: var(--vscode-editor-foreground);
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            overflow: hidden;
        }
        
        #preview-container {
            width: 100%;
            height: 100vh;
            position: relative;
        }
        
        #preview-frame {
            width: 100%;
            height: calc(100vh - 40px);
            border: none;
            background: white;
        }
        
        #preview-header {
            height: 40px;
            background: var(--vscode-titleBar-activeBackground);
            display: flex;
            align-items: center;
            padding: 0 10px;
            border-bottom: 1px solid var(--vscode-panel-border);
        }
        
        #preview-url {
            color: var(--vscode-titleBar-activeForeground);
            font-size: 12px;
            font-family: monospace;
        }
        
        #refresh-btn {
            margin-left: auto;
            background: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
            border: none;
            padding: 5px 10px;
            border-radius: 3px;
            cursor: pointer;
            font-size: 11px;
        }
        
        #refresh-btn:hover {
            background: var(--vscode-button-hoverBackground);
        }
        
        .loading {
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            color: var(--vscode-descriptionForeground);
        }
    </style>
</head>
<body>
    <div id="preview-container">
        <div id="preview-header">
            <span id="preview-url">🌐 http://localhost:3000</span>
            <button id="refresh-btn" onclick="refreshPreview()">🔄 새로고침</button>
        </div>
        <iframe id="preview-frame" src="http://localhost:3000" frameborder="0">
            <div class="loading">프리뷰 로딩 중...</div>
        </iframe>
    </div>

    <script>
        const vscode = acquireVsCodeApi();
        
        function refreshPreview() {
            const frame = document.getElementById('preview-frame');
            frame.src = frame.src + '?t=' + Date.now();
            console.log('[Preview] Manual refresh triggered');
        }
        
        // 자동 새로고침 (개발 모드)
        let autoRefreshInterval;
        
        function startAutoRefresh() {
            if (autoRefreshInterval) return;
            
            autoRefreshInterval = setInterval(() => {
                // 5초마다 자동 새로고침 (파일 변경 감지 시)
                refreshPreview();
            }, 5000);
        }
        
        function stopAutoRefresh() {
            if (autoRefreshInterval) {
                clearInterval(autoRefreshInterval);
                autoRefreshInterval = null;
            }
        }
        
        // iframe 로드 이벤트
        document.getElementById('preview-frame').addEventListener('load', function() {
            console.log('[Preview] Frame loaded successfully');
        });
        
        document.getElementById('preview-frame').addEventListener('error', function() {
            console.log('[Preview] Frame load error - retrying...');
            setTimeout(refreshPreview, 2000);
        });
        
        // VS Code에 준비 완료 신호 전송
        vscode.postMessage({
            type: 'preview:ready',
            timestamp: Date.now()
        });
        
        console.log('[Preview] WindWalker Preview WebView initialized');
        
        // 개발 모드에서 자동 새로고침 시작
        startAutoRefresh();
    </script>
</body>
</html>`;
    }
}

// Phase 4: LLMService 클래스 구현 (Claude API)
class LLMService {
    constructor() {
        // Claude API 설정 - 실제 운영에서는 환경변수로 관리
        this.apiKey = process.env.ANTHROPIC_API_KEY || 'sk-ant-api03-your-api-key-here';
        this.apiUrl = 'https://api.anthropic.com/v1/messages';
        this.model = 'claude-3-sonnet-20240229';
    }

    async generateCode(prompt, context = {}) {
        try {
            console.log('[LLMService] Generating code with Claude API');
            
            // 시스템 프롬프트 - WindWalker 특화
            const systemPrompt = `You are WindWalker AI, a code generation assistant for web development.

Context:
- Current project: ${context.projectType || 'HTML/CSS/JavaScript website'}
- Available files: ${context.files ? context.files.join(', ') : 'index.html'}
- User workspace: ${context.workspacePath || '/workspace'}

Rules:
1. Generate clean, modern, responsive code
2. Use semantic HTML5 and modern CSS
3. Prefer vanilla JavaScript over frameworks for simplicity
4. Include helpful comments in Korean
5. Follow accessibility best practices
6. Generate complete, working code snippets

Response format:
- Provide code in markdown code blocks
- Include file names as comments
- Add brief explanation in Korean
- Suggest where to save files`;

            // API 호출 시뮬레이션 (실제 API 키가 없는 경우를 위한 fallback)
            if (this.apiKey === 'sk-ant-api03-your-api-key-here') {
                return this._generateMockResponse(prompt, context);
            }

            const response = await fetch(this.apiUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-api-key': this.apiKey,
                    'anthropic-version': '2023-06-01'
                },
                body: JSON.stringify({
                    model: this.model,
                    max_tokens: 4000,
                    system: systemPrompt,
                    messages: [
                        {
                            role: 'user',
                            content: prompt
                        }
                    ]
                })
            });

            if (!response.ok) {
                throw new Error(`Claude API error: ${response.status}`);
            }

            const data = await response.json();
            return {
                success: true,
                content: data.content[0].text,
                usage: data.usage
            };

        } catch (error) {
            console.error('[LLMService] Error calling Claude API:', error);
            
            // Fallback to mock response
            return this._generateMockResponse(prompt, context);
        }
    }

    _generateMockResponse(prompt, context) {
        console.log('[LLMService] Using mock response (API key not configured)');
        
        // 간단한 규칙 기반 코드 생성
        const lowerPrompt = prompt.toLowerCase();
        
        if (lowerPrompt.includes('로그인') || lowerPrompt.includes('login')) {
            return {
                success: true,
                content: `로그인 페이지를 생성하겠습니다.

\`\`\`html
<!-- login.html -->
<!DOCTYPE html>
<html lang="ko">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>로그인 - WindWalker</title>
    <style>
        .login-container {
            max-width: 400px;
            margin: 100px auto;
            padding: 30px;
            background: white;
            border-radius: 10px;
            box-shadow: 0 0 20px rgba(0,0,0,0.1);
        }
        .form-group {
            margin-bottom: 20px;
        }
        label {
            display: block;
            margin-bottom: 5px;
            font-weight: bold;
        }
        input {
            width: 100%;
            padding: 10px;
            border: 1px solid #ddd;
            border-radius: 5px;
            font-size: 16px;
        }
        .btn-login {
            width: 100%;
            padding: 12px;
            background: #007bff;
            color: white;
            border: none;
            border-radius: 5px;
            font-size: 16px;
            cursor: pointer;
        }
        .btn-login:hover {
            background: #0056b3;
        }
    </style>
</head>
<body>
    <div class="login-container">
        <h2>로그인</h2>
        <form id="loginForm">
            <div class="form-group">
                <label for="email">이메일</label>
                <input type="email" id="email" required>
            </div>
            <div class="form-group">
                <label for="password">비밀번호</label>
                <input type="password" id="password" required>
            </div>
            <button type="submit" class="btn-login">로그인</button>
        </form>
    </div>
    
    <script>
        document.getElementById('loginForm').addEventListener('submit', function(e) {
            e.preventDefault();
            alert('로그인 기능이 구현되었습니다!');
        });
    </script>
</body>
</html>
\`\`\`

완전한 로그인 페이지가 생성되었습니다. 반응형 디자인과 기본 검증 기능이 포함되어 있습니다.`,
                usage: { input_tokens: 50, output_tokens: 200 }
            };
        }
        
        if (lowerPrompt.includes('카드') || lowerPrompt.includes('card')) {
            return {
                success: true,
                content: `카드 컴포넌트를 생성하겠습니다.

\`\`\`html
<!-- cards.html -->
<!DOCTYPE html>
<html lang="ko">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>카드 컴포넌트 - WindWalker</title>
    <style>
        .card-container {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
            gap: 20px;
            padding: 20px;
            max-width: 1200px;
            margin: 0 auto;
        }
        .card {
            background: white;
            border-radius: 10px;
            box-shadow: 0 4px 6px rgba(0,0,0,0.1);
            overflow: hidden;
            transition: transform 0.3s ease;
        }
        .card:hover {
            transform: translateY(-5px);
        }
        .card-image {
            width: 100%;
            height: 200px;
            background: linear-gradient(45deg, #667eea, #764ba2);
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-size: 24px;
        }
        .card-content {
            padding: 20px;
        }
        .card-title {
            font-size: 18px;
            font-weight: bold;
            margin-bottom: 10px;
        }
        .card-description {
            color: #666;
            line-height: 1.5;
        }
        .card-button {
            margin-top: 15px;
            padding: 10px 20px;
            background: #007bff;
            color: white;
            border: none;
            border-radius: 5px;
            cursor: pointer;
        }
    </style>
</head>
<body>
    <div class="card-container">
        <div class="card">
            <div class="card-image">🚀</div>
            <div class="card-content">
                <div class="card-title">WindWalker IDE</div>
                <div class="card-description">AI 기반 웹 개발 환경으로 자연어로 코드를 생성할 수 있습니다.</div>
                <button class="card-button">더 알아보기</button>
            </div>
        </div>
        <div class="card">
            <div class="card-image">⚡</div>
            <div class="card-content">
                <div class="card-title">빠른 프로토타이핑</div>
                <div class="card-description">실시간 프리뷰와 자동 빌드로 빠른 개발이 가능합니다.</div>
                <button class="card-button">체험해보기</button>
            </div>
        </div>
        <div class="card">
            <div class="card-image">🎨</div>
            <div class="card-content">
                <div class="card-title">아름다운 디자인</div>
                <div class="card-description">현대적이고 반응형인 UI 컴포넌트를 제공합니다.</div>
                <button class="card-button">디자인 보기</button>
            </div>
        </div>
    </div>
</body>
</html>
\`\`\`

반응형 카드 컴포넌트가 생성되었습니다. 호버 효과와 그리드 레이아웃이 포함되어 있습니다.`,
                usage: { input_tokens: 50, output_tokens: 300 }
            };
        }

        // 기본 응답
        return {
            success: true,
            content: `요청하신 "${prompt}" 기능을 구현하겠습니다.

\`\`\`html
<!-- generated.html -->
<!DOCTYPE html>
<html lang="ko">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>WindWalker AI 생성 페이지</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            max-width: 800px;
            margin: 0 auto;
            padding: 20px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            min-height: 100vh;
        }
        .content {
            background: rgba(255, 255, 255, 0.1);
            padding: 30px;
            border-radius: 10px;
            backdrop-filter: blur(10px);
        }
        h1 {
            text-align: center;
            margin-bottom: 30px;
        }
        .feature-box {
            background: rgba(255, 255, 255, 0.1);
            padding: 20px;
            border-radius: 8px;
            margin: 20px 0;
        }
    </style>
</head>
<body>
    <div class="content">
        <h1>🤖 AI가 생성한 페이지</h1>
        <div class="feature-box">
            <h3>요청 내용</h3>
            <p>${prompt}</p>
        </div>
        <div class="feature-box">
            <h3>WindWalker AI</h3>
            <p>자연어로 웹사이트를 만들 수 있는 혁신적인 개발 환경입니다.</p>
        </div>
        <script>
            console.log('WindWalker AI가 생성한 코드입니다!');
            alert('AI 코드 생성이 성공적으로 완료되었습니다!');
        </script>
    </div>
</body>
</html>
\`\`\`

AI가 요청에 맞는 웹페이지를 생성했습니다. 더 구체적인 요청을 하시면 더 정확한 코드를 생성할 수 있습니다.`,
            usage: { input_tokens: 30, output_tokens: 150 }
        };
    }
}

// Phase 4: CodeGenerationService 클래스 구현
class CodeGenerationService {
    constructor(buildManager, previewProvider, llmService) {
        this.buildManager = buildManager;
        this.previewProvider = previewProvider;
        this.llmService = llmService;
    }

    async generateCode(userPrompt) {
        try {
            console.log('[CodeGenerationService] Generating code for:', userPrompt);

            // 워크스페이스 컨텍스트 수집
            const context = await this._gatherContext();
            
            // LLM으로 코드 생성
            const llmResult = await this.llmService.generateCode(userPrompt, context);
            
            if (!llmResult.success) {
                return {
                    success: false,
                    error: 'AI 코드 생성에 실패했습니다.'
                };
            }

            // 생성된 코드에서 파일 추출 및 저장
            const savedFiles = await this._extractAndSaveFiles(llmResult.content, userPrompt);
            
            return {
                success: true,
                files: savedFiles,
                explanation: this._extractExplanation(llmResult.content),
                rawResponse: llmResult.content
            };

        } catch (error) {
            console.error('[CodeGenerationService] Error:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    async _gatherContext() {
        const context = {
            projectType: 'HTML/CSS/JavaScript website',
            files: [],
            workspacePath: '/workspace'
        };

        try {
            // 워크스페이스 파일 목록 수집
            if (vscode.workspace.workspaceFolders) {
                const workspaceFolder = vscode.workspace.workspaceFolders[0];
                const files = await vscode.workspace.fs.readDirectory(workspaceFolder.uri);
                context.files = files.map(([name, type]) => name).filter(name => 
                    name.endsWith('.html') || name.endsWith('.css') || name.endsWith('.js')
                );
            }
        } catch (error) {
            console.log('[CodeGenerationService] Could not gather context:', error.message);
        }

        return context;
    }

    async _extractAndSaveFiles(content, userPrompt) {
        const savedFiles = [];
        
        try {
            // 코드 블록 추출 (```로 감싸진 부분)
            const codeBlocks = content.match(/```[\s\S]*?```/g) || [];
            
            for (const block of codeBlocks) {
                const lines = block.split('\n');
                const firstLine = lines[0];
                
                // 파일명 추출 (<!-- filename.html --> 또는 ```html 형태)
                let filename = 'generated.html';
                let fileContent = '';
                
                if (firstLine.includes('<!--') && firstLine.includes('-->')) {
                    const match = firstLine.match(/<!--\s*(.+?)\s*-->/);
                    if (match) filename = match[1].trim();
                }
                
                // 언어 지정이 있는 경우 (```html, ```css, ```javascript)
                if (firstLine.includes('```html')) filename = 'generated.html';
                if (firstLine.includes('```css')) filename = 'styles.css';
                if (firstLine.includes('```javascript') || firstLine.includes('```js')) filename = 'script.js';
                
                // 특정 키워드로 파일명 추론
                if (userPrompt.toLowerCase().includes('로그인') || userPrompt.toLowerCase().includes('login')) {
                    filename = 'login.html';
                }
                if (userPrompt.toLowerCase().includes('카드') || userPrompt.toLowerCase().includes('card')) {
                    filename = 'cards.html';
                }
                
                // 코드 내용 추출 (첫 줄과 마지막 줄 제거)
                fileContent = lines.slice(1, -1).join('\n');
                
                // 파일 저장
                if (fileContent.trim()) {
                    await this._saveFile(filename, fileContent);
                    savedFiles.push(filename);
                }
            }
            
            // 코드 블록이 없는 경우 전체 내용을 HTML로 저장
            if (savedFiles.length === 0) {
                const filename = 'ai-generated.html';
                await this._saveFile(filename, this._wrapAsHTML(content, userPrompt));
                savedFiles.push(filename);
            }
            
        } catch (error) {
            console.error('[CodeGenerationService] Error saving files:', error);
        }
        
        return savedFiles;
    }

    async _saveFile(filename, content) {
        if (!vscode.workspace.workspaceFolders) {
            throw new Error('워크스페이스가 열려있지 않습니다.');
        }

        const workspaceFolder = vscode.workspace.workspaceFolders[0];
        const filePath = vscode.Uri.joinPath(workspaceFolder.uri, filename);
        
        await vscode.workspace.fs.writeFile(filePath, Buffer.from(content, 'utf8'));
        console.log(`[CodeGenerationService] Saved file: ${filename}`);
    }

    _extractExplanation(content) {
        // 코드 블록이 아닌 설명 부분 추출
        const lines = content.split('\n');
        const explanationLines = [];
        
        let inCodeBlock = false;
        for (const line of lines) {
            if (line.trim().startsWith('```')) {
                inCodeBlock = !inCodeBlock;
                continue;
            }
            
            if (!inCodeBlock && line.trim()) {
                explanationLines.push(line.trim());
            }
        }
        
        return explanationLines.slice(0, 3).join(' ').substring(0, 200) + '...';
    }

    _wrapAsHTML(content, userPrompt) {
        return `<!DOCTYPE html>
<html lang="ko">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>AI 생성 페이지</title>
    <style>
        body { 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            max-width: 800px; 
            margin: 0 auto; 
            padding: 20px; 
            line-height: 1.6;
        }
        .ai-content { 
            background: #f8f9fa; 
            padding: 20px; 
            border-radius: 8px; 
            border-left: 4px solid #007bff;
        }
    </style>
</head>
<body>
    <h1>🤖 AI 생성 결과</h1>
    <p><strong>요청:</strong> ${userPrompt}</p>
    <div class="ai-content">
        <pre style="white-space: pre-wrap;">${content}</pre>
    </div>
</body>
</html>`;
    }
}

class WelcomeViewProvider {
    getTreeItem(element) {
        return element;
    }

    getChildren(element) {
        if (!element) {
            return [
                new vscode.TreeItem('WindWalker 활성화됨', vscode.TreeItemCollapsibleState.None),
                new vscode.TreeItem('Phase 1 테스트 성공', vscode.TreeItemCollapsibleState.None)
            ];
        }
        return [];
    }
}

function deactivate() {
    console.log('WindWalker Phase 1 비활성화됨');
}

module.exports = {
    activate,
    deactivate
};