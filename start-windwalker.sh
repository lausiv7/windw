#!/bin/bash
echo "🚀 WindWalker Code-Server 시작 중..."

# Code-Server 포그라운드 실행
$HOME/.local/bin/code-server --bind-addr 0.0.0.0:8081 \
           --auth none \
           --log debug \
           $HOME/studio

echo "🔴 WindWalker Code-Server가 종료되었습니다."
