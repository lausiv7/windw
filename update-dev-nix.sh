#!/bin/bash

# 현재 dev.nix 백업
cp .idx/dev.nix .idx/dev.nix.backup

# dev.nix 파일에 code-server 추가
cat > .idx/dev.nix << 'DEVNIX'
{ pkgs, ... }: {
  # Which nixpkgs channel to use.
  channel = "stable-23.11"; # or "unstable"

  # Use https://search.nixos.org/packages to find packages
  packages = [
    pkgs.nodejs_20
    pkgs.nodePackages.npm
    pkgs.code-server
  ];

  # Sets environment variables in the workspace
  env = {};
  idx = {
    # Search for the extensions you want on https://open-vsx.org/ and use "publisher.id"
    extensions = [
      "bradlc.vscode-tailwindcss"
      "ms-vscode.vscode-typescript-next"
    ];

    # Enable previews
    previews = {
      enable = true;
      previews = {
        web = {
          command = ["npm" "run" "dev" "--" "--port" "$PORT" "--hostname" "0.0.0.0"];
          manager = "web";
        };
        code-server = {
          command = ["code-server" "--bind-addr" "0.0.0.0:8080" "--auth" "none"];
          manager = "web";
        };
      };
    };

    # Workspace lifecycle hooks
    workspace = {
      # Runs when a workspace is first created
      onCreate = {
        # Example: install JS dependencies from NPM
        npm-install = "npm install";
      };
      # Runs when the workspace is (re)started
      onStart = {
        # Example: start a background task to watch and re-build the project
        # watch-backend = "npm run watch-backend";
      };
    };
  };
}
DEVNIX

echo "✅ dev.nix 파일이 업데이트되었습니다!"
echo "📋 변경사항:"
echo "   - code-server 패키지 추가"
echo "   - code-server 프리뷰 설정 추가"
echo ""
echo "🔄 이제 환경을 다시 빌드합니다..."
