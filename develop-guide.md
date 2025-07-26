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
