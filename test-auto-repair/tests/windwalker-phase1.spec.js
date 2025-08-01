const { test, expect } = require('@playwright/test');

test.describe('WindWalker Phase 1 Extension Tests', () => {
  
  test.beforeEach(async ({ page }) => {
    // Code Server 페이지로 이동
    await page.goto('/');
    
    // VS Code가 로드될 때까지 기다림
    await page.waitForSelector('.monaco-workbench', { timeout: 30000 });
    
    // 로딩 완료 기다림
    await page.waitForTimeout(3000);
  });

  test('VS Code Extension Host가 로드되는지 확인', async ({ page }) => {
    // 콘솔에서 확장 활성화 메시지 확인
    const logs = [];
    page.on('console', msg => {
      logs.push(msg.text());
    });

    await page.waitForTimeout(5000);
    
    // WindWalker 활성화 로그 확인
    const hasActivationLog = logs.some(log => 
      log.includes('WindWalker Phase 1 활성화됨') || 
      log.includes('WindWalker Phase 1 확장이 성공적으로 로드')
    );
    
    expect(hasActivationLog).toBeTruthy();
  });

  test('WindWalker 사이드바 아이콘이 표시되는지 확인', async ({ page }) => {
    // Activity Bar에서 WindWalker 아이콘 찾기
    const activityBar = page.locator('.activitybar');
    await expect(activityBar).toBeVisible();

    // WindWalker 아이콘 클릭 시도 (title 또는 aria-label로 찾기)
    const windwalkerIcon = page.locator('[title*="WindWalker"], [aria-label*="WindWalker"]');
    
    // 아이콘이 존재하는지 확인 (최대 10초 대기)
    await expect(windwalkerIcon).toBeVisible({ timeout: 10000 });
  });

  test('WindWalker 패널 클릭 시 Welcome 뷰가 표시되는지 확인', async ({ page }) => {
    // WindWalker 아이콘 클릭
    const windwalkerIcon = page.locator('[title*="WindWalker"], [aria-label*="WindWalker"]');
    await windwalkerIcon.click();
    
    // Welcome 뷰가 사이드바에 표시되는지 확인
    const welcomeView = page.locator('[id*="windwalker.welcome"], .view-header [title*="Welcome"]');
    await expect(welcomeView).toBeVisible({ timeout: 5000 });
  });

  test('WindWalker Hello World 명령어 실행 테스트', async ({ page }) => {
    // 명령 팔레트 열기 (Ctrl+Shift+P)
    await page.keyboard.press('Control+Shift+P');
    
    // 명령 팔레트가 열릴 때까지 기다림
    await page.waitForSelector('.quick-input-widget', { timeout: 5000 });
    
    // WindWalker 명령어 입력
    await page.fill('.quick-input-widget input', 'WindWalker: Hello World');
    await page.waitForTimeout(1000);
    
    // 명령어 실행
    await page.keyboard.press('Enter');
    
    // 정보 메시지가 표시되는지 확인
    const notification = page.locator('.notifications-list-container .notification-toast');
    await expect(notification).toBeVisible({ timeout: 5000 });
    
    // 메시지 내용 확인
    const notificationText = await notification.textContent();
    expect(notificationText).toContain('WindWalker');
  });

  test('Extension Host 프로세스 상태 확인', async ({ page }) => {
    // 개발자 도구를 통한 확장 상태 확인
    const logs = [];
    page.on('console', msg => {
      if (msg.type() === 'log' || msg.type() === 'info') {
        logs.push(msg.text());
      }
    });

    // 페이지 새로고침으로 확장 재로드
    await page.reload();
    await page.waitForTimeout(5000);

    // Extension Host 관련 로그 확인
    const hasExtensionHostLog = logs.some(log => 
      log.includes('Extension Host') || 
      log.includes('extensions activation')
    );
    
    // WindWalker 확장이 정상적으로 로드되었는지 확인
    const hasWindWalkerLog = logs.some(log => 
      log.includes('WindWalker')
    );

    expect(hasWindWalkerLog).toBeTruthy();
  });

  test('VS Code 워크스페이스가 올바르게 로드되는지 확인', async ({ page }) => {
    // 탐색기 패널 확인
    const explorer = page.locator('.explorer-viewlet');
    
    // 워크스페이스가 로드되었는지 확인
    const workspaceFolder = page.locator('.explorer-item[title*="studio"]');
    await expect(workspaceFolder).toBeVisible({ timeout: 10000 });
  });
});