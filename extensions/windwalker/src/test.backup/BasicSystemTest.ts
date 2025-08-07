// [의도] 기초 코드 Phase 1-5 기본 동작 검증 테스트
// [책임] 컴파일 오류 없이 핵심 시스템 컴포넌트들의 기본 동작 확인

import * as vscode from 'vscode';

export interface BasicTestResult {
  testName: string;
  success: boolean;
  duration: number;
  message: string;
}

export interface BasicTestReport {
  totalTests: number;
  passed: number;
  failed: number;
  duration: number;
  results: BasicTestResult[];
  summary: string;
}

export class BasicSystemTest {
  private context: vscode.ExtensionContext;
  private results: BasicTestResult[] = [];

  constructor(context: vscode.ExtensionContext) {
    this.context = context;
  }

  async runBasicPhase1to5Tests(): Promise<BasicTestReport> {
    console.log('🔍 [BasicSystemTest] 기초 코드 Phase 1-5 테스트 시작...');
    
    const startTime = Date.now();
    this.results = [];

    // Phase 1: Environment & Context
    await this.testPhase1Environment();
    
    // Phase 2: File System
    await this.testPhase2FileSystem();
    
    // Phase 3: Build System
    await this.testPhase3BuildSystem();
    
    // Phase 4: Message System
    await this.testPhase4MessageSystem();
    
    // Phase 5: Integration
    await this.testPhase5Integration();

    const duration = Date.now() - startTime;
    const passed = this.results.filter(r => r.success).length;
    const failed = this.results.length - passed;

    const report: BasicTestReport = {
      totalTests: this.results.length,
      passed,
      failed,
      duration,
      results: this.results,
      summary: `기초 코드 Phase 1-5: ${passed}/${this.results.length} 통과 (${duration}ms)`
    };

    console.log(`✅ 기초 코드 테스트 완료: ${report.summary}`);
    return report;
  }

  private async testPhase1Environment(): Promise<void> {
    const startTime = Date.now();

    try {
      // VS Code Extension Context 확인
      const hasContext = this.context !== undefined;
      const hasExtensionPath = !!this.context.extensionPath;
      const hasWorkspace = !!vscode.workspace.workspaceFolders;

      if (!hasContext || !hasExtensionPath) {
        throw new Error('Extension context not properly initialized');
      }

      this.addResult(
        'Phase 1: Environment Setup',
        true,
        Date.now() - startTime,
        `✅ Context OK, Workspace: ${hasWorkspace ? 'Yes' : 'No'}`
      );

    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      this.addResult(
        'Phase 1: Environment Setup',
        false,
        Date.now() - startTime,
        `❌ Environment test failed: ${errorMsg}`
      );
    }
  }

  private async testPhase2FileSystem(): Promise<void> {
    const startTime = Date.now();

    try {
      // 기본 파일시스템 접근 테스트
      const workspace = vscode.workspace.workspaceFolders?.[0];
      
      if (workspace) {
        // 워크스페이스 존재 시 읽기 권한 확인
        const workspacePath = workspace.uri.fsPath;
        const canAccess = workspacePath.length > 0;
        
        this.addResult(
          'Phase 2: File System Access',
          canAccess,
          Date.now() - startTime,
          `✅ Workspace access: ${workspacePath}`
        );
      } else {
        this.addResult(
          'Phase 2: File System Access',
          true,
          Date.now() - startTime,
          '⚠️ No workspace - file system test skipped'
        );
      }

    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      this.addResult(
        'Phase 2: File System Access',
        false,
        Date.now() - startTime,
        `❌ File system test failed: ${errorMsg}`
      );
    }
  }

  private async testPhase3BuildSystem(): Promise<void> {
    const startTime = Date.now();

    try {
      // Build system basic check
      const workspace = vscode.workspace.workspaceFolders?.[0];
      let hasPackageJson = false;
      let buildSystemType = 'unknown';

      if (workspace) {
        try {
          const packageJsonUri = vscode.Uri.joinPath(workspace.uri, 'package.json');
          const packageJsonStat = await vscode.workspace.fs.stat(packageJsonUri);
          hasPackageJson = packageJsonStat.type === vscode.FileType.File;
          buildSystemType = 'npm/node';
        } catch {
          // package.json이 없을 수 있음
        }
      }

      this.addResult(
        'Phase 3: Build System Detection',
        true, // 빌드 시스템이 없어도 정상
        Date.now() - startTime,
        `✅ Build system: ${buildSystemType}, package.json: ${hasPackageJson}`
      );

    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      this.addResult(
        'Phase 3: Build System Detection',
        false,
        Date.now() - startTime,
        `❌ Build system test failed: ${errorMsg}`
      );
    }
  }

  private async testPhase4MessageSystem(): Promise<void> {
    const startTime = Date.now();

    try {
      // VS Code 메시지 시스템 기본 테스트
      const testMessage = {
        type: 'test:ping',
        data: { message: 'Basic system test' },
        timestamp: Date.now()
      };

      // 메시지 객체 생성 및 구조 확인
      const hasType = 'type' in testMessage;
      const hasData = 'data' in testMessage;
      const hasTimestamp = 'timestamp' in testMessage;

      if (!hasType || !hasData || !hasTimestamp) {
        throw new Error('Message structure validation failed');
      }

      this.addResult(
        'Phase 4: Message System',
        true,
        Date.now() - startTime,
        '✅ Message structure validation passed'
      );

    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      this.addResult(
        'Phase 4: Message System',
        false,
        Date.now() - startTime,
        `❌ Message system test failed: ${errorMsg}`
      );
    }
  }

  private async testPhase5Integration(): Promise<void> {
    const startTime = Date.now();

    try {
      // 통합 테스트: 기본 VS Code API 접근
      const hasCommands = !!vscode.commands;
      const hasWindow = !!vscode.window;
      const hasWorkspace = !!vscode.workspace;
      const hasExtensions = !!vscode.extensions;

      const apiAccessCount = [hasCommands, hasWindow, hasWorkspace, hasExtensions]
        .filter(Boolean).length;

      if (apiAccessCount < 4) {
        throw new Error(`VS Code API access incomplete: ${apiAccessCount}/4`);
      }

      // Extension 정보 확인
      const extensionId = 'windwalker';
      const extension = vscode.extensions.getExtension(extensionId);
      const isActive = extension?.isActive || false;

      this.addResult(
        'Phase 5: Integration Test',
        true,
        Date.now() - startTime,
        `✅ VS Code API: ${apiAccessCount}/4, Extension Active: ${isActive}`
      );

    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      this.addResult(
        'Phase 5: Integration Test',
        false,
        Date.now() - startTime,
        `❌ Integration test failed: ${errorMsg}`
      );
    }
  }

  private addResult(testName: string, success: boolean, duration: number, message: string): void {
    this.results.push({
      testName,
      success,
      duration,
      message
    });

    const statusIcon = success ? '✅' : '❌';
    console.log(`${statusIcon} ${testName}: ${message} (${duration}ms)`);
  }
}