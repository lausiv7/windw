#!/bin/bash

# 🌪️ WindWalker 통합 테스트 스위트
# Claude Code + Playwright + MCP 기반 자동화 테스트 시스템

set -e

# 색상 정의
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 로그 함수
log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
}

success() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] ✅${NC} $1"
}

warning() {
    echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] ⚠️${NC} $1"
}

error() {
    echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] ❌${NC} $1"
}

# 도움말 표시
show_help() {
    cat << EOF
🌪️ WindWalker 테스트 자동화 스위트

사용법: $0 [명령어] [옵션]

명령어:
  test [mode]          테스트 실행 (mode: semi-auto|auto|interactive)
  generate [type]      테스트 생성 (type: record|template|ui)  
  ui                   브라우저 테스트 선택기 열기
  report              최신 테스트 리포트 보기
  clean               임시 파일 정리
  setup               초기 환경 설정
  help                이 도움말 표시

테스트 모드:
  semi-auto     ✅ 반자동 (기본값) - 실패 시 사용자 승인 후 수정
  auto          🔁 자동 복구 - 실패 시 자동으로 수정 반복
  interactive   💬 대화형 - 사용자와 상호작용하며 수정

예시:
  $0 test semi-auto           # 반자동 모드로 테스트
  $0 test auto               # 자동 복구 모드
  $0 generate record         # 브라우저 녹화로 테스트 생성
  $0 ui                      # 브라우저 테스트 선택기
  $0 report                  # 최신 리포트 보기

EOF
}

# 환경 설정 확인
check_dependencies() {
    log "종속성 확인 중..."
    
    # Node.js 확인
    if ! command -v node &> /dev/null; then
        error "Node.js가 설치되지 않았습니다."
        exit 1
    fi
    
    # npm 확인
    if ! command -v npm &> /dev/null; then
        error "npm이 설치되지 않았습니다."
        exit 1
    fi
    
    # git 확인
    if ! command -v git &> /dev/null; then
        warning "Git이 설치되지 않았습니다. GitHub 푸시 기능이 비활성화됩니다."
    fi
    
    # package.json 확인
    if [ ! -f "package.json" ]; then
        error "package.json이 없습니다. npm init을 실행하세요."
        exit 1
    fi
    
    success "모든 종속성 확인 완료"
}

# 초기 환경 설정
setup_environment() {
    log "환경 설정 시작..."
    
    # npm 패키지 설치
    if [ ! -d "node_modules" ]; then
        log "npm 패키지 설치 중..."
        npm install
    fi
    
    # Playwright 브라우저 설치
    log "Playwright 브라우저 설치 중..."
    npx playwright install chromium
    
    # 디렉토리 생성
    mkdir -p tests reports docs .temp-repairs
    
    success "환경 설정 완료"
}

# 테스트 실행
run_tests() {
    local mode=${1:-"semi-auto"}
    
    log "테스트 실행 준비..."
    check_dependencies
    
    # Code Server 실행 상태 확인
    if ! curl -s http://localhost:8082 > /dev/null; then
        warning "Code Server가 실행되지 않았습니다. 시작 중..."
        bash ../start-windwalker.sh &
        sleep 10
    fi
    
    log "테스트 모드: $mode"
    
    # 자동 복구 루프 실행
    node auto-repair-loop.js "$mode"
    
    local exit_code=$?
    
    if [ $exit_code -eq 0 ]; then
        success "테스트 완료!"
    else
        error "테스트 실패 (종료 코드: $exit_code)"
    fi
    
    return $exit_code
}

# 테스트 생성
generate_tests() {
    local type=${1:-"ui"}
    
    case $type in
        "record")
            log "브라우저 녹화로 테스트 생성..."
            node test-generator.js record
            ;;
        "template")
            local component_name=${2:-"NewComponent"}
            log "테스트 템플릿 생성: $component_name"
            node test-generator.js template "$component_name"
            ;;
        "ui")
            log "브라우저 테스트 선택기 생성..."
            node test-generator.js ui
            ;;
        *)
            error "지원하지 않는 생성 타입: $type"
            echo "지원 타입: record, template, ui"
            exit 1
            ;;
    esac
}

# 브라우저 UI 열기
open_test_ui() {
    local ui_file="test-selector-ui.html"
    
    if [ ! -f "$ui_file" ]; then
        log "테스트 UI 파일이 없습니다. 생성 중..."
        node test-generator.js ui
    fi
    
    local full_path="$(pwd)/$ui_file"
    log "브라우저 테스트 UI 열기: file://$full_path"
    
    # 운영체제별 브라우저 열기
    if command -v xdg-open > /dev/null; then
        xdg-open "file://$full_path"
    elif command -v open > /dev/null; then
        open "file://$full_path"
    else
        warning "브라우저를 자동으로 열 수 없습니다."
        echo "수동으로 다음 URL을 브라우저에서 열어주세요:"
        echo "file://$full_path"
    fi
}

# 최신 리포트 보기
show_latest_report() {
    local report_dir="reports"
    
    if [ ! -d "$report_dir" ]; then
        warning "리포트 디렉토리가 없습니다."
        return 1
    fi
    
    local latest_report=$(find "$report_dir" -name "*.md" -type f -printf '%T@ %p\n' | sort -n | tail -1 | cut -f2- -d" ")
    
    if [ -z "$latest_report" ]; then
        warning "리포트 파일이 없습니다."
        return 1
    fi
    
    log "최신 리포트: $latest_report"
    
    # 마크다운 뷰어가 있으면 사용, 없으면 cat
    if command -v glow > /dev/null; then
        glow "$latest_report"
    elif command -v bat > /dev/null; then
        bat "$latest_report"
    else
        cat "$latest_report"
    fi
}

# 정리
clean_temp_files() {
    log "임시 파일 정리 중..."
    
    rm -rf .temp-repairs/*.txt
    rm -rf *.backup.*
    rm -rf test-results/
    rm -rf playwright-report/
    
    success "임시 파일 정리 완료"
}

# 메인 실행 로직
main() {
    local command=${1:-"help"}
    
    case $command in
        "test")
            run_tests "$2"
            ;;
        "generate")
            generate_tests "$2" "$3"
            ;;
        "ui")
            open_test_ui
            ;;
        "report")
            show_latest_report
            ;;
        "clean")
            clean_temp_files
            ;;
        "setup")
            setup_environment
            ;;
        "help"|"--help"|"-h")
            show_help
            ;;
        *)
            error "알 수 없는 명령어: $command"
            echo ""
            show_help
            exit 1
            ;;
    esac
}

# 스크립트 직접 실행 시
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi