#!/bin/bash
echo "🚀 WindWalker Code-Server 안전 모드로 시작..."

# Code-Server 실행 (오직 config 파일과 작업 디렉토리만 지정)
$HOME/.local/bin/code-server \
    --config $HOME/.config/code-server/config.yaml \
    $HOME/studio

echo "🔴 WindWalker Code-Server가 종료되었습니다."
