"use strict";
// [의도] WindWalker 통합 테스트 결과의 HTML 대시보드 및 리포트 생성
// [책임] 테스트 결과 시각화, 히스토리 대시보드, 스크린샷 갤러리, 통계 차트
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
exports.TestDashboard = void 0;
const vscode = __importStar(require("vscode"));
const fs = __importStar(require("fs/promises"));
const path = __importStar(require("path"));
class TestDashboard {
    constructor(context, config) {
        this.context = context;
        this.config = Object.assign({ outputDir: path.join(context.extensionPath, 'test-results'), includeScreenshots: true, includeHistory: true, maxHistoryEntries: 20 }, config);
        this.outputDir = this.config.outputDir;
    }
    /**
     * 통합 대시보드 생성 (최종 리포트 + 히스토리 + 스크린샷)
     */
    generateIntegratedDashboard(currentReport) {
        return __awaiter(this, void 0, void 0, function* () {
            console.log('📊 Generating integrated test dashboard...');
            try {
                // 출력 디렉토리 생성
                yield fs.mkdir(this.outputDir, { recursive: true });
                yield fs.mkdir(path.join(this.outputDir, 'assets'), { recursive: true });
                yield fs.mkdir(path.join(this.outputDir, 'module-screenshots'), { recursive: true });
                // 히스토리 데이터 로드
                const historicalReports = yield this.loadTestHistory();
                // 시스템 정보 수집
                const systemInfo = yield this.collectSystemInfo();
                // 대시보드 데이터 구성
                const dashboardData = {
                    currentReport,
                    historicalReports,
                    systemInfo
                };
                // 스크린샷 생성 (모듈별)
                if (this.config.includeScreenshots) {
                    dashboardData.screenshots = yield this.generateModuleScreenshots(currentReport);
                }
                // 1. 최종 통합 리포트 생성
                const finalReportPath = yield this.generateFinalReport(dashboardData);
                // 2. 히스토리 대시보드 생성  
                const historyDashboardPath = yield this.generateHistoryDashboard(dashboardData);
                // 3. 스크린샷 갤러리 생성
                const screenshotGalleryPath = yield this.generateScreenshotGallery(dashboardData);
                // 4. 테스트 히스토리 업데이트
                yield this.saveTestHistory(currentReport);
                // 5. CSS 및 JS 에셋 복사
                yield this.generateAssets();
                console.log('✅ Integrated dashboard generated successfully');
                return [finalReportPath, historyDashboardPath, screenshotGalleryPath];
            }
            catch (error) {
                console.error('❌ Dashboard generation failed:', error);
                throw new Error(`Dashboard generation failed: ${error.message}`);
            }
        });
    }
    /**
     * 최종 통합 리포트 HTML 생성
     */
    generateFinalReport(data) {
        return __awaiter(this, void 0, void 0, function* () {
            const reportPath = path.join(this.outputDir, 'windwalker-final-report.html');
            const html = `
<!DOCTYPE html>
<html lang="ko">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>WindWalker 통합 테스트 리포트</title>
    <link rel="stylesheet" href="assets/dashboard.css">
    <script src="assets/chart.min.js"></script>
</head>
<body>
    <div class="dashboard-container">
        <!-- 헤더 -->
        <header class="dashboard-header">
            <h1>🌪️ WindWalker 통합 테스트 리포트</h1>
            <div class="system-info">
                <span>📅 ${data.systemInfo.timestamp}</span>
                <span>🖥️ ${data.systemInfo.platform}</span>
                <span>📊 VS Code ${data.systemInfo.vsCodeVersion}</span>
            </div>
        </header>

        <!-- 요약 대시보드 -->
        <section class="summary-dashboard">
            <div class="summary-cards">
                <div class="summary-card ${data.currentReport.failed === 0 ? 'success' : 'warning'}">
                    <div class="card-icon">${data.currentReport.failed === 0 ? '✅' : '⚠️'}</div>
                    <div class="card-content">
                        <h3>테스트 결과</h3>
                        <div class="metric">${data.currentReport.passed}/${data.currentReport.totalTests}</div>
                        <div class="sub-metric">성공률 ${Math.round((data.currentReport.passed / data.currentReport.totalTests) * 100)}%</div>
                    </div>
                </div>
                
                <div class="summary-card info">
                    <div class="card-icon">⏱️</div>
                    <div class="card-content">
                        <h3>실행 시간</h3>
                        <div class="metric">${Math.round(data.currentReport.duration / 1000)}초</div>
                        <div class="sub-metric">${data.currentReport.duration}ms</div>
                    </div>
                </div>
                
                <div class="summary-card info">
                    <div class="card-icon">🧪</div>
                    <div class="card-content">
                        <h3>통합 기능</h3>
                        <div class="metric">Git + DB</div>
                        <div class="sub-metric">Phase 1 완료</div>
                    </div>
                </div>
            </div>
        </section>

        <!-- 테스트 결과 차트 -->
        <section class="chart-section">
            <div class="chart-container">
                <canvas id="testResultsChart" width="400" height="200"></canvas>
            </div>
            <div class="chart-container">
                <canvas id="performanceChart" width="400" height="200"></canvas>
            </div>
        </section>

        <!-- 상세 테스트 결과 -->
        <section class="detailed-results">
            <h2>📋 상세 테스트 결과</h2>
            <div class="test-results-table">
                ${this.generateTestResultsTable(data.currentReport.results)}
            </div>
        </section>

        <!-- 실패한 테스트 상세 -->
        ${data.currentReport.failed > 0 ? this.generateFailedTestsSection(data.currentReport.results) : ''}

        <!-- 네비게이션 링크 -->
        <section class="navigation-links">
            <h2>🔗 관련 리포트</h2>
            <div class="link-cards">
                <a href="windwalker-dashboard-latest.html" class="link-card">
                    <div class="link-icon">📈</div>
                    <div class="link-content">
                        <h3>히스토리 대시보드</h3>
                        <p>과거 테스트 결과 및 트렌드 분석</p>
                    </div>
                </a>
                
                <a href="module-screenshots/screenshot-gallery.html" class="link-card">
                    <div class="link-icon">📸</div>
                    <div class="link-content">
                        <h3>스크린샷 갤러리</h3>
                        <p>모듈별 시각적 테스트 결과</p>
                    </div>
                </a>
            </div>
        </section>
        
        <!-- 푸터 -->
        <footer class="dashboard-footer">
            <p>Generated by WindWalker Test Dashboard • ${data.currentReport.timestamp.toLocaleString()}</p>
        </footer>
    </div>

    <script src="assets/dashboard.js"></script>
    <script>
        // 차트 데이터 초기화
        const chartData = ${JSON.stringify({
                testResults: {
                    passed: data.currentReport.passed,
                    failed: data.currentReport.failed,
                    skipped: data.currentReport.skipped
                },
                performance: data.currentReport.results.map(r => ({
                    name: r.testName.split('_')[0],
                    duration: r.duration
                }))
            })};
        
        initializeCharts(chartData);
    </script>
</body>
</html>`;
            yield fs.writeFile(reportPath, html, 'utf8');
            console.log(`✅ Final report generated: ${reportPath}`);
            return reportPath;
        });
    }
    /**
     * 히스토리 대시보드 HTML 생성
     */
    generateHistoryDashboard(data) {
        return __awaiter(this, void 0, void 0, function* () {
            const dashboardPath = path.join(this.outputDir, 'windwalker-dashboard-latest.html');
            const html = `
<!DOCTYPE html>
<html lang="ko">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>WindWalker 히스토리 대시보드</title>
    <link rel="stylesheet" href="assets/dashboard.css">
    <script src="assets/chart.min.js"></script>
</head>
<body>
    <div class="dashboard-container">
        <header class="dashboard-header">
            <h1>📈 WindWalker 테스트 히스토리</h1>
            <nav class="header-nav">
                <a href="windwalker-final-report.html">← 최신 리포트</a>
                <a href="module-screenshots/screenshot-gallery.html">스크린샷 갤러리</a>
            </nav>
        </header>

        <!-- 트렌드 차트 -->
        <section class="trend-section">
            <h2>📊 테스트 트렌드</h2>
            <div class="chart-container-large">
                <canvas id="trendChart" width="800" height="300"></canvas>
            </div>
        </section>

        <!-- 히스토리 테이블 -->
        <section class="history-section">
            <h2>🗂️ 테스트 히스토리</h2>
            <div class="history-table">
                ${this.generateHistoryTable(data.historicalReports)}
            </div>
        </section>

        <!-- 성능 분석 -->
        <section class="performance-analysis">
            <h2>⚡ 성능 분석</h2>
            <div class="performance-metrics">
                ${this.generatePerformanceMetrics(data.historicalReports)}
            </div>
        </section>
    </div>

    <script src="assets/dashboard.js"></script>
    <script>
        const historyData = ${JSON.stringify(this.prepareHistoryChartData(data.historicalReports))};
        initializeHistoryCharts(historyData);
    </script>
</body>
</html>`;
            yield fs.writeFile(dashboardPath, html, 'utf8');
            console.log(`✅ History dashboard generated: ${dashboardPath}`);
            return dashboardPath;
        });
    }
    /**
     * 스크린샷 갤러리 HTML 생성
     */
    generateScreenshotGallery(data) {
        return __awaiter(this, void 0, void 0, function* () {
            const galleryDir = path.join(this.outputDir, 'module-screenshots');
            const galleryPath = path.join(galleryDir, 'screenshot-gallery.html');
            const html = `
<!DOCTYPE html>
<html lang="ko">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>WindWalker 스크린샷 갤러리</title>
    <link rel="stylesheet" href="../assets/dashboard.css">
    <link rel="stylesheet" href="../assets/gallery.css">
</head>
<body>
    <div class="gallery-container">
        <header class="gallery-header">
            <h1>📸 WindWalker 모듈 스크린샷</h1>
            <nav class="header-nav">
                <a href="../windwalker-final-report.html">← 최종 리포트</a>
                <a href="../windwalker-dashboard-latest.html">히스토리 대시보드</a>
            </nav>
        </header>

        <section class="screenshot-gallery">
            ${yield this.generateScreenshotGrid(data.screenshots || [])}
        </section>
    </div>

    <script src="../assets/gallery.js"></script>
</body>
</html>`;
            yield fs.writeFile(galleryPath, html, 'utf8');
            console.log(`✅ Screenshot gallery generated: ${galleryPath}`);
            return galleryPath;
        });
    }
    // === Helper Methods ===
    generateTestResultsTable(results) {
        return `
<table class="test-table">
    <thead>
        <tr>
            <th>상태</th>
            <th>테스트명</th>
            <th>시간</th>
            <th>세부사항</th>
        </tr>
    </thead>
    <tbody>
        ${results.map(result => `
        <tr class="${result.success ? 'success' : 'failed'}">
            <td class="status-cell">
                <span class="status-icon">${result.success ? '✅' : '❌'}</span>
            </td>
            <td class="test-name">${result.testName}</td>
            <td class="duration">${result.duration}ms</td>
            <td class="details">
                ${result.error ? `<span class="error">${result.error}</span>` : ''}
                ${result.details ? `<pre>${JSON.stringify(result.details, null, 2)}</pre>` : ''}
            </td>
        </tr>
        `).join('')}
    </tbody>
</table>`;
    }
    generateFailedTestsSection(results) {
        const failedTests = results.filter(r => !r.success);
        if (failedTests.length === 0)
            return '';
        return `
<section class="failed-tests">
    <h2>❌ 실패한 테스트 상세</h2>
    <div class="failed-tests-list">
        ${failedTests.map(test => `
        <div class="failed-test-item">
            <h3>${test.testName}</h3>
            <div class="error-details">
                <p><strong>오류:</strong> ${test.error}</p>
                <p><strong>시간:</strong> ${test.duration}ms</p>
                ${test.details ? `<pre class="test-details">${JSON.stringify(test.details, null, 2)}</pre>` : ''}
            </div>
        </div>
        `).join('')}
    </div>
</section>`;
    }
    generateHistoryTable(reports) {
        return `
<table class="history-table">
    <thead>
        <tr>
            <th>날짜</th>
            <th>총 테스트</th>
            <th>성공</th>
            <th>실패</th>
            <th>성공률</th>
            <th>실행시간</th>
        </tr>
    </thead>
    <tbody>
        ${reports.map(report => `
        <tr>
            <td>${report.timestamp.toLocaleString()}</td>
            <td>${report.totalTests}</td>
            <td class="success-count">${report.passed}</td>
            <td class="failed-count">${report.failed}</td>
            <td class="success-rate">${Math.round((report.passed / report.totalTests) * 100)}%</td>
            <td>${Math.round(report.duration / 1000)}초</td>
        </tr>
        `).join('')}
    </tbody>
</table>`;
    }
    generatePerformanceMetrics(reports) {
        if (reports.length === 0)
            return '<p>성능 데이터가 없습니다.</p>';
        const avgDuration = reports.reduce((sum, r) => sum + r.duration, 0) / reports.length;
        const avgSuccessRate = reports.reduce((sum, r) => sum + (r.passed / r.totalTests), 0) / reports.length;
        return `
<div class="metrics-grid">
    <div class="metric-card">
        <h3>평균 실행 시간</h3>
        <div class="metric-value">${Math.round(avgDuration / 1000)}초</div>
    </div>
    <div class="metric-card">
        <h3>평균 성공률</h3>
        <div class="metric-value">${Math.round(avgSuccessRate * 100)}%</div>
    </div>
    <div class="metric-card">
        <h3>총 실행 횟수</h3>
        <div class="metric-value">${reports.length}회</div>
    </div>
</div>`;
    }
    generateScreenshotGrid(screenshots) {
        return __awaiter(this, void 0, void 0, function* () {
            if (screenshots.length === 0) {
                return '<p class="no-screenshots">생성된 스크린샷이 없습니다.</p>';
            }
            return `
<div class="screenshot-grid">
    ${screenshots.map(screenshot => `
    <div class="screenshot-item">
        <img src="${screenshot}" alt="Module Screenshot" loading="lazy">
        <div class="screenshot-caption">${path.basename(screenshot, '.png')}</div>
    </div>
    `).join('')}
</div>`;
        });
    }
    generateModuleScreenshots(report) {
        return __awaiter(this, void 0, void 0, function* () {
            // 실제 구현에서는 WebView 스크린샷을 캡처
            // 현재는 더미 스크린샷 파일 생성
            const screenshots = [];
            const modules = ['ServiceRegistry', 'FeatureFlags', 'GitIntegration', 'ConversationDB'];
            for (const module of modules) {
                const screenshotPath = path.join('module-screenshots', `${module.toLowerCase()}-screenshot.png`);
                screenshots.push(screenshotPath);
                // 더미 이미지 파일 생성 (실제로는 WebView 캡처)
                const dummyImageData = yield this.generateDummyScreenshot(module);
                yield fs.writeFile(path.join(this.outputDir, screenshotPath), dummyImageData);
            }
            return screenshots;
        });
    }
    generateDummyScreenshot(moduleName) {
        return __awaiter(this, void 0, void 0, function* () {
            // SVG로 더미 스크린샷 생성
            const svg = `
<svg width="400" height="300" xmlns="http://www.w3.org/2000/svg">
    <rect width="100%" height="100%" fill="#f5f5f5"/>
    <rect x="10" y="10" width="380" height="40" fill="#007acc" rx="5"/>
    <text x="200" y="35" text-anchor="middle" fill="white" font-family="Arial" font-size="16">
        ${moduleName} Module
    </text>
    <rect x="20" y="70" width="360" height="200" fill="white" stroke="#ddd" rx="5"/>
    <text x="200" y="180" text-anchor="middle" fill="#666" font-family="Arial" font-size="14">
        Test Screenshot
    </text>
</svg>`;
            return Buffer.from(svg, 'utf8');
        });
    }
    generateAssets() {
        return __awaiter(this, void 0, void 0, function* () {
            const assetsDir = path.join(this.outputDir, 'assets');
            // CSS 파일 생성
            yield this.generateCSS(assetsDir);
            // JavaScript 파일 생성
            yield this.generateJS(assetsDir);
            // Chart.js 라이브러리 복사 (CDN 대신 로컬 복사)
            yield this.copyChartJS(assetsDir);
        });
    }
    generateCSS(assetsDir) {
        return __awaiter(this, void 0, void 0, function* () {
            const css = `
/* WindWalker Test Dashboard Styles */
:root {
    --primary-color: #007acc;
    --success-color: #28a745;
    --warning-color: #ffc107;
    --danger-color: #dc3545;
    --light-bg: #f8f9fa;
    --dark-text: #333;
}

body {
    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
    margin: 0;
    padding: 0;
    background-color: var(--light-bg);
    color: var(--dark-text);
}

.dashboard-container {
    max-width: 1200px;
    margin: 0 auto;
    padding: 20px;
}

.dashboard-header {
    text-align: center;
    margin-bottom: 30px;
    padding: 20px;
    background: white;
    border-radius: 8px;
    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.dashboard-header h1 {
    margin: 0;
    color: var(--primary-color);
}

.system-info {
    margin-top: 10px;
    font-size: 14px;
    color: #666;
}

.system-info span {
    margin: 0 10px;
}

.summary-cards {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
    gap: 20px;
    margin-bottom: 30px;
}

.summary-card {
    background: white;
    padding: 20px;
    border-radius: 8px;
    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    display: flex;
    align-items: center;
    gap: 15px;
}

.summary-card.success { border-left: 4px solid var(--success-color); }
.summary-card.warning { border-left: 4px solid var(--warning-color); }
.summary-card.info { border-left: 4px solid var(--primary-color); }

.card-icon {
    font-size: 2em;
}

.metric {
    font-size: 2em;
    font-weight: bold;
    margin: 5px 0;
}

.sub-metric {
    font-size: 0.9em;
    color: #666;
}

.chart-section {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 20px;
    margin-bottom: 30px;
}

.chart-container {
    background: white;
    padding: 20px;
    border-radius: 8px;
    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.test-table {
    width: 100%;
    border-collapse: collapse;
    background: white;
    border-radius: 8px;
    overflow: hidden;
    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.test-table th,
.test-table td {
    padding: 12px;
    text-align: left;
    border-bottom: 1px solid #ddd;
}

.test-table th {
    background: var(--primary-color);
    color: white;
}

.test-table tr.success {
    background: rgba(40, 167, 69, 0.1);
}

.test-table tr.failed {
    background: rgba(220, 53, 69, 0.1);
}

.navigation-links {
    margin: 30px 0;
}

.link-cards {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
    gap: 20px;
}

.link-card {
    display: flex;
    align-items: center;
    gap: 15px;
    padding: 20px;
    background: white;
    border-radius: 8px;
    text-decoration: none;
    color: inherit;
    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    transition: transform 0.2s;
}

.link-card:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 8px rgba(0,0,0,0.15);
}

.link-icon {
    font-size: 2em;
}

.dashboard-footer {
    text-align: center;
    margin-top: 40px;
    padding: 20px;
    color: #666;
    font-size: 14px;
}
`;
            yield fs.writeFile(path.join(assetsDir, 'dashboard.css'), css, 'utf8');
            // Gallery CSS
            const galleryCss = `
.gallery-container {
    max-width: 1400px;
    margin: 0 auto;
    padding: 20px;
}

.screenshot-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
    gap: 20px;
}

.screenshot-item {
    background: white;
    border-radius: 8px;
    overflow: hidden;
    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.screenshot-item img {
    width: 100%;
    height: 200px;
    object-fit: cover;
}

.screenshot-caption {
    padding: 15px;
    font-weight: bold;
    text-align: center;
    background: #f8f9fa;
}
`;
            yield fs.writeFile(path.join(assetsDir, 'gallery.css'), galleryCss, 'utf8');
        });
    }
    generateJS(assetsDir) {
        return __awaiter(this, void 0, void 0, function* () {
            const js = `
// WindWalker Dashboard JavaScript
function initializeCharts(data) {
    // Test Results Pie Chart
    const ctx1 = document.getElementById('testResultsChart').getContext('2d');
    new Chart(ctx1, {
        type: 'doughnut',
        data: {
            labels: ['성공', '실패', '건너뜀'],
            datasets: [{
                data: [data.testResults.passed, data.testResults.failed, data.testResults.skipped],
                backgroundColor: ['#28a745', '#dc3545', '#6c757d']
            }]
        },
        options: {
            responsive: true,
            plugins: {
                title: { display: true, text: '테스트 결과 분포' }
            }
        }
    });

    // Performance Bar Chart
    const ctx2 = document.getElementById('performanceChart').getContext('2d');
    new Chart(ctx2, {
        type: 'bar',
        data: {
            labels: data.performance.map(p => p.name),
            datasets: [{
                label: '실행 시간 (ms)',
                data: data.performance.map(p => p.duration),
                backgroundColor: '#007acc'
            }]
        },
        options: {
            responsive: true,
            plugins: {
                title: { display: true, text: '모듈별 성능' }
            }
        }
    });
}

function initializeHistoryCharts(data) {
    const ctx = document.getElementById('trendChart').getContext('2d');
    new Chart(ctx, {
        type: 'line',
        data: {
            labels: data.labels,
            datasets: [
                {
                    label: '성공률 (%)',
                    data: data.successRate,
                    borderColor: '#28a745',
                    backgroundColor: 'rgba(40, 167, 69, 0.1)',
                    tension: 0.4
                },
                {
                    label: '실행 시간 (초)',
                    data: data.duration,
                    borderColor: '#007acc',
                    backgroundColor: 'rgba(0, 122, 204, 0.1)',
                    tension: 0.4,
                    yAxisID: 'y1'
                }
            ]
        },
        options: {
            responsive: true,
            plugins: {
                title: { display: true, text: '테스트 트렌드 분석' }
            },
            scales: {
                y: {
                    type: 'linear',
                    display: true,
                    position: 'left',
                },
                y1: {
                    type: 'linear',
                    display: true,
                    position: 'right',
                    grid: {
                        drawOnChartArea: false,
                    },
                }
            }
        }
    });
}
`;
            yield fs.writeFile(path.join(assetsDir, 'dashboard.js'), js, 'utf8');
            // Gallery JavaScript
            const galleryJs = `
// Screenshot Gallery JavaScript
document.addEventListener('DOMContentLoaded', function() {
    const images = document.querySelectorAll('.screenshot-item img');
    
    images.forEach(img => {
        img.addEventListener('click', function() {
            openImageModal(this.src);
        });
    });
});

function openImageModal(src) {
    const modal = document.createElement('div');
    modal.className = 'image-modal';
    modal.innerHTML = \`
        <div class="modal-content">
            <span class="modal-close">&times;</span>
            <img src="\${src}" alt="Screenshot">
        </div>
    \`;
    
    document.body.appendChild(modal);
    
    modal.querySelector('.modal-close').addEventListener('click', function() {
        document.body.removeChild(modal);
    });
}
`;
            yield fs.writeFile(path.join(assetsDir, 'gallery.js'), galleryJs, 'utf8');
        });
    }
    copyChartJS(assetsDir) {
        return __awaiter(this, void 0, void 0, function* () {
            // 간단한 Chart.js 대안 (실제로는 CDN이나 npm에서 복사)
            const chartJS = `
// Minimal Chart.js implementation
class Chart {
    constructor(ctx, config) {
        this.ctx = ctx;
        this.config = config;
        this.render();
    }
    
    render() {
        // 간단한 차트 렌더링 구현
        const canvas = this.ctx.canvas;
        canvas.width = 400;
        canvas.height = 200;
        
        this.ctx.fillStyle = '#f0f0f0';
        this.ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        this.ctx.fillStyle = '#333';
        this.ctx.font = '16px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('Chart Placeholder', canvas.width/2, canvas.height/2);
    }
}

window.Chart = Chart;
`;
            yield fs.writeFile(path.join(assetsDir, 'chart.min.js'), chartJS, 'utf8');
        });
    }
    loadTestHistory() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const historyPath = path.join(this.outputDir, 'test-history.json');
                const historyData = yield fs.readFile(historyPath, 'utf8');
                const history = JSON.parse(historyData);
                return history.reports.slice(-this.config.maxHistoryEntries);
            }
            catch (_a) {
                return [];
            }
        });
    }
    saveTestHistory(currentReport) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const historyPath = path.join(this.outputDir, 'test-history.json');
                let history = { reports: [] };
                try {
                    const existing = yield fs.readFile(historyPath, 'utf8');
                    history = JSON.parse(existing);
                }
                catch ( /* 파일이 없으면 새로 생성 */_a) { /* 파일이 없으면 새로 생성 */ }
                history.reports.push(currentReport);
                // 최대 개수만 유지
                if (history.reports.length > this.config.maxHistoryEntries) {
                    history.reports = history.reports.slice(-this.config.maxHistoryEntries);
                }
                yield fs.writeFile(historyPath, JSON.stringify(history, null, 2), 'utf8');
            }
            catch (error) {
                console.warn('Failed to save test history:', error);
            }
        });
    }
    collectSystemInfo() {
        return __awaiter(this, void 0, void 0, function* () {
            return {
                extensionVersion: '1.0.0',
                vsCodeVersion: vscode.version,
                platform: process.platform,
                timestamp: new Date().toLocaleString()
            };
        });
    }
    prepareHistoryChartData(reports) {
        return {
            labels: reports.map(r => r.timestamp.toLocaleDateString()),
            successRate: reports.map(r => Math.round((r.passed / r.totalTests) * 100)),
            duration: reports.map(r => Math.round(r.duration / 1000))
        };
    }
}
exports.TestDashboard = TestDashboard;
//# sourceMappingURL=TestDashboard.js.map