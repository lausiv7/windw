# WindWalker Phase 3 빌드 및 프리뷰 테스트 시나리오

## 🎯 테스트 목표
Phase 3 구현에서 추가된 BuildManager 및 PreviewWebView 기능의 완전한 검증

## 📋 테스트 환경 설정

### 사전 준비
1. VS Code에서 WindWalker 프로젝트 폴더 열기
2. WindWalker Phase 3 확장 활성화 확인
3. 사이드바에서 WindWalker 패널 열기 (AI Chat + Preview 두 섹션 확인)
4. Docker 컨테이너 실행 확인 (http://localhost:3000 접근 가능)

## 🧪 테스트 시나리오

### 시나리오 1: Phase 3 기본 연결 테스트
```
입력: "hello"
예상 결과: 
- "Hello! WindWalker Phase 3가 정상적으로 작동하고 있습니다! 🚀"
- 파일, 빌드, 프리뷰 명령어 가이드 표시
```

### 시나리오 2: 프리뷰 WebView 초기화 테스트
```
확인사항:
- WindWalker 사이드바에 "Preview" 섹션이 표시됨
- Preview 섹션 클릭 시 프리뷰 화면 로드
- 프리뷰 헤더에 "🌐 http://localhost:3000" 표시
- "🔄 새로고침" 버튼 존재 확인
```

### 시나리오 3: 수동 빌드 테스트
```
입력: "빌드: npm run dev"
예상 결과:
- "🔨 빌드를 시작합니다..." 메시지
- "✅ 빌드 완료!" + 빌드 출력 정보
- 워크스페이스에 index.html 기본 템플릿 생성 확인
- 프리뷰 패널에서 자동 새로고침 발생
```

### 시나리오 4: 영어 빌드 명령어 테스트
```
입력: "build: start server"
예상 결과:
- 빌드 프로세스 정상 실행
- 서버 URL 정보 표시
```

### 시나리오 5: 프리뷰 새로고침 테스트
```
입력: "프리뷰: 새로고침"
예상 결과:
- "🔄 프리뷰가 새로고침되었습니다!" 메시지
- Preview WebView iframe 새로고침 확인
```

### 시나리오 6: 영어 프리뷰 명령어 테스트
```
입력: "preview: refresh"
예상 결과:
- 프리뷰 새로고침 정상 작동
```

### 시나리오 7: 파일 변경 → 자동 빌드 파이프라인 테스트
```
순서:
1. "파일 생성: test-auto.html, 내용: <h1>Auto Build Test</h1>"
2. 파일 변경 감지 확인 (Console 로그)
3. 자동 빌드 트리거 확인
4. 프리뷰 자동 새로고침 확인

예상 결과: 전체 파이프라인이 자동으로 작동
```

### 시나리오 8: 복합 워크플로우 테스트
```
순서:
1. "빌드: npm run dev" - 초기 빌드
2. "파일 생성: style.css, 내용: body { background: #f0f0f0; }"
3. "파일 수정: index.html, 내용: <!DOCTYPE html><html><head><link rel='stylesheet' href='style.css'></head><body><h1>Updated Project</h1></body></html>"
4. "프리뷰: 새로고침" - 수동 새로고침
5. 프리뷰에서 스타일 적용 확인

예상 결과: 각 단계별 정상 작동 및 최종 스타일 반영
```

### 시나리오 9: 빌드 중 중복 실행 방지 테스트
```
순서:
1. "빌드: npm run dev" 입력
2. 빌드 진행 중에 즉시 "빌드: npm run dev" 재입력

예상 결과:
- 첫 번째 빌드: 정상 진행
- 두 번째 빌드: "이미 빌드가 진행 중입니다." 메시지
```

### 시나리오 10: 파일 변경 감지 시스템 테스트
```
순서:
1. VS Code 파일 탐색기에서 워크스페이스 파일 직접 수정
2. Console에서 "[FileWatcher] File changed:" 로그 확인
3. "[BuildManager] Auto-build triggered" 로그 확인
4. 프리뷰 자동 업데이트 확인

예상 결과: VS Code 외부 파일 변경도 감지 및 자동 빌드
```

### 시나리오 11: Preview iframe 로드 테스트
```
확인사항:
- Preview WebView에서 http://localhost:3000 정상 로드
- WindWalker 기본 템플릿 화면 표시
- "Phase 3 빌드 및 프리뷰 시스템이 활성화되었습니다!" 메시지
- 실시간 시간 업데이트 확인
- 그라디언트 배경 및 카드 UI 정상 표시
```

### 시나리오 12: 오류 상황 처리 테스트
```
a) 워크스페이스 없이 빌드:
   - 워크스페이스 닫은 상태에서 "빌드: test"
   - "워크스페이스가 열려있지 않습니다." 메시지

b) 잘못된 빌드 명령어:
   - "빌드 잘못된 형식"
   - 적절한 안내 메시지

c) 프리뷰 없이 새로고침:
   - PreviewProvider 비활성화 상태에서 테스트
   - 적절한 오류 메시지
```

## 🔍 검증 포인트

### 기능적 검증
- [x] BuildManager 수동 빌드 기능
- [x] PreviewWebView 초기화 및 렌더링
- [x] 파일 변경 감지 시스템 (FileWatcher)
- [x] 자동 빌드 트리거 기능
- [x] 프리뷰 자동 새로고침
- [x] 한국어/영어 명령어 지원
- [x] 중복 빌드 방지
- [x] 적절한 오류 처리

### 기술적 검증
- [x] VS Code FileSystemWatcher API 활용
- [x] BuildManager 클래스 구현
- [x] PreviewWebViewProvider 클래스 구현
- [x] iframe 기반 프리뷰 시스템
- [x] 컴포넌트 간 메시지 통신 (Chat ↔ Build ↔ Preview)
- [x] Docker 프리뷰 서버 연동 (localhost:3000)
- [x] 자동 프로젝트 구조 생성
- [x] 기본 HTML 템플릿 생성

### 사용자 경험 검증
- [x] 직관적인 빌드/프리뷰 명령어
- [x] 실시간 피드백 (빌드 진행 상태)
- [x] 시각적 프리뷰 업데이트
- [x] 자동화된 워크플로우 (파일 변경 → 빌드 → 프리뷰)
- [x] 명확한 상태 메시지
- [x] 브라우저 스타일의 프리뷰 인터페이스

## 🚀 성능 및 안정성 테스트

### 성능 지표
- 빌드 시간: < 2초 (기본 템플릿)
- 프리뷰 새로고침: < 1초
- 파일 변경 감지: < 500ms
- 자동 빌드 트리거: < 1초

### 안정성 테스트
- 연속 파일 변경 처리
- 빌드 중 파일 변경 상황
- 프리뷰 서버 연결 실패 처리
- 대용량 파일 변경 감지

## 🔄 통합 테스트

### Phase 1-3 통합 검증
```
전체 워크플로우:
1. "hello" - Phase 3 정상 확인
2. "파일 생성: app.js, 내용: console.log('Phase 3 Test');" - Phase 2 기능
3. "빌드: npm run dev" - Phase 3 빌드 기능  
4. "프리뷰: 새로고침" - Phase 3 프리뷰 기능
5. "파일 수정: app.js, 내용: alert('Updated!');" - Phase 2 + 자동 빌드
6. 프리뷰에서 변경사항 확인 - 전체 파이프라인 검증

예상 결과: 모든 Phase가 유기적으로 연동되어 작동
```

## 📊 자동화 테스트 확장 계획

### Playwright E2E 테스트
```javascript
describe('WindWalker Phase 3 Build & Preview', () => {
  test('빌드 및 프리뷰 전체 플로우', async ({ page }) => {
    // 1. VS Code 접속 및 확장 로드
    // 2. AI Chat에서 빌드 명령 실행
    // 3. Preview WebView 로드 확인
    // 4. 파일 생성 후 자동 빌드 검증
    // 5. 프리뷰 업데이트 확인
  });
});
```

이 테스트 시나리오는 WindWalker Phase 3의 모든 기능을 체계적으로 검증하며, Phase 1-2와의 완벽한 통합을 보장합니다.