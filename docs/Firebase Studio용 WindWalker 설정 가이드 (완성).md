# Firebase Studio Nix 환경에서 Code Server 실행 가이드

Firebase Studio의 Nix 환경에서 VS Code for the Web (code-server)을 설치하고 실행하여 웹 기반 IDE를 사용하는 완전한 가이드입니다.

## 사전 준비사항

- Firebase Studio 환경 접근 권한
- 터미널 접근 권한
- Nix 패키지 관리자가 설치된 환경

## 1. Nix 환경 설정 및 Code Server 설치

### 1.1 Nix 환경 확인 및 code-server 설치 문제 해결
Firebase Studio는 Nix 패키지 관리자를 사용합니다. **중요**: code-server가 기본 nixpkgs에서 제거되었으므로 특별한 설치 방법이 필요합니다.

```bash
# Nix 버전 확인
nix --version

# 현재 채널 확인
nix-channel --list

# 기본 nixpkgs에서 code-server 설치 시도 (실패할 것임)
nix-shell -p code-server --run "code-server --version"
# 오류: 'code-server' has been removed from nixpkgs, as it was depending on EOL Node.js and is unmaintained.
```

#### Code Server 설치 문제 및 해결방법

**문제**: code-server가 기본 nixpkgs에서 제거됨 (EOL Node.js 의존성과 유지보수 중단으로 인해)

**해결방법**: unstable 채널 또는 직접 URL을 통한 설치

### 1.2 Code Server 설치 방법들

#### 방법 1: unstable 채널을 통한 설치 (권장)
```bash
# unstable 채널 URL을 직접 사용하여 설치 및 버전 확인
nix-shell -I nixpkgs=https://github.com/NixOS/nixpkgs/archive/nixos-unstable.tar.gz -p code-server --run "code-server --version"

# 성공 시 출력: code-server 4.91.1 (또는 최신 버전)
```

#### 방법 2: dev.nix 파일 수정 (Firebase Studio 환경)
```bash
# Firebase Studio의 dev.nix 파일을 unstable 채널로 수정
cat > .idx/dev.nix << 'EOF'
# To learn more about how to use Nix to configure your environment
# see: https://firebase.google.com/docs/studio/customize-workspace
{pkgs}: {
  # unstable 채널 사용으로 code-server 설치 가능
  channel = "nixos-unstable";
  
  # Use https://search.nixos.org/packages to find packages
  packages = [
    pkgs.nodejs_20
    pkgs.zulu
    pkgs.code-server  # unstable 채널에서만 사용 가능
    pkgs.git
  ];
  
  # Sets environment variables in the workspace
  env = {};
  
  # Firebase emulators 설정
  services.firebase.emulators = {
    detect = true;
    projectId = "demo-app";
    services = ["auth" "firestore"];
  };
  
  idx = {
    extensions = [];
    workspace = {
      onCreate = {
        default.openFiles = [
          "src/app/page.tsx"
        ];
      };
    };
    
    # Enable previews and customize configuration
    previews = {
      enable = true;
      previews = {
        web = {
          command = ["npm" "run" "dev" "--" "--port" "$PORT" "--hostname" "0.0.0.0"];
          manager = "web";
        };
      };
    };
  };
}
EOF
```

#### 방법 3: 직접 설치 (대안)
```bash
# 홈 디렉토리에 직접 설치
curl -fsSL https://code-server.dev/install.sh | sh

# 또는 수동 다운로드 및 설치
wget https://github.com/coder/code-server/releases/download/v4.91.1/code-server-4.91.1-linux-amd64.tar.gz
tar -xzf code-server-4.91.1-linux-amd64.tar.gz
sudo mv code-server-4.91.1-linux-amd64/bin/code-server /usr/local/bin/
```

### 1.2 Code Server 설치 스크립트 작성

#### 방법 1: Docker 방식 (권장하지 않음 - Nix 환경에서 충돌 가능)
Firebase Studio Nix 환경에서는 Docker 방식보다는 직접 설치가 더 안정적입니다.

#### 방법 2: 직접 설치 방식 (권장)
```bash
# install-windwalker-setup.sh 파일 생성
cat > install-windwalker-setup.sh << 'EOF'
#!/bin/bash

echo "🚀 WindWalker Code Server 설치 및 초기화 시작..."

# 1. Nix 채널 설정 (unstable 채널에서 최신 code-server 설치)
echo "📦 Nix 채널 설정..."
nix-channel --add https://nixos.org/channels/nixos-unstable unstable
nix-channel --update

# 2. Code Server 및 필요한 패키지 설치
echo "🔧 Code Server 및 개발 도구 설치 중..."
nix-env -iA unstable.code-server
nix-env -iA unstable.nodejs
nix-env -iA unstable.git
nix-env -iA unstable.tree

# 3. 프로젝트 구조 생성 (Docker 볼륨 마운트와 동일한 구조)
echo "📁 프로젝트 구조 생성..."
mkdir -p ~/windwalker/{workspace,extensions,vscode-config,logs}
mkdir -p ~/windwalker/workspace/{templates,projects}

# 4. 워크스페이스 디렉토리 설정 (Docker의 /home/coder/workspace와 동일)
WORKSPACE_DIR="$HOME/windwalker/workspace"
EXTENSIONS_DIR="$HOME/windwalker/extensions"
VSCODE_CONFIG_DIR="$HOME/windwalker/vscode-config"
USER_DATA_DIR="$HOME/.local/share/code-server"

# 5. 사용자 데이터 디렉토리 생성
mkdir -p "$USER_DATA_DIR"/{extensions,User}

# 6. VS Code 설정 파일 생성 (Docker의 vscode-config 마운트와 동일)
echo "⚙️ VS Code 기본 설정..."
cat > "$VSCODE_CONFIG_DIR/settings.json" << 'SETTINGS_EOF'
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
  "workbench.sideBar.location": "left",
  "explorer.confirmDragAndDrop": false,
  "explorer.confirmDelete": false
}
SETTINGS_EOF

# 7. React 템플릿 생성 (Docker 환경과 동일)
echo "📋 React 템플릿 생성..."
mkdir -p "$WORKSPACE_DIR/templates/react-app/src"

cat > "$WORKSPACE_DIR/templates/react-app/package.json" << 'REACT_PACKAGE_EOF'
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
REACT_PACKAGE_EOF

cat > "$WORKSPACE_DIR/templates/react-app/index.html" << 'HTML_EOF'
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
HTML_EOF

cat > "$WORKSPACE_DIR/templates/react-app/src/main.jsx" << 'MAIN_EOF'
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
MAIN_EOF

cat > "$WORKSPACE_DIR/templates/react-app/src/App.jsx" << 'APP_EOF'
import { useState } from 'react'
import './App.css'

function App() {
  const [count, setCount] = useState(0)

  return (
    <div className="App">
      <div>
        <h1>🌪️ WindWalker</h1>
        <div className="card">
          <button onClick={() => setCount((count) => count + 1)}>
            count is {count}
          </button>
          <p>
            Edit <code>src/App.jsx</code> and save to test HMR
          </p>
        </div>
        <p className="read-the-docs">
          Welcome to WindWalker IDE!
        </p>
      </div>
    </div>
  )
}

export default App
APP_EOF

cat > "$WORKSPACE_DIR/templates/react-app/src/App.css" << 'APP_CSS_EOF'
.App {
  text-align: center;
  padding: 2em;
  max-width: 1280px;
  margin: 0 auto;
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

button:focus,
button:focus-visible {
  outline: 4px auto -webkit-focus-ring-color;
}
APP_CSS_EOF

cat > "$WORKSPACE_DIR/templates/react-app/src/index.css" << 'INDEX_CSS_EOF'
:root {
  font-family: Inter, system-ui, Avenir, Helvetica, Arial, sans-serif;
  line-height: 1.5;
  font-weight: 400;

  color-scheme: light dark;
  color: rgba(255, 255, 255, 0.87);
  background-color: #242424;

  font-synthesis: none;
  text-rendering: optimizeLegibility;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  -webkit-text-size-adjust: 100%;
}

body {
  margin: 0;
  display: flex;
  place-items: center;
  min-width: 320px;
  min-height: 100vh;
}

#root {
  max-width: 1280px;
  margin: 0 auto;
  padding: 2rem;
  text-align: center;
}
INDEX_CSS_EOF

cat > "$WORKSPACE_DIR/templates/react-app/vite.config.js" << 'VITE_CONFIG_EOF'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 3000
  },
  preview: {
    host: '0.0.0.0',
    port: 3000
  }
})
VITE_CONFIG_EOF

# 8. Next.js 템플릿 생성
echo "📋 Next.js 템플릿 생성..."
mkdir -p "$WORKSPACE_DIR/templates/nextjs-app/pages"

cat > "$WORKSPACE_DIR/templates/nextjs-app/package.json" << 'NEXTJS_PACKAGE_EOF'
{
  "name": "windwalker-nextjs-template",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev -H 0.0.0.0 -p 3000",
    "build": "next build",
    "start": "next start -H 0.0.0.0 -p 3000",
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
NEXTJS_PACKAGE_EOF

cat > "$WORKSPACE_DIR/templates/nextjs-app/pages/index.js" << 'NEXTJS_INDEX_EOF'
export default function Home() {
  return (
    <div style={{ padding: '2rem', textAlign: 'center' }}>
      <h1>🌪️ WindWalker Next.js</h1>
      <p>Welcome to your WindWalker Next.js project!</p>
    </div>
  )
}
NEXTJS_INDEX_EOF

# 9. VS Code 확장 설치 스크립트 생성
echo "📦 VS Code 확장 설치 스크립트 생성..."
cat > "$EXTENSIONS_DIR/install-extensions.sh" << 'EXTENSIONS_EOF'
#!/bin/bash
# VS Code 확장 자동 설치 스크립트

echo "📦 WindWalker 기본 확장 설치 중..."

# 필수 확장들 (Docker 환경과 동일)
extensions=(
  "ms-vscode.vscode-typescript-next"
  "bradlc.vscode-tailwindcss" 
  "esbenp.prettier-vscode"
  "ms-vscode.vscode-json"
  "ritwickdey.liveserver"
  "formulahendry.auto-rename-tag"
  "christian-kohler.path-intellisense"
  "ms-vscode.vscode-css-peek"
  "ms-vscode.vscode-eslint"
  "ms-vscode.vscode-html-css-support"
)

for ext in "${extensions[@]}"; do
  echo "Installing $ext..."
  code-server --install-extension "$ext" --force || echo "Failed to install $ext"
done

echo "✅ 확장 설치 완료!"
EXTENSIONS_EOF

chmod +x "$EXTENSIONS_DIR/install-extensions.sh"

# 10. 사용자 설정을 시스템 디렉토리로 복사
echo "🔗 설정 파일 연결..."
cp "$VSCODE_CONFIG_DIR/settings.json" "$USER_DATA_DIR/User/settings.json" 2>/dev/null || true

# 11. 권한 설정
echo "🔒 권한 설정..."
chmod -R 755 ~/windwalker
chmod +x "$EXTENSIONS_DIR/install-extensions.sh"

echo ""
echo "🎉 WindWalker Code Server 환경 구축 완료!"
echo ""
echo "📁 생성된 구조:"
echo "├── ~/windwalker/"
echo "│   ├── workspace/          # 워크스페이스 (Docker의 /home/coder/workspace와 동일)"
echo "│   │   ├── templates/      # 프로젝트 템플릿"
echo "│   │   │   ├── react-app/"
echo "│   │   │   └── nextjs-app/"
echo "│   │   └── projects/       # 사용자 프로젝트"
echo "│   ├── extensions/         # VS Code 확장 (Docker의 extensions 마운트와 동일)"
echo "│   ├── vscode-config/      # VS Code 설정 (Docker의 vscode-config 마운트와 동일)"
echo "│   └── logs/              # 로그 파일"
echo "└── ~/.local/share/code-server/  # Code Server 사용자 데이터"
echo ""
echo "다음 단계:"
echo "1. 기본 확장 설치: ~/windwalker/extensions/install-extensions.sh"
echo "2. Code Server 실행: ./start-windwalker.sh"
echo "3. 또는 직접 실행: code-server --bind-addr 0.0.0.0:8081 --auth none ~/windwalker/workspace"
EOF

# 실행 권한 부여
chmod +x install-windwalker-setup.sh
```

### 1.3 WindWalker 실행 스크립트 생성
설치 스크립트와 함께 Docker와 동일한 환경을 제공하는 실행 스크립트를 생성합니다:

```bash
# start-windwalker.sh 파일 생성
cat > start-windwalker.sh << 'EOF'
#!/bin/bash

# WindWalker Code Server 실행 스크립트 (Docker 환경과 동일한 설정)
echo "🚀 WindWalker Code Server 시작..."

# Docker 환경과 동일한 디렉토리 구조 설정
WORKSPACE_DIR="$HOME/windwalker/workspace"
USER_DATA_DIR="$HOME/.local/share/code-server"
EXTENSIONS_DIR="$USER_DATA_DIR/extensions"

# 디렉토리 존재 확인
if [ ! -d "$WORKSPACE_DIR" ]; then
    echo "❌ 워크스페이스가 설정되지 않았습니다. install-windwalker-setup.sh를 먼저 실행하세요."
    exit 1
fi

# 포트 설정 (기본값: 8081, Docker와 동일하게 8080도 지원)
PORT=${1:-8081}
AUTH_TYPE=${2:-none}

echo "📂 워크스페이스: $WORKSPACE_DIR"
echo "🔧 확장 디렉토리: $EXTENSIONS_DIR"
echo "🌐 포트: $PORT"
echo "🔐 인증: $AUTH_TYPE"

# 포트 사용 확인
if lsof -Pi :$PORT -sTCP:LISTEN -t >/dev/null ; then
    echo "⚠️ 포트 $PORT 이미 사용 중입니다."
    echo "다른 포트를 사용하려면: $0 [포트번호]"
    echo "예시: $0 8082"
    exit 1
fi

# Docker의 command와 동일한 옵션으로 실행
echo "🚀 Code Server 시작 중..."
code-server \
  --bind-addr 0.0.0.0:$PORT \
  --user-data-dir "$USER_DATA_DIR" \
  --extensions-dir "$EXTENSIONS_DIR" \
  --disable-telemetry \
  --auth $AUTH_TYPE \
  "$WORKSPACE_DIR"
EOF

chmod +x start-windwalker.sh
```

### 1.4 설치 확인 및 검증
설치가 완료되면 각 방법별로 버전을 확인합니다:

```bash
# 방법 1: 기본 nixpkgs (작동하지 않을 경우)
nix-shell -p code-server --run "code-server --version" 2>/dev/null || echo "기본 nixpkgs에서 사용 불가"

# 방법 2: unstable 채널 (권장)
nix-shell -I nixpkgs=https://github.com/NixOS/nixpkgs/archive/nixos-unstable.tar.gz -p code-server --run "code-server --version"
# 예상 출력: code-server 4.91.1 1962f48b7f71772dc2c060dbaa5a6b4c0792a549

# 방법 3: 직접 설치
code-server --version 2>/dev/null || echo "직접 설치 필요"

# 추가 패키지 확인
node --version
git --version

# 프로젝트 구조 확인
tree ~/windwalker -L 3 2>/dev/null || ls -la ~/windwalker/
```

#### Nix 환경별 실행 명령어 정리
```bash
# unstable 채널 사용 (권장)
nix-shell -I nixpkgs=https://github.com/NixOS/nixpkgs/archive/nixos-unstable.tar.gz -p code-server --run "code-server --bind-addr 0.0.0.0:8081 --auth none ~/windwalker/workspace"

# 직접 설치된 경우
code-server --bind-addr 0.0.0.0:8081 --auth none ~/windwalker/workspace

# 스크립트 사용 (모든 방법 자동 감지)
~/windwalker/start-windwalker-nix.sh
```

## 2. 실행 스크립트 작성 및 Docker 환경 호환

### 2.1 통합 실행 스크립트 (Docker 환경과 동일한 설정)
직접 설치 방식에서도 Docker의 볼륨 마운트와 포트 설정을 동일하게 구현합니다:

```bash
# start-code-server.sh 파일 생성 (이미 start-windwalker.sh로 생성됨)
# Docker의 command 옵션과 동일한 실행 방식을 제공

# 사용법:
./start-windwalker.sh              # 기본 포트 8081
./start-windwalker.sh 8080         # Docker와 동일한 8080 포트  
./start-windwalker.sh 8082 password # 포트 8082, 패스워드 인증
```

### 2.2 Docker vs 직접 설치 환경 비교

| 구성 요소 | Docker 환경 | 직접 설치 환경 |
|-----------|-------------|---------------|
| **워크스페이스** | `/home/coder/workspace` | `~/windwalker/workspace` |
| **확장 디렉토리** | `/home/coder/.local/share/code-server/extensions` | `~/.local/share/code-server/extensions` |
| **설정 디렉토리** | `/home/coder/.local/share/code-server/User` | `~/.local/share/code-server/User` |
| **기본 포트** | `8080` | `8081` (충돌 방지) |
| **인증 방식** | `PASSWORD=windwalker2024` | `--auth none` (기본값) |
| **바인드 주소** | `0.0.0.0:8080` | `0.0.0.0:8081` |

### 2.3 Docker 호환 디렉토리 구조 스크립트
```bash
# create-docker-compatible-structure.sh
cat > create-docker-compatible-structure.sh << 'EOF'
#!/bin/bash

echo "🔄 Docker 호환 디렉토리 구조 생성..."

# Docker의 볼륨 마운트 구조와 동일하게 심볼릭 링크 생성
WINDWALKER_HOME="$HOME/windwalker"

# Docker의 워크스페이스 경로 호환
if [ ! -L "/home/coder/workspace" ]; then
    sudo mkdir -p /home/coder 2>/dev/null || true
    ln -sf "$WINDWALKER_HOME/workspace" "$HOME/workspace" 2>/dev/null || true
    echo "✅ 워크스페이스 링크 생성: ~/workspace -> ~/windwalker/workspace"
fi

# Docker의 확장 디렉토리 호환
mkdir -p "$HOME/.local/share/code-server"
if [ ! -L "$HOME/.local/share/code-server/extensions" ]; then
    ln -sf "$WINDWALKER_HOME/extensions" "$HOME/.local/share/code-server/extensions" 2>/dev/null || true
    echo "✅ 확장 디렉토리 링크 생성"
fi

# Docker의 설정 디렉토리 호환
if [ ! -L "$HOME/.local/share/code-server/User" ]; then
    ln -sf "$WINDWALKER_HOME/vscode-config" "$HOME/.local/share/code-server/User" 2>/dev/null || true
    echo "✅ 설정 디렉토리 링크 생성"
fi

echo "🐳 Docker 호환 구조 생성 완료!"
EOF

chmod +x create-docker-compatible-structure.sh
```

### 2.4 템플릿 프로젝트 생성 스크립트
Docker 환경의 setup.sh와 동일한 기능을 제공합니다:

```bash
# create-project-from-template.sh
cat > create-project-from-template.sh << 'EOF'
#!/bin/bash

# WindWalker 프로젝트 생성 스크립트 (Docker setup.sh와 동일)
WORKSPACE_DIR="$HOME/windwalker/workspace"
TEMPLATES_DIR="$WORKSPACE_DIR/templates"
PROJECTS_DIR="$WORKSPACE_DIR/projects"

echo "🎯 WindWalker 프로젝트 생성..."

# 프로젝트 이름 입력
read -p "프로젝트 이름을 입력하세요: " PROJECT_NAME

if [ -z "$PROJECT_NAME" ]; then
    echo "❌ 프로젝트 이름이 필요합니다."
    exit 1
fi

# 템플릿 선택
echo ""
echo "사용 가능한 템플릿:"
echo "1) React + Vite"
echo "2) Next.js"

read -p "템플릿을 선택하세요 (1-2): " TEMPLATE_CHOICE

case $TEMPLATE_CHOICE in
    1)
        TEMPLATE_DIR="$TEMPLATES_DIR/react-app"
        TEMPLATE_NAME="React"
        ;;
    2)
        TEMPLATE_DIR="$TEMPLATES_DIR/nextjs-app"
        TEMPLATE_NAME="Next.js"
        ;;
    *)
        echo "❌ 잘못된 선택입니다."
        exit 1
        ;;
esac

# 프로젝트 디렉토리 생성
PROJECT_DIR="$PROJECTS_DIR/$PROJECT_NAME"

if [ -d "$PROJECT_DIR" ]; then
    echo "❌ 프로젝트 '$PROJECT_NAME'이 이미 존재합니다."
    exit 1
fi

# 템플릿 복사
echo "📋 $TEMPLATE_NAME 템플릿 복사 중..."
cp -r "$TEMPLATE_DIR" "$PROJECT_DIR"

# package.json의 이름 업데이트
if [ -f "$PROJECT_DIR/package.json" ]; then
    sed -i "s/windwalker-.*-template/$PROJECT_NAME/g" "$PROJECT_DIR/package.json"
fi

echo ""
echo "🎉 프로젝트 '$PROJECT_NAME' 생성 완료!"
echo "📁 위치: $PROJECT_DIR"
echo ""
echo "다음 단계:"
echo "1. cd $PROJECT_DIR"
echo "2. npm install"
echo "3. npm run dev"
echo "4. Code Server에서 프로젝트 폴더 열기"

EOF

chmod +x create-project-from-template.sh
```

## 3. 포트 사용 현황 확인 및 관리

Code Server를 실행하기 전에 사용하려는 포트가 이미 사용 중인지 확인합니다.

### 3.1 포트 사용 현황 확인
```bash
# 특정 포트 사용 현황 확인 (예: 8080)
lsof -i :8080

# 또는 netstat 사용
netstat -tulpn | grep :8080

# 모든 프로세스에서 특정 포트 확인
ps aux | grep 8080
```

### 3.2 사용 중인 포트 종료 (필요시)
```bash
# 특정 포트를 사용하는 프로세스 종료
# 먼저 PID 확인
lsof -ti :8080

# PID를 이용한 프로세스 종료
kill -9 $(lsof -ti :8080)
```

### 3.3 포트 관리 스크립트
```bash
# port-manager.sh 파일 생성
cat > port-manager.sh << 'EOF'
#!/bin/bash

case "$1" in
    "check")
        PORT=${2:-8080}
        echo "포트 $PORT 사용 현황:"
        lsof -i :$PORT
        ;;
    "kill")
        PORT=${2:-8080}
        PID=$(lsof -ti :$PORT)
        if [ ! -z "$PID" ]; then
            echo "포트 $PORT 에서 실행 중인 프로세스 $PID 를 종료합니다."
            kill -9 $PID
            echo "프로세스가 종료되었습니다."
        else
            echo "포트 $PORT 에서 실행 중인 프로세스가 없습니다."
        fi
        ;;
    "list")
        echo "사용 중인 모든 포트:"
        netstat -tulpn | grep LISTEN
        ;;
    *)
        echo "사용법: $0 {check|kill|list} [포트번호]"
        echo "  check [포트]: 특정 포트 사용 현황 확인"
        echo "  kill [포트]: 특정 포트 사용 프로세스 종료"
        echo "  list: 모든 사용 중인 포트 목록"
        ;;
esac
EOF

# 실행 권한 부여
chmod +x port-manager.sh
```

## 4. Code Server 실행 방법

### 4.1 스크립트를 이용한 실행 (권장)

#### 기본 실행
```bash
# 기본 포트 8080으로 실행
./start-code-server.sh

# 특정 포트로 실행
./start-code-server.sh 8081

# 포트와 작업 디렉토리 지정
./start-code-server.sh 8081 ~/my-project

# 자동 포트 감지로 실행
./start-code-server-auto.sh
```

### 4.2 직접 명령어 실행

### 기본 실행 (포트 8080)
```bash
code-server --bind-addr 0.0.0.0:8080 --auth none ~/studio
```

### 다른 포트 사용 (포트 8081)
만약 8080 포트가 이미 사용 중이라면 다른 포트를 사용합니다:

```bash
code-server --bind-addr 0.0.0.0:8081 --auth none ~/studio
```

### 실행 옵션 설명
- `--bind-addr 0.0.0.0:포트번호`: 모든 IP에서 접근 가능하도록 바인딩
- `--auth none`: 인증 비활성화 (개발 환경용)
- `~/studio`: 작업 디렉토리 지정
- `--config`: 설정 파일 지정 (선택사항)
- `--user-data-dir`: 사용자 데이터 디렉토리 지정 (선택사항)

### 4.3 실행 상태 확인
```bash
# 실행 중인 code-server 프로세스 확인
ps aux | grep code-server

# 포트 리스닝 상태 확인
netstat -tulpn | grep :8081
```

## 5. Firebase Studio에서 포트 접근 설정 및 문제 해결

Code Server가 실행되면 Firebase Studio에서 포트를 공개적으로 접근 가능하도록 설정해야 합니다.

### 5.1 Firebase Studio 패널 열기
- VS Code에서 `Ctrl+Shift+P` (Mac: `Cmd+Shift+P`)로 명령 팔레트 열기
- 또는 좌측 액티비티 바에서 Firebase Studio 아이콘 클릭

### 5.2 Backend Ports 섹션 확인
- Firebase Studio 패널에서 "Backend ports" 섹션을 확장
- 실행 중인 서버 목록에서 해당 포트 번호 확인 (예: 8081)

### 5.3 포트를 공개로 설정
1. 포트 번호 왼쪽의 **잠금 아이콘(Make public)** 클릭
2. 아이콘이 **지구본 모양**으로 변경되면 공개 설정 완료
3. 포트 번호 오른쪽의 **"Copy URL" 아이콘**을 클릭하여 접근 URL 복사

### 5.4 포트가 Backend Ports에 표시되지 않는 경우
만약 실행한 포트가 Backend Ports 목록에 나타나지 않는다면:

```bash
# Firebase Studio 패널 새로고침
# 또는 code-server 재시작

# 프로세스가 정상 실행 중인지 확인
ps aux | grep code-server

# 포트가 정상적으로 리스닝 중인지 확인
lsof -i :8081

# code-server 로그 확인
# 터미널에서 실행 중인 code-server의 출력 메시지 확인
```

## 6. 웹 브라우저에서 접근 및 초기 설정

복사한 URL을 웹 브라우저에 붙여넣기하여 VS Code for the Web에 접근합니다.

## 7. 실행 결과 확인 및 모니터링

처음 접근할 때 다음과 같은 설정을 진행합니다:

### 6.1 신뢰 설정
- "Do you trust the authors of the files in this folder?" 대화상자가 나타남
- **"Yes, I trust the authors"** 버튼 클릭하여 모든 기능 활성화

### 6.2 테마 선택
- Dark Modern, Light Modern, High Contrast 등에서 원하는 테마 선택
- 나중에 설정에서 변경 가능

## 7. 실행 결과 확인

정상적으로 실행되면 다음과 같은 로그가 출력됩니다:

```
[2025-07-26T17:33:21.375Z] info  code-server 4.91.1 1962f48b7f71772dc2c060dbaa5a6b4c0792a549
[2025-07-26T17:33:21.407Z] info  HTTP server listening on http://0.0.0.0:8081/
[2025-07-26T17:33:21.407Z] info    - Authentication is disabled
[2025-07-26T17:33:21.407Z] info    - Not serving HTTPS
```

### 7.1 모니터링 스크립트
```bash
# monitor-code-server.sh 파일 생성
cat > monitor-code-server.sh << 'EOF'
#!/bin/bash

echo "Code Server 모니터링 시작..."

while true; do
    clear
    echo "=== Code Server 상태 모니터링 ==="
    echo "현재 시간: $(date)"
    echo ""
    
    echo "1. 실행 중인 code-server 프로세스:"
    ps aux | grep code-server | grep -v grep
    echo ""
    
    echo "2. 리스닝 중인 포트:"
    netstat -tulpn | grep code-server
    echo ""
    
    echo "3. 메모리 사용량:"
    ps aux | grep code-server | grep -v grep | awk '{print "CPU: "$3"%, Memory: "$4"%"}'
    echo ""
    
    echo "새로고침: 5초마다 업데이트 (Ctrl+C로 종료)"
    sleep 5
done
EOF

# 실행 권한 부여
chmod +x monitor-code-server.sh
```

## 8. 주의사항 및 보안 고려사항

### 보안 주의사항
- `--auth none` 옵션으로 인증이 비활성화되어 있습니다
- 포트를 공개로 설정하면 워크스페이스가 활성화된 동안 인터넷의 누구나 접근 가능합니다
- 개발 환경에서만 사용하고, 중요한 정보가 포함된 프로젝트는 주의해서 사용하세요

### 문제 해결 및 최적화
- **포트 충돌**: 자동 포트 감지 스크립트 사용 또는 `port-manager.sh`로 포트 관리
- **Backend Ports에 표시되지 않음**: Firebase Studio 패널 새로고침 또는 code-server 재시작
- **접속 불가**: 방화벽 설정 확인 및 `--bind-addr 0.0.0.0:포트` 옵션 확인
- **성능 저하**: `monitor-code-server.sh`로 리소스 사용량 확인

### Nix 환경 특정 고려사항
- Nix 패키지 업데이트 시 code-server 재설치 필요할 수 있음
- 환경 변수 설정이 Nix 환경에 따라 달라질 수 있음
- 의존성 패키지들이 Nix store에 별도로 관리됨

## 9. 중단 및 정리 방법

### 9.1 Code Server 중단
```bash
# 터미널에서 실행 중인 경우
Ctrl+C

# 백그라운드에서 실행 중인 경우
kill -9 $(lsof -ti :8081)

# 또는 포트 관리 스크립트 사용
./port-manager.sh kill 8081
```

### 9.2 완전한 정리
```bash
# 모든 code-server 프로세스 종료
pkill -f code-server

# 임시 파일 정리 (선택사항)
rm -rf ~/.local/share/code-server/logs/*
```

## 10. 빠른 시작 명령어 모음

### 설치부터 실행까지 한 번에
```bash
# 1. 설치 스크립트 다운로드 및 실행
chmod +x install-code-server.sh && ./install-code-server.sh

# 2. 실행 스크립트 준비
chmod +x start-code-server-auto.sh

# 3. Code Server 실행 (자동 포트 감지)
./start-code-server-auto.sh

# 4. Firebase Studio에서 Backend Ports 확인 후 포트 공개 설정
```

### 주요 스크립트 파일들
- `install-code-server.sh`: Code Server 설치
- `start-code-server.sh`: 기본 실행 스크립트
- `start-code-server-auto.sh`: 자동 포트 감지 실행 스크립트
- `port-manager.sh`: 포트 관리 유틸리티
- `monitor-code-server.sh`: 실행 상태 모니터링

---

이제 Firebase Studio의 Nix 환경에서 완전한 웹 기반 VS Code IDE를 안정적으로 사용할 수 있습니다!