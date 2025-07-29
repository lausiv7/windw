#!/bin/bash
echo "🚀 WindWalker Code-Server 시작 중..."

# 원래의 복잡한 옵션을 사용하여 Code-Server를 실행합니다.
# 이렇게 하면 환경에 따른 경로 해석을 명확히 할 수 있습니다.
$HOME/.local/bin/code-server --bind-addr 0.0.0.0:8081 \
           --user-data-dir $HOME/.local/share/code-server \
           --extensions-dir $HOME/.local/share/code-server/extensions \
           --disable-telemetry \
           --auth none \
           $HOME/studio

echo "🔴 WindWalker Code-Server가 종료되었습니다."
