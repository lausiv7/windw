#!/bin/bash

echo "🚀 WindWalker Docker 환경 시작 중..."

# Docker 서비스 상태 확인
if ! systemctl is-active --quiet docker; then
    echo "🔧 Docker 서비스 시작 중..."
    sudo systemctl start docker
fi

# 권한 설정
echo "🔒 권한 설정..."
sudo chown -R 1000:1000 workspace extensions vscode-config 2>/dev/null || true
chmod -R 755 workspace extensions vscode-config 2>/dev/null || true

# Docker Compose 실행
echo "🐳 Docker Compose 실행 중..."
docker-compose up -d

echo ""
echo "✅ WindWalker가 시작되었습니다!"
echo "🌐 IDE 접속: http://localhost:8080 (패스워드: windwalker2024)"
echo "🔍 프리뷰: http://localhost:3000"
echo ""
echo "📋 유용한 명령어:"
echo "  docker-compose logs -f code-server  # 로그 확인"
echo "  docker-compose down                 # 서비스 종료"
echo "  ./stop-docker.sh                    # 빠른 종료"