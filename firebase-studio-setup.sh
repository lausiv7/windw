#!/bin/bash
# firebase-studio-setup.sh

echo "🔥 Firebase Studio용 WindWalker 설정 시작..."

# 1. Code-Server 설치 (이미 설치되어 있다면 건너뜀)
if ! command -v code-server &> /dev/null
then
    echo "📦 Code-Server 설치..."
    curl -fsSL https://code-server.dev/install.sh | sh
else
    echo "📦 Code-Server가 이미 설치되어 있습니다."
fi

# 2. Node.js 환경 확인
if ! command -v node &> /dev/null; then
    echo "Node.js 설치 중..."
    curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
    sudo apt-get install -y nodejs
fi

# 3. VS Code 설정 및 확장 프로그램 디렉토리 생성
echo "📁 워크스페이스 설정..."
mkdir -p ~/.local/share/code-server/User
mkdir -p ~/.local/share/code-server/extensions

# 4. 필수 VS Code 확장 설치
echo "🔌 VS Code 확장 설치..."
code-server --install-extension ms-vscode.vscode-typescript-next --force
code-server --install-extension esbenp.prettier-vscode --force
code-server --install-extension bradlc.vscode-tailwindcss --force
code-server --install-extension ms-vscode.vscode-json --force

# 5. 시작 스크립트 생성
cat > ./start-windwalker.sh << 'EOF'
#!/bin/bash
echo "🚀 WindWalker 시작 중..."

# Code-Server 백그라운드 실행
# --auth none: 비밀번호 없이 접속 허용
code-server --bind-addr 0.0.0.0:8080 \
           --user-data-dir ~/.local/share/code-server \
           --extensions-dir ~/.local/share/code-server/extensions \
           --disable-telemetry \
           --auth none \
           . &

CODE_SERVER_PID=$!

# Next.js 개발 서버 실행 (포트 9002)
npm run dev &
NEXT_PID=$!

echo "✅ WindWalker 시작 완료!"
echo "🌐 VS Code IDE: http://localhost:8080"
echo "👁️ Next.js Preview: http://localhost:9002"
echo ""
echo "종료하려면 Ctrl+C를 누르세요"

# Ctrl+C 시 모든 프로세스 종료
trap "kill $CODE_SERVER_PID $NEXT_PID; exit" INT

# 프로세스 유지
wait
EOF

chmod +x ./start-windwalker.sh

echo ""
echo "🎉 Firebase Studio용 WindWalker 설정 완료!"
echo ""
echo "📋 다음 단계:"
echo "1. 터미널에서 'sh firebase-studio-setup.sh'를 실행하여 설정을 완료하세요."
echo "2. 설정이 끝나면 './start-windwalker.sh'를 실행하여 개발 환경을 시작하세요."
echo "3. Firebase Studio에서 포트 8080과 9002를 열어주세요."
echo ""
