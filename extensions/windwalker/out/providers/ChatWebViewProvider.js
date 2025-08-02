"use strict";
// [의도] VS Code 사이드바에 'AI 채팅' 웹뷰를 생성하고 관리합니다.
// [책임] 웹뷰의 HTML 컨텐츠 제공, 웹뷰와의 메시지 송수신(postMessage) 처리.
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
exports.ChatWebViewProvider = void 0;
const vscode = __importStar(require("vscode"));
const MessageBridge_1 = require("../core/MessageBridge");
class ChatWebViewProvider {
    constructor(_extensionUri, context) {
        this._extensionUri = _extensionUri;
        this.context = context;
        this.messageBridge = new MessageBridge_1.MessageBridge(context);
    }
    resolveWebviewView(webviewView, context, _token) {
        this._view = webviewView;
        webviewView.webview.options = {
            // Allow scripts in the webview
            enableScripts: true,
            localResourceRoots: [
                vscode.Uri.joinPath(this._extensionUri, 'webview', 'chat')
            ]
        };
        webviewView.webview.html = this._getHtmlForWebview(webviewView.webview);
        // 웹뷰로부터 메시지를 받으면 MessageBridge를 통해 처리
        webviewView.webview.onDidReceiveMessage((data) => __awaiter(this, void 0, void 0, function* () {
            try {
                console.log('[ChatWebViewProvider] Received message:', data);
                // Phase 2: Use MessageBridge to handle all messages
                yield this.messageBridge.processMessage(data, webviewView.webview);
            }
            catch (error) {
                console.error('[ChatWebViewProvider] Error processing message:', error);
                const errorMessage = error instanceof Error ? error.message : String(error);
                // Send error response to webview
                webviewView.webview.postMessage({
                    type: 'error',
                    data: { message: errorMessage, originalType: data.type },
                    timestamp: Date.now()
                });
            }
        }));
    }
    _getHtmlForWebview(webview) {
        // Get the local path to main script run in the webview, then convert it to a uri we can use in the webview.
        const scriptUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'webview', 'chat', 'script.js'));
        const styleMainUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'webview', 'chat', 'style.css'));
        // Use a nonce to only allow a specific script to be run.
        const nonce = getNonce();
        return `<!DOCTYPE html>
			<html lang="en">
			<head>
				<meta charset="UTF-8">
				<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource} 'unsafe-inline'; script-src 'nonce-${nonce}';">
				<meta name="viewport" content="width=device-width, initial-scale=1.0">
				
				<link href="${styleMainUri}" rel="stylesheet">
				
				<title>WindWalker AI Chat</title>
			</head>
			<body>
				<div id="chat-container">
					<div id="messages"></div>
					<div id="input-area">
						<textarea id="chat-input" placeholder="What can I help you with?"></textarea>
						<button id="send-button">Send</button>
					</div>
				</div>

				<script nonce="${nonce}" src="${scriptUri}"></script>
			</body>
			</html>`;
    }
}
exports.ChatWebViewProvider = ChatWebViewProvider;
ChatWebViewProvider.viewType = 'windwalker.chatView';
function getNonce() {
    let text = '';
    const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    for (let i = 0; i < 32; i++) {
        text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
}
//# sourceMappingURL=ChatWebViewProvider.js.map