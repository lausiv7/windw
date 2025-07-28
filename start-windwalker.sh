#!/bin/bash
echo "🚀 WindWalker Code-Server 시작 중..."

# Code-Server 포그라운드 실행
# --extra-extensions-dir 옵션을 추가하여 개발 중인 확장 폴더를 지정합니다.
~/.local/bin/code-server --bind-addr 0.0.0.0:8081 \
           --user-data-dir ~/.local/share/code-server \
           --extensions-dir ~/.local/share/code-server/extensions \
           --extra-extensions-dir ~/studio/extensions \
           --disable-telemetry \
           --auth none \
           --log debug \
           ~/studio

echo "🔴 WindWalker Code-Server가 종료되었습니다."
