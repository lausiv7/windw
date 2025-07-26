#!/bin/bash
echo "🔍 WindWalker 환경 진단..."

echo "=== 기본 정보 ==="
echo "사용자: $(whoami)"
echo "홈 디렉토리: $HOME"
echo "현재 디렉토리: $(pwd)"
echo "Shell: $SHELL"

echo "=== Code-Server 상태 ==="
if command -v ~/.local/bin/code-server &> /dev/null; then
    echo "✅ Code-Server 설치됨"
    ~/.local/bin/code-server --version
else
    echo "❌ Code-Server 설치되지 않음"
fi

echo "=== 디렉토리 구조 ==="
echo "📁 ~/.local/share/code-server:"
ls -la ~/.local/share/code-server/ 2>/dev/null || echo "디렉토리 없음"

echo "📁 ~/studio:"
ls -la ~/studio/ 2>/dev/null || echo "디렉토리 없음"

echo "=== 포트 사용 현황 ==="
netstat -tulpn | grep :8080 || echo "포트 8080 사용 안함"

echo "=== 실행 중인 Code-Server 프로세스 ==="
ps aux | grep code-server | grep -v grep || echo "실행 중인 프로세스 없음"

echo "=== 최근 로그 (마지막 20줄) ==="
if [ -f ~/.local/share/code-server/logs/windwalker.log ]; then
    tail -20 ~/.local/share/code-server/logs/windwalker.log
else
    echo "로그 파일 없음"
fi
