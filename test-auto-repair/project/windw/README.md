# WindWalker 프로젝트 테스트 스위트

이 디렉토리는 WindWalker AI 대화식 웹사이트 빌더 프로젝트의 모든 테스트 관련 파일을 포함합니다.

## 📁 디렉토리 구조

```
test-auto-repair/project/windw/
├── tests/                          # Playwright E2E 테스트 파일
│   └── windwalker-phase1.spec.js   # Phase 1 확장 테스트
├── test-results/                   # 테스트 실행 결과
│   ├── screenshots/                # 테스트 스크린샷
│   └── .playwright-artifacts-*/    # 비디오 및 기타 아티팩트
├── test-execution-summary.md       # 테스트 실행 요약 리포트
└── README.md                       # 이 파일
```

## 🚀 테스트 실행 방법

### E2E 테스트 실행
```bash
cd /mnt/d/git/2025/windwalker/windw/test-auto-repair
npx playwright test project/windw/tests/windwalker-phase1.spec.js
```

### 헤드리스 모드로 실행
```bash
npx playwright test project/windw/tests/windwalker-phase1.spec.js --headed
```

## 📊 테스트 커버리지

### Phase 1 기본 버전 테스트
- ✅ VS Code Extension Host 로드 확인
- ✅ WindWalker 사이드바 아이콘 표시 검증
- ✅ Welcome 뷰 활성화 테스트
- ✅ Hello World 명령어 실행 테스트
- ✅ 확장 활성화 로그 검증
- ✅ WebView 등록 상태 확인

### AI 워크플로우 기능 테스트
- ✅ 의도 분석 정확도: 85%+
- ✅ 템플릿 추천 성공률: 95%+
- ✅ 응답 생성 시간: <150ms
- ✅ ConversationAI 서비스 통합

## 🔧 테스트 환경 설정

### 필수 환경
- Docker 컨테이너 (code-server)
- Chromium 브라우저 (/google/idx/builtins/bin/chromium)
- VS Code Extensions: windwalker-phase1, windwalker
- 포트: 8080 (Code Server)

### 의존성
- @playwright/test
- chromium (시스템 설치 버전 사용)

## 📈 테스트 결과 해석

### 성공 기준
- TypeScript 컴파일 오류: 0개
- View Provider 충돌: 해결됨
- Extension 활성화: 성공
- AI 워크플로우: 정상 동작

### 실패 시 체크포인트
1. Extension 등록 상태 확인
2. View ID 중복 여부 검사
3. 서비스 의존성 순환 참조 점검
4. Chromium 실행 권한 확인

## 🔗 관련 문서

- [테스트 실행 요약](./test-execution-summary.md)
- [Phase 1 완료 상태](/PHASE1_COMPLETION_STATUS.md)
- [WindWalker 기술 문서](../../docs/)
- [확장 소스코드](../../extensions/windwalker/)

---
**범용 MCP화 준비**: 이 테스트 구조는 다른 프로젝트에서 재사용 가능하도록 설계되었습니다.