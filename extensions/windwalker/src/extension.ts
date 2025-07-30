// [의도] WindWalker 확장의 시작점. 모든 관리자(Manager)와 공급자(Provider)를 초기화하고, VS Code에 등록하여 중앙 허브의 기반을 마련합니다.
// [책임] 각 모듈의 인스턴스 생성 및 생명주기 관리, 명령어 등록.

import * as vscode from 'vscode';
import { ChatWebViewProvider } from './providers/ChatWebViewProvider';

export function activate(context: vscode.ExtensionContext) {
    // 확장이 성공적으로 활성화되었음을 명확히 알리는 로그 및 정보 메시지
    console.log('🎉 Congratulations, WindWalker extension is now active!');
    vscode.window.showInformationMessage('WindWalker is now active!');

    // 1. WebView 공급자(Provider) 생성 및 등록 (Phase 2: MessageBridge 연동)
    const chatProvider = new ChatWebViewProvider(context.extensionUri, context);

    // 2. 'windwalker.chatView'라는 ID를 가진 웹뷰를 VS Code 창에 등록
    context.subscriptions.push(
        vscode.window.registerWebviewViewProvider(ChatWebViewProvider.viewType, chatProvider)
    );
}

// This method is called when your extension is deactivated
export function deactivate() {}
