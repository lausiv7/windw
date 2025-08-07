🔍 Git vs IndexedDB 역할 구분

  📁 Git 저장소 - 소스코드 버전 관리

  flowchart TD
      A[👤 사용자: "헤더를 파란색으로 바꿔줘"] --> B[🤖 AI 코드 생성]
      B --> C[📄 style.css 파일 수정]
      C --> D[📊 Git Commit 생성]
      D --> E["git commit -m 'AI: 헤더 파란색으로 변경'"]

      subgraph "Git에 저장되는 것들"
          F[📄 HTML 파일들]
          G[🎨 CSS 파일들]
          H[⚙️ JavaScript 파일들]
          I[📦 package.json]
          J[🖼️ 이미지 파일들]
      end

      E --> F
      E --> G
      E --> H
      E --> I
      E --> J

      style D fill:#e1f5fe
      style E fill:#c8e6c9

  💾 IndexedDB - 대화 내용 및 메타데이터 저장

  flowchart TD
      A[👤 사용자: "헤더를 파란색으로 바꿔줘"] --> B[💾 IndexedDB에 대화 저장]

      subgraph "IndexedDB에 저장되는 것들"
          C[💬 대화 내용<br/>"헤더를 파란색으로..."]
          D[🤖 AI 응답<br/>"파란색 헤더로 변경했습니다"]
          E[⏰ 타임스탬프<br/>2025-08-05 14:30:22]
          F[🔗 Git 커밋 해시<br/>abc123...]
          G[👤 사용자 선호도<br/>파란색 선호, 미니멀 스타일]
          H[📊 대화 컨텍스트<br/>이전 요청들과의 연관성]
      end

      B --> C
      B --> D
      B --> E
      B --> F
      B --> G
      B --> H

      style B fill:#fff3e0
      style G fill:#f3e5f5

  🔄 두 시스템의 연결 관계

  sequenceDiagram
      participant User as 👤 사용자
      participant Chat as 💬 AI 채팅
      participant IndexedDB as 💾 IndexedDB
      participant AI as 🤖 AI 엔진
      participant Files as 📁 파일 시스템
      participant Git as 📊 Git 저장소

      User->>Chat: "버튼을 더 크게 만들어줘"

      Note over Chat,IndexedDB: 1. 대화 내용 저장
      Chat->>IndexedDB: 사용자 메시지 저장

      Note over Chat,AI: 2. AI 처리
      Chat->>AI: 메시지 분석 및 코드 생성
      AI-->>Chat: CSS 코드 생성

      Note over Chat,IndexedDB: 3. AI 응답 저장
      Chat->>IndexedDB: AI 응답 + 생성 코드 저장

      Note over Files,Git: 4. 소스코드 변경
      Chat->>Files: CSS 파일 업데이트
      Files->>Git: Git 커밋 생성
      Git-->>IndexedDB: 커밋 해시 반환

      Note over IndexedDB: 5. 연결 정보 저장
      IndexedDB->>IndexedDB: 대화 ↔ Git 커밋 연결 저장

      Chat-->>User: "버튼 크기가 변경되었습니다!"

  💡 왜 이렇게 분리하는가?

  🎯 Git의 장점 (소스코드용)

  - ✅ 버전 관리: 코드 변경 이력 추적
  - ✅ 협업: 여러 개발자와 코드 공유
  - ✅ 되돌리기: 특정 시점으로 코드 복구
  - ✅ 브랜치: 실험적 변경사항 분리
  - ✅ 배포: CI/CD 시스템과 연동

  🎯 IndexedDB의 장점 (대화 내용용)

  - ✅ 빠른 검색: 대화 내용 실시간 검색
  - ✅ 개인화: 사용자별 선호도 학습
  - ✅ 오프라인: 인터넷 없어도 이전 대화 확인
  - ✅ 컨텍스트: 이전 대화와의 연관성 추적
  - ✅ 패턴 분석: 사용자 행동 패턴 추출

  📊 실제 데이터 구조 예시

  Git 커밋 메시지

  commit abc123def456...
  Author: WindWalker AI <ai@windwalker.dev>
  Date: Mon Aug 5 14:30:22 2025 +0900

  AI: 버튼 크기를 24px로 증가

  Conversation-ID: conv_20250805_143022
  Generated-By: AI-Workflow-Engine
  Files-Modified: src/style.css
  User-Request: "버튼을 더 크게 만들어줘"

  IndexedDB 레코드

  {
    conversationId: "conv_20250805_143022",
    messages: [
      {
        id: "msg_001",
        sender: "user",
        content: "버튼을 더 크게 만들어줘",
        timestamp: "2025-08-05T14:30:22.123Z"
      },
      {
        id: "msg_002",
        sender: "ai",
        content: "버튼 크기를 24px로 변경했습니다!",
        timestamp: "2025-08-05T14:30:25.456Z",
        gitCommitHash: "abc123def456...",
        generatedCode: "button { font-size: 24px; padding: 12px 24px; }",
        confidence: 0.95
      }
    ],
    userPreferences: {
      preferredColors: ["blue", "green"],
      designStyle: "modern",
      buttonSizes: "large"
    },
    sessionMetadata: {
      projectType: "e-commerce",
      templateUsed: "minimal-shop",
      totalChanges: 15
    }
  }

  🔄 연결 관계의 활용 방안

  1. 🔙 특정 대화로 되돌리기
    - IndexedDB에서 대화 찾기 → Git 커밋 해시 확인 → git reset --hard {hash}
  2. 📈 개인화 서비스
    - IndexedDB의 사용자 선호도 → AI가 맞춤형 제안 생성
  3. 🧠 패턴 기반 추천
    - IndexedDB의 대화 패턴 분석 → 다음에 할 만한 작업 미리 제안
  4. 📊 프로젝트 히스토리
    - Git 커밋 + IndexedDB 대화 → 완전한 프로젝트 스토리 재구성

  이렇게 Git은 결과물(코드), **IndexedDB는 과정(대화)**을 저장해서 완벽한 AI 개발
  히스토리를 만드는 거죠!