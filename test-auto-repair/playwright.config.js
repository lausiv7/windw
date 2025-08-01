// @ts-check
const { defineConfig, devices } = require('@playwright/test');

module.exports = defineConfig({
  testDir: './tests',
  timeout: 60000,
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1, // WindWalker 테스트는 순차 실행
  reporter: [
    ['html'],
    ['json', { outputFile: 'test-results.json' }],
    ['line']
  ],
  use: {
    // Global test settings
    baseURL: 'http://localhost:8082',
    trace: 'on-first-retry',
    headless: true,
    args: ['--disable-dev-shm-usage', '--no-sandbox', '--disable-setuid-sandbox']
  },

  projects: [
    {
      name: 'chromium',
      use: { 
        ...devices['Desktop Chrome'],
        // 시스템 설치된 Chromium 사용 시도
        channel: 'chromium',
        executablePath: '/google/idx/builtins/bin/chromium',
        // 추가 안전 인수
        args: [
          '--disable-dev-shm-usage',
          '--no-sandbox', 
          '--disable-setuid-sandbox',
          '--disable-web-security',
          '--disable-features=VizDisplayCompositor',
          '--single-process'
        ]
      },
    }
  ],

  // Code Server가 실행되기를 기다림
  webServer: {
    command: '../start-windwalker.sh',
    port: 8082,
    timeout: 30000,
    reuseExistingServer: !process.env.CI,
  },
});