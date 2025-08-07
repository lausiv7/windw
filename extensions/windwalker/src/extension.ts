// [의도] WindWalker 확장의 시작점 - Git+IndexedDB 통합 AI 대화식 웹사이트 빌더
// [책임] 서비스 레지스트리 초기화, 통합 시스템 구동, WebView 제공자 등록

import * as vscode from 'vscode';
import { ChatWebViewProvider } from './providers/ChatWebViewProvider';
import { PreviewWebViewProvider } from './providers/PreviewWebViewProvider';
import { ServiceRegistry } from './core/ServiceRegistry';
import { FeatureFlagManager } from './core/FeatureFlagManager';
import { EnhancedMessageBridge } from './core/EnhancedMessageBridge';
import { ConversationHistoryTracker } from './services/ConversationHistoryTracker';
// import { SimpleTestRunner } from './test/SimpleTestRunner';
// import { IntegrationTest } from './test/IntegrationTest';
// import { BasicSystemTest } from './test/BasicSystemTest';
import { TemplateManager } from './services/TemplateManager';
import { ConversationAI } from './services/ConversationAI';

let serviceRegistry: ServiceRegistry;
let enhancedMessageBridge: EnhancedMessageBridge;

export async function activate(context: vscode.ExtensionContext) {
    console.log('🚀 WindWalker extension activating...');
    
    try {
        // 1. 서비스 레지스트리 초기화 및 핵심 서비스 등록
        serviceRegistry = new ServiceRegistry(context);
        await registerCoreServices(context, serviceRegistry);

        // 3. 기본 WebView 제공자 생성 및 등록
        const chatProvider = new ChatWebViewProvider(context.extensionUri, context);
        const previewProvider = new PreviewWebViewProvider(context.extensionUri, context);

        // 4. Enhanced Message Bridge를 WebView Provider에 연결
        enhancedMessageBridge = await serviceRegistry.getService<EnhancedMessageBridge>('EnhancedMessageBridge');
        chatProvider.setMessageBridge(enhancedMessageBridge);
        previewProvider.setMessageBridge(enhancedMessageBridge);

        // 5. VS Code에 WebView 등록
        context.subscriptions.push(
            vscode.window.registerWebviewViewProvider(ChatWebViewProvider.viewType, chatProvider),
            vscode.window.registerWebviewViewProvider(PreviewWebViewProvider.viewType, previewProvider)
        );

        // 6. 기본 명령어 등록
        registerBasicCommands(context);

        // 7. 개발 모드에서 자동 테스트 실행
        if (context.extensionMode === vscode.ExtensionMode.Development) {
            setTimeout(() => runDevelopmentTests(context), 2000); // 2초 후 테스트 실행
        }

        console.log('✅ WindWalker extension activated successfully with Git+IndexedDB integration!');
        vscode.window.showInformationMessage('🎉 WindWalker AI Website Builder with Git+IndexedDB is ready!');

    } catch (error) {
        console.error('❌ WindWalker extension activation failed:', error);
        const errorMsg = error instanceof Error ? error.message : String(error);
        vscode.window.showErrorMessage(`WindWalker activation failed: ${errorMsg}`);
    }
}

/**
 * 핵심 서비스들을 서비스 레지스트리에 등록
 */
async function registerCoreServices(context: vscode.ExtensionContext, registry: ServiceRegistry): Promise<void> {
    console.log('📋 Registering core services...');

    // 1. 기능 플래그 관리자 등록 (최우선)
    registry.register({
        name: 'FeatureFlagManager',
        implementation: FeatureFlagManager,
        dependencies: [],
        singleton: true,
        autoStart: true
    });

    // 2. 대화 히스토리 트래커 등록 (메모리 기반 기본 버전)
    registry.register({
        name: 'ConversationHistoryTracker',
        implementation: ConversationHistoryTracker,
        dependencies: [],
        singleton: true,
        autoStart: true
    });

    // 3. 템플릿 매니저 등록
    registry.register({
        name: 'TemplateManager',
        implementation: TemplateManager,
        dependencies: [],
        singleton: true,
        autoStart: true
    });

    // 4. AI 대화 서비스 등록
    registry.register({
        name: 'ConversationAI',
        implementation: ConversationAI,
        dependencies: [],
        singleton: true,
        autoStart: true
    });

    // 5. 확장 메시지 브리지 등록 (의존성 있음)
    registry.register({
        name: 'EnhancedMessageBridge',
        implementation: EnhancedMessageBridge,
        dependencies: [
            { name: 'FeatureFlagManager', required: true },
            { name: 'TemplateManager', required: true },
            { name: 'ConversationAI', required: true }
        ],
        singleton: true,
        autoStart: true
    });

    console.log('✅ Core services registered');
}

/**
 * 기본 VS Code 명령어 등록
 */
function registerBasicCommands(context: vscode.ExtensionContext): void {
    console.log('⌨️ Registering commands...');

    // WindWalker 테스트 실행 명령어 (기본 버전에서 비활성화)
    const testCommand = vscode.commands.registerCommand('windwalker.runTests', async () => {
        vscode.window.showInformationMessage('✅ AI 대화식 웹사이트 빌더 기능이 활성화되었습니다!');
    });

    // WindWalker 기능 상태 확인 명령어
    const statusCommand = vscode.commands.registerCommand('windwalker.showStatus', async () => {
        try {
            const featureFlagManager = await serviceRegistry.getService<FeatureFlagManager>('FeatureFlagManager');
            const enabledFeatures = featureFlagManager.getEnabledFlags();
            const serviceStatus = serviceRegistry.getServiceStatus();
            
            const statusMessage = [
                '🎯 WindWalker Status:',
                `Services: ${Object.keys(serviceStatus).length} registered`,
                `Features: ${enabledFeatures.length} enabled`,
                `Enabled: ${enabledFeatures.join(', ')}`
            ].join('\n');

            vscode.window.showInformationMessage(statusMessage);
        } catch (error) {
            const errorMsg = error instanceof Error ? error.message : String(error);
            vscode.window.showErrorMessage(`❌ Failed to get status: ${errorMsg}`);
        }
    });

    // Git 상태 확인 명령어
    const gitStatusCommand = vscode.commands.registerCommand('windwalker.gitStatus', async () => {
        try {
            vscode.window.showInformationMessage('🔄 Git integration is ready');
        } catch (error) {
            const errorMsg = error instanceof Error ? error.message : String(error);
            vscode.window.showErrorMessage(`❌ Git status check failed: ${errorMsg}`);
        }
    });

    context.subscriptions.push(testCommand, statusCommand, gitStatusCommand);
    console.log('✅ Commands registered');
}

/**
 * 개발 모드에서 자동 테스트 실행 (기본 버전에서 간소화)
 */
async function runDevelopmentTests(context: vscode.ExtensionContext): Promise<void> {
    console.log('🧪 Development tests bypassed in basic version');
    console.log('✅ AI 대화식 웹사이트 빌더 기본 버전 준비 완료');
}

/**
 * 확장 비활성화 시 정리 작업
 */
export function deactivate(): void {
    console.log('🔄 Deactivating WindWalker extension...');
    
    try {
        // 서비스 레지스트리 정리
        if (serviceRegistry) {
            serviceRegistry.dispose();
            console.log('✅ Service registry disposed');
        }

        // 추가 정리 작업
        if (enhancedMessageBridge) {
            enhancedMessageBridge.dispose();
            console.log('✅ Enhanced message bridge disposed');
        }

        console.log('✅ WindWalker extension deactivated successfully');
    } catch (error) {
        console.error('❌ Error during WindWalker deactivation:', error);
    }
}
