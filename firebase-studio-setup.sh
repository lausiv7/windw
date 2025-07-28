#!/bin/bash
# firebase-studio-setup.sh

echo "🔥 Firebase Studio용 WindWalker 설정 시작..."

# 1. Code-Server 설치 (이미 설치되어 있다면 건너뜀)
if ! command -v $HOME/.local/bin/code-server &> /dev/null
then
    echo "📦 Code-Server 설치..."
    curl -fsSL https://code-server.dev/install.sh | sh
else
    echo "📦 Code-Server가 이미 설치되어 있습니다."
fi

# 2. Node.js 환경 확인 (이미 설치되어 있을 가능성이 높음)
if ! command -v node &> /dev/null; then
    echo "Node.js를 찾을 수 없습니다. Firebase Studio 환경에 포함되어 있는지 확인하세요."
fi

# 3. code-server가 확장을 찾는 실제 경로 생성
# 로그에서 확인된 잘못된 경로를 그대로 사용합니다.
echo "📁 잘못된 경로에 확장 디렉토리 생성..."
mkdir -p "$HOME/studio/$HOME/.local/share/code-server/extensions"

# 4. 개발용 확장을 링크하여 code-server가 인식하도록 설정
echo "🔗 개발용 확장 링크 설정..."
# ln -sfn [실제 확장 소스 경로] [code-server가 바라보는 확장 경로]
ln -sfn "$HOME/studio/extensions/windwalker" "$HOME/studio/$HOME/.local/share/code-server/extensions/windwalker"


# 5. 필수 VS Code 확장 설치 (필요시 주석 해제)
# echo "🔌 VS Code 확장 설치..."
# $HOME/.local/bin/code-server --install-extension ms-vscode.vscode-typescript-next --force
# $HOME/.local/bin/code-server --install-extension esbenp.prettier-vscode --force
# $HOME/.local/bin/code-server --install-extension bradlc.vscode-tailwindcss --force

echo ""
echo "🎉 Firebase Studio용 WindWalker 설정 완료!"
echo ""
echo "📋 다음 단계:"
echo "1. 이 터미널에서 './start-windwalker.sh'를 실행하여 Code-Server를 시작하세요."
echo "2. Firebase Studio에서 포트 8081을 열어주세요."
echo "3. Code-Server 접속 후, Ctrl+Shift+P로 'WindWalker: Hello World' 명령어가 보이는지 확인하세요."
echo ""
