// [의도] WindWalker 확장의 시작점 - Git+IndexedDB 통합 AI 대화식 웹사이트 빌더
// [책임] 서비스 레지스트리 초기화, 통합 시스템 구동, WebView 제공자 등록

import * as vscode from 'vscode';
import { ChatWebViewProvider } from './providers/ChatWebViewProvider';
import { PreviewWebViewProvider } from './providers/PreviewWebViewProvider';
import { ServiceRegistry } from './core/ServiceRegistry';
import { FeatureFlagManager } from './core/FeatureFlagManager';
import { EnhancedMessageBridge } from './core/EnhancedMessageBridge';
import { ConversationHistoryTracker } from './core/ConversationHistoryTracker';
import { IntegratedTestSuite } from './test/IntegratedTestSuite';

let serviceRegistry: ServiceRegistry;
let enhancedMessageBridge: EnhancedMessageBridge;

export async function activate(context: vscode.ExtensionContext) {
    console.log('🚀 WindWalker extension activating with Git+IndexedDB integration...');
    
    try {
        // 1. 서비스 레지스트리 초기화
        serviceRegistry = ServiceRegistry.getInstance(context);
        
        // 2. 핵심 서비스들 등록
        await registerCoreServices(context, serviceRegistry);
        
        // 3. 모든 서비스 초기화
        await serviceRegistry.initializeAllServices();
        
        // 4. 확장 메시지 브리지 초기화
        enhancedMessageBridge = await serviceRegistry.getService<EnhancedMessageBridge>('EnhancedMessageBridge');
        
        // 5. WebView 제공자 생성 및 등록 (확장된 메시지 브리지 사용)
        const chatProvider = new ChatWebViewProvider(context.extensionUri, context, enhancedMessageBridge);
        const previewProvider = new PreviewWebViewProvider(context.extensionUri, context, enhancedMessageBridge);

        // 6. VS Code에 WebView 등록
        context.subscriptions.push(
            vscode.window.registerWebviewViewProvider(ChatWebViewProvider.viewType, chatProvider),
            vscode.window.registerWebviewViewProvider(PreviewWebViewProvider.viewType, previewProvider)
        );

        // 7. 명령어 등록
        registerCommands(context, serviceRegistry);

        // 8. 개발 모드에서 자동 테스트 실행
        if (context.extensionMode === vscode.ExtensionMode.Development) {
            setTimeout(() => runDevelopmentTests(context), 2000); // 2초 후 테스트 실행
        }

        console.log('✅ WindWalker extension activated successfully!');
        vscode.window.showInformationMessage('🎉 WindWalker AI Website Builder is ready!');

        // 기능 상태 표시
        const featureFlagManager = await serviceRegistry.getService<FeatureFlagManager>('FeatureFlagManager');
        const enabledFeatures = featureFlagManager.getEnabledFlags();
        console.log(`🎯 Enabled features: ${enabledFeatures.join(', ')}`);

    } catch (error) {
        console.error('❌ WindWalker extension activation failed:', error);
        vscode.window.showErrorMessage(`WindWalker activation failed: ${error.message}`);
        throw error;
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

    // 2. 대화 히스토리 트래커 등록
    registry.register({
        name: 'ConversationHistoryTracker',
        implementation: ConversationHistoryTracker,
        dependencies: [],
        singleton: true,
        autoStart: true
    });

    // 3. 확장 메시지 브리지 등록 (의존성 있음)
    registry.register({
        name: 'EnhancedMessageBridge',
        implementation: EnhancedMessageBridge,
        dependencies: [
            { name: 'FeatureFlagManager', required: true }
        ],
        singleton: true,
        autoStart: true
    });

    console.log('✅ Core services registered');
}

/**
 * VS Code 명령어 등록
 */
function registerCommands(context: vscode.ExtensionContext, registry: ServiceRegistry): void {
    console.log('⌨️ Registering commands...');

    // WindWalker 테스트 실행 명령어
    const testCommand = vscode.commands.registerCommand('windwalker.runTests', async () => {
        const testSuite = new IntegratedTestSuite(context);
        
        vscode.window.showInformationMessage('🧪 Running WindWalker integration tests...');
        
        try {
            const report = await testSuite.runFullTestSuite();
            
            if (report.failed === 0) {
                vscode.window.showInformationMessage(
                    `✅ All tests passed! (${report.passed}/${report.totalTests}) in ${report.duration}ms`
                );
            } else {
                vscode.window.showWarningMessage(
                    `⚠️ ${report.failed} tests failed. ${report.passed}/${report.totalTests} passed.`
                );
            }
        } catch (error) {
            vscode.window.showErrorMessage(`❌ Test execution failed: ${error.message}`);
        }
    });

    // WindWalker 기능 상태 확인 명령어
    const statusCommand = vscode.commands.registerCommand('windwalker.showStatus', async () => {
        try {
            const featureFlagManager = await registry.getService<FeatureFlagManager>('FeatureFlagManager');
            const enabledFeatures = featureFlagManager.getEnabledFlags();
            const serviceStatus = registry.getServiceStatus();
            
            const statusMessage = [
                '🎯 WindWalker Status:',
                `Services: ${Object.keys(serviceStatus).length} registered`,
                `Features: ${enabledFeatures.length} enabled`,
                `Enabled: ${enabledFeatures.join(', ')}`
            ].join('\n');

            vscode.window.showInformationMessage(statusMessage);
        } catch (error) {
            vscode.window.showErrorMessage(`❌ Failed to get status: ${error.message}`);
        }
    });

    // Git 상태 확인 명령어
    const gitStatusCommand = vscode.commands.registerCommand('windwalker.gitStatus', async () => {
        try {
            const messageBridge = await registry.getService<EnhancedMessageBridge>('EnhancedMessageBridge');
            // Git 상태를 직접 확인하는 로직 추가 필요
            vscode.window.showInformationMessage('🔄 Git integration is active');
        } catch (error) {
            vscode.window.showErrorMessage(`❌ Git status check failed: ${error.message}`);
        }
    });

    // 스모크 테스트 실행 명령어
    const smokeTestCommand = vscode.commands.registerCommand('windwalker.runSmokeTests', async () => {
        const testSuite = new IntegratedTestSuite(context);
        
        vscode.window.showInformationMessage('💨 Running quick smoke tests...');
        
        try {
            const report = await testSuite.runSmokeTests();
            
            if (report.failed === 0) {
                vscode.window.showInformationMessage(`✅ Smoke tests passed! (${report.duration}ms)`);
            } else {
                vscode.window.showWarningMessage(`⚠️ Smoke tests failed: ${report.failed}/${report.totalTests}`);
            }
        } catch (error) {
            vscode.window.showErrorMessage(`❌ Smoke tests failed: ${error.message}`);
        }
    });

    context.subscriptions.push(testCommand, statusCommand, gitStatusCommand, smokeTestCommand);
    console.log('✅ Commands registered');
}

/**
 * 개발 모드에서 자동 테스트 실행
 */
async function runDevelopmentTests(context: vscode.ExtensionContext): Promise<void> {
    console.log('🧪 Running development smoke tests...');
    
    try {
        const testSuite = new IntegratedTestSuite(context);
        const report = await testSuite.runSmokeTests();
        
        if (report.failed === 0) {
            console.log(`✅ Development smoke tests passed: ${report.summary}`);
        } else {
            console.warn(`⚠️ Development smoke tests had failures: ${report.summary}`);
            
            // 실패한 테스트 상세 로그
            report.results.filter(r => !r.success).forEach(result => {
                console.error(`❌ ${result.testName}: ${result.error}`);
            });
        }
    } catch (error) {
        console.error('❌ Development tests failed:', error);
    }
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
