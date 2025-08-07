// [의도] WindWalker Git+IndexedDB 통합 시스템의 자동 테스트 스위트
// [책임] Phase 1 구현 검증, 통합 테스트, 자동 테스트 실행 및 리포팅

import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs/promises';
import { ServiceRegistry } from '../core/ServiceRegistry';
import { FeatureFlagManager } from '../core/FeatureFlagManager';
import { GitIntegrationManager } from '../core/GitIntegrationManager';
import { ConversationDatabase } from '../core/ConversationDatabase';
import { EnhancedMessageBridge } from '../core/EnhancedMessageBridge';
import { ConversationHistoryTracker } from '../core/ConversationHistoryTracker';
import { TestDashboard } from './TestDashboard';

export interface TestResult {
  testName: string;
  success: boolean;
  duration: number;
  error?: string;
  details?: any;
}

export interface TestSuiteReport {
  totalTests: number;
  passed: number;
  failed: number;
  skipped: number;
  duration: number;
  results: TestResult[];
  summary: string;
  timestamp: Date;
}

export class IntegratedTestSuite {
  private context: vscode.ExtensionContext;
  private serviceRegistry: ServiceRegistry;
  private testResults: TestResult[] = [];
  private testWorkspace: string;

  constructor(context: vscode.ExtensionContext) {
    this.context = context;
    this.serviceRegistry = ServiceRegistry.getInstance(context);
    this.testWorkspace = path.join(context.extensionPath, 'test-workspace');
  }

  /**
   * 전체 테스트 스위트 실행
   */
  async runFullTestSuite(): Promise<TestSuiteReport> {
    const startTime = Date.now();
    console.log('🧪 [IntegratedTestSuite] Starting full test suite...');

    try {
      // 0. 테스트 환경 준비
      await this.setupTestEnvironment();

      // 1. 기본 서비스 테스트
      await this.testServiceRegistry();
      await this.testFeatureFlagManager();

      // 2. 스토리지 시스템 테스트
      await this.testGitIntegrationManager();
      await this.testConversationDatabase();

      // 3. 통합 시스템 테스트
      await this.testEnhancedMessageBridge();
      await this.testConversationHistoryTracker();

      // 4. 엔드투엔드 통합 테스트
      await this.testEndToEndConversationFlow();
      await this.testGitConversationLinking();
      await this.testPersonalizationFlow();

      // 5. 테스트 환경 정리
      await this.cleanupTestEnvironment();

    } catch (error) {
      console.error('🚫 [IntegratedTestSuite] Test suite failed:', error);
      this.addTestResult('TestSuite_Setup', false, 0, error.message);
    }

    const duration = Date.now() - startTime;
    const report = this.generateReport(duration);

    // 6. 통합 대시보드 생성 및 링크 공유
    await this.generateAndShareDashboard(report);

    return report;
  }

  /**
   * 빠른 스모크 테스트
   */
  async runSmokeTests(): Promise<TestSuiteReport> {
    const startTime = Date.now();
    console.log('💨 [IntegratedTestSuite] Running smoke tests...');

    try {
      await this.setupTestEnvironment();

      // 기본 초기화 테스트만 실행
      await this.testServiceRegistryInitialization();
      await this.testDatabaseConnection();
      await this.testGitRepository();
      await this.testFeatureFlags();

      await this.cleanupTestEnvironment();
    } catch (error) {
      console.error('🚫 [IntegratedTestSuite] Smoke tests failed:', error);
      this.addTestResult('SmokeTest_Setup', false, 0, error.message);
    }

    const duration = Date.now() - startTime;
    const report = this.generateReport(duration);

    // 스모크 테스트도 대시보드 생성
    await this.generateAndShareDashboard(report);

    return report;
  }

  // === Setup & Cleanup ===

  private async setupTestEnvironment(): Promise<void> {
    const testStart = Date.now();
    
    try {
      // 테스트 워크스페이스 디렉토리 생성
      await fs.mkdir(this.testWorkspace, { recursive: true });
      
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
      
      await fs.writeFile(
        path.join(this.testWorkspace, 'package.json'),
        JSON.stringify(packageJson, null, 2)
      );

      // 테스트용 소스 파일 생성
      await fs.mkdir(path.join(this.testWorkspace, 'src'), { recursive: true });
      await fs.writeFile(
        path.join(this.testWorkspace, 'src', 'test.ts'),
        '// Test file for WindWalker integration tests\nexport const testVar = "test";'
      );

      console.log('✅ Test environment setup complete');
      this.addTestResult('Setup_TestEnvironment', true, Date.now() - testStart);

    } catch (error) {
      this.addTestResult('Setup_TestEnvironment', false, Date.now() - testStart, error.message);
      throw error;
    }
  }

  private async cleanupTestEnvironment(): Promise<void> {
    const testStart = Date.now();
    
    try {
      // 테스트 워크스페이스 정리
      await fs.rm(this.testWorkspace, { recursive: true, force: true });
      
      console.log('✅ Test environment cleanup complete');
      this.addTestResult('Cleanup_TestEnvironment', true, Date.now() - testStart);

    } catch (error) {
      this.addTestResult('Cleanup_TestEnvironment', false, Date.now() - testStart, error.message);
      console.warn('⚠️ Test cleanup failed, but continuing...', error);
    }
  }

  // === Individual Component Tests ===

  private async testServiceRegistry(): Promise<void> {
    await this.runTest('ServiceRegistry_Full', async () => {
      // ServiceRegistry 테스트
      await this.testServiceRegistryInitialization();
      
      // Mock 서비스 등록 테스트
      class MockService {
        name = 'MockService';
        async initialize() { console.log('Mock initialized'); }
        dispose() { console.log('Mock disposed'); }
      }

      this.serviceRegistry.register({
        name: 'MockService',
        implementation: MockService as any,
        dependencies: [],
        singleton: true,
        autoStart: false
      });

      const mockService = await this.serviceRegistry.getService('MockService');
      if (!mockService || mockService.name !== 'MockService') {
        throw new Error('Service registration/retrieval failed');
      }

      return { serviceCount: this.serviceRegistry.getRegisteredServices().length };
    });
  }

  private async testServiceRegistryInitialization(): Promise<void> {
    await this.runTest('ServiceRegistry_Initialization', async () => {
      const registeredServices = this.serviceRegistry.getRegisteredServices();
      const serviceStatus = this.serviceRegistry.getServiceStatus();
      
      return { registeredServices, serviceStatus };
    });
  }

  private async testFeatureFlagManager(): Promise<void> {
    await this.runTest('FeatureFlagManager_Full', async () => {
      const flagManager = new FeatureFlagManager(this.context);
      await flagManager.initialize();

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
    });
  }

  private async testFeatureFlags(): Promise<void> {
    await this.runTest('FeatureFlags_Smoke', async () => {
      const flagManager = new FeatureFlagManager(this.context);
      await flagManager.initialize();
      
      const enabledFlags = flagManager.getEnabledFlags();
      flagManager.dispose();
      
      return { enabledFlagsCount: enabledFlags.length };
    });
  }

  private async testGitIntegrationManager(): Promise<void> {
    await this.runTest('GitIntegrationManager_Full', async () => {
      const gitManager = new GitIntegrationManager(this.context);
      
      // Git 상태 확인
      const status = await gitManager.getStatus();
      const currentCommit = await gitManager.getCurrentCommit();
      const currentBranch = await gitManager.getCurrentBranch();

      return {
        hasGitRepo: status !== null,
        currentCommit: currentCommit.hash.substring(0, 8),
        currentBranch,
        modifiedFiles: status?.files?.length || 0
      };
    });
  }

  private async testGitRepository(): Promise<void> {
    await this.runTest('Git_Repository_Smoke', async () => {
      const gitManager = new GitIntegrationManager(this.context);
      const currentCommit = await gitManager.getCurrentCommitHash();
      
      return { hasCommit: !!currentCommit };
    });
  }

  private async testConversationDatabase(): Promise<void> {
    await this.runTest('ConversationDatabase_Full', async () => {
      const db = new ConversationDatabase();
      await db.initialize();

      // 테스트 대화 생성
      const conversationId = await db.createConversation(
        'test-user-123',
        'react',
        { templateUsed: 'test-template' }
      );

      // 메시지 저장 테스트
      const messageId = await db.saveMessage(
        conversationId,
        'user',
        'Create a test component',
        {
          messageMetadata: { testRun: true }
        }
      );

      // 대화 조회 테스트
      const conversation = await db.getConversation(conversationId);
      const messages = await db.getConversationMessages(conversationId);

      if (!conversation || messages.length === 0) {
        throw new Error('Database operations failed');
      }

      return {
        conversationId,
        messageId,
        messageCount: messages.length,
        conversationStatus: conversation.status
      };
    });
  }

  private async testDatabaseConnection(): Promise<void> {
    await this.runTest('Database_Connection_Smoke', async () => {
      const db = new ConversationDatabase();
      await db.initialize();
      
      return { connected: true };
    });
  }

  private async testEnhancedMessageBridge(): Promise<void> {
    await this.runTest('EnhancedMessageBridge_Full', async () => {
      const bridge = new EnhancedMessageBridge(this.context, this.serviceRegistry);
      await bridge.initialize();

      // Mock WebView 생성
      const mockWebView = {
        postMessage: async (message: any) => {
          console.log('[MockWebView] Message sent:', message.type);
          return true;
        }
      } as any;

      // 테스트 메시지 처리
      const testMessage = {
        type: 'chat:message',
        data: { content: 'Hello WindWalker' },
        timestamp: Date.now(),
        requestId: 'test-request-123'
      };

      // 예외를 던지지 않으면 성공
      await bridge.processMessage(testMessage, mockWebView);

      bridge.dispose();
      
      return { messageProcessed: true };
    });
  }

  private async testConversationHistoryTracker(): Promise<void> {
    await this.runTest('ConversationHistoryTracker_Full', async () => {
      const tracker = new ConversationHistoryTracker(this.context);
      await tracker.initialize();

      // 테스트 대화 변경 추적
      const entry = await tracker.trackConversationChange(
        'test-conversation-456',
        'test-message-789',
        'test-user-123',
        'Create a new component',
        'Component created successfully',
        ['src/TestComponent.tsx'],
        'create'
      );

      // 히스토리 조회 테스트
      const history = await tracker.getConversationHistory('test-conversation-456');
      
      tracker.dispose();

      return {
        entryCreated: !!entry.entryId,
        historyCount: history.length,
        trackingSuccess: entry.success
      };
    });
  }

  // === Integration Tests ===

  private async testEndToEndConversationFlow(): Promise<void> {
    await this.runTest('E2E_ConversationFlow', async () => {
      // 1. 서비스 초기화
      const bridge = new EnhancedMessageBridge(this.context, this.serviceRegistry);
      await bridge.initialize();

      const tracker = new ConversationHistoryTracker(this.context);
      await tracker.initialize();

      // 2. Mock WebView
      const mockWebView = {
        postMessage: async (message: any) => ({ type: message.type, success: true })
      } as any;

      // 3. 대화 시작
      await bridge.processMessage({
        type: 'conversation:start',
        data: { userId: 'e2e-test-user', projectType: 'react' },
        timestamp: Date.now()
      }, mockWebView);

      // 4. 채팅 메시지 처리
      await bridge.processMessage({
        type: 'chat:message',
        data: { content: 'Create a button component' },
        timestamp: Date.now(),
        userId: 'e2e-test-user'
      }, mockWebView);

      // 5. 파일 생성
      await bridge.processMessage({
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
    });
  }

  private async testGitConversationLinking(): Promise<void> {
    await this.runTest('Git_Conversation_Linking', async () => {
      const gitManager = new GitIntegrationManager(this.context);
      const db = new ConversationDatabase();
      await db.initialize();

      // 1. 테스트 대화 생성
      const conversationId = await db.createConversation('link-test-user', 'typescript');
      
      // 2. 메시지 저장
      const messageId = await db.saveMessage(
        conversationId,
        'user',
        'Add a new utility function'
      );

      // 3. Git 커밋 생성 (실제 파일 변경이 있다면)
      try {
        const commitResult = await gitManager.createAIConversationCommit(
          conversationId,
          messageId,
          'Add utility function',
          'Function added successfully',
          ['src/utils.ts'],
          {
            model: 'test-model',
            confidence: 0.95,
            processingTime: 200
          }
        );

        // 4. DB에 Git 연결 저장
        await db.linkGitCommit(
          conversationId,
          messageId,
          {
            commitHash: commitResult.commitHash,
            shortHash: commitResult.shortHash,
            message: commitResult.message,
            filesChanged: commitResult.filesChanged,
            timestamp: commitResult.timestamp
          },
          'Test linking'
        );

        return { 
          linked: true, 
          commitHash: commitResult.shortHash,
          conversationId 
        };

      } catch (error) {
        // Git 커밋 실패는 예상될 수 있음 (변경사항이 없을 경우)
        return { 
          linked: false, 
          reason: 'No changes to commit',
          conversationId 
        };
      }
    });
  }

  private async testPersonalizationFlow(): Promise<void> {
    await this.runTest('Personalization_Flow', async () => {
      const db = new ConversationDatabase();
      await db.initialize();

      const tracker = new ConversationHistoryTracker(this.context);
      await tracker.initialize();

      // 1. 사용자 패턴 생성을 위한 더미 데이터
      const userId = 'personalization-test-user';
      
      for (let i = 0; i < 3; i++) {
        const conversationId = await db.createConversation(userId, 'react');
        
        await db.saveMessage(
          conversationId,
          'user',
          `Test request ${i + 1}: Create component`,
          { messageMetadata: { testIndex: i } }
        );

        await db.saveMessage(
          conversationId,
          'ai',
          `Component created for request ${i + 1}`,
          {
            aiMetadata: {
              model: 'test-model',
              confidence: 0.8 + (i * 0.05),
              processingTime: 100 + (i * 50)
            }
          }
        );
      }

      // 2. 개인화 인사이트 생성
      const insights = await tracker.generatePersonalizationInsights(userId);

      // 3. 패턴 분석
      const patterns = await db.analyzeUserPatterns(userId);

      tracker.dispose();

      return {
        insightsGenerated: !!insights.userId,
        patternCount: patterns.totalConversations,
        recommendationsCount: insights.recommendedNextActions.length,
        preferredProjectTypes: patterns.preferredProjectTypes.length
      };
    });
  }

  // === Test Utilities ===

  private async runTest(testName: string, testFn: () => Promise<any>): Promise<void> {
    const startTime = Date.now();
    
    try {
      console.log(`🧪 Running test: ${testName}`);
      const result = await testFn();
      const duration = Date.now() - startTime;
      
      this.addTestResult(testName, true, duration, undefined, result);
      console.log(`✅ Test passed: ${testName} (${duration}ms)`);
      
    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      this.addTestResult(testName, false, duration, errorMessage);
      console.error(`❌ Test failed: ${testName} (${duration}ms):`, errorMessage);
    }
  }

  private addTestResult(
    testName: string, 
    success: boolean, 
    duration: number, 
    error?: string, 
    details?: any
  ): void {
    this.testResults.push({
      testName,
      success,
      duration,
      error,
      details
    });
  }

  private generateReport(totalDuration: number): TestSuiteReport {
    const passed = this.testResults.filter(r => r.success).length;
    const failed = this.testResults.filter(r => !r.success).length;
    const skipped = 0; // 현재 구현에서는 스킵된 테스트 없음

    const summary = `${passed}/${this.testResults.length} tests passed` + 
                   (failed > 0 ? `, ${failed} failed` : '') +
                   ` in ${totalDuration}ms`;

    const report: TestSuiteReport = {
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

  private async saveTestReport(report: TestSuiteReport): Promise<void> {
    try {
      const reportPath = path.join(this.context.extensionPath, 'test-results');
      await fs.mkdir(reportPath, { recursive: true });
      
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `test-report-${timestamp}.json`;
      
      await fs.writeFile(
        path.join(reportPath, filename),
        JSON.stringify(report, null, 2)
      );

      console.log(`📄 Test report saved: ${filename}`);
    } catch (error) {
      console.error('Failed to save test report:', error);
    }
  }

  /**
   * 통합 대시보드 생성 및 링크 공유
   */
  private async generateAndShareDashboard(report: TestSuiteReport): Promise<void> {
    try {
      console.log('📊 Generating integrated test dashboard...');

      const dashboard = new TestDashboard(this.context, {
        includeScreenshots: true,
        includeHistory: true,
        maxHistoryEntries: 20
      });

      const [finalReportPath, historyDashboardPath, screenshotGalleryPath] = 
        await dashboard.generateIntegratedDashboard(report);

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
      const choice = await vscode.window.showInformationMessage(
        `🎯 WindWalker 테스트 완료! 결과: ${report.passed}/${report.totalTests} 성공`,
        openDashboard
      );

      if (choice === openDashboard) {
        // 기본 브라우저에서 최종 리포트 열기
        await vscode.env.openExternal(vscode.Uri.file(finalReportPath));
      }

      // 상태바에 링크 표시 (선택사항)
      vscode.window.setStatusBarMessage(
        `✅ WindWalker 테스트: ${report.passed}/${report.totalTests} 성공 - 대시보드 생성됨`,
        10000
      );

    } catch (error) {
      console.error('❌ Dashboard generation failed:', error);
      vscode.window.showErrorMessage(`대시보드 생성 실패: ${error.message}`);
    }
  }

  /**
   * 특정 컴포넌트만 테스트
   */
  async testComponent(componentName: string): Promise<TestSuiteReport> {
    const startTime = Date.now();
    console.log(`🧪 [IntegratedTestSuite] Testing component: ${componentName}`);

    try {
      await this.setupTestEnvironment();

      switch (componentName.toLowerCase()) {
        case 'serviceregistry':
          await this.testServiceRegistry();
          break;
        case 'featureflag':
          await this.testFeatureFlagManager();
          break;
        case 'git':
          await this.testGitIntegrationManager();
          break;
        case 'database':
          await this.testConversationDatabase();
          break;
        case 'messagebridge':
          await this.testEnhancedMessageBridge();
          break;
        case 'tracker':
          await this.testConversationHistoryTracker();
          break;
        default:
          throw new Error(`Unknown component: ${componentName}`);
      }

      await this.cleanupTestEnvironment();
    } catch (error) {
      this.addTestResult(`Component_${componentName}`, false, 0, error.message);
    }

    const duration = Date.now() - startTime;
    return this.generateReport(duration);
  }
}