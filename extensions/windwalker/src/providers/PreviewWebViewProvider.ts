// [의도] VS Code 사이드바에 '프리뷰' 웹뷰를 생성하고 관리합니다.
// [책임] 개발 서버(localhost:9003)를 iframe으로 로드하고, 빌드 완료 시 자동 새로고침을 처리합니다.

import * as vscode from 'vscode';
import { MessageBridge } from '../core/MessageBridge';

export class PreviewWebViewProvider implements vscode.WebviewViewProvider {

	public static readonly viewType = 'windwalker.fullPreviewView';

	private _view?: vscode.WebviewView;
	private currentPreviewUrl: string = 'http://localhost:9003';
	private messageBridge?: MessageBridge;

	constructor(
		private readonly _extensionUri: vscode.Uri,
		private readonly context: vscode.ExtensionContext
	) { }

	// Enhanced Message Bridge 설정 (서비스 레지스트리에서 호출)
	public setMessageBridge(messageBridge: MessageBridge): void {
		this.messageBridge = messageBridge;
		console.log('[PreviewWebViewProvider] Enhanced Message Bridge connected');
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
				vscode.Uri.joinPath(this._extensionUri, 'webview', 'preview')
			]
		};

		webviewView.webview.html = this._getHtmlForWebview(webviewView.webview);

		// 웹뷰로부터 메시지 수신 처리
		webviewView.webview.onDidReceiveMessage(async (data) => {
			try {
				console.log('[PreviewWebViewProvider] Received message:', data);
				
				switch (data.type) {
					case 'preview:ready':
						// 프리뷰가 준비되면 현재 URL 로드
						await this.loadPreview(this.currentPreviewUrl);
						break;
					
					case 'preview:reload':
						// 프리뷰 새로고침 요청
						await this.reloadPreview();
						break;
						
					case 'preview:changeUrl':
						// URL 변경 요청
						if (data.data?.url) {
							this.currentPreviewUrl = data.data.url;
							await this.loadPreview(this.currentPreviewUrl);
						}
						break;
				}
				
			} catch (error) {
				console.error('[PreviewWebViewProvider] Error processing message:', error);
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

	// 외부에서 프리뷰 새로고침을 요청할 때 사용
	public async reloadPreview(): Promise<void> {
		if (this._view) {
			await this._view.webview.postMessage({
				type: 'preview:reload',
				timestamp: Date.now()
			});
			console.log('[PreviewWebViewProvider] Preview reload requested');
		}
	}

	// 외부에서 특정 URL을 로드할 때 사용
	public async loadPreview(url: string): Promise<void> {
		this.currentPreviewUrl = url;
		if (this._view) {
			await this._view.webview.postMessage({
				type: 'preview:load',
				data: { url },
				timestamp: Date.now()
			});
			console.log(`[PreviewWebViewProvider] Loading preview: ${url}`);
		}
	}

	// 현재 프리뷰 URL 가져오기
	public getCurrentUrl(): string {
		return this.currentPreviewUrl;
	}

	// 프리뷰 상태 확인
	public async checkPreviewStatus(): Promise<boolean> {
		try {
			// 간단한 fetch로 서버 상태 확인
			const response = await fetch(this.currentPreviewUrl, { 
				method: 'HEAD',
				signal: AbortSignal.timeout(3000) // 3초 타임아웃
			});
			return response.ok;
		} catch (error) {
			console.warn(`[PreviewWebViewProvider] Preview server not available: ${this.currentPreviewUrl}`);
			return false;
		}
	}

	private _getHtmlForWebview(webview: vscode.Webview) {
		// Get the local path to main script run in the webview, then convert it to a uri we can use in the webview.
		const scriptUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'webview', 'preview', 'script.js'));
		const styleMainUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'webview', 'preview', 'style.css'));

		// Use a nonce to only allow a specific script to be run.
		const nonce = getNonce();

		return `<!DOCTYPE html>
			<html lang="en">
			<head>
				<meta charset="UTF-8">
				<meta http-equiv="Content-Security-Policy" content="default-src 'none'; frame-src http: https:; style-src ${webview.cspSource} 'unsafe-inline'; script-src 'nonce-${nonce}';">
				<meta name="viewport" content="width=device-width, initial-scale=1.0">
				
				<link href="${styleMainUri}" rel="stylesheet">
				
				<title>WindWalker Preview</title>
			</head>
			<body>
				<div id="preview-container">
					<div id="preview-header">
						<div id="url-bar">
							<input id="url-input" type="text" value="${this.currentPreviewUrl}" placeholder="Preview URL">
							<button id="reload-button">🔄</button>
						</div>
						<div id="status-indicator" class="status-unknown">●</div>
					</div>
					<div id="preview-content">
						<iframe id="preview-frame" src="about:blank" frameborder="0"></iframe>
						<div id="loading-overlay">
							<div class="loading-spinner"></div>
							<p>Loading preview...</p>
						</div>
						<div id="error-overlay" style="display: none;">
							<div class="error-message">
								<h3>Preview Not Available</h3>
								<p>Make sure the development server is running on <span id="error-url"></span></p>
								<button id="retry-button">Retry</button>
							</div>
						</div>
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
