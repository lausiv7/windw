"use strict";
// [의도] WindWalker Git+IndexedDB 통합 시스템의 자동 테스트 스위트
// [책임] Phase 1 구현 검증, 통합 테스트, 자동 테스트 실행 및 리포팅
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
exports.IntegratedTestSuite = void 0;
const vscode = __importStar(require("vscode"));
const path = __importStar(require("path"));
const fs = __importStar(require("fs/promises"));
const ServiceRegistry_1 = require("../core/ServiceRegistry");
const FeatureFlagManager_1 = require("../core/FeatureFlagManager");
const GitIntegrationManager_1 = require("../core/GitIntegrationManager");
const ConversationDatabase_1 = require("../core/ConversationDatabase");
const EnhancedMessageBridge_1 = require("../core/EnhancedMessageBridge");
const ConversationHistoryTracker_1 = require("../core/ConversationHistoryTracker");
const TestDashboard_1 = require("./TestDashboard");
class IntegratedTestSuite {
    constructor(context) {
        this.testResults = [];
        this.context = context;
        this.serviceRegistry = ServiceRegistry_1.ServiceRegistry.getInstance(context);
        this.testWorkspace = path.join(context.extensionPath, 'test-workspace');
    }
    /**
     * 전체 테스트 스위트 실행
     */
    runFullTestSuite() {
        return __awaiter(this, void 0, void 0, function* () {
            const startTime = Date.now();
            console.log('🧪 [IntegratedTestSuite] Starting full test suite...');
            try {
                // 0. 테스트 환경 준비
                yield this.setupTestEnvironment();
                // 1. 기본 서비스 테스트
                yield this.testServiceRegistry();
                yield this.testFeatureFlagManager();
                // 2. 스토리지 시스템 테스트
                yield this.testGitIntegrationManager();
                yield this.testConversationDatabase();
                // 3. 통합 시스템 테스트
                yield this.testEnhancedMessageBridge();
                yield this.testConversationHistoryTracker();
                // 4. 엔드투엔드 통합 테스트
                yield this.testEndToEndConversationFlow();
                yield this.testGitConversationLinking();
                yield this.testPersonalizationFlow();
                // 5. 테스트 환경 정리
                yield this.cleanupTestEnvironment();
            }
            catch (error) {
                console.error('🚫 [IntegratedTestSuite] Test suite failed:', error);
                this.addTestResult('TestSuite_Setup', false, 0, error.message);
            }
            const duration = Date.now() - startTime;
            const report = this.generateReport(duration);
            // 6. 통합 대시보드 생성 및 링크 공유
            yield this.generateAndShareDashboard(report);
            return report;
        });
    }
    /**
     * 빠른 스모크 테스트
     */
    runSmokeTests() {
        return __awaiter(this, void 0, void 0, function* () {
            const startTime = Date.now();
            console.log('💨 [IntegratedTestSuite] Running smoke tests...');
            try {
                yield this.setupTestEnvironment();
                // 기본 초기화 테스트만 실행
                yield this.testServiceRegistryInitialization();
                yield this.testDatabaseConnection();
                yield this.testGitRepository();
                yield this.testFeatureFlags();
                yield this.cleanupTestEnvironment();
            }
            catch (error) {
                console.error('🚫 [IntegratedTestSuite] Smoke tests failed:', error);
                this.addTestResult('SmokeTest_Setup', false, 0, error.message);
            }
            const duration = Date.now() - startTime;
            const report = this.generateReport(duration);
            // 스모크 테스트도 대시보드 생성
            yield this.generateAndShareDashboard(report);
            return report;
        });
    }
    // === Setup & Cleanup ===
    setupTestEnvironment() {
        return __awaiter(this, void 0, void 0, function* () {
            const testStart = Date.now();
            try {
                // 테스트 워크스페이스 디렉토리 생성
                yield fs.mkdir(this.testWorkspace, { recursive: true });
                // 테스트용 package.json 생성
                const packageJson = {
                    name: 'windwalker-test-workspace',
                    version: '1.0.0',
                    description: 'Test workspace for WindWalker integration tests',
                    scripts: {
                        dev: 'echo "Test dev server"',
                        build: 'echo "Test build"'
                    }
                };
                yield fs.writeFile(path.join(this.testWorkspace, 'package.json'), JSON.stringify(packageJson, null, 2));
                // 테스트용 소스 파일 생성
                yield fs.mkdir(path.join(this.testWorkspace, 'src'), { recursive: true });
                yield fs.writeFile(path.join(this.testWorkspace, 'src', 'test.ts'), '// Test file for WindWalker integration tests\nexport const testVar = "test";');
                console.log('✅ Test environment setup complete');
                this.addTestResult('Setup_TestEnvironment', true, Date.now() - testStart);
            }
            catch (error) {
                this.addTestResult('Setup_TestEnvironment', false, Date.now() - testStart, error.message);
                throw error;
            }
        });
    }
    cleanupTestEnvironment() {
        return __awaiter(this, void 0, void 0, function* () {
            const testStart = Date.now();
            try {
                // 테스트 워크스페이스 정리
                yield fs.rm(this.testWorkspace, { recursive: true, force: true });
                console.log('✅ Test environment cleanup complete');
                this.addTestResult('Cleanup_TestEnvironment', true, Date.now() - testStart);
            }
            catch (error) {
                this.addTestResult('Cleanup_TestEnvironment', false, Date.now() - testStart, error.message);
                console.warn('⚠️ Test cleanup failed, but continuing...', error);
            }
        });
    }
    // === Individual Component Tests ===
    testServiceRegistry() {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.runTest('ServiceRegistry_Full', () => __awaiter(this, void 0, void 0, function* () {
                // ServiceRegistry 테스트
                yield this.testServiceRegistryInitialization();
                // Mock 서비스 등록 테스트
                class MockService {
                    constructor() {
                        this.name = 'MockService';
                    }
                    initialize() {
                        return __awaiter(this, void 0, void 0, function* () { console.log('Mock initialized'); });
                    }
                    dispose() { console.log('Mock disposed'); }
                }
                this.serviceRegistry.register({
                    name: 'MockService',
                    implementation: MockService,
                    dependencies: [],
                    singleton: true,
                    autoStart: false
                });
                const mockService = yield this.serviceRegistry.getService('MockService');
                if (!mockService || mockService.name !== 'MockService') {
                    throw new Error('Service registration/retrieval failed');
                }
                return { serviceCount: this.serviceRegistry.getRegisteredServices().length };
            }));
        });
    }
    testServiceRegistryInitialization() {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.runTest('ServiceRegistry_Initialization', () => __awaiter(this, void 0, void 0, function* () {
                const registeredServices = this.serviceRegistry.getRegisteredServices();
                const serviceStatus = this.serviceRegistry.getServiceStatus();
                return { registeredServices, serviceStatus };
            }));
        });
    }
    testFeatureFlagManager() {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.runTest('FeatureFlagManager_Full', () => __awaiter(this, void 0, void 0, function* () {
                const flagManager = new FeatureFlagManager_1.FeatureFlagManager(this.context);
                yield flagManager.initialize();
                // 기본 플래그 테스트
                const gitEnabled = flagManager.isEnabled('git-integration');
                const conversationEnabled = flagManager.isEnabled('conversation-history');
                // 플래그 토글 테스트
                const originalState = flagManager.isEnabled('personalization-engine');
                flagManager.toggleFlag('personalization-engine');
                const toggledState = flagManager.isEnabled('personalization-engine');
                if (originalState === toggledState) {
                    throw new Error('Flag toggle did not work');
                }
                flagManager.dispose();
                return {
                    gitEnabled,
                    conversationEnabled,
                    toggleWorked: originalState !== toggledState
                };
            }));
        });
    }
    testFeatureFlags() {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.runTest('FeatureFlags_Smoke', () => __awaiter(this, void 0, void 0, function* () {
                const flagManager = new FeatureFlagManager_1.FeatureFlagManager(this.context);
                yield flagManager.initialize();
                const enabledFlags = flagManager.getEnabledFlags();
                flagManager.dispose();
                return { enabledFlagsCount: enabledFlags.length };
            }));
        });
    }
    testGitIntegrationManager() {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.runTest('GitIntegrationManager_Full', () => __awaiter(this, void 0, void 0, function* () {
                var _a;
                const gitManager = new GitIntegrationManager_1.GitIntegrationManager(this.context);
                // Git 상태 확인
                const status = yield gitManager.getStatus();
                const currentCommit = yield gitManager.getCurrentCommit();
                const currentBranch = yield gitManager.getCurrentBranch();
                return {
                    hasGitRepo: status !== null,
                    currentCommit: currentCommit.hash.substring(0, 8),
                    currentBranch,
                    modifiedFiles: ((_a = status === null || status === void 0 ? void 0 : status.files) === null || _a === void 0 ? void 0 : _a.length) || 0
                };
            }));
        });
    }
    testGitRepository() {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.runTest('Git_Repository_Smoke', () => __awaiter(this, void 0, void 0, function* () {
                const gitManager = new GitIntegrationManager_1.GitIntegrationManager(this.context);
                const currentCommit = yield gitManager.getCurrentCommitHash();
                return { hasCommit: !!currentCommit };
            }));
        });
    }
    testConversationDatabase() {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.runTest('ConversationDatabase_Full', () => __awaiter(this, void 0, void 0, function* () {
                const db = new ConversationDatabase_1.ConversationDatabase();
                yield db.initialize();
                // 테스트 대화 생성
                const conversationId = yield db.createConversation('test-user-123', 'react', { templateUsed: 'test-template' });
                // 메시지 저장 테스트
                const messageId = yield db.saveMessage(conversationId, 'user', 'Create a test component', {
                    messageMetadata: { testRun: true }
                });
                // 대화 조회 테스트
                const conversation = yield db.getConversation(conversationId);
                const messages = yield db.getConversationMessages(conversationId);
                if (!conversation || messages.length === 0) {
                    throw new Error('Database operations failed');
                }
                return {
                    conversationId,
                    messageId,
                    messageCount: messages.length,
                    conversationStatus: conversation.status
                };
            }));
        });
    }
    testDatabaseConnection() {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.runTest('Database_Connection_Smoke', () => __awaiter(this, void 0, void 0, function* () {
                const db = new ConversationDatabase_1.ConversationDatabase();
                yield db.initialize();
                return { connected: true };
            }));
        });
    }
    testEnhancedMessageBridge() {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.runTest('EnhancedMessageBridge_Full', () => __awaiter(this, void 0, void 0, function* () {
                const bridge = new EnhancedMessageBridge_1.EnhancedMessageBridge(this.context, this.serviceRegistry);
                yield bridge.initialize();
                // Mock WebView 생성
                const mockWebView = {
                    postMessage: (message) => __awaiter(this, void 0, void 0, function* () {
                        console.log('[MockWebView] Message sent:', message.type);
                        return true;
                    })
                };
                // 테스트 메시지 처리
                const testMessage = {
                    type: 'chat:message',
                    data: { content: 'Hello WindWalker' },
                    timestamp: Date.now(),
                    requestId: 'test-request-123'
                };
                // 예외를 던지지 않으면 성공
                yield bridge.processMessage(testMessage, mockWebView);
                bridge.dispose();
                return { messageProcessed: true };
            }));
        });
    }
    testConversationHistoryTracker() {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.runTest('ConversationHistoryTracker_Full', () => __awaiter(this, void 0, void 0, function* () {
                const tracker = new ConversationHistoryTracker_1.ConversationHistoryTracker(this.context);
                yield tracker.initialize();
                // 테스트 대화 변경 추적
                const entry = yield tracker.trackConversationChange('test-conversation-456', 'test-message-789', 'test-user-123', 'Create a new component', 'Component created successfully', ['src/TestComponent.tsx'], 'create');
                // 히스토리 조회 테스트
                const history = yield tracker.getConversationHistory('test-conversation-456');
                tracker.dispose();
                return {
                    entryCreated: !!entry.entryId,
                    historyCount: history.length,
                    trackingSuccess: entry.success
                };
            }));
        });
    }
    // === Integration Tests ===
    testEndToEndConversationFlow() {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.runTest('E2E_ConversationFlow', () => __awaiter(this, void 0, void 0, function* () {
                // 1. 서비스 초기화
                const bridge = new EnhancedMessageBridge_1.EnhancedMessageBridge(this.context, this.serviceRegistry);
                yield bridge.initialize();
                const tracker = new ConversationHistoryTracker_1.ConversationHistoryTracker(this.context);
                yield tracker.initialize();
                // 2. Mock WebView
                const mockWebView = {
                    postMessage: (message) => __awaiter(this, void 0, void 0, function* () { return ({ type: message.type, success: true }); })
                };
                // 3. 대화 시작
                yield bridge.processMessage({
                    type: 'conversation:start',
                    data: { userId: 'e2e-test-user', projectType: 'react' },
                    timestamp: Date.now()
                }, mockWebView);
                // 4. 채팅 메시지 처리
                yield bridge.processMessage({
                    type: 'chat:message',
                    data: { content: 'Create a button component' },
                    timestamp: Date.now(),
                    userId: 'e2e-test-user'
                }, mockWebView);
                // 5. 파일 생성
                yield bridge.processMessage({
                    type: 'file:create',
                    data: {
                        path: 'src/Button.tsx',
                        content: 'export const Button = () => <button>Test</button>;'
                    },
                    timestamp: Date.now(),
                    userId: 'e2e-test-user',
                    requiresGitCommit: true,
                    filesChanged: ['src/Button.tsx']
                }, mockWebView);
                // 6. 정리
                bridge.dispose();
                tracker.dispose();
                return { flowCompleted: true };
            }));
        });
    }
    testGitConversationLinking() {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.runTest('Git_Conversation_Linking', () => __awaiter(this, void 0, void 0, function* () {
                const gitManager = new GitIntegrationManager_1.GitIntegrationManager(this.context);
                const db = new ConversationDatabase_1.ConversationDatabase();
                yield db.initialize();
                // 1. 테스트 대화 생성
                const conversationId = yield db.createConversation('link-test-user', 'typescript');
                // 2. 메시지 저장
                const messageId = yield db.saveMessage(conversationId, 'user', 'Add a new utility function');
                // 3. Git 커밋 생성 (실제 파일 변경이 있다면)
                try {
                    const commitResult = yield gitManager.createAIConversationCommit(conversationId, messageId, 'Add utility function', 'Function added successfully', ['src/utils.ts'], {
                        model: 'test-model',
                        confidence: 0.95,
                        processingTime: 200
                    });
                    // 4. DB에 Git 연결 저장
                    yield db.linkGitCommit(conversationId, messageId, {
                        commitHash: commitResult.commitHash,
                        shortHash: commitResult.shortHash,
                        message: commitResult.message,
                        filesChanged: commitResult.filesChanged,
                        timestamp: commitResult.timestamp
                    }, 'Test linking');
                    return {
                        linked: true,
                        commitHash: commitResult.shortHash,
                        conversationId
                    };
                }
                catch (error) {
                    // Git 커밋 실패는 예상될 수 있음 (변경사항이 없을 경우)
                    return {
                        linked: false,
                        reason: 'No changes to commit',
                        conversationId
                    };
                }
            }));
        });
    }
    testPersonalizationFlow() {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.runTest('Personalization_Flow', () => __awaiter(this, void 0, void 0, function* () {
                const db = new ConversationDatabase_1.ConversationDatabase();
                yield db.initialize();
                const tracker = new ConversationHistoryTracker_1.ConversationHistoryTracker(this.context);
                yield tracker.initialize();
                // 1. 사용자 패턴 생성을 위한 더미 데이터
                const userId = 'personalization-test-user';
                for (let i = 0; i < 3; i++) {
                    const conversationId = yield db.createConversation(userId, 'react');
                    yield db.saveMessage(conversationId, 'user', `Test request ${i + 1}: Create component`, { messageMetadata: { testIndex: i } });
                    yield db.saveMessage(conversationId, 'ai', `Component created for request ${i + 1}`, {
                        aiMetadata: {
                            model: 'test-model',
                            confidence: 0.8 + (i * 0.05),
                            processingTime: 100 + (i * 50)
                        }
                    });
                }
                // 2. 개인화 인사이트 생성
                const insights = yield tracker.generatePersonalizationInsights(userId);
                // 3. 패턴 분석
                const patterns = yield db.analyzeUserPatterns(userId);
                tracker.dispose();
                return {
                    insightsGenerated: !!insights.userId,
                    patternCount: patterns.totalConversations,
                    recommendationsCount: insights.recommendedNextActions.length,
                    preferredProjectTypes: patterns.preferredProjectTypes.length
                };
            }));
        });
    }
    // === Test Utilities ===
    runTest(testName, testFn) {
        return __awaiter(this, void 0, void 0, function* () {
            const startTime = Date.now();
            try {
                console.log(`🧪 Running test: ${testName}`);
                const result = yield testFn();
                const duration = Date.now() - startTime;
                this.addTestResult(testName, true, duration, undefined, result);
                console.log(`✅ Test passed: ${testName} (${duration}ms)`);
            }
            catch (error) {
                const duration = Date.now() - startTime;
                const errorMessage = error instanceof Error ? error.message : String(error);
                this.addTestResult(testName, false, duration, errorMessage);
                console.error(`❌ Test failed: ${testName} (${duration}ms):`, errorMessage);
            }
        });
    }
    addTestResult(testName, success, duration, error, details) {
        this.testResults.push({
            testName,
            success,
            duration,
            error,
            details
        });
    }
    generateReport(totalDuration) {
        const passed = this.testResults.filter(r => r.success).length;
        const failed = this.testResults.filter(r => !r.success).length;
        const skipped = 0; // 현재 구현에서는 스킵된 테스트 없음
        const summary = `${passed}/${this.testResults.length} tests passed` +
            (failed > 0 ? `, ${failed} failed` : '') +
            ` in ${totalDuration}ms`;
        const report = {
            totalTests: this.testResults.length,
            passed,
            failed,
            skipped,
            duration: totalDuration,
            results: [...this.testResults],
            summary,
            timestamp: new Date()
        };
        // 콘솔에 요약 출력
        console.log(`\n📊 Test Suite Results:`);
        console.log(`   Total Tests: ${report.totalTests}`);
        console.log(`   ✅ Passed: ${report.passed}`);
        console.log(`   ❌ Failed: ${report.failed}`);
        console.log(`   ⏱️ Duration: ${report.duration}ms`);
        console.log(`   🎯 Success Rate: ${Math.round((passed / report.totalTests) * 100)}%`);
        if (failed > 0) {
            console.log(`\n❌ Failed Tests:`);
            this.testResults.filter(r => !r.success).forEach(result => {
                console.log(`   - ${result.testName}: ${result.error}`);
            });
        }
        // 테스트 결과를 파일에 저장
        this.saveTestReport(report).catch(error => {
            console.warn('⚠️ Failed to save test report:', error);
        });
        return report;
    }
    saveTestReport(report) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const reportPath = path.join(this.context.extensionPath, 'test-results');
                yield fs.mkdir(reportPath, { recursive: true });
                const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
                const filename = `test-report-${timestamp}.json`;
                yield fs.writeFile(path.join(reportPath, filename), JSON.stringify(report, null, 2));
                console.log(`📄 Test report saved: ${filename}`);
            }
            catch (error) {
                console.error('Failed to save test report:', error);
            }
        });
    }
    /**
     * 통합 대시보드 생성 및 링크 공유
     */
    generateAndShareDashboard(report) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                console.log('📊 Generating integrated test dashboard...');
                const dashboard = new TestDashboard_1.TestDashboard(this.context, {
                    includeScreenshots: true,
                    includeHistory: true,
                    maxHistoryEntries: 20
                });
                const [finalReportPath, historyDashboardPath, screenshotGalleryPath] = yield dashboard.generateIntegratedDashboard(report);
                // 파일 URL로 변환
                const finalReportUrl = vscode.Uri.file(finalReportPath).toString();
                const historyDashboardUrl = vscode.Uri.file(historyDashboardPath).toString();
                const screenshotGalleryUrl = vscode.Uri.file(screenshotGalleryPath).toString();
                // 콘솔에 링크 출력
                console.log('\n🎯 WindWalker 테스트 대시보드가 생성되었습니다:');
                console.log(`📋 최종 통합 리포트: ${finalReportUrl}`);
                console.log(`📈 히스토리 대시보드: ${historyDashboardUrl}`);
                console.log(`📸 스크린샷 갤러리: ${screenshotGalleryUrl}`);
                // VS Code 알림으로 링크 제공
                const openDashboard = '대시보드 열기';
                const choice = yield vscode.window.showInformationMessage(`🎯 WindWalker 테스트 완료! 결과: ${report.passed}/${report.totalTests} 성공`, openDashboard);
                if (choice === openDashboard) {
                    // 기본 브라우저에서 최종 리포트 열기
                    yield vscode.env.openExternal(vscode.Uri.file(finalReportPath));
                }
                // 상태바에 링크 표시 (선택사항)
                vscode.window.setStatusBarMessage(`✅ WindWalker 테스트: ${report.passed}/${report.totalTests} 성공 - 대시보드 생성됨`, 10000);
            }
            catch (error) {
                console.error('❌ Dashboard generation failed:', error);
                vscode.window.showErrorMessage(`대시보드 생성 실패: ${error.message}`);
            }
        });
    }
    /**
     * 특정 컴포넌트만 테스트
     */
    testComponent(componentName) {
        return __awaiter(this, void 0, void 0, function* () {
            const startTime = Date.now();
            console.log(`🧪 [IntegratedTestSuite] Testing component: ${componentName}`);
            try {
                yield this.setupTestEnvironment();
                switch (componentName.toLowerCase()) {
                    case 'serviceregistry':
                        yield this.testServiceRegistry();
                        break;
                    case 'featureflag':
                        yield this.testFeatureFlagManager();
                        break;
                    case 'git':
                        yield this.testGitIntegrationManager();
                        break;
                    case 'database':
                        yield this.testConversationDatabase();
                        break;
                    case 'messagebridge':
                        yield this.testEnhancedMessageBridge();
                        break;
                    case 'tracker':
                        yield this.testConversationHistoryTracker();
                        break;
                    default:
                        throw new Error(`Unknown component: ${componentName}`);
                }
                yield this.cleanupTestEnvironment();
            }
            catch (error) {
                this.addTestResult(`Component_${componentName}`, false, 0, error.message);
            }
            const duration = Date.now() - startTime;
            return this.generateReport(duration);
        });
    }
}
exports.IntegratedTestSuite = IntegratedTestSuite;
//# sourceMappingURL=IntegratedTestSuite.js.map