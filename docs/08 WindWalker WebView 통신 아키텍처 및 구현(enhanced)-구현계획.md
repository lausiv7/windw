# WindWalker 구현 계획서: WebView 통신 아키텍처

## 1. 🎯 구현 목표

이 문서는 `docs/07.WindWalker WebView 통신 아키텍처 및 구현(enhanced).md`에 정의된 **중앙 허브(Central Hub) 아키텍처**를 실제 코드로 구현하기 위한 구체적인 개발 계획과 절차를 정의합니다.

**최종 목표:** 사용자가 AI 채팅 패널에 요구사항을 입력하면, 확장이 이를 처리하여 코드를 수정하고, 그 결과가 실시간 프리뷰에 반영되는 완전한 E2E(End-to-End) 데이터 플로우를 완성합니다.

---

## 2. 📁 구현 대상 핵심 파일

우리의 아키텍처 구현은 `extensions/windwalker` 폴더 내의 파일들을 중심으로 진행됩니다.

### 2.1. Extension Core (핵심 로직)

```
extensions/windwalker/src/
├── extension.ts                    # ✅ 메인 진입점: 모든 모듈을 초기화하고 VS Code에 등록
├── core/
│   ├── MessageBridge.ts           # ✅ 통신 허브: WebView와 Extension 간의 모든 메시지 중계
│   ├── WebViewManager.ts          # ✅ WebView 생성 및 관리
│   ├── FileManager.ts             # ✅ 파일 시스템 조작 (읽기, 쓰기)
│   └── BuildManager.ts            # ✅ npm 빌드 및 개발 서버 실행 관리
├── providers/
│   ├── ChatWebViewProvider.ts     # ✅ AI 채팅 WebView 패널 제공
│   └── PreviewWebViewProvider.ts  # ✅ 프리뷰 WebView 패널 제공
└── services/
    ├── CodeGenerationService.ts   # ✅ LLM 응답을 실제 코드로 변환하는 로직
    └── RAGService.ts              # ✅ RAG/LLM API 호출 클라이언트
```

### 2.2. WebView UI (사용자 인터페이스)

```
extensions/windwalker/webview/
├── chat/
│   ├── index.html                 # ✅ 채팅 UI의 기본 HTML 구조
│   ├── script.js                  # ✅ 채팅 UI 로직 (메시지 송수신 및 렌더링)
│   └── style.css                  # ✅ 채팅 UI 스타일
└── preview/
    ├── index.html                 # ✅ 프리뷰 UI (iframe 래퍼)
    └── script.js                  # ✅ 프리뷰 로직 (URL 로드 및 새로고침)
```

### 2.3. Configuration (확장 설정)

```
extensions/windwalker/
├── package.json                   # ✅ 확장 정보, 명령어, UI(View) 기여점 정의
└── tsconfig.json                  # ✅ TypeScript 컴파일 설정
```

---

## 3. 🚀 구현 순서 및 로드맵

`docs/07` 문서에서 정의한 우선순위에 따라 구현을 진행합니다.

### **Phase 1: 기본 통신 아키텍처 확립 (가장 중요)**
*   **기간:** 3일
*   **목표:** 확장과 채팅 웹뷰 간에 기본적인 메시지를 성공적으로 주고받는다.
*   **작업 내용:**
    1.  **[Task 1.1]** `extension.ts`: `ChatWebViewProvider`를 초기화하고 `vscode.window.registerWebviewViewProvider`를 통해 VS Code에 등록합니다.
    2.  **[Task 1.2]** `ChatWebViewProvider.ts`: `resolveWebviewView` 메서드 내에서 `webview/chat/index.html`을 로드하도록 구현합니다.
    3.  **[Task 1.3]** `webview/chat/script.js`: UI가 로드되면 `vscode.postMessage({ type: 'chat:ready' })`를 통해 확장에 준비 완료 메시지를 보냅니다.
    4.  **[Task 1.4]** `ChatWebViewProvider.ts`: `chat:ready` 메시지를 수신하면, `webview.postMessage({ type: 'system:info', data: 'Welcome!' })` 같은 응답 메시지를 보내 웹뷰에 표시되는지 **핵심 통신 루프를 검증**합니다.

### **Phase 2: 파일 시스템 연동**
*   **기간:** 2일
*   **목표:** 웹뷰에서 보낸 요청으로 실제 워크스페이스의 파일을 생성/수정한다.
*   **작업 내용:**
    1.  **[Task 2.1]** `FileManager.ts`: VS Code의 `vscode.workspace.fs` API를 사용하여 파일을 읽고 쓰는 기본 메서드(`readFile`, `writeFile`)를 구현합니다.
    2.  **[Task 2.2]** `MessageBridge.ts`: `code:generate`와 같은 메시지를 수신했을 때, `FileManager`의 메서드를 호출하도록 연결합니다.
    3.  **[Task 2.3]** 채팅 웹뷰에서 "파일 생성: test.txt, 내용: hello" 와 같은 특정 명령어를 전송하여 실제 파일이 생성되는지 테스트합니다.

### **Phase 3: 빌드 및 프리뷰 연동**
*   **기간:** 3일
*   **목표:** 파일 변경이 감지되면 자동으로 빌드를 실행하고, 그 결과를 프리뷰 패널에 표시한다.
*   **작업 내용:**
    1.  **[Task 3.1]** `BuildManager.ts`: VS Code의 `vscode.tasks.executeTask` API를 사용하여 `package.json`에 정의된 `npm run dev` 스크립트를 실행하는 로직을 구현합니다.
    2.  **[Task 3.2]** `PreviewWebViewProvider.ts`: `localhost:9003` 같은 개발 서버 주소를 로드하는 `iframe`을 포함한 HTML을 제공합니다.
    3.  **[Task 3.3]** `FileManager`에서 파일 저장이 완료된 후 `BuildManager`를 호출하고, 빌드가 완료되면 `PreviewWebViewProvider`에 `preview:reload` 메시지를 보내 `iframe`을 새로고침하는 흐름을 완성합니다.

### **Phase 4: AI 서비스 연동 (간소화)**
*   **기간:** 2일
*   **목표:** 간소화된 LLM API 연동을 통해 기본 AI 채팅 기능을 구현한다.
*   **작업 내용:**
    1.  **[Task 4.1]** `LLMService.ts`: 직접 LLM API 서버(OpenAI/Claude 등)를 호출하는 `fetch` 로직을 구현합니다.
    2.  **[Task 4.2]** `CodeGenerationService.ts`: LLM 응답을 실제 파일에 적용할 수 있는 형태로 가공합니다.
    3.  **[Task 4.3]** **기본 플로우 연결:** **채팅 입력 → `LLMService` API 호출 → `CodeGenerationService` 코드 가공 → `FileManager`로 파일 수정 → `BuildManager`로 자동 빌드 → `PreviewWebView` 자동 새로고침**의 E2E 테스트를 완료합니다.

*   **구현 예정 (향후):**
    -   `RAGService.ts`: Meilisearch + 백엔드 RAG API 서버 연동
    -   @Codebase 명령어 구현
    -   코드베이스 컨텍스트 분석 기능
    -   고급 코드 생성 및 리팩토링 기능

### **Phase 5: 프로토타이핑 모드 구현 (Next.js 웹앱)**
*   **기간:** 3일
*   **목표:** Next.js 웹사이트에서 AI 채팅패널과 프리뷰가 동작하는 프로토타이핑 모드를 구현한다.
*   **작업 내용:**
    1.  **[Task 5.1]** `src/components/PrototypingView.tsx`: 메인 레이아웃 컴포넌트 구현 (좌측 AI 채팅, 우측 프리뷰 2단 구조)
    2.  **[Task 5.2]** `src/components/AIChatPanel.tsx`: Next.js 환경용 AI 채팅 컴포넌트 구현
    3.  **[Task 5.3]** `src/components/PreviewPanel.tsx`: Next.js 환경용 프리뷰 컴포넌트 구현 (iframe을 통한 개발서버 로드)
    4.  **[Task 5.4]** `src/app/api/chat/route.ts`: AI API 연동을 위한 Next.js API Route 구현
    5.  **[Task 5.5]** `src/app/api/build/route.ts`: 빌드 트리거 및 상태 관리 API Route 구현
    6.  **[Task 5.6]** **전체 플로우 테스트:** 웹 환경에서 **채팅 입력 → API Route → 파일 수정 → 빌드 → 프리뷰 업데이트** 전체 흐름 검증

---

## 4. 🔑 핵심 성공 요인

1.  **`07`번 아키텍처 문서 준수:** 이 계획은 `07`번 문서를 완벽하게 구현하는 것을 전제로 합니다. 모든 코드 작성은 해당 문서의 설계와 데이터 흐름을 따라야 합니다.
2.  **단계별 검증:** 각 Phase가 끝날 때마다 해당 기능이 완벽하게 동작하는 것을 확인하고 다음 단계로 넘어갑니다. 특히 **Phase 1의 기본 통신 루프 검증**이 가장 중요합니다.
3.  **역할과 책임의 명확성:** 각 클래스(`Provider`, `Manager`)는 `07`번 문서에 정의된 자신의 역할에만 집중하여 코드의 응집도를 높이고 결합도를 낮춥니다.

이 구현 계획을 차례대로 따르면, 우리는 체계적이고 안정적으로 WindWalker의 핵심 아키텍처를 완성할 수 있을 것입니다.