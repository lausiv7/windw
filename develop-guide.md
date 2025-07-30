# WindWalker IDE 개발일지

## 날짜: 2025-07-26

### 목표
Firebase Studio (Nix 환경) 내에서 Next.js 애플리케이션을 통해 `code-server` (VS Code Web)를 안정적으로 실행하고 iframe으로 통합한다.

---

### 주요 문제 및 해결 과정

#### 1. 포트 충돌 (EADDRINUSE)
- **문제**: Next.js 개발 서버 실행 시 `9002`, `9003` 포트가 이미 사용 중이라는 `EADDRINUSE` 오류가 간헐적으로 발생. `lsof` 명령으로는 해당 포트를 사용하는 프로세스가 확인되지 않음.
- **추정 원인**: Firebase Studio의 특수한 네트워크 환경 또는 내부적으로 예약된 포트로 인한 충돌.
- **해결**: 충돌 가능성이 낮은 `9003` 포트를 Next.js 개발 서버의 기본 포트로 `package.json`에 명시.

#### 2. 프록시 연결 거부 (ECONNREFUSED)
- **문제**: Next.js 앱에서 `/ide` 경로 접근 시 "Internal Server Error" 발생. 터미널 로그에 `Failed to proxy http://localhost:8080 Error: connect ECONNREFUSED` 메시지 확인.
- **원인**: Next.js의 `rewrites` 프록시 기능이 `code-server`로 요청을 전달하려 했으나, `code-server`가 정상적으로 실행되지 않아 연결이 거부됨.
- **과정**:
    - `start-windwalker.sh` 스크립트에서 `code-server`와 `next dev`의 실행 순서를 보장하기 위해 `sleep`을 추가했으나 실패.
    - 두 프로세스를 분리하여 별도의 터미널에서 실행하는 방식으로 전환하여 문제의 원인이 `code-server` 실행 실패임을 특정.

#### 3. `code-server` 실행 실패
- **문제**: `./start-windwalker.sh` 스크립트로 `code-server` 실행 시, 즉시 종료되는 현상 발생.
- **로그**: `Trying to open in existing instance`, `got message from Code {"message":"null"}`, `Please specify at least one file or folder` 등의 오류 메시지를 통해 원인 분석.
- **최종 원인**: Firebase Studio의 Nix 환경에서 `code-server`가 "이미 실행 중인 인스턴스에서 열기"를 시도하는 내부 IPC(프로세스 간 통신) 메커니즘과 충돌하여 새 서버를 시작하지 못하고 비정상적으로 종료됨.
- **최종 해결**:
    1. `code-server`와 `next dev`를 **두 개의 개별 터미널에서 각각 실행**하여 프로세스를 완전히 분리.
    2. `code-server` 실행 시 충돌 가능성이 있는 `8080` 포트 대신 **`8081` 포트**를 사용.
    3. `iframe`에서 `code-server` 로드 시 발생하는 `X-Frame-Options` 문제를 해결하기 위해 `--auth none` 플래그 추가.
    4. 명시적으로 작업 공간의 절대 경로(`~/studio`)를 지정하여 실행.

---

### 최종 실행 명령어

- **터미널 1: Code Server 실행**
  ```bash
  code-server --bind-addr 0.0.0.0:8081 --auth none ~/studio
  ```

- **터미널 2: Next.js 개발 서버 실행**
  ```bash
  npm run dev
  ```

### 결론
Firebase Studio의 Nix 환경은 표준 리눅스 환경과 다른 내부 동작(특히 네트워크 및 프로세스 통신)을 가지고 있어, `code-server`와 같은 복잡한 애플리케이션을 스크립트로 동시에 실행할 때 예측하지 못한 문제가 발생했다. 각 서버를 독립적으로 실행하고, 충돌 가능성이 없는 포트를 사용하며, `code-server`의 옵션을 명시적으로 설정함으로써 문제를 해결할 수 있었다. 이 과정은 향후 환경 설정 및 디버깅에 중요한 참고 자료가 될 것이다.

Firebase Studio용 WindWalker 설정 가이드(최초해볼것).md 문서를 보고, 참조해서 한땀한땀 테스트하면서 설치 및 실행해볼 것. 서버마다 환경설정이 달라서, 보통 해보면 거의 에러가 발생한다. 차근차근 설치하면 된다.

## 날짜: 2025-07-27

### 목표
WindWalker VS Code 확장의 기본 구조를 설정하고, `code-server`가 확장을 정상적으로 로드하여 하단 패널에 'AI Assistant'와 'Live Preview'를 표시하도록 한다.

---

### 아키텍처: VS Code 확장의 컴파일 및 로드 과정

VS Code 확장은 TypeScript로 개발되지만, 실제 실행 환경인 `code-server`는 JavaScript를 실행합니다. 따라서 다음과 같은 과정이 필수적입니다.

1.  **확장 설계 (`package.json`):** 확장의 이름, 버전, 그리고 가장 중요하게 '어떤 UI를 어디에 추가할 것인지'(`contributes` 속성)를 정의합니다.
2.  **컴파일 (`.ts` → `.js`):** TypeScript 컴파일러(`tsc`)가 `tsconfig.json` 설정에 따라 `src` 폴더의 모든 `.ts` 파일을 JavaScript로 변환하여 `out` 폴더에 저장합니다.
3.  **로드 및 실행:** `code-server`는 시작 시 `--extensions-dir` 경로를 스캔하여 유효한 확장(`package.json`과 컴파일된 `out/extension.js`가 있는 폴더)을 찾아 로드하고 실행합니다.

```mermaid
graph TD
    subgraph "개발 단계"
        A[TS 소스 코드<br/>(extensions/windwalker/src)] -- `tsc` 컴파일 --> B[JS 실행 파일<br/>(extensions/windwalker/out)]
        C[확장 설계도<br/>(extensions/windwalker/package.json)]
    end
    
    subgraph "실행 단계"
        D[code-server] -- 시작 시 스캔 --> E[확장 폴더<br/>(~/.local/share/code-server/extensions)]
        E -- 로드 --> F[WindWalker 확장]
        F -- `package.json`의 `contributes` 참조 --> G[VS Code UI에 패널 추가]
        F -- `out/extension.js` 실행 --> H[확장 기능 활성화]
    end

    B -- "설치 (수동 또는 스크립트)" --> E
    C -- "설치 (수동 또는 스크립트)" --> E
```

### 주요 작업 내용

-   **`extensions/windwalker/src/`:** `docs/06` 문서에 명시된 모든 `core`, `providers`, `services` 폴더와 TypeScript 파일의 기본 골격(Placeholder)을 생성했습니다.
-   **`extensions/windwalker/out/extension.js`:** `src/extension.ts`의 컴파일된 결과물을 미리 생성하여 `out` 폴더에 배치했습니다. 이를 통해 `npm run compile` 명령을 직접 실행하지 않아도 `code-server`가 확장을 인식할 수 있도록 했습니다.
-   **`develop-guide.md`:** 현재 진행 중인 이 컴파일 및 로드 과정에 대한 설명을 개발 일지에 추가하여, 왜 이 과정이 필수적인지를 명확히 기록했습니다.

### 다음 단계
- `code-server`를 재시작하여 하단 패널에 'AI Assistant'와 'Live Preview' 탭이 정상적으로 나타나는지 확인합니다.
- 탭이 보인다면, `PreviewProvider.ts`를 구현하여 'Live Preview' 패널에 실제 `iframe`을 렌더링하는 작업을 진행합니다.

---

## 날짜: 2025-07-30

### WindWalker Phase 2-3 구현 완료 및 구현 계획 업데이트

#### 주요 성과
- ✅ **Phase 2 완료**: MessageBridge 기반 파일시스템 통합 (FileManager, BuildManager, ChatWebViewProvider)
- ✅ **GitHub 푸시 성공**: 외부 저장소 https://github.com/lausiv7/windw 에 Phase 2 구현 완료
- 🔄 **Phase 3 진행중**: PreviewWebViewProvider 구현 시작

#### 구현 계획 문서 업데이트
- **08 구현계획 문서 업데이트**: 
  - Phase 4 간소화: RAG → 단순 LLM API 연동으로 변경
  - **Phase 5 추가**: Next.js 프로토타이핑 모드 구현 계획 추가
  - RAG 고급 기능들은 "구현 예정" 상태로 표시

- **헌법 문서 업데이트**:
  - 개발 로드맵 재정리: Phase 3 (현재), Phase 4-5 (계획), Phase 6 RAG (향후 구현 예정)
  - 인증 시스템 이후 RAG 구현 일정으로 조정

#### 현재 작업 상황
- **PreviewWebViewProvider.ts**: VS Code 확장용 프리뷰 WebView 구현 완료
- **다음 작업**: webview/preview/ 폴더의 script.js, style.css 구현
- **목표**: Phase 3 완료 후 자동 수리 루프로 검증

#### 헌법 준수 사항 확인
- ✅ 문서 수정 시 기존 내용 보존 (삭제 대신 "구현 예정" 표시)
- ✅ 헌법 기준 MessageBridge 아키텍처 준수
- ✅ 명시적 의도 주석 작성 (`[의도]`, `[책임]` 형식)
- ✅ 개발일지 및 헌법 문서 동시 업데이트

#### 기술적 세부사항
- PreviewWebViewProvider: localhost:9003 iframe 로드, 자동 새로고침 지원
- 프리뷰 상태 확인 기능 (fetch HEAD 요청)
- URL 변경 및 수동 새로고침 UI 포함
- CSP 설정으로 보안 강화 (`frame-src http: https:`)
```
