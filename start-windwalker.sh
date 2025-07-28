#!/bin/bash
echo "🚀 WindWalker Code-Server 시작 중..."

# Code-Server 포그라운드 실행
~/.local/bin/code-server --bind-addr 0.0.0.0:8081 \
           --user-data-dir ~/.local/share/code-server \
           --extensions-dir ~/.local/share/code-server/extensions \
           --disable-telemetry \
           --auth none \
           --log debug \
           ~/studio

echo "🔴 WindWalker Code-Server가 종료되었습니다."
