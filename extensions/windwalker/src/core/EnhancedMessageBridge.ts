// [의도] 기존 MessageBridge의 확장 - Git+IndexedDB 통합 기능 추가
// [책임] AI 대화식 웹사이트 빌더의 중앙 메시지 라우터, Git 커밋 자동화, 대화 히스토리 관리

import * as vscode from 'vscode';
import { MessageBridge, WindWalkerMessage } from './MessageBridge';
import { ServiceRegistry, ServiceInterface } from './ServiceRegistry';
import { FeatureFlagManager } from './FeatureFlagManager';
import { GitIntegrationManager, GitCommitResult, AIMetadata } from './GitIntegrationManager';
import { ConversationDatabase, ConversationSession, ChatMessage } from './ConversationDatabase';

export interface EnhancedWindWalkerMessage extends WindWalkerMessage {
  conversationId?: string;
  messageId?: string;
  userId?: string;
  aiMetadata?: AIMetadata;
  requiresGitCommit?: boolean;
  filesChanged?: string[];
}

export interface ConversationContext {
  conversationId: string;
  userId: string;
  projectType: string;
  currentSession?: ConversationSession;
  messageHistory: ChatMessage[];
}

export class EnhancedMessageBridge extends MessageBridge implements ServiceInterface {
  name = 'EnhancedMessageBridge';
  
  private serviceRegistry: ServiceRegistry;
  private featureFlagManager: FeatureFlagManager;
  private gitManager: GitIntegrationManager;
  private conversationDb: ConversationDatabase;
  private currentConversation: ConversationContext | null = null;
  private messageIdCounter = 0;

  constructor(context: vscode.ExtensionContext, serviceRegistry: ServiceRegistry) {
    super(context);
    
    this.serviceRegistry = serviceRegistry;
    this.gitManager = new GitIntegrationManager(context);
    this.conversationDb = new ConversationDatabase();
    
    console.log('[EnhancedMessageBridge] Initialized with Git+IndexedDB integration');
  }

  async initialize(): Promise<void> {
    // 1. 기본 서비스들 초기화
    this.featureFlagManager = await this.serviceRegistry.getService<FeatureFlagManager>('FeatureFlagManager');
    
    // 2. IndexedDB 초기화
    await this.conversationDb.initialize();
    
    // 3. 확장 메시지 핸들러 등록
    this.registerEnhancedHandlers();
    
    console.log('✅ EnhancedMessageBridge initialized with enhanced capabilities');
  }

  dispose(): void {
    if (this.currentConversation) {
      this.endCurrentConversation().catch(error => {
        console.error('[EnhancedMessageBridge] Error ending conversation:', error);
      });
    }
    console.log('[EnhancedMessageBridge] Disposed');
  }

  /**
   * 확장된 메시지 처리 (기존 + Git/DB 통합)
   */
  async processMessage(message: EnhancedWindWalkerMessage, webview: vscode.Webview): Promise<void> {
    try {
      // 대화 컨텍스트 확보
      await this.ensureConversationContext(message, webview);
      
      // 메시지 ID 생성
      if (!message.messageId) {
        message.messageId = this.generateMessageId();
      }
      
      // 사용자 메시지 저장 (IndexedDB)
      if (message.type === 'chat:message' && this.currentConversation) {
        await this.saveUserMessage(message);
      }

      console.log(`[EnhancedMessageBridge] Processing enhanced message: ${message.type}`, {
        conversationId: message.conversationId,
        messageId: message.messageId,
        userId: message.userId
      });

      // 기존 MessageBridge 처리
      await super.processMessage(message, webview);
      
      // Git 통합 처리 (응답 후)
      if (this.shouldCreateGitCommit(message)) {
        await this.handleGitIntegration(message, webview);
      }

    } catch (error) {
      console.error(`[EnhancedMessageBridge] Enhanced processing error:`, error);
      throw error;
    }
  }

  /**
   * 확장 메시지 핸들러 등록
   */
  private registerEnhancedHandlers(): void {
    // 대화 관리 핸들러
    this.messageHandlers.set('conversation:start', this.handleConversationStart.bind(this));
    this.messageHandlers.set('conversation:end', this.handleConversationEnd.bind(this));
    this.messageHandlers.set('conversation:history', this.handleConversationHistory.bind(this));
    this.messageHandlers.set('conversation:analytics', this.handleConversationAnalytics.bind(this));

    // Git 통합 핸들러
    this.messageHandlers.set('git:commit', this.handleGitCommit.bind(this));
    this.messageHandlers.set('git:revert', this.handleGitRevert.bind(this));
    this.messageHandlers.set('git:status', this.handleGitStatus.bind(this));
    this.messageHandlers.set('git:history', this.handleGitHistory.bind(this));

    // 개인화 핸들러
    this.messageHandlers.set('personalization:analyze', this.handlePersonalizationAnalyze.bind(this));
    this.messageHandlers.set('personalization:recommend', this.handlePersonalizationRecommend.bind(this));
    this.messageHandlers.set('personalization:profile', this.handlePersonalizationProfile.bind(this));

    // 기능 플래그 핸들러
    this.messageHandlers.set('feature:status', this.handleFeatureStatus.bind(this));
    this.messageHandlers.set('feature:toggle', this.handleFeatureToggle.bind(this));
  }

  /**
   * 대화 컨텍스트 확보
   */
  private async ensureConversationContext(
    message: EnhancedWindWalkerMessage, 
    webview: vscode.Webview
  ): Promise<void> {
    // 이미 활성 대화가 있으면 사용
    if (this.currentConversation && message.conversationId === this.currentConversation.conversationId) {
      return;
    }

    // 새 대화 시작
    if (!message.conversationId || !this.currentConversation) {
      const userId = message.userId || 'anonymous';
      const projectType = this.inferProjectType();
      
      const conversationId = await this.conversationDb.createConversation(
        userId, 
        projectType,
        { templateUsed: 'default' }
      );

      this.currentConversation = {
        conversationId,
        userId,
        projectType,
        messageHistory: []
      };

      // 웹뷰에 대화 시작 알림
      await webview.postMessage({
        type: 'conversation:started',
        data: {
          conversationId,
          userId,
          projectType
        },
        timestamp: Date.now()
      });

      console.log(`✅ New conversation started: ${conversationId} for user: ${userId}`);
    }

    // 메시지에 대화 정보 추가
    message.conversationId = this.currentConversation.conversationId;
    message.userId = this.currentConversation.userId;
  }

  /**
   * 사용자 메시지 저장
   */
  private async saveUserMessage(message: EnhancedWindWalkerMessage): Promise<void> {
    if (!this.currentConversation) return;

    const messageId = await this.conversationDb.saveMessage(
      this.currentConversation.conversationId,
      'user',
      message.data.content,
      {
        messageMetadata: {
          requestId: message.requestId,
          timestamp: message.timestamp,
          webviewType: 'chat'
        }
      }
    );

    console.log(`✅ User message saved: ${messageId}`);
  }

  /**
   * AI 응답 저장 (기존 핸들러에서 호출)
   */
  private async saveAIResponse(
    userMessage: EnhancedWindWalkerMessage,
    aiResponse: any,
    aiMetadata?: AIMetadata
  ): Promise<string> {
    if (!this.currentConversation) {
      throw new Error('No active conversation for AI response');
    }

    const messageId = await this.conversationDb.saveMessage(
      this.currentConversation.conversationId,
      'ai',
      aiResponse.content || JSON.stringify(aiResponse),
      {
        aiMetadata: aiMetadata || {
          model: aiResponse.model || 'default',
          confidence: aiResponse.confidence || 0.8,
          processingTime: Date.now() - (userMessage.timestamp || Date.now()),
          tokenCount: aiResponse.tokenCount
        },
        messageMetadata: {
          requestId: userMessage.requestId,
          responseType: aiResponse.type || 'text'
        }
      }
    );

    return messageId;
  }

  /**
   * Git 커밋 여부 판단
   */
  private shouldCreateGitCommit(message: EnhancedWindWalkerMessage): boolean {
    // 기능 플래그 확인
    if (!this.featureFlagManager.isEnabled('git-integration')) {
      return false;
    }

    // 명시적 Git 커밋 요청
    if (message.requiresGitCommit) {
      return true;
    }

    // 파일 변경 작업들
    const gitTriggerTypes = [
      'file:write', 'file:create', 'file:delete',
      'code:apply', 'code:generate'
    ];

    return gitTriggerTypes.includes(message.type);
  }

  /**
   * Git 통합 처리
   */
  private async handleGitIntegration(
    message: EnhancedWindWalkerMessage, 
    webview: vscode.Webview
  ): Promise<void> {
    if (!this.currentConversation) return;

    try {
      // Git 상태 확인
      const gitStatus = await this.gitManager.getStatus();
      if (gitStatus.files.length === 0) {
        console.log('[EnhancedMessageBridge] No changes to commit');
        return;
      }

      // AI 응답 메타데이터 구성
      const aiMetadata: AIMetadata = message.aiMetadata || {
        model: 'windwalker-default',
        confidence: 0.8,
        processingTime: 500,
        tokenCount: 100
      };

      // Git 커밋 생성
      const commitResult: GitCommitResult = await this.gitManager.createAIConversationCommit(
        this.currentConversation.conversationId,
        message.messageId || this.generateMessageId(),
        message.data?.content || 'AI generated changes',
        'AI response applied to codebase',
        message.filesChanged || gitStatus.files.map(f => f.path),
        aiMetadata
      );

      // Git 커밋 정보를 IndexedDB에 연결
      await this.conversationDb.linkGitCommit(
        this.currentConversation.conversationId,
        message.messageId || this.generateMessageId(),
        {
          commitHash: commitResult.commitHash,
          shortHash: commitResult.shortHash,
          message: commitResult.message,
          filesChanged: commitResult.filesChanged,
          timestamp: commitResult.timestamp
        },
        `AI generated commit for: ${message.data?.content || 'changes'}`
      );

      // 웹뷰에 Git 커밋 완료 알림
      await webview.postMessage({
        type: 'git:committed',
        data: {
          commitHash: commitResult.shortHash,
          message: commitResult.message,
          filesChanged: commitResult.filesChanged.length,
          conversationId: this.currentConversation.conversationId
        },
        timestamp: Date.now()
      });

      console.log(`✅ Git commit created and linked: ${commitResult.shortHash}`);

    } catch (error) {
      console.error('[EnhancedMessageBridge] Git integration error:', error);
      
      // 에러를 웹뷰에 알림
      await webview.postMessage({
        type: 'git:error',
        data: {
          error: error.message,
          conversationId: this.currentConversation?.conversationId
        },
        timestamp: Date.now()
      });
    }
  }

  // === Enhanced Message Handlers ===

  private async handleConversationStart(message: EnhancedWindWalkerMessage): Promise<any> {
    const { userId, projectType } = message.data;
    
    const conversationId = await this.conversationDb.createConversation(
      userId, 
      projectType || this.inferProjectType()
    );

    this.currentConversation = {
      conversationId,
      userId,
      projectType: projectType || this.inferProjectType(),
      messageHistory: []
    };

    return {
      conversationId,
      projectType: this.currentConversation.projectType,
      message: 'New conversation started'
    };
  }

  private async handleConversationEnd(message: EnhancedWindWalkerMessage): Promise<any> {
    if (this.currentConversation) {
      const result = await this.endCurrentConversation();
      return {
        conversationId: result.conversationId,
        totalMessages: result.totalMessages,
        duration: result.duration,
        message: 'Conversation ended successfully'
      };
    }
    
    return { message: 'No active conversation to end' };
  }

  private async handleConversationHistory(message: EnhancedWindWalkerMessage): Promise<any> {
    const { userId, limit = 20 } = message.data;
    
    const history = await this.conversationDb.getUserConversationHistory(
      userId || this.currentConversation?.userId || 'anonymous',
      limit
    );

    return {
      conversations: history,
      totalCount: history.length,
      userId
    };
  }

  private async handleGitCommit(message: EnhancedWindWalkerMessage): Promise<any> {
    if (!this.featureFlagManager.isEnabled('git-integration')) {
      throw new Error('Git integration is disabled');
    }

    // 수동 Git 커밋 요청 처리
    message.requiresGitCommit = true;
    
    return {
      message: 'Manual Git commit will be processed',
      conversationId: this.currentConversation?.conversationId
    };
  }

  private async handleGitRevert(message: EnhancedWindWalkerMessage): Promise<any> {
    if (!this.featureFlagManager.isEnabled('git-integration')) {
      throw new Error('Git integration is disabled');
    }

    const { conversationId, stepsBack } = message.data;
    
    const revertResult = await this.gitManager.revertToConversationState(
      conversationId || this.currentConversation?.conversationId!,
      stepsBack
    );

    return {
      reverted: true,
      targetCommit: revertResult.targetCommit.substring(0, 8),
      stepsReverted: revertResult.stepsReverted,
      message: revertResult.commitMessage
    };
  }

  private async handleGitStatus(message: EnhancedWindWalkerMessage): Promise<any> {
    const status = await this.gitManager.getStatus();
    const currentCommit = await this.gitManager.getCurrentCommit();
    
    return {
      modified: status.files.length,
      files: status.files.map(f => ({ path: f.path, status: f.index })),
      currentCommit: {
        hash: currentCommit.hash.substring(0, 8),
        message: currentCommit.message
      }
    };
  }

  private async handleGitHistory(message: EnhancedWindWalkerMessage): Promise<any> {
    const conversationId = message.data?.conversationId || this.currentConversation?.conversationId;
    
    if (!conversationId) {
      throw new Error('No conversation ID provided for Git history');
    }

    const commits = await this.gitManager.getConversationCommits(conversationId);
    
    return {
      conversationId,
      commits: commits.all.map(commit => ({
        hash: commit.hash.substring(0, 8),
        message: commit.message,
        date: commit.date,
        author: commit.author_name
      }))
    };
  }

  private async handlePersonalizationAnalyze(message: EnhancedWindWalkerMessage): Promise<any> {
    if (!this.featureFlagManager.isEnabled('personalization-engine')) {
      throw new Error('Personalization engine is disabled');
    }

    const userId = message.data?.userId || this.currentConversation?.userId || 'anonymous';
    const analysis = await this.conversationDb.analyzeUserPatterns(userId);
    
    return {
      userId,
      analysis,
      recommendations: this.generatePersonalizationRecommendations(analysis)
    };
  }

  private async handlePersonalizationRecommend(message: EnhancedWindWalkerMessage): Promise<any> {
    const { userRequest, context } = message.data;
    const userId = this.currentConversation?.userId || 'anonymous';
    
    // 사용자 패턴 기반 개인화된 추천
    const patterns = await this.conversationDb.analyzeUserPatterns(userId);
    const recommendations = this.generateContextualRecommendations(userRequest, patterns, context);
    
    return {
      userRequest,
      personalizedRecommendations: recommendations,
      basedOnHistory: true,
      patternCount: patterns.totalConversations
    };
  }

  private async handlePersonalizationProfile(message: EnhancedWindWalkerMessage): Promise<any> {
    const { userId, profileUpdates } = message.data;
    
    if (profileUpdates) {
      await this.conversationDb.updateUserProfile(userId, profileUpdates);
    }
    
    const patterns = await this.conversationDb.analyzeUserPatterns(userId);
    
    return {
      userId,
      profile: {
        totalConversations: patterns.totalConversations,
        totalMessages: patterns.totalMessages,
        preferredProjectTypes: patterns.preferredProjectTypes,
        commonPatterns: patterns.commonRequestPatterns.slice(0, 5),
        peakHours: patterns.peakActivityHours
      }
    };
  }

  private async handleFeatureStatus(message: EnhancedWindWalkerMessage): Promise<any> {
    const allFlags = this.featureFlagManager.getAllFlags();
    const enabledFlags = this.featureFlagManager.getEnabledFlags();
    
    return {
      allFlags,
      enabledFlags,
      totalFlags: Object.keys(allFlags).length,
      enabledCount: enabledFlags.length
    };
  }

  private async handleFeatureToggle(message: EnhancedWindWalkerMessage): Promise<any> {
    const { flagName, enabled } = message.data;
    
    if (enabled !== undefined) {
      if (enabled) {
        this.featureFlagManager.enableFlag(flagName);
      } else {
        this.featureFlagManager.disableFlag(flagName);
      }
    } else {
      this.featureFlagManager.toggleFlag(flagName);
    }
    
    const isEnabled = this.featureFlagManager.isEnabled(flagName);
    
    return {
      flagName,
      enabled: isEnabled,
      message: `Feature '${flagName}' is now ${isEnabled ? 'enabled' : 'disabled'}`
    };
  }

  private async handleConversationAnalytics(message: EnhancedWindWalkerMessage): Promise<any> {
    const gitAnalytics = await this.gitManager.extractConversationAnalytics();
    
    return {
      totalConversations: gitAnalytics.length,
      uniqueUsers: [...new Set(gitAnalytics.map(a => a.conversationId))].length,
      averageConfidence: gitAnalytics.reduce((sum, a) => sum + a.confidence, 0) / gitAnalytics.length,
      popularModels: this.groupByModel(gitAnalytics),
      recentActivity: gitAnalytics.slice(-10)
    };
  }

  // === Helper Methods ===

  private async endCurrentConversation(): Promise<{ conversationId: string; totalMessages: number; duration: number }> {
    if (!this.currentConversation) {
      throw new Error('No active conversation to end');
    }

    const conversation = await this.conversationDb.getConversation(this.currentConversation.conversationId);
    if (conversation) {
      const duration = Date.now() - conversation.createdAt.getTime();
      
      // 대화 완료 상태로 업데이트 (실제 업데이트 메소드 필요)
      console.log(`✅ Conversation ended: ${this.currentConversation.conversationId}`);
      
      const result = {
        conversationId: this.currentConversation.conversationId,
        totalMessages: conversation.totalMessages,
        duration: Math.round(duration / 60000) // 분 단위
      };

      this.currentConversation = null;
      return result;
    }

    throw new Error('Failed to end conversation');
  }

  private generateMessageId(): string {
    return `msg_${Date.now()}_${++this.messageIdCounter}_${Math.random().toString(36).substr(2, 6)}`;
  }

  private inferProjectType(): string {
    // 워크스페이스에서 프로젝트 타입 추론
    const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
    if (!workspaceFolder) return 'unknown';

    // package.json으로 프로젝트 타입 감지
    try {
      const packageJsonPath = vscode.Uri.joinPath(workspaceFolder.uri, 'package.json');
      // 실제로는 파일 읽기 필요
      return 'react'; // 기본값
    } catch {
      return 'html-css-js';
    }
  }

  private generatePersonalizationRecommendations(analysis: any): string[] {
    const recommendations: string[] = [];
    
    // 선호 프로젝트 타입 기반
    if (analysis.preferredProjectTypes.length > 0) {
      const topType = analysis.preferredProjectTypes[0].type;
      recommendations.push(`Continue with ${topType} projects for better personalization`);
    }
    
    // 자주 사용하는 패턴 기반
    if (analysis.commonRequestPatterns.length > 0) {
      const topPattern = analysis.commonRequestPatterns[0].pattern;
      recommendations.push(`Try advanced ${topPattern} features`);
    }
    
    return recommendations;
  }

  private generateContextualRecommendations(
    userRequest: string, 
    patterns: any, 
    context: any
  ): string[] {
    const recommendations: string[] = [];
    
    // 컨텍스트 기반 개인화 추천 로직
    const requestLower = userRequest.toLowerCase();
    
    if (requestLower.includes('색상') || requestLower.includes('color')) {
      recommendations.push('Based on your history, try using your preferred color palette');
    }
    
    if (requestLower.includes('버튼') || requestLower.includes('button')) {
      recommendations.push('Consider your frequently used button styles');
    }
    
    return recommendations;
  }

  private groupByModel(analytics: any[]): { [model: string]: number } {
    const modelGroups: { [model: string]: number } = {};
    
    analytics.forEach(item => {
      modelGroups[item.aiModel] = (modelGroups[item.aiModel] || 0) + 1;
    });
    
    return modelGroups;
  }
}