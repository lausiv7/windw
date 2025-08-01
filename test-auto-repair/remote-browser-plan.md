# 🌐 원격 브라우저 서버를 통한 Playwright 테스트 계획

## 📋 개요
Firebase/Nix 환경의 시스템 라이브러리 제약을 우회하기 위해 외부 브라우저 서버를 활용

## 🏗️ 아키텍처 설계

### 1. **원격 브라우저 서버 (별도 인스턴스)**
```
┌─────────────────────────────────────┐
│    원격 브라우저 서버                │
│  ┌─────────────────────────────────┐ │
│  │ Docker Container                │ │
│  │ - Ubuntu 20.04/22.04           │ │
│  │ - Playwright + Chromium        │ │
│  │ - 모든 시스템 의존성 설치       │ │
│  │ - WebSocket/HTTP API 서버       │ │
│  └─────────────────────────────────┘ │
│          포트: 9222 (DevTools)      │
│          포트: 8090 (API Server)    │
└─────────────────────────────────────┘
```

### 2. **Firebase 스튜디오 (현재 환경)**
```
┌─────────────────────────────────────┐
│   Firebase Studio (Nix)            │
│  ┌─────────────────────────────────┐ │
│  │ Playwright Test Runner          │ │
│  │ - 원격 브라우저 클라이언트      │ │
│  │ - Test Auto-Repair Loop         │ │
│  │ - WindWalker Code Server        │ │
│  └─────────────────────────────────┘ │
│     ↕️ WebSocket/HTTP 통신          │
└─────────────────────────────────────┘
```

## 🔧 구현 계획

### Phase 1: 원격 브라우저 서버 구축
```bash
# Docker 기반 브라우저 서버
FROM mcr.microsoft.com/playwright:v1.40.0-ubuntu20.04

WORKDIR /app
COPY package*.json ./
RUN npm install

# 브라우저 원격 접속 API 서버 
COPY remote-browser-server.js ./
EXPOSE 8090 9222

CMD ["node", "remote-browser-server.js"]
```

### Phase 2: 원격 브라우저 클라이언트 개발
```javascript
// remote-browser-client.js
class RemoteBrowserClient {
  constructor(serverUrl) {
    this.serverUrl = serverUrl;
    this.wsConnection = null;
  }

  async connect() {
    // WebSocket 연결 설정
    this.wsConnection = new WebSocket(`${this.serverUrl}/ws`);
    
    // CDP (Chrome DevTools Protocol) 프록시 설정
    return this.setupCDPProxy();
  }

  async runTest(testCode) {
    // 원격에서 테스트 실행
    return await this.sendCommand('runTest', { code: testCode });
  }
}
```

### Phase 3: Playwright 설정 수정
```javascript
// playwright.config.js 원격 브라우저 설정
module.exports = defineConfig({
  use: {
    // 원격 브라우저 연결
    connect: {
      wsEndpoint: 'ws://remote-browser-server:8090/browser'
    }
  },
  
  projects: [
    {
      name: 'remote-chromium',
      use: { 
        browserName: 'chromium',
        // 원격 브라우저 엔드포인트
        connectOptions: {
          wsEndpoint: process.env.REMOTE_BROWSER_WS
        }
      }
    }
  ]
});
```

## 📡 통신 프로토콜

### 1. **브라우저 제어 명령**
```json
{
  "type": "browser_command",
  "action": "launch",
  "options": {
    "headless": true,
    "args": ["--no-sandbox", "--disable-web-security"]
  }
}
```

### 2. **테스트 실행 요청**
```json
{
  "type": "test_execution",
  "testFile": "windwalker-phase1.spec.js",
  "config": {
    "baseURL": "http://firebase-studio:8082",
    "timeout": 60000
  }
}
```

### 3. **결과 반환**
```json
{
  "type": "test_result",
  "status": "passed|failed",
  "results": [...],
  "screenshots": ["base64..."],
  "trace": "..."
}
```

## 🚀 배포 방법

### A. **클라우드 인스턴스** 
- **Google Cloud Run**: 서버리스, 자동 스케일링
- **AWS ECS**: 컨테이너 기반, 안정적 
- **Digital Ocean Droplet**: 단순, 저렴

### B. **로컬 Docker**
```bash
# 원격 브라우저 서버 실행
docker run -d -p 8090:8090 -p 9222:9222 \
  --name remote-browser \
  windwalker/remote-browser-server

# Firebase에서 연결
export REMOTE_BROWSER_WS="ws://localhost:8090/browser"
npm run test
```

## 💡 장점

1. **완전한 호환성**: 표준 Ubuntu 환경에서 모든 라이브러리 사용 가능
2. **확장성**: 여러 브라우저 타입 지원 (Chrome, Firefox, Safari)
3. **재사용성**: 다른 제약 환경에서도 활용 가능
4. **독립성**: Firebase 환경 변경 없이 브라우저 업그레이드 가능

## ⚠️ 고려사항

1. **네트워크 지연**: 원격 통신으로 인한 테스트 속도 저하
2. **보안**: 브라우저 서버 접근 권한 관리
3. **비용**: 별도 서버 인스턴스 운영 비용
4. **복잡성**: 시스템 구성 요소 증가

## 🎯 구현 우선순위

1. **1단계**: 로컬 Docker 기반 프로토타입 구축 
2. **2단계**: WebSocket 기반 통신 프로토콜 구현
3. **3단계**: Playwright 원격 연결 통합
4. **4단계**: 클라우드 배포 및 운영 환경 구축
5. **5단계**: 테스트 자동화 루프 통합 및 최적화