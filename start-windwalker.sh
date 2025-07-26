#!/bin/bash
echo "🚀 WindWalker 시작 중..."

# 포트 9003을 사용하는 프로세스가 있으면 종료
if lsof -t -i:9003; then
  echo "Port 9003 is in use. Killing the process..."
  kill -9 $(lsof -t -i:9003)
fi

# Code-Server를 백그라운드에서 실행하고 로그를 파일에 기록
~/.local/bin/code-server --bind-addr 0.0.0.0:8080 \
           --user-data-dir ~/.local/share/code-server \
           --extensions-dir ~/.local/share/code-server/extensions \
           --disable-telemetry \
           --auth none \
           --log debug \
           . &

CODE_SERVER_PID=$!

# Next.js 개발 서버 실행
npm run dev &
NEXT_PID=$!

echo "✅ WindWalker 시작 완료!"
echo "🌐 VS Code IDE: http://localhost:8080"
echo "👁️ Next.js Preview: http://localhost:9003"
echo ""
echo "종료하려면 Ctrl+C를 누르세요"

# Ctrl+C 시 모든 프로세스 종료
trap "kill $CODE_SERVER_PID $NEXT_PID 2>/dev/null; exit" INT

# 프로세스 유지
wait
