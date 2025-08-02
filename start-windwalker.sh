#!/bin/bash
echo "🚀 WindWalker Code-Server 시작 중..."

# 기존 Code-Server 프로세스가 실행 중인지 확인하고 종료
if pgrep -f "code-server" > /dev/null; then
    echo "🔄 기존 Code-Server 프로세스를 종료합니다..."
    pkill -f code-server
    sleep 3
    echo "✅ 기존 프로세스 종료 완료"
else
    echo "ℹ️  실행 중인 Code-Server 프로세스가 없습니다."
fi

# 원래의 복잡한 옵션을 사용하여 Code-Server를 실행합니다.
# 이렇게 하면 환경에 따른 경로 해석을 명확히 할 수 있습니다.
# IPC Hook 충돌 방지를 위한 환경 변수 제거
unset VSCODE_IPC_HOOK_CLI

# WindWalker 확장과 함께 Code-Server 실행
echo "🔧 WindWalker 확장 디렉토리: $HOME/.local/share/code-server/extensions"
echo "📂 워크스페이스: $HOME/studio"
echo "🌐 접속 주소: http://0.0.0.0:8082"

code-server --bind-addr 0.0.0.0:8082 \
           --user-data-dir $HOME/.local/share/code-server \
           --extensions-dir $HOME/.local/share/code-server/extensions \
           --disable-telemetry \
           --auth none \
           $HOME/studio

echo "🔴 WindWalker Code-Server가 종료되었습니다."
