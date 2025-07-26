#!/bin/bash
echo "🚀 WindWalker 시작 중..."

# 포트 8080을 사용하는 프로세스가 있으면 종료
if lsof -t -i:8080; then
  echo "Port 8080 is in use. Killing the process..."
  kill -9 $(lsof -t -i:8080)
fi

# Code-Server를 포그라운드에서 실행하여 프로세스가 종료되지 않도록 함
echo "Starting code-server on 0.0.0.0:8080..."
~/.local/bin/code-server --bind-addr 0.0.0.0:8080 \
           --user-data-dir ~/.local/share/code-server \
           --extensions-dir ~/.local/share/code-server/extensions \
           --disable-telemetry \
           --auth none \
           .

echo "✅ WindWalker 시작 완료!"
echo "🌐 VS Code IDE: http://localhost:8080"
echo "👁️ Next.js Preview is running separately."
