"use strict";
// [의도] WindWalker 확장의 시작점 - Git+IndexedDB 통합 AI 대화식 웹사이트 빌더
// [책임] 서비스 레지스트리 초기화, 통합 시스템 구동, WebView 제공자 등록
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
exports.activate = activate;
exports.deactivate = deactivate;
const vscode = __importStar(require("vscode"));
const ChatWebViewProvider_1 = require("./providers/ChatWebViewProvider");
const PreviewWebViewProvider_1 = require("./providers/PreviewWebViewProvider");
const FeatureFlagManager_1 = require("./core/FeatureFlagManager");
const EnhancedMessageBridge_1 = require("./core/EnhancedMessageBridge");
const ConversationHistoryTracker_1 = require("./core/ConversationHistoryTracker");
const SimpleTestRunner_1 = require("./test/SimpleTestRunner");
let serviceRegistry;
let enhancedMessageBridge;
function activate(context) {
    return __awaiter(this, void 0, void 0, function* () {
        console.log('🚀 WindWalker extension activating...');
        try {
            // 1. 기본 WebView 제공자 생성 및 등록
            const chatProvider = new ChatWebViewProvider_1.ChatWebViewProvider(context.extensionUri, context);
            const previewProvider = new PreviewWebViewProvider_1.PreviewWebViewProvider(context.extensionUri, context);
            // 2. VS Code에 WebView 등록
            context.subscriptions.push(vscode.window.registerWebviewViewProvider(ChatWebViewProvider_1.ChatWebViewProvider.viewType, chatProvider), vscode.window.registerWebviewViewProvider(PreviewWebViewProvider_1.PreviewWebViewProvider.viewType, previewProvider));
            // 3. 기본 명령어 등록
            registerBasicCommands(context);
            // 4. 개발 모드에서 자동 테스트 실행
            if (context.extensionMode === vscode.ExtensionMode.Development) {
                setTimeout(() => runDevelopmentTests(context), 2000); // 2초 후 테스트 실행
            }
            console.log('✅ WindWalker extension activated successfully!');
            vscode.window.showInformationMessage('🎉 WindWalker AI Website Builder is ready!');
        }
        catch (error) {
            console.error('❌ WindWalker extension activation failed:', error);
            const errorMsg = error instanceof Error ? error.message : String(error);
            vscode.window.showErrorMessage(`WindWalker activation failed: ${errorMsg}`);
        }
    });
}
/**
 * 핵심 서비스들을 서비스 레지스트리에 등록
 */
function registerCoreServices(context, registry) {
    return __awaiter(this, void 0, void 0, function* () {
        console.log('📋 Registering core services...');
        // 1. 기능 플래그 관리자 등록 (최우선)
        registry.register({
            name: 'FeatureFlagManager',
            implementation: FeatureFlagManager_1.FeatureFlagManager,
            dependencies: [],
            singleton: true,
            autoStart: true
        });
        // 2. 대화 히스토리 트래커 등록
        registry.register({
            name: 'ConversationHistoryTracker',
            implementation: ConversationHistoryTracker_1.ConversationHistoryTracker,
            dependencies: [],
            singleton: true,
            autoStart: true
        });
        // 3. 확장 메시지 브리지 등록 (의존성 있음)
        registry.register({
            name: 'EnhancedMessageBridge',
            implementation: EnhancedMessageBridge_1.EnhancedMessageBridge,
            dependencies: [
                { name: 'FeatureFlagManager', required: true }
            ],
            singleton: true,
            autoStart: true
        });
        console.log('✅ Core services registered');
    });
}
/**
 * 기본 VS Code 명령어 등록
 */
function registerBasicCommands(context) {
    console.log('⌨️ Registering commands...');
    // WindWalker 테스트 실행 명령어
    const testCommand = vscode.commands.registerCommand('windwalker.runTests', () => __awaiter(this, void 0, void 0, function* () {
        const testRunner = new SimpleTestRunner_1.SimpleTestRunner(context);
        vscode.window.showInformationMessage('🧪 Running WindWalker basic tests...');
        try {
            const report = yield testRunner.runBasicTests();
            if (report.failed === 0) {
                vscode.window.showInformationMessage(`✅ All tests passed! (${report.passed}/${report.totalTests}) in ${report.duration}ms`);
            }
            else {
                vscode.window.showWarningMessage(`⚠️ ${report.failed} tests failed. ${report.passed}/${report.totalTests} passed.`);
            }
        }
        catch (error) {
            const errorMsg = error instanceof Error ? error.message : String(error);
            vscode.window.showErrorMessage(`❌ Test execution failed: ${errorMsg}`);
        }
    }));
    // WindWalker 기능 상태 확인 명령어
    const statusCommand = vscode.commands.registerCommand('windwalker.showStatus', () => __awaiter(this, void 0, void 0, function* () {
        try {
            const featureFlagManager = yield registry.getService('FeatureFlagManager');
            const enabledFeatures = featureFlagManager.getEnabledFlags();
            const serviceStatus = registry.getServiceStatus();
            const statusMessage = [
                '🎯 WindWalker Status:',
                `Services: ${Object.keys(serviceStatus).length} registered`,
                `Features: ${enabledFeatures.length} enabled`,
                `Enabled: ${enabledFeatures.join(', ')}`
            ].join('\n');
            vscode.window.showInformationMessage(statusMessage);
        }
        catch (error) {
            const errorMsg = error instanceof Error ? error.message : String(error);
            vscode.window.showErrorMessage(`❌ Failed to get status: ${errorMsg}`);
        }
    }));
    // Git 상태 확인 명령어
    const gitStatusCommand = vscode.commands.registerCommand('windwalker.gitStatus', () => __awaiter(this, void 0, void 0, function* () {
        try {
            vscode.window.showInformationMessage('🔄 Git integration is ready');
        }
        catch (error) {
            const errorMsg = error instanceof Error ? error.message : String(error);
            vscode.window.showErrorMessage(`❌ Git status check failed: ${errorMsg}`);
        }
    }));
    // 스모크 테스트 실행 명령어
    const smokeTestCommand = vscode.commands.registerCommand('windwalker.runSmokeTests', () => __awaiter(this, void 0, void 0, function* () {
        const testRunner = new SimpleTestRunner_1.SimpleTestRunner(context);
        vscode.window.showInformationMessage('💨 Running quick smoke tests...');
        try {
            const report = yield testRunner.runBasicTests();
            if (report.failed === 0) {
                vscode.window.showInformationMessage(`✅ Smoke tests passed! (${report.duration}ms)`);
            }
            else {
                vscode.window.showWarningMessage(`⚠️ Smoke tests failed: ${report.failed}/${report.totalTests}`);
            }
        }
        catch (error) {
            const errorMsg = error instanceof Error ? error.message : String(error);
            vscode.window.showErrorMessage(`❌ Smoke tests failed: ${errorMsg}`);
        }
    }));
    context.subscriptions.push(testCommand, statusCommand, gitStatusCommand, smokeTestCommand);
    console.log('✅ Commands registered');
}
/**
 * 개발 모드에서 자동 테스트 실행
 */
function runDevelopmentTests(context) {
    return __awaiter(this, void 0, void 0, function* () {
        console.log('🧪 Running development smoke tests...');
        try {
            const testRunner = new SimpleTestRunner_1.SimpleTestRunner(context);
            const report = yield testRunner.runBasicTests();
            if (report.failed === 0) {
                console.log(`✅ Development smoke tests passed: ${report.summary}`);
            }
            else {
                console.warn(`⚠️ Development smoke tests had failures: ${report.summary}`);
                // 실패한 테스트 상세 로그
                report.results.filter(r => !r.success).forEach(result => {
                    console.error(`❌ ${result.testName}: ${result.message}`);
                });
            }
        }
        catch (error) {
            console.error('❌ Development tests failed:', error);
        }
    });
}
/**
 * 확장 비활성화 시 정리 작업
 */
function deactivate() {
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
    }
    catch (error) {
        console.error('❌ Error during WindWalker deactivation:', error);
    }
}
//# sourceMappingURL=extension.js.map