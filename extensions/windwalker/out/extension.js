"use strict";
// [의도] WindWalker 확장의 시작점. 모든 관리자(Manager)와 공급자(Provider)를 초기화하고, VS Code에 등록하여 중앙 허브의 기반을 마련합니다.
// [책임] 각 모듈의 인스턴스 생성 및 생명주기 관리, 명령어 등록.
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.activate = activate;
exports.deactivate = deactivate;
const vscode = __importStar(require("vscode"));
const ChatWebViewProvider_1 = require("./providers/ChatWebViewProvider");
const PreviewWebViewProvider_1 = require("./providers/PreviewWebViewProvider");
function activate(context) {
    // 확장이 성공적으로 활성화되었음을 명확히 알리는 로그 및 정보 메시지
    console.log('🎉 Congratulations, WindWalker extension is now active!');
    vscode.window.showInformationMessage('WindWalker is now active!');
    // 1. WebView 공급자(Provider) 생성 및 등록 (Phase 2-3: MessageBridge 연동)
    const chatProvider = new ChatWebViewProvider_1.ChatWebViewProvider(context.extensionUri, context);
    const previewProvider = new PreviewWebViewProvider_1.PreviewWebViewProvider(context.extensionUri, context);
    // 2. WebView들을 VS Code 창에 등록
    context.subscriptions.push(vscode.window.registerWebviewViewProvider(ChatWebViewProvider_1.ChatWebViewProvider.viewType, chatProvider), vscode.window.registerWebviewViewProvider(PreviewWebViewProvider_1.PreviewWebViewProvider.viewType, previewProvider));
}
// This method is called when your extension is deactivated
function deactivate() { }
//# sourceMappingURL=extension.js.map