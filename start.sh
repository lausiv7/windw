#!/bin/bash
echo "🚀 WindWalker 시작 중..."
docker-compose up -d
echo "✅ WindWalker가 시작되었습니다!"
echo "🌐 IDE 접속: http://localhost:8080 (패스워드: windwalker2024)"
echo "🔍 프리뷰: http://localhost:3000"
echo ""
echo "📋 유용한 명령어:"
echo "  docker-compose logs -f code-server  # 로그 확인"
echo "  docker-compose down                 # 서비스 종료"
echo "  ./stop.sh                           # 빠른 종료"
