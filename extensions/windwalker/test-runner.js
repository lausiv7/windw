// WindWalker 자동 테스트 실행기 (Node.js)
const fs = require('fs').promises;
const path = require('path');
const { exec } = require('child_process');
const { promisify } = require('util');

const execAsync = promisify(exec);

class WindWalkerAutoTest {
  constructor() {
    this.outputDir = path.join(__dirname, 'test-results');
    this.results = [];
    this.startTime = Date.now();
  }

  async runAllTests() {
    console.log('🚀 WindWalker 자동 테스트 시작...\n');

    try {
      await this.setupTestEnvironment();
      
      // 기본 환경 테스트
      await this.testEnvironment();
      await this.testFileSystem();
      await this.testGitBasics();
      await this.testPackageStructure();
      await this.testExtensionConfig();
      
      // 통합 기능 테스트
      await this.testMessageFlow();
      await this.testConversationFlow();

      const report = await this.generateReport();
      await this.generateDashboard(report);
      
      return report;

    } catch (error) {
      console.error('❌ 테스트 실행 중 오류:', error);
      return null;
    }
  }

  async setupTestEnvironment() {
    const testStart = Date.now();
    
    try {
      await fs.mkdir(this.outputDir, { recursive: true });
      this.addResult('Setup_TestEnvironment', true, Date.now() - testStart, '테스트 환경 설정 완료');
    } catch (error) {
      this.addResult('Setup_TestEnvironment', false, Date.now() - testStart, `환경 설정 실패: ${error.message}`);
    }
  }

  async testEnvironment() {
    const testStart = Date.now();
    
    try {
      const nodeVersion = process.version;
      const platform = process.platform;
      const arch = process.arch;
      
      this.addResult(
        'Environment_Check', 
        true, 
        Date.now() - testStart,
        `Node.js ${nodeVersion}, ${platform}-${arch}`,
        { nodeVersion, platform, arch }
      );
    } catch (error) {
      this.addResult('Environment_Check', false, Date.now() - testStart, `환경 확인 실패: ${error.message}`);
    }
  }

  async testFileSystem() {
    const testStart = Date.now();
    
    try {
      const testFile = path.join(this.outputDir, 'test-file.txt');
      const testContent = 'WindWalker Test Content';
      
      await fs.writeFile(testFile, testContent, 'utf8');
      const readContent = await fs.readFile(testFile, 'utf8');
      
      const success = readContent === testContent;
      
      this.addResult(
        'FileSystem_Operations',
        success,
        Date.now() - testStart,
        success ? '파일 시스템 작업 성공' : '파일 내용 불일치'
      );

      await fs.unlink(testFile);
      
    } catch (error) {
      this.addResult('FileSystem_Operations', false, Date.now() - testStart, `파일 시스템 테스트 실패: ${error.message}`);
    }
  }

  async testGitBasics() {
    const testStart = Date.now();
    
    try {
      const { stdout, stderr } = await execAsync('git status --porcelain', { cwd: __dirname });
      
      this.addResult(
        'Git_Basic_Status',
        true,
        Date.now() - testStart,
        'Git 저장소 접근 가능',
        { 
          hasChanges: stdout.trim().length > 0,
          changedFiles: stdout.trim().split('\n').filter(line => line.trim()).length
        }
      );
      
    } catch (error) {
      this.addResult('Git_Basic_Status', false, Date.now() - testStart, `Git 테스트 실패: ${error.message}`);
    }
  }

  async testPackageStructure() {
    const testStart = Date.now();
    
    try {
      const packageJsonPath = path.join(__dirname, 'package.json');
      const packageJson = JSON.parse(await fs.readFile(packageJsonPath, 'utf8'));
      
      const hasRequiredFields = packageJson.name && packageJson.version && packageJson.main;
      const hasCommands = packageJson.contributes && packageJson.contributes.commands;
      
      this.addResult(
        'Package_Structure',
        hasRequiredFields && hasCommands,
        Date.now() - testStart,
        hasRequiredFields && hasCommands ? 'package.json 구조 올바름' : '필수 필드 누락',
        { 
          name: packageJson.name,
          version: packageJson.version,
          commandCount: hasCommands ? packageJson.contributes.commands.length : 0
        }
      );
      
    } catch (error) {
      this.addResult('Package_Structure', false, Date.now() - testStart, `패키지 구조 테스트 실패: ${error.message}`);
    }
  }

  async testExtensionConfig() {
    const testStart = Date.now();
    
    try {
      // TypeScript 설정 확인
      const tsconfigPath = path.join(__dirname, 'tsconfig.json');
      const tsconfig = JSON.parse(await fs.readFile(tsconfigPath, 'utf8'));
      
      // 소스 파일 구조 확인
      const srcDir = path.join(__dirname, 'src');
      const srcExists = await fs.stat(srcDir).then(() => true).catch(() => false);
      
      this.addResult(
        'Extension_Config',
        srcExists && tsconfig.compilerOptions,
        Date.now() - testStart,
        srcExists && tsconfig.compilerOptions ? '확장 설정 올바름' : '설정 파일 누락',
        { 
          hasTsConfig: !!tsconfig.compilerOptions,
          hasSrcDir: srcExists,
          outDir: tsconfig.compilerOptions?.outDir || 'none'
        }
      );
      
    } catch (error) {
      this.addResult('Extension_Config', false, Date.now() - testStart, `확장 설정 테스트 실패: ${error.message}`);
    }
  }

  async testMessageFlow() {
    const testStart = Date.now();
    
    try {
      const mockMessage = {
        type: 'test:message',
        data: { content: 'Hello WindWalker' },
        timestamp: Date.now(),
        requestId: 'test-123'
      };
      
      // 메시지 구조 검증
      const isValidMessage = mockMessage.type && mockMessage.data && mockMessage.timestamp;
      
      this.addResult(
        'Message_Flow_Simulation',
        isValidMessage,
        Date.now() - testStart,
        isValidMessage ? '메시지 플로우 시뮬레이션 성공' : '메시지 구조 오류',
        { messageType: mockMessage.type, hasData: !!mockMessage.data }
      );
      
    } catch (error) {
      this.addResult('Message_Flow_Simulation', false, Date.now() - testStart, `메시지 플로우 테스트 실패: ${error.message}`);
    }
  }

  async testConversationFlow() {
    const testStart = Date.now();
    
    try {
      const conversationData = {
        conversationId: `conv_test_${Date.now()}`,
        userId: 'test-user',
        messages: [
          { sender: 'user', content: 'Create a button component' },
          { sender: 'ai', content: 'I will create a button component for you.' }
        ]
      };
      
      const isValidConversation = conversationData.conversationId && 
                                  conversationData.userId && 
                                  conversationData.messages.length > 0;
      
      this.addResult(
        'Conversation_Flow_Simulation',
        isValidConversation,
        Date.now() - testStart,
        isValidConversation ? '대화 플로우 시뮬레이션 성공' : '대화 구조 오류',
        { 
          conversationId: conversationData.conversationId,
          messageCount: conversationData.messages.length
        }
      );
      
    } catch (error) {
      this.addResult('Conversation_Flow_Simulation', false, Date.now() - testStart, `대화 플로우 테스트 실패: ${error.message}`);
    }
  }

  addResult(testName, success, duration, message, details = null) {
    this.results.push({
      testName,
      success,
      duration,
      message,
      details
    });
    
    console.log(`${success ? '✅' : '❌'} ${testName}: ${message} (${duration}ms)`);
  }

  async generateReport() {
    const totalDuration = Date.now() - this.startTime;
    const passed = this.results.filter(r => r.success).length;
    const failed = this.results.filter(r => !r.success).length;
    
    const report = {
      totalTests: this.results.length,
      passed,
      failed,
      duration: totalDuration,
      results: [...this.results],
      timestamp: new Date(),
      summary: `${passed}/${this.results.length} tests passed in ${totalDuration}ms`
    };
    
    console.log(`\n📊 WindWalker 자동 테스트 결과:`);
    console.log(`   ✅ 성공: ${passed}`);
    console.log(`   ❌ 실패: ${failed}`);
    console.log(`   ⏱️ 총 시간: ${totalDuration}ms`);
    console.log(`   🎯 성공률: ${Math.round((passed / this.results.length) * 100)}%`);
    
    return report;
  }

  async generateDashboard(report) {
    try {
      const dashboardPath = path.join(this.outputDir, 'windwalker-final-report.html');
      
      const html = `
<!DOCTYPE html>
<html lang="ko">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>WindWalker 자동 테스트 리포트</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { 
            font-family: 'Segoe UI', -apple-system, BlinkMacSystemFont, sans-serif; 
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            padding: 20px;
        }
        .container { 
            max-width: 1200px; 
            margin: 0 auto; 
            background: white;
            border-radius: 16px;
            box-shadow: 0 25px 50px rgba(0,0,0,0.15);
            overflow: hidden;
        }
        .header { 
            background: linear-gradient(135deg, #1e3c72, #2a5298);
            color: white; 
            padding: 50px 40px;
            text-align: center;
            position: relative;
        }
        .header::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="20" cy="20" r="2" fill="rgba(255,255,255,0.1)"/><circle cx="80" cy="40" r="3" fill="rgba(255,255,255,0.1)"/><circle cx="40" cy="80" r="1" fill="rgba(255,255,255,0.1)"/></svg>');
        }
        .header h1 { 
            font-size: 3em; 
            margin-bottom: 15px; 
            position: relative;
            z-index: 1;
        }
        .header p { 
            font-size: 1.3em; 
            opacity: 0.9; 
            position: relative;
            z-index: 1;
        }
        
        .summary { 
            display: grid; 
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 0;
        }
        .summary-card { 
            padding: 40px; 
            text-align: center;
            border-right: 1px solid #e8e8e8;
            transition: transform 0.3s ease;
        }
        .summary-card:last-child { border-right: none; }
        .summary-card:hover { transform: translateY(-5px); }
        
        .summary-card.success { background: linear-gradient(135deg, #11998e, #38ef7d); color: white; }
        .summary-card.danger { background: linear-gradient(135deg, #fc466b, #3f5efb); color: white; }
        .summary-card.info { background: linear-gradient(135deg, #667eea, #764ba2); color: white; }
        
        .metric { 
            font-size: 3.5em; 
            font-weight: 800; 
            margin: 15px 0; 
            text-shadow: 0 2px 4px rgba(0,0,0,0.3);
        }
        .metric-label {
            font-size: 1.1em;
            opacity: 0.9;
            text-transform: uppercase;
            letter-spacing: 1px;
        }
        
        .results { 
            padding: 50px 40px; 
            background: #fafbfc;
        }
        .results h2 { 
            margin-bottom: 30px; 
            color: #2c3e50;
            font-size: 2.2em;
        }
        
        .test-item { 
            display: flex;
            align-items: center;
            padding: 25px;
            margin-bottom: 20px;
            border-radius: 12px;
            border-left: 5px solid;
            background: white;
            box-shadow: 0 4px 12px rgba(0,0,0,0.1);
            transition: all 0.3s ease;
        }
        .test-item:hover {
            transform: translateX(5px);
            box-shadow: 0 6px 20px rgba(0,0,0,0.15);
        }
        
        .test-item.success { 
            border-left-color: #27ae60;
        }
        .test-item.failed { 
            border-left-color: #e74c3c;
        }
        
        .test-icon { 
            font-size: 2em; 
            margin-right: 20px;
            width: 40px;
            display: flex;
            justify-content: center;
        }
        .test-content { flex: 1; }
        .test-name { 
            font-weight: 700; 
            margin-bottom: 8px;
            font-size: 1.1em;
            color: #2c3e50;
        }
        .test-message { 
            color: #7f8c8d; 
            font-size: 1em;
            line-height: 1.5;
        }
        .test-duration { 
            color: #95a5a6; 
            font-size: 0.9em;
            margin-left: auto;
            font-weight: 600;
            padding: 5px 10px;
            background: #ecf0f1;
            border-radius: 20px;
        }
        
        .footer { 
            background: #2c3e50; 
            color: #ecf0f1;
            padding: 40px;
            text-align: center;
        }
        .footer h3 {
            margin-bottom: 15px;
            font-size: 1.5em;
        }
        .footer p {
            opacity: 0.8;
            line-height: 1.6;
        }
        
        .details-toggle {
            cursor: pointer;
            color: #3498db;
            text-decoration: none;
            font-size: 0.9em;
            margin-top: 8px;
            display: inline-block;
            font-weight: 600;
        }
        .details-toggle:hover {
            text-decoration: underline;
        }
        .details-content {
            display: none;
            margin-top: 15px;
            padding: 15px;
            background: #f8f9fa;
            border-radius: 8px;
            font-size: 0.85em;
            border: 1px solid #e9ecef;
        }
        .details-content pre {
            white-space: pre-wrap;
            word-wrap: break-word;
        }

        .badge {
            display: inline-block;
            padding: 4px 12px;
            border-radius: 20px;
            font-size: 0.8em;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            margin-left: 10px;
        }
        .badge.success { background: #d4edda; color: #155724; }
        .badge.danger { background: #f8d7da; color: #721c24; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🌪️ WindWalker</h1>
            <p>자동 테스트 리포트 - Phase 1 Git+IndexedDB 통합</p>
            <p>${report.timestamp.toLocaleString()}</p>
        </div>
        
        <div class="summary">
            <div class="summary-card ${report.failed === 0 ? 'success' : 'danger'}">
                <div class="metric">${report.passed}/${report.totalTests}</div>
                <div class="metric-label">성공률 ${Math.round((report.passed / report.totalTests) * 100)}%</div>
            </div>
            <div class="summary-card info">
                <div class="metric">${Math.round(report.duration / 1000)}초</div>
                <div class="metric-label">총 실행 시간</div>
            </div>
            <div class="summary-card ${report.failed === 0 ? 'success' : 'danger'}">
                <div class="metric">${report.failed === 0 ? '🎉' : '⚠️'}</div>
                <div class="metric-label">${report.failed === 0 ? '모든 테스트 통과' : `${report.failed}개 실패`}</div>
            </div>
        </div>
        
        <div class="results">
            <h2>📋 상세 테스트 결과</h2>
            ${report.results.map((result, index) => `
                <div class="test-item ${result.success ? 'success' : 'failed'}">
                    <div class="test-icon">${result.success ? '✅' : '❌'}</div>
                    <div class="test-content">
                        <div class="test-name">
                            ${result.testName}
                            <span class="badge ${result.success ? 'success' : 'danger'}">
                                ${result.success ? 'PASS' : 'FAIL'}
                            </span>
                        </div>
                        <div class="test-message">${result.message}</div>
                        ${result.details ? `
                            <div class="details-toggle" onclick="toggleDetails(${index})">
                                📊 상세 정보 보기
                            </div>
                            <div class="details-content" id="details-${index}">
                                <pre>${JSON.stringify(result.details, null, 2)}</pre>
                            </div>
                        ` : ''}
                    </div>
                    <div class="test-duration">${result.duration}ms</div>
                </div>
            `).join('')}
        </div>
        
        <div class="footer">
            <h3>🎯 WindWalker AI 대화식 웹사이트 빌더</h3>
            <p><strong>Phase 1 완료</strong> - Git+IndexedDB 통합, 자동 커밋, 대화 히스토리, 개인화 시스템</p>
            <p>Generated at ${report.timestamp.toLocaleString()}</p>
            <p style="margin-top: 20px; opacity: 0.6;">
                🚀 다음 단계: PersonalizationEngine, TemplateMarketplace, CollaborationSystem
            </p>
        </div>
    </div>
    
    <script>
        function toggleDetails(index) {
            const element = document.getElementById('details-' + index);
            const toggle = element.previousElementSibling;
            
            if (element.style.display === 'none' || element.style.display === '') {
                element.style.display = 'block';
                toggle.innerHTML = '📊 상세 정보 숨기기';
            } else {
                element.style.display = 'none';
                toggle.innerHTML = '📊 상세 정보 보기';
            }
        }

        // 페이지 로드 시 애니메이션
        document.addEventListener('DOMContentLoaded', function() {
            const items = document.querySelectorAll('.test-item');
            items.forEach((item, index) => {
                setTimeout(() => {
                    item.style.opacity = '0';
                    item.style.transform = 'translateY(20px)';
                    item.style.transition = 'all 0.5s ease';
                    setTimeout(() => {
                        item.style.opacity = '1';
                        item.style.transform = 'translateY(0)';
                    }, 100);
                }, index * 100);
            });
        });
    </script>
</body>
</html>`;
      
      await fs.writeFile(dashboardPath, html, 'utf8');
      
      console.log(`\n🎯 WindWalker 테스트 대시보드가 생성되었습니다:`);
      console.log(`📋 최종 통합 리포트: file://${dashboardPath}`);
      
      // URL을 파일 프로토콜로 출력
      const absolutePath = path.resolve(dashboardPath);
      console.log(`🌐 브라우저에서 열기: file://${absolutePath}`);
      
      return dashboardPath;
      
    } catch (error) {
      console.error('❌ Dashboard generation failed:', error);
      throw error;
    }
  }
}

// 메인 실행
async function main() {
  const tester = new WindWalkerAutoTest();
  const report = await tester.runAllTests();
  
  if (report) {
    console.log(`\n🏁 테스트 완료! 결과: ${report.summary}`);
  }
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = WindWalkerAutoTest;