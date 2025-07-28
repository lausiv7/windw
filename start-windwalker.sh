#!/bin/bash
echo "🚀 WindWalker Code-Server 시작 중..."

# --user-data-dir 와 --extensions-dir 옵션을 제거하여 code-server가 기본 경로를 사용하도록 함
# 이렇게 하면 경로 해석 오류를 피할 수 있습니다.
$HOME/.local/bin/code-server --bind-addr 0.0.0.0:8081 \
           --auth none \
           --log debug \
           $HOME/studio

echo "🔴 WindWalker Code-Server가 종료되었습니다."
