#!/bin/bash

# setup.sh - WindWalker Code-Server 환경 구축 스크립트

echo "🚀 WindWalker Code-Server 환경 구축 시작..."

# 1. 프로젝트 구조 생성
echo "📁 프로젝트 구조 생성..."
mkdir -p workspace/{templates,projects}
mkdir -p extensions
mkdir -p vscode-config
mkdir -p logs

# 2. 기본 템플릿 프로젝트 생성
echo "📋 기본 템플릿 생성..."

# React 템플릿
mkdir -p workspace/templates/react-app
cat > workspace/templates/react-app/package.json << 'EOF'
{
  "name": "react-template",
  "version": "1.0.0",
  "private": true,
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview"
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

cat > workspace/templates/react-app/index.html << 'EOF'
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>WindWalker App</title>
</head>
<body>
  <div id="root"></div>
  <script type="module" src="/src/main.jsx"></script>
</body>
</html>
EOF

mkdir -p workspace/templates/react-app/src
cat > workspace/templates/react-app/src/main.jsx << 'EOF'
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

cat > workspace/templates/react-app/src/App.jsx << 'EOF'
import { useState } from 'react'
import './App.css'

function App() {
  const [count, setCount] = useState(0)

  return (
    <div className="App">
      <div>
        <h1>WindWalker</h1>
        <div className="card">
          <button onClick={() => setCount((count) => count + 1)}>
            count is {count}
          </button>
          <p>
            Edit <code>src/App.jsx</code> and save to test HMR
          </p>
        </div>
        <p className="read-the-docs">
          Click on the WindWalker logo to learn more
        </p>
      </div>
    </div>
  )
}

export default App
EOF

cat > workspace/templates/react-app/src/App.css << 'EOF'
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
  transition: border-color: 0.25s;
}

button:hover {
  border-color: #646cff;
}
EOF

cat > workspace/templates/react-app/src/index.css << 'EOF'
body {
  margin: 0;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen',
    'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue',
    sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}
EOF

cat > workspace/templates/react-app/vite.config.js << 'EOF'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 3000
  }
})
EOF

# Next.js 템플릿
mkdir -p workspace/templates/nextjs-app
cat > workspace/templates/nextjs-app/package.json << 'EOF'
{
  "name": "nextjs-template",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint"
  },
  "dependencies": {
    "next": "14.0.0",
    "react": "^18.2.0",
    "react-dom": "^18.2.0"
  },
  "devDependencies": {
    "@types/node": "^20.0.0",
    "@types/react": "^18.2.0",
    "@types/react-dom": "^18.2.0",
    "eslint": "^8.0.0",
    "eslint-config-next": "14.0.0",
    "typescript": "^5.0.0"
  }
}
EOF

# 3. VS Code 기본 설정
echo "⚙️ VS Code 설정..."
cat > vscode-config/settings.json << 'EOF'
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
  "workbench.startupEditor": "welcomePage"
}
EOF

# 4. 기본 확장 목록 생성
cat > extensions/install-extensions.sh << 'EOF'
#!/bin/bash
# VS Code 확장 자동 설치 스크립트

echo "📦 기본 확장 설치 중..."

# 필수 확장들
extensions=(
  "ms-vscode.vscode-typescript-next"
  "bradlc.vscode-tailwindcss" 
  "esbenp.prettier-vscode"
  "ms-vscode.vscode-json"
  "ritwickdey.liveserver"
  "formulahendry.auto-rename-tag"
  "christian-kohler.path-intellisense"
  "ms-vscode.vscode-css-peek"
)

for ext in "${extensions[@]}"; do
  echo "Installing $ext..."
  code-server --install-extension "$ext" --force
done

echo "✅ 확장 설치 완료!"
EOF

chmod +x extensions/install-extensions.sh

# 5. 헬퍼 스크립트들
cat > start.sh << 'EOF'
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
EOF

cat > stop.sh << 'EOF'
#!/bin/bash
echo "🛑 WindWalker 종료 중..."
docker-compose down
echo "✅ WindWalker가 종료되었습니다."
EOF

chmod +x start.sh stop.sh

# 6. 권한 설정
echo "🔒 권한 설정..."
sudo chown -R 1000:1000 workspace extensions vscode-config
chmod -R 755 workspace extensions vscode-config

echo ""
echo "🎉 WindWalker Code-Server 환경 구축 완료!"
echo ""
echo "다음 단계:"
echo "1. docker-compose up -d        # 서비스 시작"
echo "2. http://localhost:8080 접속  # IDE 사용 (패스워드: windwalker2024)"
echo "3. 또는 ./start.sh 실행        # 간편 시작"
echo ""
echo "📁 프로젝트 구조:"
echo "├── workspace/          # 사용자 프로젝트 공간"
echo "│   ├── templates/      # 프로젝트 템플릿"
echo "│   └── projects/       # 사용자 프로젝트"
echo "├── extensions/         # VS Code 확장"
echo "└── vscode-config/      # VS Code 설정"
