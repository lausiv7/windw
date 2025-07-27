# Firebase Studio Nix 환경에서 Code Server 실행 가이드

Firebase Studio의 Nix 환경에서 VS Code for the Web (code-server)을 설치하고 실행하여 웹 기반 IDE를 사용하는 완전한 가이드입니다.

## 사전 준비사항

- Firebase Studio 환경 접근 권한
- 터미널 접근 권한
- Nix 패키지 관리자가 설치된 환경

## 1. Nix 환경 설정 및 Code Server 설치

### 1.1 Nix 환경 확인
Firebase Studio는 Nix 패키지 관리자를 사용합니다. 현재 Nix 환경을 확인합니다:

```bash
# Nix 버전 확인
nix --version

# 현재 설치된 패키지 확인
nix-env -q
```

### 1.2 설치 스크립트 작성
Code Server와 필요한 의존성을 설치하는 스크립트를 작성합니다:

```bash
# install-code-server.sh 파일 생성
cat > install-code-server.sh << 'EOF'
#!/bin/bash

echo "Firebase Studio Nix 환경에서 Code Server 설치 시작..."

# Nix를 통한 code-server 설치
echo "Code Server 설치 중..."
nix-env -iA nixpkgs.code-server

# 필요한 추가 패키지 설치 (선택사항)
echo "추가 개발 도구 설치 중..."
nix-env -iA nixpkgs.nodejs
nix-env -iA nixpkgs.git

# 설치 확인
echo "설치 완료! Code Server 버전 확인:"
code-server --version

echo "설치가 완료되었습니다."
EOF

# 실행 권한 부여
chmod +x install-code-server.sh
```

### 1.3 설치 스크립트 실행
```bash
./install-code-server.sh
```

### 1.4 설치 확인
설치가 완료되면 버전을 확인합니다:

```bash
code-server --version
```

## 2. 실행 스크립트 작성

Code Server를 쉽게 실행할 수 있도록 스크립트를 작성합니다:

### 2.1 기본 실행 스크립트
```bash
# start-code-server.sh 파일 생성
cat > start-code-server.sh << 'EOF'
#!/bin/bash

# Code Server 실행 스크립트
echo "Firebase Studio Code Server 시작..."

# 기본 설정
PORT=${1:-8080}
WORK_DIR=${2:-~/studio}
AUTH_TYPE=${3:-none}

echo "포트: $PORT"
echo "작업 디렉토리: $WORK_DIR"
echo "인증 방식: $AUTH_TYPE"

# 포트 사용 확인
if lsof -Pi :$PORT -sTCP:LISTEN -t >/dev/null ; then
    echo "경고: 포트 $PORT 이미 사용 중입니다."
    echo "다른 포트를 사용하거나 기존 프로세스를 종료하세요."
    echo "사용법: $0 [포트번호] [작업디렉토리] [인증방식]"
    echo "예시: $0 8081 ~/studio none"
    exit 1
fi

# Code Server 실행
echo "Code Server를 포트 $PORT 에서 시작합니다..."
code-server --bind-addr 0.0.0.0:$PORT --auth $AUTH_TYPE $WORK_DIR
EOF

# 실행 권한 부여
chmod +x start-code-server.sh
```

### 2.2 고급 실행 스크립트 (포트 자동 감지)
```bash
# start-code-server-auto.sh 파일 생성
cat > start-code-server-auto.sh << 'EOF'
#!/bin/bash

# Code Server 자동 포트 감지 실행 스크립트
echo "Firebase Studio Code Server 자동 시작..."

# 기본 설정
BASE_PORT=8080
MAX_PORT=8090
WORK_DIR=${1:-~/studio}
AUTH_TYPE=${2:-none}

# 사용 가능한 포트 찾기
find_available_port() {
    for port in $(seq $BASE_PORT $MAX_PORT); do
        if ! lsof -Pi :$port -sTCP:LISTEN -t >/dev/null ; then
            echo $port
            return
        fi
    done
    echo "0"
}

# 포트 찾기
AVAILABLE_PORT=$(find_available_port)

if [ "$AVAILABLE_PORT" = "0" ]; then
    echo "오류: 포트 $BASE_PORT-$MAX_PORT 범위에서 사용 가능한 포트를 찾을 수 없습니다."
    exit 1
fi

echo "사용 가능한 포트 발견: $AVAILABLE_PORT"
echo "작업 디렉토리: $WORK_DIR"
echo "인증 방식: $AUTH_TYPE"

# Code Server 실행
echo "Code Server를 포트 $AVAILABLE_PORT 에서 시작합니다..."
code-server --bind-addr 0.0.0.0:$AVAILABLE_PORT --auth $AUTH_TYPE $WORK_DIR
EOF

# 실행 권한 부여
chmod +x start-code-server-auto.sh
```

## 3. 포트 사용 현황 확인 및 관리

Code Server를 실행하기 전에 사용하려는 포트가 이미 사용 중인지 확인합니다.

### 3.1 포트 사용 현황 확인
```bash
# 특정 포트 사용 현황 확인 (예: 8080)
lsof -i :8080

# 또는 netstat 사용
netstat -tulpn | grep :8080

# 모든 프로세스에서 특정 포트 확인
ps aux | grep 8080
```

### 3.2 사용 중인 포트 종료 (필요시)
```bash
# 특정 포트를 사용하는 프로세스 종료
# 먼저 PID 확인
lsof -ti :8080

# PID를 이용한 프로세스 종료
kill -9 $(lsof -ti :8080)
```

### 3.3 포트 관리 스크립트
```bash
# port-manager.sh 파일 생성
cat > port-manager.sh << 'EOF'
#!/bin/bash

case "$1" in
    "check")
        PORT=${2:-8080}
        echo "포트 $PORT 사용 현황:"
        lsof -i :$PORT
        ;;
    "kill")
        PORT=${2:-8080}
        PID=$(lsof -ti :$PORT)
        if [ ! -z "$PID" ]; then
            echo "포트 $PORT 에서 실행 중인 프로세스 $PID 를 종료합니다."
            kill -9 $PID
            echo "프로세스가 종료되었습니다."
        else
            echo "포트 $PORT 에서 실행 중인 프로세스가 없습니다."
        fi
        ;;
    "list")
        echo "사용 중인 모든 포트:"
        netstat -tulpn | grep LISTEN
        ;;
    *)
        echo "사용법: $0 {check|kill|list} [포트번호]"
        echo "  check [포트]: 특정 포트 사용 현황 확인"
        echo "  kill [포트]: 특정 포트 사용 프로세스 종료"
        echo "  list: 모든 사용 중인 포트 목록"
        ;;
esac
EOF

# 실행 권한 부여
chmod +x port-manager.sh
```

## 4. Code Server 실행 방법

### 4.1 스크립트를 이용한 실행 (권장)

#### 기본 실행
```bash
# 기본 포트 8080으로 실행
./start-code-server.sh

# 특정 포트로 실행
./start-code-server.sh 8081

# 포트와 작업 디렉토리 지정
./start-code-server.sh 8081 ~/my-project

# 자동 포트 감지로 실행
./start-code-server-auto.sh
```

### 4.2 직접 명령어 실행

### 기본 실행 (포트 8080)
```bash
code-server --bind-addr 0.0.0.0:8080 --auth none ~/studio
```

### 다른 포트 사용 (포트 8081)
만약 8080 포트가 이미 사용 중이라면 다른 포트를 사용합니다:

```bash
code-server --bind-addr 0.0.0.0:8081 --auth none ~/studio
```

### 실행 옵션 설명
- `--bind-addr 0.0.0.0:포트번호`: 모든 IP에서 접근 가능하도록 바인딩
- `--auth none`: 인증 비활성화 (개발 환경용)
- `~/studio`: 작업 디렉토리 지정
- `--config`: 설정 파일 지정 (선택사항)
- `--user-data-dir`: 사용자 데이터 디렉토리 지정 (선택사항)

### 4.3 실행 상태 확인
```bash
# 실행 중인 code-server 프로세스 확인
ps aux | grep code-server

# 포트 리스닝 상태 확인
netstat -tulpn | grep :8081
```

## 5. Firebase Studio에서 포트 접근 설정 및 문제 해결

Code Server가 실행되면 Firebase Studio에서 포트를 공개적으로 접근 가능하도록 설정해야 합니다.

### 5.1 Firebase Studio 패널 열기
- VS Code에서 `Ctrl+Shift+P` (Mac: `Cmd+Shift+P`)로 명령 팔레트 열기
- 또는 좌측 액티비티 바에서 Firebase Studio 아이콘 클릭

### 5.2 Backend Ports 섹션 확인
- Firebase Studio 패널에서 "Backend ports" 섹션을 확장
- 실행 중인 서버 목록에서 해당 포트 번호 확인 (예: 8081)

### 5.3 포트를 공개로 설정
1. 포트 번호 왼쪽의 **잠금 아이콘(Make public)** 클릭
2. 아이콘이 **지구본 모양**으로 변경되면 공개 설정 완료
3. 포트 번호 오른쪽의 **"Copy URL" 아이콘**을 클릭하여 접근 URL 복사

### 5.4 포트가 Backend Ports에 표시되지 않는 경우
만약 실행한 포트가 Backend Ports 목록에 나타나지 않는다면:

```bash
# Firebase Studio 패널 새로고침
# 또는 code-server 재시작

# 프로세스가 정상 실행 중인지 확인
ps aux | grep code-server

# 포트가 정상적으로 리스닝 중인지 확인
lsof -i :8081

# code-server 로그 확인
# 터미널에서 실행 중인 code-server의 출력 메시지 확인
```

## 6. 웹 브라우저에서 접근 및 초기 설정

복사한 URL을 웹 브라우저에 붙여넣기하여 VS Code for the Web에 접근합니다.

## 7. 실행 결과 확인 및 모니터링

처음 접근할 때 다음과 같은 설정을 진행합니다:

### 6.1 신뢰 설정
- "Do you trust the authors of the files in this folder?" 대화상자가 나타남
- **"Yes, I trust the authors"** 버튼 클릭하여 모든 기능 활성화

### 6.2 테마 선택
- Dark Modern, Light Modern, High Contrast 등에서 원하는 테마 선택
- 나중에 설정에서 변경 가능

## 7. 실행 결과 확인

정상적으로 실행되면 다음과 같은 로그가 출력됩니다:

```
[2025-07-26T17:33:21.375Z] info  code-server 4.91.1 1962f48b7f71772dc2c060dbaa5a6b4c0792a549
[2025-07-26T17:33:21.407Z] info  HTTP server listening on http://0.0.0.0:8081/
[2025-07-26T17:33:21.407Z] info    - Authentication is disabled
[2025-07-26T17:33:21.407Z] info    - Not serving HTTPS
```

### 7.1 모니터링 스크립트
```bash
# monitor-code-server.sh 파일 생성
cat > monitor-code-server.sh << 'EOF'
#!/bin/bash

echo "Code Server 모니터링 시작..."

while true; do
    clear
    echo "=== Code Server 상태 모니터링 ==="
    echo "현재 시간: $(date)"
    echo ""
    
    echo "1. 실행 중인 code-server 프로세스:"
    ps aux | grep code-server | grep -v grep
    echo ""
    
    echo "2. 리스닝 중인 포트:"
    netstat -tulpn | grep code-server
    echo ""
    
    echo "3. 메모리 사용량:"
    ps aux | grep code-server | grep -v grep | awk '{print "CPU: "$3"%, Memory: "$4"%"}'
    echo ""
    
    echo "새로고침: 5초마다 업데이트 (Ctrl+C로 종료)"
    sleep 5
done
EOF

# 실행 권한 부여
chmod +x monitor-code-server.sh
```

## 8. 주의사항 및 보안 고려사항

### 보안 주의사항
- `--auth none` 옵션으로 인증이 비활성화되어 있습니다
- 포트를 공개로 설정하면 워크스페이스가 활성화된 동안 인터넷의 누구나 접근 가능합니다
- 개발 환경에서만 사용하고, 중요한 정보가 포함된 프로젝트는 주의해서 사용하세요

### 문제 해결 및 최적화
- **포트 충돌**: 자동 포트 감지 스크립트 사용 또는 `port-manager.sh`로 포트 관리
- **Backend Ports에 표시되지 않음**: Firebase Studio 패널 새로고침 또는 code-server 재시작
- **접속 불가**: 방화벽 설정 확인 및 `--bind-addr 0.0.0.0:포트` 옵션 확인
- **성능 저하**: `monitor-code-server.sh`로 리소스 사용량 확인

### Nix 환경 특정 고려사항
- Nix 패키지 업데이트 시 code-server 재설치 필요할 수 있음
- 환경 변수 설정이 Nix 환경에 따라 달라질 수 있음
- 의존성 패키지들이 Nix store에 별도로 관리됨

## 9. 중단 및 정리 방법

### 9.1 Code Server 중단
```bash
# 터미널에서 실행 중인 경우
Ctrl+C

# 백그라운드에서 실행 중인 경우
kill -9 $(lsof -ti :8081)

# 또는 포트 관리 스크립트 사용
./port-manager.sh kill 8081
```

### 9.2 완전한 정리
```bash
# 모든 code-server 프로세스 종료
pkill -f code-server

# 임시 파일 정리 (선택사항)
rm -rf ~/.local/share/code-server/logs/*
```

## 10. 빠른 시작 명령어 모음

### 설치부터 실행까지 한 번에
```bash
# 1. 설치 스크립트 다운로드 및 실행
chmod +x install-code-server.sh && ./install-code-server.sh

# 2. 실행 스크립트 준비
chmod +x start-code-server-auto.sh

# 3. Code Server 실행 (자동 포트 감지)
./start-code-server-auto.sh

# 4. Firebase Studio에서 Backend Ports 확인 후 포트 공개 설정
```

### 주요 스크립트 파일들
- `install-code-server.sh`: Code Server 설치
- `start-code-server.sh`: 기본 실행 스크립트
- `start-code-server-auto.sh`: 자동 포트 감지 실행 스크립트
- `port-manager.sh`: 포트 관리 유틸리티
- `monitor-code-server.sh`: 실행 상태 모니터링

---

이제 Firebase Studio의 Nix 환경에서 완전한 웹 기반 VS Code IDE를 안정적으로 사용할 수 있습니다!