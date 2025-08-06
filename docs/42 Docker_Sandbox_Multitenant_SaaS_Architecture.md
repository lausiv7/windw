
# 💡 멀티테넌트 Docker 샌드박스 기반 SaaS 아키텍처 및 비용 모델

## 📌 개요
이 문서는 VSCode Web(예: Code-Server), AI Builder, Web App Builder 등 PaaS 스타일 SaaS를 멀티테넌트 환경에서 저비용 고효율로 제공하기 위한 Docker 샌드박스 + 상태 분리 아키텍처 설계 및 운영 전략을 설명합니다.

## 🏗️ 핵심 아키텍처

### 🔥 1. 웜풀(Warm Pool)
- 항상 1~3개의 Docker 인스턴스를 백그라운드에서 실행
- 사용자 요청 시 즉시 컨테이너 할당 → 1~2초 내 IDE 구동
- 초기 딜레이 제거, 대기시간 최소화

### 📦 2. 상태 분리(State Separation)
- 컨테이너는 휘발성 (Stateless)
- 유저 설정, 프로젝트, node_modules 등은 외부 파일 스토리지에 저장
- 각 컨테이너는 사용자 마운트 디렉토리(`/mnt/user-1234`)를 통해 환경 복구

### 🔄 3. 공유 컨테이너 전략 (Multi-User Efficient Pooling)
- 동시 접속자 1000명 중 실제 작업자 5~10명 예상
- 컨테이너는 1인 전용이 아닌 “유휴 → 회수 → 재사용” 방식으로 풀 관리
- 각 세션은 JWT 토큰 기반으로 인증 및 사용자 분리

## ☁️ 클라우드 아키텍처 추천

### ✅ Google Cloud 기반 예시
| 구성 요소 | 기술 선택 | 설명 |
|-----------|------------|------|
| 컨테이너 실행 | Cloud Run / GKE Autopilot | 서버리스로 비용 최적화 |
| 파일 저장소 | Filestore / Cloud Storage | node_modules, 프로젝트 저장 |
| 인증 | Firebase Auth | GitHub, Google 로그인 연동 |
| DB | Firestore / Supabase | 유저 정보, 설정 관리 |
| CDN | Cloudflare + Storage Hosting | 정적 웹사이트 최적 호스팅 |

## 💸 비용 모델 (MAU 1,000 기준)

### 1. 고정 비용
| 항목 | 비용 (월) |
|------|------------|
| 웜풀 컨테이너 2개 (f1-micro) | $20 ~ $40 |
| 파일 저장소 (50~100GB) | $30 ~ $80 |
| Docker 이미지 저장 (Artifact Registry) | $5 이하 |
| 인증 + DB (Firebase or Supabase) | $0 ~ $20 |
**소계**: `$50 ~ $140 / 월`

### 2. 사용량 기반 비용
| 항목 | 단가 예시 | 추정 사용량 | 비용 |
|------|-----------|--------------|------|
| Cloud Run 실행 | $0.000024/vCPU-sec | 100시간 | $10 ~ $30 |
| Filestore IO | $0.30/GB-month | 5GB | $2 ~ $5 |
| 네트워크 대역폭 | $0.12/GB | 10GB | $1.2 |
**소계**: `$15 ~ $50 / 월`

### ✅ 총 예상: **$65 ~ $200 / 월**

## 💳 구독 요금제 설계
| 요금제 | 월 이용료 | 포함 리소스 | 대상 |
|--------|-----------|-------------|------|
| Free | $0 | 30분/일 IDE, 100MB 저장 | 체험 사용자 |
| Starter | $5 | 5시간/월, 1GB 저장 | 라이트 사용자 |
| Pro | $10 | 20시간/월, 5GB 저장 | 실사용자 |
| Team | $25 | 사용자 3명, 100시간, 10GB | 소규모 팀 |
| Enterprise | Custom | 무제한 | 기업 고객 |

## 📦 추가 리소스 제공 제안
- ✅ Google Sheet 기반 비용 계산기 템플릿
- ✅ 이 아키텍처를 반영한 PaaS-like SaaS Starter Kit

## 📈 향후 확장 전략
- AI 기능 탑재 (LLM inference / RAG)
- SSR 기반 페이지 프리뷰 연동
- GitHub Actions 통합
- 정적 호스팅 자동 배포 (Cloudflare Pages)

## 📝 요약
이 구조는 고비용 DevServer를 다수 띄우는 기존 방식 대비 최소 10배 이상 효율적이며, 초기 스타트업 환경에서도 충분히 유지 가능한 수준의 비용으로 상용 SaaS를 운영할 수 있습니다. 특히 PWA 기반 프론트 + Docker IDE 백엔드를 결합하면 Jamstack 기반 차세대 SaaS 플랫폼으로 발전 가능합니다.
