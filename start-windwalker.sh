#!/bin/bash
echo "🚀 WindWalker Code-Server 시작 중..."

# Code-Server 포그라운드 실행
# --user-data-dir와 --extensions-dir 옵션을 제거하여 code-server가 기본 경로를 사용하도록 합니다.
# setup 스크립트에서 심볼릭 링크를 생성했으므로, 이제 기본 경로에서 우리 확장을 찾을 수 있습니다.
$HOME/.local/bin/code-server --bind-addr 0.0.0.0:8081 \
           --auth none \
           --log debug \
           $HOME/studio

echo "🔴 WindWalker Code-Server가 종료되었습니다."
