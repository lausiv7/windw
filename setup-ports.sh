#!/bin/bash
echo "🌐 Firebase Studio 포트 설정..."

# Firebase Studio에서 포트 노출 확인
echo "📋 Firebase Studio에서 다음 포트들을 노출해야 합니다:"
echo "   - 포트 8080: VS Code IDE"
echo "   - 포트 3000: React 프리뷰 (나중에 사용)"
echo ""
echo "🔧 Firebase Studio 설정 방법:"
echo "1. Firebase Studio 좌측 패널에서 'Ports' 클릭"
echo "2. 'Add Port' 버튼 클릭"
echo "3. 포트 8080 추가 → 'Web Preview' 선택"
echo "4. 포트 3000 추가 → 'Web Preview' 선택"
echo ""
echo "✅ 설정 완료 후 ./start-windwalker-safe.sh 실행"
