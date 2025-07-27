
# WindWalker 통합 아키텍처: 코드/프로토타이핑 모드 공통화

## 1. 개요

이 문서는 WindWalker IDE의 두 가지 핵심 모드인 **코드 모드(VS Code 확장)**와 **프로토타이PING 모드(웹)**에서 AI 채팅 패널과 프리뷰 패널의 UI를 어떻게 효율적으로 재사용할 것인지에 대한 아키텍처 설계를 정의합니다.

**핵심 목표:** UI 로직은 한 번만 작성하고, 각 모드의 특성에 맞는 데이터 및 로직(Controller)만 별도로 구현하여 코드 재사용성을 극대화하고 일관된 사용자 경험을 제공합니다.

---

## 2. 통합 아키텍처 구조

두 모드는 **공통 UI 라이브러리**를 공유하며, 각 모드는 자신의 환경에 맞는 '어댑터(Adapter)'를 통해 UI와 상호작용합니다.

```mermaid
graph TD
    subgraph "사용자 인터페이스 (공통 UI 라이브러리 - React)"
        A[<b>AI 채팅 패널 UI</b><br/>(입력창, 메시지 목록 등)]
        B[<b>프리뷰 패널 UI</b><br/>(Iframe 래퍼, 디바이스 컨트롤 등)]
    end

    subgraph "모드별 실행 환경"
        subgraph "<b>코드 모드 (VS Code 확장)</b>"
            C1[VS Code 확장 어댑터] --> A
            C2[VS Code 확장 어댑터] --> B
            C1 -- VS Code API --> D[파일 시스템, 터미널, RAG API]
        end
        subgraph "<b>프로토타이핑 모드 (Next.js 웹앱)</b>"
            E1[Next.js 웹 어댑터] --> A
            E2[Next.js 웹 어댑터] --> B
            E1 -- Next.js API Routes --> D
        end
    end

    D -- 데이터 흐름 --> C1
    D -- 데이터 흐름 --> E1

    style A fill:#D6EAF8
    style B fill:#D6EAF8
```

-   **공통 UI 라이브러리:** 순수한 React 컴포넌트로 구성되며, 상태나 비즈니스 로직을 갖지 않고 오직 `props`를 통해 데이터를 받아 UI를 렌더링하고, 콜백 함수(`onSendMessage` 등)를 통해 사용자 이벤트를 상위로 전달하는 역할만 합니다.
-   **어댑터(Adapter):** 각 모드의 "두뇌"에 해당합니다.
    -   **VS Code 확장 어댑터:** VS Code의 API를 사용하여 파일 시스템에 접근하거나, 터미널 명령을 실행하고, 그 결과를 공통 UI 컴포넌트에 `props`로 전달합니다.
    -   **Next.js 웹 어댑터:** Next.js의 API 라우트를 호출하여 서버와 통신하고, `useState`, `useEffect` 같은 React 훅을 사용해 상태를 관리하며 UI 컴포넌트에 `props`를 전달합니다.

---

## 3. 공통 UI 라이브러리 프로젝트 구조 (Monorepo)

프로젝트 루트에 `packages` 디렉토리를 생성하여 모노레포 구조로 전환하는 것을 제안합니다.

```
windwalker/
├── packages/
│   └── ui-core/                  # 🔵 공통 UI 라이브러리
│       ├── package.json
│       ├── src/
│       │   ├── components/
│       │   │   ├── AIChatPanel.tsx
│       │   │   └── PreviewPanel.tsx
│       │   └── index.ts          # 컴포넌트 export
│       └── tsconfig.json
│
├── src/                          # Next.js 앱 (프로토타이핑 모드)
│   ├── app/
│   └── components/
│       └── PrototypingView.tsx     # 웹 어댑터 역할
│
├── extensions/                   # VS Code 확장 (코드 모드)
│   ├── windwalker-ext/
│   │   ├── package.json
│   │   └── src/
│   │       └── AIChatViewProvider.ts # 확장 어댑터 역할
│   └── ...
│
└── package.json                  # 루트 package.json (workspaces 설정)
```

-   `packages/ui-core`: AI 채팅, 프리뷰 패널 등 재사용 가능한 모든 UI 컴포넌트가 위치합니다.
-   Next.js 앱과 VS Code 확장은 모두 `package.json`을 통해 `ui-core` 패키지를 의존성으로 추가합니다.

---

## 4. 핵심 구현 코드 예시

### 4.1. 공통 UI 컴포넌트 (`packages/ui-core/src/components/AIChatPanel.tsx`)

```tsx
// [의도] AI 채팅 UI를 렌더링하고 사용자 입력을 상위로 전달합니다.
// [책임] 상태 관리나 API 호출을 하지 않고, 순수하게 UI 표현에만 집중합니다.

import React from 'react';

// 메시지 타입 정의
export interface ChatMessage {
  sender: 'user' | 'ai' | 'system';
  content: string;
}

// 컴포넌트 Props 정의
export interface AIChatPanelProps {
  messages: ChatMessage[];
  onSendMessage: (message: string) => void;
  isLoading: boolean;
}

export const AIChatPanel: React.FC<AIChatPanelProps> = ({ messages, onSendMessage, isLoading }) => {
  const [inputValue, setInputValue] = React.useState('');

  const handleSend = () => {
    if (inputValue.trim()) {
      onSendMessage(inputValue);
      setInputValue('');
    }
  };

  return (
    <div>
      <div className="message-list">
        {messages.map((msg, index) => (
          <div key={index} className={`message ${msg.sender}`}>
            {msg.content}
          </div>
        ))}
        {isLoading && <div className="message system">AI가 생각 중...</div>}
      </div>
      <div className="input-area">
        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          disabled={isLoading}
        />
        <button onClick={handleSend} disabled={isLoading}>전송</button>
      </div>
    </div>
  );
};
```

### 4.2. 프로토타이핑 모드 어댑터 (`src/components/PrototypingView.tsx`)

```tsx
// [의도] 웹 환경에서 AI 채팅 패널을 사용합니다.
// [책임] React의 상태(useState)와 API(fetch)를 사용하여 비즈니스 로직을 처리합니다.

import { AIChatPanel, ChatMessage } from 'ui-core/components/AIChatPanel';
import { useState, useEffect } from 'react';

export function PrototypingView() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const handleSendMessage = async (message: string) => {
    setIsLoading(true);
    const newMessages = [...messages, { sender: 'user', content: message }];
    setMessages(newMessages);

    // Next.js API Route 호출
    const response = await fetch('/api/chat', {
      method: 'POST',
      body: JSON.stringify({ message }),
    });
    const result = await response.json();

    setMessages([...newMessages, { sender: 'ai', content: result.reply }]);
    setIsLoading(false);
  };

  return (
    <AIChatPanel
      messages={messages}
      onSendMessage={handleSendMessage}
      isLoading={isLoading}
    />
  );
}
```

### 4.3. 코드 모드 어댑터 (VS Code 확장 - `AIChatViewProvider.ts` 일부)

```typescript
// [의도] VS Code 확장 환경에서 AI 채팅 패널을 사용합니다.
// [책임] VS Code API와 통신하여 비즈니스 로직을 처리합니다.

import * as vscode from 'vscode';
// React 컴포넌트를 웹뷰 HTML로 변환하는 로직 필요 (예: esbuild)
import { renderToString } from 'react-dom/server';
import { AIChatPanel } from 'ui-core/components/AIChatPanel';

export class AIChatViewProvider implements vscode.WebviewViewProvider {
  resolveWebviewView(webviewView: vscode.WebviewView) {
    // ... 웹뷰 설정 ...

    // 메시지 핸들링
    webviewView.webview.onDidReceiveMessage(async (message) => {
      if (message.command === 'sendMessage') {
        // VS Code의 파일 시스템 접근 또는 RAG API 호출
        const reply = await this.callRagApi(message.text);

        // UI 업데이트 메시지 전송
        webviewView.webview.postMessage({ command: 'aiReply', text: reply });
      }
    });

    // 초기 UI 렌더링
    // 실제 구현에서는 상태를 관리하고 postMessage로 업데이트해야 함
    const reactComponentHtml = renderToString(
      <AIChatPanel messages={[]} onSendMessage={() => {}} isLoading={false} />
    );
    webviewView.webview.html = `... ${reactComponentHtml} ...`;
  }

  private async callRagApi(text: string): Promise<string> {
    // ...
    return "코드베이스를 분석한 AI의 답변입니다.";
  }
}
```

---

## 5. UI 레이아웃 전환

-   **프로토타이핑 모드:** `src/app/page.tsx`가 메인 레이아웃을 담당합니다. 좌측에 AI 채팅 패널, 우측에 프리뷰 패널을 배치하는 그리드 시스템을 구현합니다.
-   **코드 모드:** VS Code의 "View Container"와 "WebviewView" API를 사용합니다. `package.json`의 `contributes` 섹션에 `views`를 정의하여, VS Code의 사이드바에 'WindWalker'라는 이름의 뷰 컨테이너를 만들고, 그 안에 AI 채팅과 프리뷰 웹뷰를 등록합니다.

---

## 6. 구현 일정 (제안)

-   **Week 1: 아키텍처 설정**
    -   모노레포 구조 설정 (`packages/ui-core` 생성)
    -   `ui-core`에 `AIChatPanel` 기본 컴포넌트 구현
    -   Next.js 앱에서 `AIChatPanel`을 임시 데이터로 렌더링 (프로토타이핑 모드)
-   **Week 2-3: 프로토타이핑 모드 기능 구현**
    -   Next.js API 라우트 (`/api/chat`) 구현
    -   `PrototypingView.tsx`에서 상태 관리 및 API 연동 완료
    -   `PreviewPanel` 컴포넌트 및 `iframe` 연동 구현
-   **Week 4: 코드 모드 기능 구현**
    -   VS Code 확장 프로젝트(`windwalker-ext`) 설정
    -   `AIChatViewProvider` 구현 및 웹뷰에 `AIChatPanel` 렌더링
    -   `postMessage`를 통한 웹뷰와 확장 간의 통신 구현

이 아키텍처를 통해 우리는 두 모드 간의 UI 개발을 한 곳에서 관리하여 개발 효율성을 높이고, 일관된 사용자 경험을 보장할 수 있습니다.
