#!/bin/bash
# firebase-studio-debug-fix.sh

echo "🔧 Firebase Studio Code-Server 문제 해결 중..."

# 1. 기존 Code-Server 프로세스 정리
echo "🧹 기존 프로세스 정리..."
pkill -f code-server
sleep 2

# 2. 임시 파일 정리
echo "🗑️ 임시 파일 정리..."
rm -rf $HOME/.local/share/code-server/logs/*
rm -rf $HOME/.local/share/code-server/CachedData/*
rm -rf /tmp/code-server*

# 3. 권한 확인 및 수정
echo "🔒 권한 설정..."
mkdir -p $HOME/.local/share/code-server/User
mkdir -p $HOME/.local/share/code-server/extensions
chmod -R 755 $HOME/.local/share/code-server
chmod -R 755 $HOME/studio

# 4. Code-Server 버전 확인
echo "📋 Code-Server 정보:"
if [ -f "$HOME/.local/bin/code-server" ]; then
    $HOME/.local/bin/code-server --version
else
    echo "Code-Server가 설치되지 않았습니다."
fi

# 5. 안전한 설정 파일 생성 (문제가 되는 경로 옵션 제거)
echo "⚙️ 안전한 설정 파일 생성..."
mkdir -p $HOME/.config/code-server
cat > $HOME/.config/code-server/config.yaml << 'EOF'
bind-addr: 0.0.0.0:8081
auth: none
cert: false
disable-telemetry: true
disable-update-check: true
log: debug
EOF

# 6. 안전한 시작 스크립트 생성
cat > ./start-windwalker.sh << 'EOF'
#!/bin/bash
echo "🚀 WindWalker Code-Server 안전 모드로 시작..."

# Code-Server 실행 (오직 config 파일과 작업 디렉토리만 지정)
$HOME/.local/bin/code-server \
    --config $HOME/.config/code-server/config.yaml \
    $HOME/studio

echo "🔴 WindWalker Code-Server가 종료되었습니다."
EOF

chmod +x ./start-windwalker.sh

# 7. 진단 스크립트 업데이트
cat > ./diagnose-windwalker.sh << 'EOF'
#!/bin/bash
echo "🔍 WindWalker 환경 진단..."

echo "=== 기본 정보 ==="
echo "사용자: $(whoami)"
echo "홈 디렉토리: $HOME"
echo "현재 디렉토리: $(pwd)"
echo "Shell: $SHELL"

echo "=== Code-Server 상태 ==="
if command -v $HOME/.local/bin/code-server &> /dev/null; then
    echo "✅ Code-Server 설치됨"
    $HOME/.local/bin/code-server --version
else
    echo "❌ Code-Server 설치되지 않음"
fi

echo "=== 디렉토리 구조 ==="
echo "📁 $HOME/.local/share/code-server/extensions:"
ls -la $HOME/.local/share/code-server/extensions 2>/dev/null || echo "디렉토리 없음"

echo "📁 $HOME/studio/extensions:"
ls -la $HOME/studio/extensions 2>/dev/null || echo "디렉토리 없음"

echo "=== 포트 사용 현황 ==="
netstat -tulpn | grep :8081 || echo "포트 8081 사용 안함"

echo "=== 실행 중인 Code-Server 프로세스 ==="
ps aux | grep code-server | grep -v grep || echo "실행 중인 프로세스 없음"
EOF

chmod +x ./diagnose-windwalker.sh


echo ""
echo "🎉 Firebase Studio Code-Server 문제 해결 스크립트 생성 완료!"
echo ""
echo "📋 해결 순서:"
echo "1. 이 터미널을 닫고 새 터미널을 열어주세요."
echo "2. ./firebase-studio-debug-fix.sh   # 환경 정리 및 스크립트 재생성"
echo "3. ./diagnose-windwalker.sh         # 정리된 환경 확인"
echo "4. ./start-windwalker.sh           # 안전 모드로 시작"
echo ""
echo "🔍 문제가 계속되면 로그 확인:"
echo "   tail -f \$HOME/.local/share/code-server/coder-logs/code-server.log"
