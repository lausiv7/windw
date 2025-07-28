#!/bin/bash
echo "🚀 WindWalker Code-Server 시작 중..."

# 모든 경로 옵션을 제거하고 code-server가 기본값을 사용하도록 합니다.
# 이렇게 하면 환경에 따른 경로 해석 오류를 피할 수 있습니다.
$HOME/.local/bin/code-server --bind-addr 0.0.0.0:8081 --auth none $HOME/studio

echo "🔴 WindWalker Code-Server가 종료되었습니다."
