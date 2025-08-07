// [의도] AI 대화식 웹사이트 빌더 워크플로우 라우팅 시스템
// [책임] AI 워크플로우 메시지를 적절한 서비스로 라우팅, 워크플로우 단계 관리

import * as vscode from 'vscode';
import { ServiceInterface } from './ServiceRegistry';
import { EnhancedWindWalkerMessage } from './EnhancedMessageBridge';

export interface WorkflowStep {
  step: number;
  type: WorkflowStepType;
  input: any;
  output?: any;
  status: 'pending' | 'processing' | 'completed' | 'error';
  timestamp: number;
  processingTime?: number;
  error?: string;
}

export type WorkflowStepType = 
  | 'intent-analysis'
  | 'template-recommendation'
  | 'template-application'
  | 'customization-generation'
  | 'customization-application'
  | 'preview-generation'
  | 'user-feedback';

export interface WorkflowSession {
  conversationId: string;
  workflowType: string;
  status: 'active' | 'paused' | 'completed' | 'error';
  startTime: number;
  endTime?: number;
  currentStep: number;
  steps: WorkflowStep[];
  context: {
    userRequest: string;
    templateCategory?: string;
    selectedTemplate?: string;
    customizations: any[];
    userPreferences?: any;
  };
}

export interface WorkflowResult {
  success: boolean;
  data?: any;
  nextStep?: WorkflowStepType;
  error?: string;
  metadata?: {
    processingTime: number;
    confidence: number;
    source: string;
  };
}

export class AIWorkflowRouter implements ServiceInterface {
  name = 'AIWorkflowRouter';
  
  private context: vscode.ExtensionContext;
  private activeSessions: Map<string, WorkflowSession> = new Map();
  private stepHandlers: Map<WorkflowStepType, (step: WorkflowStep, session: WorkflowSession) => Promise<WorkflowResult>>;

  constructor(context: vscode.ExtensionContext) {
    this.context = context;
    this.stepHandlers = new Map();
    this.initializeStepHandlers();
    
    console.log('[AIWorkflowRouter] Initialized');
  }

  async initialize(): Promise<void> {
    // 활성 세션 복원 (필요시)
    await this.restoreActiveSessions();
    
    console.log(`✅ AIWorkflowRouter initialized with ${this.stepHandlers.size} step handlers`);
  }

  dispose(): void {
    // 모든 활성 세션 종료
    for (const [conversationId] of this.activeSessions) {
      this.endWorkflowSession(conversationId).catch(error => {
        console.error(`Error ending session ${conversationId}:`, error);
      });
    }
    
    this.activeSessions.clear();
    console.log('[AIWorkflowRouter] Disposed');
  }

  /**
   * 메인 라우팅 메소드 - Enhanced Message를 적절한 워크플로우로 라우팅
   */
  async route(message: EnhancedWindWalkerMessage): Promise<WorkflowResult> {
    try {
      console.log(`[AIWorkflowRouter] Routing message: ${message.type}`);

      // 대화 세션 확인/생성
      let session = await this.getOrCreateSession(message);
      
      // 메시지 타입에 따른 워크플로우 단계 결정
      const workflowStep = this.determineWorkflowStep(message, session);
      
      if (!workflowStep) {
        return {
          success: false,
          error: `No workflow step found for message type: ${message.type}`
        };
      }

      // 워크플로우 단계 실행
      const result = await this.executeWorkflowStep(workflowStep, session);
      
      // 세션 업데이트
      await this.updateSession(session, workflowStep, result);

      return result;

    } catch (error) {
      console.error('[AIWorkflowRouter] Routing error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  /**
   * 워크플로우 세션 시작
   */
  async startWorkflowSession(
    conversationId: string, 
    workflowType: string, 
    initialRequest: string
  ): Promise<WorkflowSession> {
    const session: WorkflowSession = {
      conversationId,
      workflowType,
      status: 'active',
      startTime: Date.now(),
      currentStep: 1,
      steps: [],
      context: {
        userRequest: initialRequest,
        customizations: []
      }
    };

    this.activeSessions.set(conversationId, session);
    
    console.log(`[AIWorkflowRouter] Started workflow session: ${conversationId} (${workflowType})`);
    return session;
  }

  /**
   * 워크플로우 세션 종료
   */
  async endWorkflowSession(conversationId: string): Promise<WorkflowSession | null> {
    const session = this.activeSessions.get(conversationId);
    
    if (!session) {
      return null;
    }

    session.status = 'completed';
    session.endTime = Date.now();
    
    // 세션 정리 (필요시 저장)
    this.activeSessions.delete(conversationId);
    
    console.log(`[AIWorkflowRouter] Ended workflow session: ${conversationId}`);
    return session;
  }

  /**
   * 활성 세션 조회
   */
  getActiveSession(conversationId: string): WorkflowSession | null {
    return this.activeSessions.get(conversationId) || null;
  }

  /**
   * 모든 활성 세션 조회
   */
  getActiveSessions(): WorkflowSession[] {
    return Array.from(this.activeSessions.values());
  }

  // === Private Methods ===

  private initializeStepHandlers(): void {
    this.stepHandlers.set('intent-analysis', this.handleIntentAnalysis.bind(this));
    this.stepHandlers.set('template-recommendation', this.handleTemplateRecommendation.bind(this));
    this.stepHandlers.set('template-application', this.handleTemplateApplication.bind(this));
    this.stepHandlers.set('customization-generation', this.handleCustomizationGeneration.bind(this));
    this.stepHandlers.set('customization-application', this.handleCustomizationApplication.bind(this));
    this.stepHandlers.set('preview-generation', this.handlePreviewGeneration.bind(this));
    this.stepHandlers.set('user-feedback', this.handleUserFeedback.bind(this));

    console.log(`[AIWorkflowRouter] Registered ${this.stepHandlers.size} step handlers`);
  }

  private async restoreActiveSessions(): Promise<void> {
    // VS Code 확장 상태에서 활성 세션 복원 (필요시)
    try {
      const saved = this.context.globalState.get<WorkflowSession[]>('windwalker.activeSessions');
      if (saved && Array.isArray(saved)) {
        saved.forEach(session => {
          this.activeSessions.set(session.conversationId, session);
        });
        console.log(`[AIWorkflowRouter] Restored ${saved.length} active sessions`);
      }
    } catch (error) {
      console.error('[AIWorkflowRouter] Failed to restore sessions:', error);
    }
  }

  private async getOrCreateSession(message: EnhancedWindWalkerMessage): Promise<WorkflowSession> {
    const conversationId = message.conversationId || `conv-${Date.now()}`;
    
    let session = this.activeSessions.get(conversationId);
    
    if (!session) {
      // 새 세션 생성
      session = await this.startWorkflowSession(
        conversationId,
        this.inferWorkflowType(message),
        message.data?.content || message.data?.userRequest || 'New workflow'
      );
    }

    return session;
  }

  private determineWorkflowStep(
    message: EnhancedWindWalkerMessage, 
    session: WorkflowSession
  ): WorkflowStep | null {
    const stepType = this.mapMessageTypeToWorkflowStep(message.type);
    
    if (!stepType) {
      return null;
    }

    const step: WorkflowStep = {
      step: session.currentStep,
      type: stepType,
      input: message.data,
      status: 'pending',
      timestamp: Date.now()
    };

    return step;
  }

  private mapMessageTypeToWorkflowStep(messageType: string): WorkflowStepType | null {
    const mapping: { [key: string]: WorkflowStepType } = {
      'ai:analyze-intent': 'intent-analysis',
      'template:recommend': 'template-recommendation',
      'template:apply': 'template-application',
      'ai:customize': 'customization-generation',
      'customization:apply': 'customization-application',
      'preview:generate': 'preview-generation',
      'user:feedback': 'user-feedback'
    };

    return mapping[messageType] || null;
  }

  private inferWorkflowType(message: EnhancedWindWalkerMessage): string {
    // 메시지 내용을 분석하여 워크플로우 타입 추론
    const content = message.data?.content || message.data?.userRequest || '';
    const lowerContent = content.toLowerCase();

    if (lowerContent.includes('website') || lowerContent.includes('site')) {
      return 'website-builder';
    } else if (lowerContent.includes('template')) {
      return 'template-workflow';
    } else if (lowerContent.includes('customize') || lowerContent.includes('modify')) {
      return 'customization-workflow';
    }

    return 'general-workflow';
  }

  private async executeWorkflowStep(
    step: WorkflowStep, 
    session: WorkflowSession
  ): Promise<WorkflowResult> {
    const startTime = Date.now();
    step.status = 'processing';

    try {
      const handler = this.stepHandlers.get(step.type);
      
      if (!handler) {
        throw new Error(`No handler found for workflow step: ${step.type}`);
      }

      const result = await handler(step, session);
      
      step.status = 'completed';
      step.output = result.data;
      step.processingTime = Date.now() - startTime;

      return result;

    } catch (error) {
      step.status = 'error';
      step.error = error instanceof Error ? error.message : String(error);
      step.processingTime = Date.now() - startTime;

      return {
        success: false,
        error: step.error
      };
    }
  }

  private async updateSession(
    session: WorkflowSession,
    step: WorkflowStep,
    result: WorkflowResult
  ): Promise<void> {
    // 단계를 세션에 추가
    session.steps.push(step);
    
    // 다음 단계 설정
    if (result.success && result.nextStep) {
      session.currentStep += 1;
    }

    // 세션 상태 업데이트
    if (step.status === 'error') {
      session.status = 'error';
    }

    // 세션 저장 (필요시)
    await this.saveSessionState();
  }

  private async saveSessionState(): Promise<void> {
    try {
      const sessions = Array.from(this.activeSessions.values());
      await this.context.globalState.update('windwalker.activeSessions', sessions);
    } catch (error) {
      console.error('[AIWorkflowRouter] Failed to save session state:', error);
    }
  }

  // === Workflow Step Handlers ===

  private async handleIntentAnalysis(step: WorkflowStep, session: WorkflowSession): Promise<WorkflowResult> {
    const userRequest = step.input.userRequest || step.input.content;
    
    console.log(`[AIWorkflowRouter] Analyzing intent for: ${userRequest}`);
    
    // Phase 1: 간단한 키워드 기반 의도 분석
    const lowerRequest = userRequest.toLowerCase();
    let category = 'general';
    let confidence = 0.5;
    
    if (lowerRequest.includes('restaurant') || lowerRequest.includes('food') || lowerRequest.includes('menu')) {
      category = 'restaurant';
      confidence = 0.9;
    } else if (lowerRequest.includes('portfolio') || lowerRequest.includes('showcase')) {
      category = 'portfolio';
      confidence = 0.85;
    } else if (lowerRequest.includes('blog') || lowerRequest.includes('article')) {
      category = 'blog';
      confidence = 0.8;
    } else if (lowerRequest.includes('ecommerce') || lowerRequest.includes('shop') || lowerRequest.includes('store')) {
      category = 'ecommerce';
      confidence = 0.88;
    } else if (lowerRequest.includes('business') || lowerRequest.includes('company')) {
      category = 'business';
      confidence = 0.75;
    }

    // 세션 컨텍스트 업데이트
    session.context.templateCategory = category;

    return {
      success: true,
      data: {
        intent: category,
        confidence: confidence,
        keywords: this.extractKeywords(userRequest),
        suggestedNext: 'template-recommendation'
      },
      nextStep: 'template-recommendation',
      metadata: {
        processingTime: Date.now() - step.timestamp,
        confidence: confidence,
        source: 'AIWorkflowRouter'
      }
    };
  }

  private async handleTemplateRecommendation(step: WorkflowStep, session: WorkflowSession): Promise<WorkflowResult> {
    const category = session.context.templateCategory || 'general';
    
    console.log(`[AIWorkflowRouter] Recommending templates for category: ${category}`);
    
    // Phase 1: Mock template recommendations
    const templates = this.getTemplatesForCategory(category);
    
    return {
      success: true,
      data: {
        category: category,
        recommendations: templates,
        total: templates.length
      },
      nextStep: 'template-application',
      metadata: {
        processingTime: Date.now() - step.timestamp,
        confidence: 0.9,
        source: 'TemplateManager'
      }
    };
  }

  private async handleTemplateApplication(step: WorkflowStep, session: WorkflowSession): Promise<WorkflowResult> {
    const templateId = step.input.templateId;
    
    console.log(`[AIWorkflowRouter] Applying template: ${templateId}`);
    
    // 세션 컨텍스트 업데이트
    session.context.selectedTemplate = templateId;
    
    // Phase 1: Mock template application
    const result = {
      templateId: templateId,
      status: 'applied',
      files: [
        'index.html',
        'styles.css',
        'script.js'
      ],
      previewUrl: 'http://localhost:3000'
    };
    
    return {
      success: true,
      data: result,
      nextStep: 'customization-generation',
      metadata: {
        processingTime: Date.now() - step.timestamp,
        confidence: 1.0,
        source: 'TemplateManager'
      }
    };
  }

  private async handleCustomizationGeneration(step: WorkflowStep, session: WorkflowSession): Promise<WorkflowResult> {
    const customizationRequest = step.input.customizationRequest || step.input.content;
    
    console.log(`[AIWorkflowRouter] Generating customizations for: ${customizationRequest}`);
    
    // Phase 1: Mock customization options
    const options = [
      {
        level: 'conservative',
        description: 'Subtle changes that maintain the original design',
        changes: { colors: { primary: '#2c5f4f' }, typography: { fontSize: '16px' } }
      },
      {
        level: 'balanced',
        description: 'Moderate improvements to modernize the design',
        changes: { colors: { primary: '#1976d2' }, layout: { spacing: 'relaxed' } }
      },
      {
        level: 'bold',
        description: 'Complete design overhaul with modern elements',
        changes: { colors: { primary: '#e91e63' }, layout: { grid: 'masonry' } }
      }
    ];
    
    return {
      success: true,
      data: {
        request: customizationRequest,
        options: options,
        total: options.length
      },
      nextStep: 'customization-application',
      metadata: {
        processingTime: Date.now() - step.timestamp,
        confidence: 0.85,
        source: 'CustomizationEngine'
      }
    };
  }

  private async handleCustomizationApplication(step: WorkflowStep, session: WorkflowSession): Promise<WorkflowResult> {
    const selectedCustomization = step.input.selectedCustomization;
    
    console.log(`[AIWorkflowRouter] Applying customization: ${selectedCustomization?.level}`);
    
    // 세션 컨텍스트 업데이트
    session.context.customizations.push(selectedCustomization);
    
    return {
      success: true,
      data: {
        applied: selectedCustomization,
        previewUrl: 'http://localhost:3000',
        changedFiles: ['styles.css', 'script.js']
      },
      nextStep: 'preview-generation',
      metadata: {
        processingTime: Date.now() - step.timestamp,
        confidence: 0.95,
        source: 'CustomizationEngine'
      }
    };
  }

  private async handlePreviewGeneration(step: WorkflowStep, session: WorkflowSession): Promise<WorkflowResult> {
    console.log(`[AIWorkflowRouter] Generating preview for session: ${session.conversationId}`);
    
    // Phase 1: Mock preview generation
    const previews = [
      {
        type: 'desktop',
        url: 'http://localhost:3000',
        screenshot: '/previews/desktop.png'
      },
      {
        type: 'mobile',
        url: 'http://localhost:3000',
        screenshot: '/previews/mobile.png'
      }
    ];
    
    return {
      success: true,
      data: {
        previews: previews,
        ready: true,
        generatedAt: Date.now()
      },
      nextStep: 'user-feedback',
      metadata: {
        processingTime: Date.now() - step.timestamp,
        confidence: 1.0,
        source: 'PreviewGenerator'
      }
    };
  }

  private async handleUserFeedback(step: WorkflowStep, session: WorkflowSession): Promise<WorkflowResult> {
    const feedback = step.input.feedback;
    
    console.log(`[AIWorkflowRouter] Processing user feedback: ${feedback?.type}`);
    
    // 피드백 유형에 따라 다음 단계 결정
    let nextStep: WorkflowStepType | undefined;
    
    if (feedback?.type === 'customize') {
      nextStep = 'customization-generation';
    } else if (feedback?.type === 'template') {
      nextStep = 'template-recommendation';
    }
    
    return {
      success: true,
      data: {
        feedback: feedback,
        processed: true,
        suggestedNext: nextStep
      },
      nextStep: nextStep,
      metadata: {
        processingTime: Date.now() - step.timestamp,
        confidence: 0.8,
        source: 'FeedbackProcessor'
      }
    };
  }

  // === Helper Methods ===

  private extractKeywords(text: string): string[] {
    if (!text) return [];
    
    const stopWords = ['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by'];
    const words = text.toLowerCase().split(/\W+/).filter(word => 
      word.length > 2 && !stopWords.includes(word)
    );
    
    return [...new Set(words)];
  }

  private getTemplatesForCategory(category: string): any[] {
    const templateMap: { [key: string]: any[] } = {
      restaurant: [
        { id: 'restaurant-modern', name: 'Modern Restaurant', description: 'Clean modern design', confidence: 0.95 },
        { id: 'restaurant-classic', name: 'Classic Restaurant', description: 'Traditional elegant style', confidence: 0.87 },
        { id: 'cafe-minimal', name: 'Minimal Cafe', description: 'Minimalist cafe design', confidence: 0.78 }
      ],
      portfolio: [
        { id: 'portfolio-creative', name: 'Creative Portfolio', description: 'For creative professionals', confidence: 0.92 },
        { id: 'portfolio-minimal', name: 'Minimal Portfolio', description: 'Clean minimal design', confidence: 0.85 },
        { id: 'portfolio-showcase', name: 'Showcase Portfolio', description: 'Highlight your work', confidence: 0.88 }
      ],
      blog: [
        { id: 'blog-magazine', name: 'Magazine Style', description: 'Magazine-inspired layout', confidence: 0.90 },
        { id: 'blog-minimal', name: 'Minimal Blog', description: 'Focus on content', confidence: 0.83 },
        { id: 'blog-personal', name: 'Personal Blog', description: 'Personal storytelling', confidence: 0.86 }
      ],
      ecommerce: [
        { id: 'ecommerce-modern', name: 'Modern Store', description: 'Contemporary online store', confidence: 0.94 },
        { id: 'ecommerce-classic', name: 'Classic Store', description: 'Traditional store layout', confidence: 0.89 },
        { id: 'marketplace', name: 'Marketplace', description: 'Multi-vendor platform', confidence: 0.81 }
      ],
      general: [
        { id: 'landing-modern', name: 'Modern Landing', description: 'Modern landing page', confidence: 0.85 },
        { id: 'landing-minimal', name: 'Minimal Landing', description: 'Simple clean design', confidence: 0.80 },
        { id: 'business-professional', name: 'Business Pro', description: 'Professional business site', confidence: 0.88 }
      ]
    };
    
    return templateMap[category] || templateMap.general;
  }
}