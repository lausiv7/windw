#!/bin/bash
echo "🚀 WindWalker Code-Server 시작 중..."

# Code-Server 포그라운드 실행
# 모든 경로에서 ~ 대신 $HOME을 사용하여 경로 해석 오류를 방지합니다.
$HOME/.local/bin/code-server --bind-addr 0.0.0.0:8081 \
           --auth none \
           --log debug \
           $HOME/studio

echo "🔴 WindWalker Code-Server가 종료되었습니다."
