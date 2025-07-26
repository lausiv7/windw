#!/bin/bash
# firebase-studio-debug-fix.sh

echo "🔧 Firebase Studio Code-Server 문제 해결 중..."

# 1. 기존 Code-Server 프로세스 정리
echo "🧹 기존 프로세스 정리..."
pkill -f code-server
sleep 2

# 2. 임시 파일 정리
echo "🗑️ 임시 파일 정리..."
rm -rf ~/.local/share/code-server/logs/*
rm -rf ~/.local/share/code-server/CachedData/*
rm -rf /tmp/.code-server-*

# 3. 권한 확인 및 수정
echo "🔒 권한 설정..."
mkdir -p ~/.local/share/code-server/{User,extensions,logs}
chmod -R 755 ~/.local/share/code-server
chmod -R 755 ~/studio

# 4. Code-Server 버전 확인
echo "📋 Code-Server 정보:"
~/.local/bin/code-server --version

# 5. 환경 변수 설정
export CODE_SERVER_CONFIG=~/.config/code-server/config.yaml
export SHELL=/bin/bash

# 6. 설정 파일 생성
echo "⚙️ 안전한 설정 파일 생성..."
mkdir -p ~/.config/code-server
cat > ~/.config/code-server/config.yaml << 'EOF'
bind-addr: 0.0.0.0:8080
auth: none
password: 
cert: false
user-data-dir: ~/.local/share/code-server
extensions-dir: ~/.local/share/code-server/extensions
disable-telemetry: true
disable-update-check: true
log: info
EOF

# 7. 안전한 시작 스크립트 생성
cat > ./start-windwalker-safe.sh << 'EOF'
#!/bin/bash
echo "🚀 WindWalker Code-Server 안전 모드로 시작..."

# 환경 변수 설정
export SHELL=/bin/bash
export HOME=/home/user
export CODE_SERVER_CONFIG=~/.config/code-server/config.yaml

# 로그 디렉토리 확인
mkdir -p ~/.local/share/code-server/logs

echo "📍 작업 디렉토리: $(pwd)"
echo "🏠 홈 디렉토리: $HOME"
echo "📂 워크스페이스: ~/studio"

# Code-Server 실행 (더 안전한 옵션으로)
~/.local/bin/code-server \
    --config ~/.config/code-server/config.yaml \
    ~/studio 2>&1 | tee ~/.local/share/code-server/logs/windwalker.log

echo "🔴 WindWalker Code-Server가 종료되었습니다."
echo "📋 로그 확인: cat ~/.local/share/code-server/logs/windwalker.log"
EOF

chmod +x ./start-windwalker-safe.sh

# 8. 문제 진단 스크립트 생성
cat > ./diagnose-windwalker.sh << 'EOF'
#!/bin/bash
echo "🔍 WindWalker 환경 진단..."

echo "=== 기본 정보 ==="
echo "사용자: $(whoami)"
echo "홈 디렉토리: $HOME"
echo "현재 디렉토리: $(pwd)"
echo "Shell: $SHELL"

echo "=== Code-Server 상태 ==="
if command -v ~/.local/bin/code-server &> /dev/null; then
    echo "✅ Code-Server 설치됨"
    ~/.local/bin/code-server --version
else
    echo "❌ Code-Server 설치되지 않음"
fi

echo "=== 디렉토리 구조 ==="
echo "📁 ~/.local/share/code-server:"
ls -la ~/.local/share/code-server/ 2>/dev/null || echo "디렉토리 없음"

echo "📁 ~/studio:"
ls -la ~/studio/ 2>/dev/null || echo "디렉토리 없음"

echo "=== 포트 사용 현황 ==="
netstat -tulpn | grep :8080 || echo "포트 8080 사용 안함"

echo "=== 실행 중인 Code-Server 프로세스 ==="
ps aux | grep code-server | grep -v grep || echo "실행 중인 프로세스 없음"

echo "=== 최근 로그 (마지막 20줄) ==="
if [ -f ~/.local/share/code-server/logs/windwalker.log ]; then
    tail -20 ~/.local/share/code-server/logs/windwalker.log
else
    echo "로그 파일 없음"
fi
EOF

chmod +x ./diagnose-windwalker.sh

# 9. Firebase Studio 전용 포트 설정 스크립트
cat > ./setup-ports.sh << 'EOF'
#!/bin/bash
echo "🌐 Firebase Studio 포트 설정..."

# Firebase Studio에서 포트 노출 확인
echo "📋 Firebase Studio에서 다음 포트들을 노출해야 합니다:"
echo "   - 포트 8080: VS Code IDE"
echo "   - 포트 3000: React 프리뷰 (나중에 사용)"
echo ""
echo "🔧 Firebase Studio 설정 방법:"
echo "1. Firebase Studio 좌측 패널에서 'Ports' 클릭"
echo "2. 'Add Port' 버튼 클릭"
echo "3. 포트 8080 추가 → 'Web Preview' 선택"
echo "4. 포트 3000 추가 → 'Web Preview' 선택"
echo ""
echo "✅ 설정 완료 후 ./start-windwalker-safe.sh 실행"
EOF

chmod +x ./setup-ports.sh

echo ""
echo "🎉 Firebase Studio Code-Server 문제 해결 스크립트 생성 완료!"
echo ""
echo "📋 해결 순서:"
echo "1. ./diagnose-windwalker.sh          # 현재 상태 확인"
echo "2. ./setup-ports.sh                  # 포트 설정 가이드"  
echo "3. ./start-windwalker-safe.sh        # 안전 모드로 시작"
echo ""
echo "🔍 문제가 계속되면 로그 확인:"
echo "   tail -f ~/.local/share/code-server/logs/windwalker.log"