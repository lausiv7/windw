// [의도] 기존 MessageBridge의 확장 - AI 대화식 웹사이트 빌더 통합
// [책임] AI 대화식 웹사이트 빌더의 중앙 메시지 라우터, 템플릿 관리, 대화 AI 통합

import * as vscode from 'vscode';
import { MessageBridge, WindWalkerMessage } from './MessageBridge';
import { ServiceRegistry, ServiceInterface } from './ServiceRegistry';
import { FeatureFlagManager } from './FeatureFlagManager';
import { TemplateManager } from '../services/TemplateManager';
import { ConversationAI, UserIntent, ConversationContext, AIResponse } from '../services/ConversationAI';

export interface EnhancedWindWalkerMessage extends WindWalkerMessage {
  conversationId?: string;
  messageId?: string;
  userId?: string;
  intent?: UserIntent;
  requiresTemplate?: boolean;
  templateId?: string;
}

export class EnhancedMessageBridge extends MessageBridge implements ServiceInterface {
  name = 'EnhancedMessageBridge';
  
  private serviceRegistry: ServiceRegistry;
  private featureFlagManager!: FeatureFlagManager;
  private templateManager!: TemplateManager;
  private conversationAI!: ConversationAI;
  private currentConversation: ConversationContext | null = null;
  private messageIdCounter = 0;

  constructor(context: vscode.ExtensionContext, serviceRegistry: ServiceRegistry) {
    super(context);
    
    this.serviceRegistry = serviceRegistry;
    
    console.log('[EnhancedMessageBridge] Initialized with AI conversation capabilities');
  }

  async initialize(): Promise<void> {
    // 1. 기본 서비스들 초기화
    this.featureFlagManager = await this.serviceRegistry.getService<FeatureFlagManager>('FeatureFlagManager');
    
    // 2. AI 서비스들 초기화
    this.templateManager = await this.serviceRegistry.getService<TemplateManager>('TemplateManager');
    this.conversationAI = await this.serviceRegistry.getService<ConversationAI>('ConversationAI');
    
    // 3. 확장 메시지 핸들러 등록
    this.registerEnhancedHandlers();
    
    console.log('✅ EnhancedMessageBridge initialized with AI conversation capabilities');
  }

  dispose(): void {
    this.currentConversation = null;
    console.log('[EnhancedMessageBridge] Disposed');
  }

  /**
   * 확장된 메시지 처리 - AI 대화 워크플로우
   */
  async processMessage(message: EnhancedWindWalkerMessage, webview: vscode.Webview): Promise<void> {
    try {
      // 대화 컨텍스트 확보
      await this.ensureConversationContext(message, webview);
      
      // 메시지 ID 생성
      if (!message.messageId) {
        message.messageId = this.generateMessageId();
      }

      console.log(`[EnhancedMessageBridge] Processing AI conversation message: ${message.type}`, {
        conversationId: message.conversationId,
        messageId: message.messageId,
        userId: message.userId
      });

      // AI 대화 처리 (chat:message의 경우)
      if (message.type === 'chat:message' && this.currentConversation) {
        await this.handleAIConversation(message, webview);
      }
      
      // 기존 MessageBridge 처리
      await super.processMessage(message, webview);
      
      // 템플릿 적용 처리
      if (this.shouldApplyTemplate(message)) {
        await this.handleTemplateApplication(message, webview);
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
    // AI 대화 핸들러
    this.messageHandlers.set('ai:chat', this.handleAIChat.bind(this));
    this.messageHandlers.set('ai:intent-analyze', this.handleIntentAnalyze.bind(this));
    
    // 템플릿 핸들러
    this.messageHandlers.set('template:recommend', this.handleTemplateRecommend.bind(this));
    this.messageHandlers.set('template:apply', this.handleTemplateApply.bind(this));
    this.messageHandlers.set('template:list', this.handleTemplateList.bind(this));
    
    // 대화 관리 핸들러
    this.messageHandlers.set('conversation:start', this.handleConversationStart.bind(this));
    this.messageHandlers.set('conversation:end', this.handleConversationEnd.bind(this));
    
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
      const conversationId = this.generateConversationId();
      
      this.currentConversation = {
        conversationId,
        userId,
        projectType: this.inferProjectType(),
        previousIntents: [],
        userPreferences: {
          preferredStyle: 'modern',
          colorPreference: 'neutral',
          complexityLevel: 'beginner'
        }
      };

      // 웹뷰에 대화 시작 알림
      await webview.postMessage({
        type: 'conversation:started',
        data: {
          conversationId,
          userId,
          projectType: this.currentConversation.projectType
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
   * AI 대화 처리
   */
  private async handleAIConversation(
    message: EnhancedWindWalkerMessage, 
    webview: vscode.Webview
  ): Promise<void> {
    if (!this.currentConversation) return;

    try {
      // 1. 사용자 의도 분석
      const userMessage = message.data?.content || message.data?.message || '';
      const intent = await this.conversationAI.analyzeUserIntent(
        userMessage,
        this.currentConversation
      );

      // 2. 의도 기반 AI 응답 생성
      const aiResponse = await this.conversationAI.generateResponse(intent, userMessage);

      // 3. 개인화된 응답으로 변환
      const personalizedResponse = this.conversationAI.personalizeResponse(aiResponse, this.currentConversation);

      // 4. 대화 컨텍스트 업데이트
      this.currentConversation = this.conversationAI.updateConversationContext(
        this.currentConversation,
        intent.primary,
        intent.entities
      );

      // 5. 웹뷰에 AI 응답 전송
      await webview.postMessage({
        type: 'ai:response',
        data: {
          ...personalizedResponse,
          intent: intent.primary,
          confidence: intent.confidence,
          conversationId: this.currentConversation.conversationId
        },
        timestamp: Date.now(),
        requestId: message.requestId
      });

      console.log(`✅ AI conversation processed: ${intent.primary} (confidence: ${intent.confidence.toFixed(2)})`);

    } catch (error) {
      console.error('[EnhancedMessageBridge] AI conversation error:', error);
      
      await webview.postMessage({
        type: 'ai:error',
        data: {
          error: 'AI 처리 중 오류가 발생했습니다.',
          conversationId: this.currentConversation.conversationId
        },
        timestamp: Date.now(),
        requestId: message.requestId
      });
    }
  }

  /**
   * 템플릿 적용 여부 판단
   */
  private shouldApplyTemplate(message: EnhancedWindWalkerMessage): boolean {
    if (message.requiresTemplate || message.templateId) {
      return true;
    }

    // 템플릿 관련 메시지 타입들
    const templateTriggerTypes = ['template:apply', 'template:recommend'];
    return templateTriggerTypes.includes(message.type);
  }

  /**
   * 템플릿 적용 처리
   */
  private async handleTemplateApplication(
    message: EnhancedWindWalkerMessage, 
    webview: vscode.Webview
  ): Promise<void> {
    if (!message.templateId) return;

    try {
      const result = await this.templateManager.applyTemplate(
        message.templateId,
        message.data?.customizations
      );

      await webview.postMessage({
        type: 'template:applied',
        data: result,
        timestamp: Date.now(),
        requestId: message.requestId
      });

      console.log(`✅ Template applied: ${message.templateId}`);

    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      console.error('[EnhancedMessageBridge] Template application error:', error);
      
      await webview.postMessage({
        type: 'template:error',
        data: {
          error: errorMsg,
          templateId: message.templateId
        },
        timestamp: Date.now(),
        requestId: message.requestId
      });
    }
  }

  // === Enhanced Message Handlers ===

  private async handleAIChat(message: EnhancedWindWalkerMessage): Promise<any> {
    const userMessage = message.data?.content || message.data?.message || '';
    
    if (!this.currentConversation) {
      throw new Error('No active conversation for AI chat');
    }

    const intent = await this.conversationAI.analyzeUserIntent(
      userMessage,
      this.currentConversation
    );

    const response = await this.conversationAI.generateResponse(intent, userMessage);

    return {
      ...response,
      intent: intent.primary,
      confidence: intent.confidence,
      conversationId: this.currentConversation.conversationId
    };
  }

  private async handleIntentAnalyze(message: EnhancedWindWalkerMessage): Promise<any> {
    const userMessage = message.data?.text || '';
    
    if (!this.currentConversation) {
      throw new Error('No active conversation for intent analysis');
    }

    const intent = await this.conversationAI.analyzeUserIntent(
      userMessage,
      this.currentConversation
    );

    return {
      intent: intent.primary,
      secondaryIntents: intent.secondary,
      confidence: intent.confidence,
      entities: intent.entities,
      conversationId: this.currentConversation.conversationId
    };
  }

  private async handleTemplateRecommend(message: EnhancedWindWalkerMessage): Promise<any> {
    const { intent, userLevel, requirements, preferences } = message.data;

    const recommendations = await this.templateManager.recommendTemplates({
      intent,
      userLevel,
      requirements,
      preferences
    });

    return {
      templates: recommendations,
      count: recommendations.length,
      basedOn: 'user preferences and intent analysis'
    };
  }

  private async handleTemplateApply(message: EnhancedWindWalkerMessage): Promise<any> {
    const { templateId, customizations } = message.data;

    const result = await this.templateManager.applyTemplate(templateId, customizations);

    return result;
  }

  private async handleTemplateList(message: EnhancedWindWalkerMessage): Promise<any> {
    const { category } = message.data || {};

    if (category) {
      const templates = this.templateManager.getTemplatesByCategory(category);
      return {
        category,
        templates,
        count: templates.length
      };
    } else {
      const allTemplates = this.templateManager.getAllTemplates();
      return {
        templates: allTemplates,
        count: allTemplates.length
      };
    }
  }

  private async handleConversationStart(message: EnhancedWindWalkerMessage): Promise<any> {
    const { userId, projectType } = message.data;
    
    const conversationId = this.generateConversationId();

    this.currentConversation = {
      conversationId,
      userId: userId || 'anonymous',
      projectType: projectType || this.inferProjectType(),
      previousIntents: [],
      userPreferences: {
        preferredStyle: 'modern',
        colorPreference: 'neutral',
        complexityLevel: 'beginner'
      }
    };

    return {
      conversationId,
      projectType: this.currentConversation.projectType,
      message: 'New conversation started'
    };
  }

  private async handleConversationEnd(message: EnhancedWindWalkerMessage): Promise<any> {
    if (this.currentConversation) {
      const conversationId = this.currentConversation.conversationId;
      this.currentConversation = null;
      
      return {
        conversationId,
        message: 'Conversation ended successfully'
      };
    }
    
    return { message: 'No active conversation to end' };
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

  // === Helper Methods ===

  private generateMessageId(): string {
    return `msg_${Date.now()}_${++this.messageIdCounter}_${Math.random().toString(36).substr(2, 6)}`;
  }

  private generateConversationId(): string {
    return `conv_${Date.now()}_${Math.random().toString(36).substr(2, 8)}`;
  }

  private inferProjectType(): string {
    // 워크스페이스에서 프로젝트 타입 추론
    const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
    if (!workspaceFolder) return 'unknown';

    // package.json으로 프로젝트 타입 감지 (실제 구현은 파일 읽기 필요)
    return 'html-css-js'; // 기본값
  }
}