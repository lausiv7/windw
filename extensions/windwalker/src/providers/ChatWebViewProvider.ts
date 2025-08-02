// [의도] VS Code 사이드바에 'AI 채팅' 웹뷰를 생성하고 관리합니다.
// [책임] 웹뷰의 HTML 컨텐츠 제공, 웹뷰와의 메시지 송수신(postMessage) 처리.

import * as vscode from 'vscode';
import { MessageBridge } from '../core/MessageBridge';

export class ChatWebViewProvider implements vscode.WebviewViewProvider {

	public static readonly viewType = 'windwalker.chatView';

	private _view?: vscode.WebviewView;
	private messageBridge: MessageBridge;

	constructor(
		private readonly _extensionUri: vscode.Uri,
		private readonly context: vscode.ExtensionContext
	) { 
		this.messageBridge = new MessageBridge(context);
	}

	public resolveWebviewView(
		webviewView: vscode.WebviewView,
		context: vscode.WebviewViewResolveContext,
		_token: vscode.CancellationToken,
	) {
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
		webviewView.webview.onDidReceiveMessage(async (data) => {
			try {
				console.log('[ChatWebViewProvider] Received message:', data);
				
				// Phase 2: Use MessageBridge to handle all messages
				await this.messageBridge.processMessage(data, webviewView.webview);
				
			} catch (error) {
				console.error('[ChatWebViewProvider] Error processing message:', error);
				const errorMessage = error instanceof Error ? error.message : String(error);
				
				// Send error response to webview
				webviewView.webview.postMessage({
					type: 'error',
					data: { message: errorMessage, originalType: data.type },
					timestamp: Date.now()
				});
			}
		});
	}

	private _getHtmlForWebview(webview: vscode.Webview) {
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

function getNonce() {
	let text = '';
	const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
	for (let i = 0; i < 32; i++) {
		text += possible.charAt(Math.floor(Math.random() * possible.length));
	}
	return text;
}
