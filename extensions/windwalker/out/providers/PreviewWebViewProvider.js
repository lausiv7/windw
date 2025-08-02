"use strict";
// [의도] VS Code 사이드바에 '프리뷰' 웹뷰를 생성하고 관리합니다.
// [책임] 개발 서버(localhost:9003)를 iframe으로 로드하고, 빌드 완료 시 자동 새로고침을 처리합니다.
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
exports.PreviewWebViewProvider = void 0;
const vscode = __importStar(require("vscode"));
class PreviewWebViewProvider {
    constructor(_extensionUri, context) {
        this._extensionUri = _extensionUri;
        this.context = context;
        this.currentPreviewUrl = 'http://localhost:9003';
    }
    resolveWebviewView(webviewView, context, _token) {
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
        webviewView.webview.onDidReceiveMessage((data) => __awaiter(this, void 0, void 0, function* () {
            var _a;
            try {
                console.log('[PreviewWebViewProvider] Received message:', data);
                switch (data.type) {
                    case 'preview:ready':
                        // 프리뷰가 준비되면 현재 URL 로드
                        yield this.loadPreview(this.currentPreviewUrl);
                        break;
                    case 'preview:reload':
                        // 프리뷰 새로고침 요청
                        yield this.reloadPreview();
                        break;
                    case 'preview:changeUrl':
                        // URL 변경 요청
                        if ((_a = data.data) === null || _a === void 0 ? void 0 : _a.url) {
                            this.currentPreviewUrl = data.data.url;
                            yield this.loadPreview(this.currentPreviewUrl);
                        }
                        break;
                }
            }
            catch (error) {
                console.error('[PreviewWebViewProvider] Error processing message:', error);
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
    // 외부에서 프리뷰 새로고침을 요청할 때 사용
    reloadPreview() {
        return __awaiter(this, void 0, void 0, function* () {
            if (this._view) {
                yield this._view.webview.postMessage({
                    type: 'preview:reload',
                    timestamp: Date.now()
                });
                console.log('[PreviewWebViewProvider] Preview reload requested');
            }
        });
    }
    // 외부에서 특정 URL을 로드할 때 사용
    loadPreview(url) {
        return __awaiter(this, void 0, void 0, function* () {
            this.currentPreviewUrl = url;
            if (this._view) {
                yield this._view.webview.postMessage({
                    type: 'preview:load',
                    data: { url },
                    timestamp: Date.now()
                });
                console.log(`[PreviewWebViewProvider] Loading preview: ${url}`);
            }
        });
    }
    // 현재 프리뷰 URL 가져오기
    getCurrentUrl() {
        return this.currentPreviewUrl;
    }
    // 프리뷰 상태 확인
    checkPreviewStatus() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                // 간단한 fetch로 서버 상태 확인
                const response = yield fetch(this.currentPreviewUrl, {
                    method: 'HEAD',
                    signal: AbortSignal.timeout(3000) // 3초 타임아웃
                });
                return response.ok;
            }
            catch (error) {
                console.warn(`[PreviewWebViewProvider] Preview server not available: ${this.currentPreviewUrl}`);
                return false;
            }
        });
    }
    _getHtmlForWebview(webview) {
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
exports.PreviewWebViewProvider = PreviewWebViewProvider;
PreviewWebViewProvider.viewType = 'windwalker.previewView';
function getNonce() {
    let text = '';
    const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    for (let i = 0; i < 32; i++) {
        text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
}
//# sourceMappingURL=PreviewWebViewProvider.js.map