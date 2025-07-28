Firebase Studio용 WindWalker 설정 가이드
🔧 문제 진단 및 해결
현재 상황

Firebase Studio는 Nix 환경을 사용
Docker daemon이 실행되지 않음
docker-compose가 설치되지 않음

해결 방법 1: Nix 환경에서 Docker 설정
1.1 dev.nix 파일 수정
nix# dev.nix 파일에 추가
{ pkgs }: {
  packages = [
    pkgs.docker
    pkgs.docker-compose
    pkgs.nodejs_18
    pkgs.git
  ];
  
  # Docker daemon을 백그라운드에서 실행
  shellHook = ''
    # Docker daemon 시작 (루트 권한 필요 시 sudo 사용)
    if ! docker info > /dev/null 2>&1; then
      echo "🐳 Docker daemon 시작 중..."
      sudo dockerd &
      sleep 5
    fi
    
    echo "✅ 개발 환경 준비 완료"
    echo "🚀 WindWalker 시작: ./start.sh"
  '';
}
1.2 환경 재빌드
bash# Firebase Studio 터미널에서 실행
nix-shell --run "echo 'Environment rebuilt'"



해결 방법 2: Docker 없이 직접 실행 (추천)
Firebase Studio 환경 특성상 Docker보다는 직접 실행이 더 안정적입니다.
2.1 Code-Server 직접 설치 스크립트
bash#!/bin/bash
# firebase-studio-setup.sh

echo "🔥 Firebase Studio용 WindWalker 설정 시작..."

# 1. Code-Server 설치
echo "📦 Code-Server 설치..."
curl -fsSL https://code-server.dev/install.sh | sh

# 2. Node.js 환경 확인
if ! command -v node &> /dev/null; then
    echo "Node.js 설치 중..."
    curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
    sudo apt-get install -y nodejs
fi

# 3. 워크스페이스 구조 생성
echo "📁 워크스페이스 설정..."
mkdir -p ~/.local/share/code-server/User
mkdir -p ~/.local/share/code-server/extensions
mkdir -p ~/windwalker/{workspace,templates,projects}

# 4. VS Code 설정
cat > ~/.local/share/code-server/User/settings.json << 'EOF'
{
  "workbench.colorTheme": "Dark+ (default dark)",
  "editor.fontSize": 14,
  "editor.tabSize": 2,
  "editor.insertSpaces": true,
  "editor.formatOnSave": true,
  "files.autoSave": "afterDelay",
  "files.autoSaveDelay": 1000,
  "terminal.integrated.shell.linux": "/bin/bash",
  "extensions.autoUpdate": false,
  "workbench.startupEditor": "welcomePage",
  "security.workspace.trust.enabled": false
}
EOF

# 5. React 템플릿 생성
echo "📋 React 템플릿 생성..."
mkdir -p ~/windwalker/templates/react-app
cd ~/windwalker/templates/react-app

cat > package.json << 'EOF'
{
  "name": "windwalker-react-template",
  "version": "1.0.0",
  "private": true,
  "scripts": {
    "dev": "vite --host 0.0.0.0 --port 3000",
    "build": "vite build",
    "preview": "vite preview --host 0.0.0.0 --port 3000"
  },
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0"
  },
  "devDependencies": {
    "@types/react": "^18.2.0",
    "@types/react-dom": "^18.2.0",
    "@vitejs/plugin-react": "^4.0.0",
    "vite": "^4.4.0"
  }
}
EOF

# npm 패키지 설치
echo "📦 npm 패키지 설치..."
npm install

# 기본 React 파일들 생성
mkdir -p src
cat > index.html << 'EOF'
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>WindWalker Firebase Studio</title>
</head>
<body>
  <div id="root"></div>
  <script type="module" src="/src/main.jsx"></script>
</body>
</html>
EOF

cat > src/main.jsx << 'EOF'
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
EOF

cat > src/App.jsx << 'EOF'
import { useState } from 'react'
import './App.css'

function App() {
  const [count, setCount] = useState(0)

  return (
    <div className="App">
      <div>
        <h1>🔥 WindWalker + Firebase Studio</h1>
        <div className="card">
          <button onClick={() => setCount((count) => count + 1)}>
            count is {count}
          </button>
          <p>
            Edit <code>src/App.jsx</code> and save to test HMR
          </p>
        </div>
        <p className="read-the-docs">
          WindWalker IDE is running successfully! 🚀
        </p>
      </div>
    </div>
  )
}

export default App
EOF

cat > src/App.css << 'EOF'
.App {
  text-align: center;
  padding: 2em;
}

.card {
  padding: 2em;
}

button {
  border-radius: 8px;
  border: 1px solid transparent;
  padding: 0.6em 1.2em;
  font-size: 1em;
  font-weight: 500;
  font-family: inherit;
  background-color: #1a1a1a;
  color: white;
  cursor: pointer;
  transition: border-color 0.25s;
}

button:hover {
  border-color: #646cff;
}

h1 {
  font-size: 3.2em;
  line-height: 1.1;
}
EOF

cat > src/index.css << 'EOF'
body {
  margin: 0;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen',
    'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue',
    sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

#root {
  max-width: 1280px;
  margin: 0 auto;
  padding: 2rem;
  text-align: center;
}
EOF

cat > vite.config.js << 'EOF'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 3000,
    strictPort: true
  }
})
EOF

# 6. 필수 VS Code 확장 설치
echo "🔌 VS Code 확장 설치..."
code-server --install-extension ms-vscode.vscode-typescript-next
code-server --install-extension esbenp.prettier-vscode
code-server --install-extension bradlc.vscode-tailwindcss
code-server --install-extension ms-vscode.vscode-json

# 7. 시작 스크립트 생성
cd ~
cat > start-windwalker.sh << 'EOF'
#!/bin/bash
echo "🚀 WindWalker 시작 중..."

# Code-Server 백그라운드 실행
code-server --bind-addr 0.0.0.0:8080 \
           --user-data-dir ~/.local/share/code-server \
           --extensions-dir ~/.local/share/code-server/extensions \
           --disable-telemetry \
           --auth none \
           ~/windwalker/workspace &

CODE_SERVER_PID=$!

# React 개발 서버 백그라운드 실행
cd ~/windwalker/templates/react-app
npm run dev &
VITE_PID=$!

echo "✅ WindWalker 시작 완료!"
echo "🌐 VS Code IDE: http://localhost:8080"
echo "👁️ React Preview: http://localhost:3000"
echo ""
echo "종료하려면 Ctrl+C를 누르세요"

# Ctrl+C 시 모든 프로세스 종료
trap "kill $CODE_SERVER_PID $VITE_PID; exit" INT

# 프로세스 유지
wait
EOF

chmod +x start-windwalker.sh

echo ""
echo "🎉 Firebase Studio용 WindWalker 설정 완료!"
echo ""
echo "📋 다음 단계:"
echo "1. ./start-windwalker.sh 실행"
echo "2. Firebase Studio에서 포트 8080과 3000 열기"
echo "3. VS Code IDE와 React 프리뷰 확인"
echo ""
echo "📁 프로젝트 구조:"
echo "~/windwalker/"
echo "├── workspace/     # 작업 공간"
echo "├── templates/     # 프로젝트 템플릿"
echo "└── projects/      # 사용자 프로젝트"
2.2 실행 명령어
bash# Firebase Studio 터미널에서 실행
chmod +x firebase-studio-setup.sh
./firebase-studio-setup.sh

# 설정 완료 후 시작
./start-windwalker.sh


해결 방법 3: Firebase Studio 포트 설정
Firebase Studio에서 iframe으로 로컬호스트에 접근하려면 포트를 올바르게 노출해야 합니다.
3.1 Firebase Studio 설정 파일 확인
yaml# firebase-studio.yaml 또는 dev.nix
# 포트 8080과 3000을 노출해야 함
ports:
  - "8080:8080"  # VS Code IDE
  - "3000:3000"  # React Preview
3.2 포트 확인 명령어
bash# 현재 실행 중인 서비스 확인
sudo netstat -tlnp | grep :8080
sudo netstat -tlnp | grep :3000

# 포트가 열려있는지 확인
curl http://localhost:8080
curl http://localhost:3000
🔍 트러블슈팅
문제 1: "연결을 거부했습니다" 오류
원인: 포트가 올바르게 노출되지 않음
해결: Firebase Studio에서 포트 8080, 3000을 명시적으로 노출
문제 2: Code-Server가 시작되지 않음
원인: 권한 문제 또는 포트 충돌
해결:
bash# 포트 사용 중인 프로세스 종료
sudo lsof -ti:8080 | xargs kill -9
sudo lsof -ti:3000 | xargs kill -9

# 다시 시작
./start-windwalker.sh
문제 3: React 개발 서버 오류
원인: Node.js 버전 호환성 문제
해결:
bash# Node.js 버전 확인 및 재설치
node --version
npm --version

# 패키지 재설치
cd ~/windwalker/templates/react-app
rm -rf node_modules package-lock.json
npm install
이렇게 설정하면 Firebase Studio에서 정상적으로 WindWalker IDE가 실행될 것입니다!