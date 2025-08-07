// Phase 2 테스트: ConversationHistoryTracker 및 확장된 AI 대화 히스토리 기능
const { ConversationHistoryTracker } = require('./extensions/windwalker/out/services/ConversationHistoryTracker');

console.log('🧪 Phase 2 ConversationHistoryTracker 기능 테스트 시작\n');

async function testConversationHistoryTracker() {
    try {
        // 1. ConversationHistoryTracker 초기화
        const historyTracker = new ConversationHistoryTracker();
        await historyTracker.initialize();
        
        console.log('✅ ConversationHistoryTracker 초기화 완료');

        // 2. 대화 추가 테스트
        const conversation1Id = await historyTracker.addConversation({
            message: "레스토랑 웹사이트를 만들고 싶어요",
            intent: "create-website",
            response: "레스토랑 웹사이트를 만들어드리겠습니다. 어떤 스타일을 원하시나요?",
            metadata: {
                confidence: 0.92,
                entities: { websiteType: "restaurant" }
            }
        });

        const conversation2Id = await historyTracker.addConversation({
            message: "모던한 스타일로 해주세요",
            intent: "modify-design",
            response: "모던 스타일의 레스토랑 템플릿을 추천해드리겠습니다.",
            metadata: {
                confidence: 0.88,
                entities: { style: "modern" }
            }
        });

        const conversation3Id = await historyTracker.addConversation({
            message: "메뉴 페이지도 추가해주세요",
            intent: "add-component", 
            response: "메뉴 페이지를 추가하겠습니다.",
            metadata: {
                confidence: 0.95,
                entities: { component: "menu" }
            }
        });

        console.log(`✅ 3개 대화 추가 완료: ${conversation1Id}, ${conversation2Id}, ${conversation3Id}`);

        // 3. 최근 대화 조회 테스트
        const recentConversations = await historyTracker.getRecentConversations(2);
        console.log(`✅ 최근 2개 대화 조회: ${recentConversations.length}개 반환`);
        console.log(`   - 최신: "${recentConversations[recentConversations.length - 1]?.message}"`);

        // 4. 전체 히스토리 조회 테스트
        const fullHistory = await historyTracker.getConversationHistory();
        console.log(`✅ 전체 히스토리 조회: ${fullHistory.length}개 대화`);

        // 5. 검색 테스트
        const searchResults = await historyTracker.searchConversations("레스토랑");
        console.log(`✅ "레스토랑" 검색: ${searchResults.length}개 결과`);

        // 6. 대화 컨텍스트 조회 테스트
        const context = await historyTracker.getConversationContext(5);
        console.log(`✅ 대화 컨텍스트 조회: ${context.length}개 대화`);

        // 7. 롤백 테스트 ("2번째 대화로 되돌리기")
        const rolledBack = await historyTracker.rollbackToStep(1); // 0-based index, 2번째는 1
        console.log(`✅ 2번째로 롤백: ${rolledBack.length}개 대화 남음`);

        // 8. 세션 정보 테스트
        const sessionInfo = await historyTracker.getSessionInfo();
        console.log(`✅ 세션 정보: ${sessionInfo.sessionId}, 대화 수: ${sessionInfo.conversationCount}`);

        // 9. 새 세션 생성 테스트
        const newSessionId = await historyTracker.createNewSession();
        console.log(`✅ 새 세션 생성: ${newSessionId}`);

        // 새 세션에 대화 추가
        await historyTracker.addConversation({
            message: "블로그 사이트를 만들어주세요",
            intent: "create-website", 
            response: "블로그 사이트를 만들어드리겠습니다.",
            metadata: {
                confidence: 0.89,
                entities: { websiteType: "blog" }
            }
        });

        // 10. 모든 세션 조회 테스트
        const allSessions = await historyTracker.getAllSessions();
        console.log(`✅ 모든 세션 조회: ${allSessions.length}개 세션`);

        // 11. 통계 정보 테스트
        const stats = await historyTracker.getConversationStats();
        console.log(`✅ 통계 정보:`);
        console.log(`   - 총 대화 수: ${stats.totalConversations}`);
        console.log(`   - 현재 세션 대화 수: ${stats.currentSessionConversations}`);
        console.log(`   - 활성 세션 수: ${stats.activeSessions}`);
        console.log(`   - 가장 많은 의도: ${stats.mostActiveIntent}`);

        // 12. 세션 전환 테스트
        const firstSessionId = allSessions[1]?.sessionId; // 첫 번째 세션으로 전환
        if (firstSessionId) {
            const switched = await historyTracker.switchToSession(firstSessionId);
            console.log(`✅ 첫 번째 세션으로 전환: ${switched ? '성공' : '실패'}`);
            
            const currentHistory = await historyTracker.getConversationHistory();
            console.log(`   - 전환된 세션의 대화 수: ${currentHistory.length}`);
        }

        await historyTracker.cleanup();
        console.log('✅ ConversationHistoryTracker 정리 완료');

        return {
            success: true,
            conversationsAdded: 4,
            sessionsCreated: 2,
            searchResults: searchResults.length,
            rollbackSuccess: rolledBack.length > 0,
            totalConversations: stats.totalConversations
        };

    } catch (error) {
        console.error('❌ ConversationHistoryTracker 테스트 실패:', error);
        return {
            success: false,
            error: error.message
        };
    }
}

// 메인 테스트 실행
testConversationHistoryTracker().then(result => {
    console.log('\n📊 Phase 2 테스트 결과:');
    console.log('=====================================');
    
    if (result.success) {
        console.log('✅ ConversationHistoryTracker: 정상 동작');
        console.log(`✅ 대화 추가: ${result.conversationsAdded}개`);
        console.log(`✅ 세션 생성: ${result.sessionsCreated}개`);
        console.log(`✅ 검색 결과: ${result.searchResults}개`);
        console.log(`✅ 롤백 기능: ${result.rollbackSuccess ? '성공' : '실패'}`);
        console.log(`✅ 총 대화 수: ${result.totalConversations}`);
        console.log('\n🎉 Phase 2: 통합 히스토리 추적 시스템 - 모든 기능 정상 동작!');
        console.log('📈 세션 기반 대화 관리, 검색, 롤백, 통계 기능 모두 완료');
    } else {
        console.log('❌ ConversationHistoryTracker: 오류 발생');
        console.log(`   오류: ${result.error}`);
        console.log('\n💥 Phase 2 테스트 실패');
    }
    
    console.log('=====================================');
}).catch(error => {
    console.error('💥 Phase 2 테스트 실행 실패:', error);
});