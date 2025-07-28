// [의도] WindWalker 확장의 메인 진입점 역할을 합니다.
// [책임] 확장이 활성화될 때 모든 핵심 컴포넌트(매니저, 웹뷰, 명령어)를 초기화하고 등록합니다.

import * as vscode from 'vscode';
// import { WebViewManager } from './core/WebViewManager';
// import { FileManager } from './core/FileManager';
// import { BuildManager } from './core/BuildManager';
// import { ModeManager, WindWalkerMode } from './core/ModeManager';
// import { MessageBridge } from './core/MessageBridge';

export function activate(context: vscode.ExtensionContext) {
    console.log('WindWalker Extension 활성화');
    
    // 핵심 매니저들 초기화 (추후 구현)
    // const modeManager = new ModeManager();
    // const fileManager = new FileManager(context);
    // const buildManager = new BuildManager(context);
    // const webViewManager = new WebViewManager(context);
    // const messageBridge = new MessageBridge();
    
    // WebView들 등록 (추후 구현)
    // const chatProvider = webViewManager.createChatProvider();
    // const previewProvider = webViewManager.createPreviewProvider();
    
    // Message Bridge 설정 (추후 구현)
    // messageBridge.setupCommunication(chatProvider, previewProvider, {
    //     fileManager,
    //     buildManager,
    //     modeManager
    // });
    
    // 명령어 등록 (예시)
    const helloCommand = vscode.commands.registerCommand('windwalker.helloWorld', () => {
        vscode.window.showInformationMessage('안녕하세요! WindWalker입니다.');
    });
    
    context.subscriptions.push(helloCommand);

    /*
    const commands = [
        vscode.commands.registerCommand('windwalker.switchMode', () => {
            const currentMode = modeManager.getCurrentMode();
            const newMode = currentMode === WindWalkerMode.CODE 
                ? WindWalkerMode.PROTOTYPE 
                : WindWalkerMode.CODE;
            modeManager.switchMode(newMode);
        }),
        
        vscode.commands.registerCommand('windwalker.openChat', () => {
            chatProvider.show();
        }),
        
        vscode.commands.registerCommand('windwalker.openPreview', () => {
            previewProvider.show();
        })
    ];
    
    context.subscriptions.push(...commands);
    */
}

export function deactivate() {}
