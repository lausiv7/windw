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
                        
                        // 간단한 에코 응답 (Phase 1 테스트용)
                        let response = `Echo: ${userMessage}`;
                        
                        // 특별한 명령어 처리
                        if (userMessage.toLowerCase().includes('hello')) {
                            response = 'Hello! WindWalker Phase 1이 정상적으로 작동하고 있습니다! 🚀';
                        } else if (userMessage.toLowerCase().includes('test')) {
                            response = '테스트 성공! 확장과 웹뷰 간의 양방향 통신이 완벽하게 작동합니다! ✅';
                        }
                        
                        webviewView.webview.postMessage({
                            type: 'chat:response',
                            data: response
                        });
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