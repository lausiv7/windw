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
