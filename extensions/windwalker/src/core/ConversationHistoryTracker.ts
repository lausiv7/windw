// [의도] Git과 IndexedDB 사이의 브리지 역할 - 대화와 코드 변경을 연결하는 통합 추적 시스템
// [책임] 대화-커밋 매핑, 히스토리 추적, 개인화 데이터 연결, 되돌리기 지원

import * as vscode from 'vscode';
import { ServiceInterface } from './ServiceRegistry';
import { GitIntegrationManager, GitCommitResult, ConversationAnalytics } from './GitIntegrationManager';
import { ConversationDatabase, ConversationSession, ChatMessage, UserPatternAnalysis } from './ConversationDatabase';

export interface HistoryEntry {
  entryId: string;
  conversationId: string;
  messageId: string;
  userId: string;
  userRequest: string;
  aiResponse: string;
  gitCommit?: {
    hash: string;
    shortHash: string;
    message: string;
    filesChanged: string[];
    timestamp: Date;
  };
  codeChanges: {
    filesAffected: string[];
    linesAdded: number;
    linesRemoved: number;
    changeType: 'create' | 'update' | 'delete' | 'refactor' | 'style' | 'fix';
  };
  userFeedback?: {
    helpful: boolean;
    rating: number;
    comment?: string;
  };
  timestamp: Date;
  success: boolean;
}

export interface RevertPreview {
  targetCommit: string;
  stepsToRevert: number;
  affectedFiles: string[];
  conversationContext: string;
  safetyWarnings: string[];
  canRevert: boolean;
}

export interface PersonalizationInsight {
  userId: string;
  preferredWorkflows: string[];
  successfulPatterns: Array<{
    pattern: string;
    successRate: number;
    frequency: number;
  }>;
  commonMistakes: Array<{
    mistake: string;
    frequency: number;
    solution: string;
  }>;
  recommendedNextActions: string[];
  timeBasedPreferences: {
    peakHours: number[];
    averageSessionLength: number;
    preferredProjectTypes: string[];
  };
}

export class ConversationHistoryTracker implements ServiceInterface {
  name = 'ConversationHistoryTracker';
  
  private gitManager: GitIntegrationManager;
  private conversationDb: ConversationDatabase;
  private context: vscode.ExtensionContext;
  private historyCache: Map<string, HistoryEntry[]> = new Map();

  constructor(context: vscode.ExtensionContext) {
    this.context = context;
    this.gitManager = new GitIntegrationManager(context);
    this.conversationDb = new ConversationDatabase();
    
    console.log('[ConversationHistoryTracker] Initialized');
  }

  async initialize(): Promise<void> {
    // IndexedDB 초기화
    await this.conversationDb.initialize();
    
    // 기존 히스토리 캐시 로드
    await this.loadHistoryCache();
    
    console.log('✅ ConversationHistoryTracker initialized');
  }

  dispose(): void {
    this.historyCache.clear();
    console.log('[ConversationHistoryTracker] Disposed');
  }

  /**
   * 대화-코드 변경 연결 추적
   */
  async trackConversationChange(
    conversationId: string,
    messageId: string,
    userId: string,
    userRequest: string,
    aiResponse: string,
    filesChanged: string[],
    changeType: 'create' | 'update' | 'delete' | 'refactor' | 'style' | 'fix' = 'update'
  ): Promise<HistoryEntry> {
    try {
      console.log(`[ConversationHistoryTracker] Tracking change for conversation: ${conversationId}`);

      // 1. Git 상태 분석
      const gitStatus = await this.gitManager.getStatus();
      const hasChanges = gitStatus.files.length > 0;

      // 2. 히스토리 엔트리 생성
      const entryId = this.generateEntryId();
      const entry: HistoryEntry = {
        entryId,
        conversationId,
        messageId,
        userId,
        userRequest,
        aiResponse,
        codeChanges: {
          filesAffected: filesChanged,
          linesAdded: await this.countLinesChanged(filesChanged, 'added'),
          linesRemoved: await this.countLinesChanged(filesChanged, 'removed'),
          changeType
        },
        timestamp: new Date(),
        success: hasChanges
      };

      // 3. Git 커밋이 있는 경우 연결
      if (hasChanges) {
        try {
          const commitResult = await this.createLinkedCommit(
            conversationId,
            messageId,
            userRequest,
            aiResponse,
            filesChanged
          );
          
          entry.gitCommit = {
            hash: commitResult.commitHash,
            shortHash: commitResult.shortHash,
            message: commitResult.message,
            filesChanged: commitResult.filesChanged,
            timestamp: commitResult.timestamp
          };

          console.log(`✅ Git commit linked: ${commitResult.shortHash}`);
        } catch (error) {
          console.warn(`[ConversationHistoryTracker] Git commit failed:`, error);
          entry.success = false;
        }
      }

      // 4. 히스토리에 추가
      await this.addToHistory(entry);

      // 5. 개인화 데이터 업데이트
      await this.updatePersonalizationData(userId, entry);

      return entry;

    } catch (error) {
      console.error(`[ConversationHistoryTracker] Error tracking change:`, error);
      throw new Error(`Failed to track conversation change: ${error.message}`);
    }
  }

  /**
   * 특정 단계로 되돌리기 (안전한 되돌리기)
   */
  async revertToStep(
    conversationId: string, 
    stepsBack: number
  ): Promise<{ success: boolean; revertedTo: string; message: string }> {
    try {
      console.log(`[ConversationHistoryTracker] Reverting ${stepsBack} steps for conversation: ${conversationId}`);

      // 1. 되돌리기 미리보기
      const preview = await this.previewRevert(conversationId, stepsBack);
      
      if (!preview.canRevert) {
        throw new Error(`Cannot revert: ${preview.safetyWarnings.join(', ')}`);
      }

      // 2. Git 되돌리기 수행
      const revertResult = await this.gitManager.revertToConversationState(
        conversationId,
        stepsBack
      );

      // 3. IndexedDB에 되돌리기 기록
      await this.recordRevertAction(conversationId, revertResult, stepsBack);

      return {
        success: true,
        revertedTo: revertResult.targetCommit.substring(0, 8),
        message: `Successfully reverted ${stepsBack} steps`
      };

    } catch (error) {
      console.error(`[ConversationHistoryTracker] Revert failed:`, error);
      return {
        success: false,
        revertedTo: '',
        message: `Revert failed: ${error.message}`
      };
    }
  }

  /**
   * 되돌리기 미리보기 (안전성 검사)
   */
  async previewRevert(conversationId: string, stepsBack: number): Promise<RevertPreview> {
    try {
      // Git 커밋 히스토리 조회
      const commits = await this.gitManager.getConversationCommits(conversationId);
      
      if (commits.all.length === 0) {
        return {
          targetCommit: '',
          stepsToRevert: 0,
          affectedFiles: [],
          conversationContext: 'No commits found',
          safetyWarnings: ['No Git history available'],
          canRevert: false
        };
      }

      if (stepsBack > commits.all.length) {
        return {
          targetCommit: '',
          stepsToRevert: 0,
          affectedFiles: [],
          conversationContext: 'Steps exceed available history',
          safetyWarnings: [`Only ${commits.all.length} steps available`],
          canRevert: false
        };
      }

      const targetIndex = Math.max(0, commits.all.length - stepsBack);
      const targetCommit = commits.all[targetIndex];
      
      // 영향받을 파일들 분석
      const affectedFiles = await this.getAffectedFilesSince(targetCommit.hash);
      
      // 안전성 경고 생성
      const warnings: string[] = [];
      if (affectedFiles.length > 10) {
        warnings.push(`Many files will be affected (${affectedFiles.length})`);
      }

      // 현재 작업 중인 변경사항 확인
      const currentStatus = await this.gitManager.getStatus();
      if (currentStatus.files.length > 0) {
        warnings.push('Uncommitted changes will be lost');
      }

      return {
        targetCommit: targetCommit.hash,
        stepsToRevert: stepsBack,
        affectedFiles,
        conversationContext: targetCommit.message,
        safetyWarnings: warnings,
        canRevert: warnings.length === 0 || warnings.every(w => !w.includes('lost'))
      };

    } catch (error) {
      return {
        targetCommit: '',
        stepsToRevert: 0,
        affectedFiles: [],
        conversationContext: 'Error analyzing revert',
        safetyWarnings: [`Analysis failed: ${error.message}`],
        canRevert: false
      };
    }
  }

  /**
   * 사용자별 개인화 인사이트 생성
   */
  async generatePersonalizationInsights(userId: string): Promise<PersonalizationInsight> {
    try {
      // IndexedDB에서 사용자 패턴 분석
      const patterns = await this.conversationDb.analyzeUserPatterns(userId);
      
      // Git에서 성공/실패 패턴 분석
      const gitAnalytics = await this.gitManager.extractConversationAnalytics();
      const userGitData = gitAnalytics.filter(a => a.conversationId.includes(userId));

      // 히스토리에서 워크플로우 패턴 분석
      const userHistory = await this.getUserHistory(userId);
      
      const insights: PersonalizationInsight = {
        userId,
        preferredWorkflows: this.extractWorkflowPatterns(userHistory),
        successfulPatterns: this.analyzeSuccessPatterns(userHistory, userGitData),
        commonMistakes: this.identifyCommonMistakes(userHistory),
        recommendedNextActions: await this.generateRecommendations(userId, patterns),
        timeBasedPreferences: {
          peakHours: patterns.peakActivityHours,
          averageSessionLength: patterns.averageSessionLength,
          preferredProjectTypes: patterns.preferredProjectTypes.map(p => p.type)
        }
      };

      // 인사이트를 IndexedDB에 캐시
      await this.cachePersonalizationInsights(userId, insights);

      return insights;

    } catch (error) {
      console.error(`[ConversationHistoryTracker] Error generating insights:`, error);
      throw new Error(`Failed to generate personalization insights: ${error.message}`);
    }
  }

  /**
   * 대화별 전체 히스토리 조회
   */
  async getConversationHistory(conversationId: string): Promise<HistoryEntry[]> {
    // 캐시에서 먼저 확인
    if (this.historyCache.has(conversationId)) {
      return this.historyCache.get(conversationId)!;
    }

    // DB에서 조회
    const messages = await this.conversationDb.getConversationMessages(conversationId);
    const history: HistoryEntry[] = [];

    for (const message of messages) {
      if (message.sender === 'user') {
        // 다음 AI 응답 찾기
        const nextAIMessage = messages.find(m => 
          m.sender === 'ai' && 
          m.timestamp > message.timestamp
        );

        if (nextAIMessage) {
          const entry: HistoryEntry = {
            entryId: `entry_${message.messageId}`,
            conversationId,
            messageId: message.messageId,
            userId: 'unknown', // ConversationSession에서 가져와야 함
            userRequest: message.content,
            aiResponse: nextAIMessage.content,
            codeChanges: {
              filesAffected: nextAIMessage.codeGeneration?.fileName ? [nextAIMessage.codeGeneration.fileName] : [],
              linesAdded: 0, // Git diff에서 계산 필요
              linesRemoved: 0,
              changeType: 'update'
            },
            timestamp: message.timestamp,
            success: true,
            userFeedback: nextAIMessage.userFeedback
          };

          // Git 커밋 정보가 있는 경우 추가
          if (nextAIMessage.codeGeneration?.gitCommitHash) {
            entry.gitCommit = {
              hash: nextAIMessage.codeGeneration.gitCommitHash,
              shortHash: nextAIMessage.codeGeneration.gitCommitHash.substring(0, 8),
              message: 'AI generated commit',
              filesChanged: [nextAIMessage.codeGeneration.fileName],
              timestamp: nextAIMessage.timestamp
            };
          }

          history.push(entry);
        }
      }
    }

    // 캐시에 저장
    this.historyCache.set(conversationId, history);
    return history;
  }

  /**
   * 사용자별 히스토리 조회
   */
  async getUserHistory(userId: string, limit: number = 50): Promise<HistoryEntry[]> {
    const conversations = await this.conversationDb.getUserConversationHistory(userId, 20);
    const allHistory: HistoryEntry[] = [];

    for (const conversation of conversations) {
      const history = await this.getConversationHistory(conversation.conversationId);
      allHistory.push(...history);
    }

    return allHistory
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, limit);
  }

  // === Private Methods ===

  private async loadHistoryCache(): Promise<void> {
    try {
      const cached = this.context.globalState.get<{ [key: string]: HistoryEntry[] }>('windwalker.historyCache');
      if (cached) {
        for (const [conversationId, entries] of Object.entries(cached)) {
          this.historyCache.set(conversationId, entries);
        }
        console.log(`[ConversationHistoryTracker] Loaded ${Object.keys(cached).length} cached conversations`);
      }
    } catch (error) {
      console.error('[ConversationHistoryTracker] Error loading cache:', error);
    }
  }

  private async saveHistoryCache(): Promise<void> {
    try {
      const cacheObject: { [key: string]: HistoryEntry[] } = {};
      for (const [conversationId, entries] of this.historyCache) {
        // 최근 10개 엔트리만 캐시
        cacheObject[conversationId] = entries.slice(-10);
      }
      await this.context.globalState.update('windwalker.historyCache', cacheObject);
    } catch (error) {
      console.error('[ConversationHistoryTracker] Error saving cache:', error);
    }
  }

  private async createLinkedCommit(
    conversationId: string,
    messageId: string,
    userRequest: string,
    aiResponse: string,
    filesChanged: string[]
  ): Promise<GitCommitResult> {
    const aiMetadata = {
      model: 'windwalker-tracker',
      confidence: 0.85,
      processingTime: 100,
      tokenCount: userRequest.length + aiResponse.length
    };

    const commitResult = await this.gitManager.createAIConversationCommit(
      conversationId,
      messageId,
      userRequest,
      aiResponse,
      filesChanged,
      aiMetadata
    );

    // IndexedDB에 Git 연결 정보 저장
    await this.conversationDb.linkGitCommit(
      conversationId,
      messageId,
      {
        commitHash: commitResult.commitHash,
        shortHash: commitResult.shortHash,
        message: commitResult.message,
        filesChanged: commitResult.filesChanged,
        timestamp: commitResult.timestamp
      },
      `Tracked change: ${userRequest}`
    );

    return commitResult;
  }

  private async addToHistory(entry: HistoryEntry): Promise<void> {
    // 메모리 캐시에 추가
    const conversationHistory = this.historyCache.get(entry.conversationId) || [];
    conversationHistory.push(entry);
    this.historyCache.set(entry.conversationId, conversationHistory);

    // 캐시를 디스크에 저장
    await this.saveHistoryCache();

    console.log(`✅ History entry added: ${entry.entryId}`);
  }

  private async updatePersonalizationData(userId: string, entry: HistoryEntry): Promise<void> {
    // 사용자 패턴 데이터 업데이트를 위한 메타데이터 저장
    await this.conversationDb.saveUserPatterns(userId, {
      lastAction: entry.codeChanges.changeType,
      success: entry.success,
      filesAffected: entry.codeChanges.filesAffected.length,
      timestamp: entry.timestamp
    });
  }

  private async recordRevertAction(
    conversationId: string, 
    revertResult: any, 
    stepsBack: number
  ): Promise<void> {
    // IndexedDB에 되돌리기 액션 기록
    await this.conversationDb.saveMessage(
      conversationId,
      'system',
      `Reverted ${stepsBack} steps to commit ${revertResult.targetCommit.substring(0, 8)}`,
      {
        revertOperation: {
          stepsReverted: stepsBack,
          targetCommitHash: revertResult.targetCommit,
          revertedAt: new Date(),
          requestedBy: 'user'
        }
      }
    );
  }

  private async countLinesChanged(files: string[], type: 'added' | 'removed'): Promise<number> {
    // Git diff를 사용해 라인 수 계산 (간단 구현)
    try {
      const status = await this.gitManager.getStatus();
      return status.files.length * 5; // 평균 추정값
    } catch {
      return 0;
    }
  }

  private async getAffectedFilesSince(commitHash: string): Promise<string[]> {
    // 특정 커밋 이후 변경된 파일 목록
    try {
      const currentCommit = await this.gitManager.getCurrentCommitHash();
      // 실제로는 git diff --name-only 사용
      return ['file1.ts', 'file2.tsx']; // 예시
    } catch {
      return [];
    }
  }

  private extractWorkflowPatterns(history: HistoryEntry[]): string[] {
    const patterns = new Map<string, number>();
    
    history.forEach(entry => {
      const workflow = `${entry.codeChanges.changeType}->${entry.success ? 'success' : 'fail'}`;
      patterns.set(workflow, (patterns.get(workflow) || 0) + 1);
    });

    return Array.from(patterns.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([pattern]) => pattern);
  }

  private analyzeSuccessPatterns(
    history: HistoryEntry[], 
    gitData: ConversationAnalytics[]
  ): Array<{ pattern: string; successRate: number; frequency: number }> {
    const patterns = new Map<string, { success: number; total: number }>();

    history.forEach(entry => {
      const pattern = entry.codeChanges.changeType;
      const current = patterns.get(pattern) || { success: 0, total: 0 };
      
      current.total += 1;
      if (entry.success) current.success += 1;
      
      patterns.set(pattern, current);
    });

    return Array.from(patterns.entries()).map(([pattern, stats]) => ({
      pattern,
      successRate: stats.total > 0 ? stats.success / stats.total : 0,
      frequency: stats.total
    }));
  }

  private identifyCommonMistakes(history: HistoryEntry[]): Array<{
    mistake: string;
    frequency: number;
    solution: string;
  }> {
    const mistakes: Array<{ mistake: string; frequency: number; solution: string }> = [];
    
    const failedEntries = history.filter(entry => !entry.success);
    const failurePatterns = new Map<string, number>();

    failedEntries.forEach(entry => {
      const pattern = `${entry.codeChanges.changeType}_failure`;
      failurePatterns.set(pattern, (failurePatterns.get(pattern) || 0) + 1);
    });

    for (const [pattern, frequency] of failurePatterns) {
      mistakes.push({
        mistake: pattern.replace('_failure', ' operations often fail'),
        frequency,
        solution: this.getSolutionForPattern(pattern)
      });
    }

    return mistakes.sort((a, b) => b.frequency - a.frequency);
  }

  private getSolutionForPattern(pattern: string): string {
    const solutions: { [key: string]: string } = {
      'create_failure': 'Check file permissions and path validity',
      'update_failure': 'Verify file exists before updating',
      'delete_failure': 'Ensure file is not in use before deletion',
      'refactor_failure': 'Test changes in smaller increments'
    };

    return solutions[pattern] || 'Review the request and try again';
  }

  private async generateRecommendations(userId: string, patterns: UserPatternAnalysis): Promise<string[]> {
    const recommendations: string[] = [];

    // 활동 패턴 기반 추천
    if (patterns.peakActivityHours.length > 0) {
      const peakHour = patterns.peakActivityHours[0];
      recommendations.push(`Best productivity around ${peakHour}:00 - consider complex tasks then`);
    }

    // 프로젝트 타입 기반 추천
    if (patterns.preferredProjectTypes.length > 0) {
      const topType = patterns.preferredProjectTypes[0];
      recommendations.push(`Try advanced ${topType.type} features - you're experienced with this type`);
    }

    // 요청 패턴 기반 추천
    if (patterns.commonRequestPatterns.length > 0) {
      const topPattern = patterns.commonRequestPatterns[0];
      recommendations.push(`Explore variations of '${topPattern.pattern}' - it's your most used pattern`);
    }

    return recommendations;
  }

  private async cachePersonalizationInsights(userId: string, insights: PersonalizationInsight): Promise<void> {
    try {
      const cacheKey = `windwalker.personalization.${userId}`;
      await this.context.globalState.update(cacheKey, {
        ...insights,
        cachedAt: new Date().toISOString()
      });
    } catch (error) {
      console.error('[ConversationHistoryTracker] Error caching insights:', error);
    }
  }

  private generateEntryId(): string {
    return `entry_${Date.now()}_${Math.random().toString(36).substr(2, 8)}`;
  }
}