// [의도] WindWalker 기능 플래그 관리 시스템
// [책임] 기능 토글, A/B 테스트, 점진적 롤아웃, 환경별 기능 제어

import * as vscode from 'vscode';
import { ServiceInterface } from './ServiceRegistry';

export interface FeatureFlag {
  name: string;
  enabled: boolean;
  description: string;
  environment?: string[];
  userSegment?: string[];
  rolloutPercentage?: number;
  dependencies?: string[];
  expiry?: Date;
  metadata?: { [key: string]: any };
}

export interface FeatureFlagConfig {
  version: string;
  flags: { [key: string]: FeatureFlag };
  defaultEnabled: boolean;
  environment: 'development' | 'staging' | 'production';
}

export interface UserContext {
  userId?: string;
  userGroup?: string;
  environment: string;
  beta?: boolean;
  experimentGroup?: string;
}

export class FeatureFlagManager implements ServiceInterface {
  name = 'FeatureFlagManager';
  
  private flags: Map<string, FeatureFlag> = new Map();
  private config: FeatureFlagConfig;
  private userContext: UserContext;
  private context: vscode.ExtensionContext;

  constructor(context: vscode.ExtensionContext) {
    this.context = context;
    this.userContext = {
      environment: 'development',
      beta: false
    };

    // 기본 설정
    this.config = {
      version: '1.0.0',
      flags: {},
      defaultEnabled: false,
      environment: 'development'
    };

    console.log('[FeatureFlagManager] Initialized');
  }

  async initialize(): Promise<void> {
    // 저장된 설정 로드
    await this.loadConfiguration();
    
    // 기본 기능 플래그들 등록
    this.registerDefaultFlags();
    
    // 환경별 설정 적용
    this.applyEnvironmentConfig();
    
    console.log(`✅ FeatureFlagManager initialized with ${this.flags.size} flags`);
  }

  dispose(): void {
    this.flags.clear();
    console.log('[FeatureFlagManager] Disposed');
  }

  /**
   * 기능 플래그 등록
   */
  registerFlag(flag: FeatureFlag): void {
    // 의존성 체크
    if (flag.dependencies) {
      for (const dep of flag.dependencies) {
        if (!this.flags.has(dep)) {
          throw new Error(`Feature flag dependency '${dep}' not found for '${flag.name}'`);
        }
      }
    }

    this.flags.set(flag.name, { ...flag });
    console.log(`[FeatureFlagManager] Registered flag: ${flag.name} (${flag.enabled ? 'enabled' : 'disabled'})`);
    
    // 설정 저장
    this.saveConfiguration();
  }

  /**
   * 기능 플래그 상태 확인
   */
  isEnabled(flagName: string, userContext?: Partial<UserContext>): boolean {
    const flag = this.flags.get(flagName);
    
    if (!flag) {
      console.warn(`[FeatureFlagManager] Unknown flag: ${flagName}, using default: ${this.config.defaultEnabled}`);
      return this.config.defaultEnabled;
    }

    // 만료 확인
    if (flag.expiry && new Date() > flag.expiry) {
      console.log(`[FeatureFlagManager] Flag '${flagName}' has expired`);
      return false;
    }

    // 기본 활성화 상태 확인
    if (!flag.enabled) {
      return false;
    }

    // 의존성 확인
    if (flag.dependencies) {
      for (const dep of flag.dependencies) {
        if (!this.isEnabled(dep, userContext)) {
          return false;
        }
      }
    }

    const currentUserContext = { ...this.userContext, ...userContext };

    // 환경 필터 확인
    if (flag.environment && flag.environment.length > 0) {
      if (!flag.environment.includes(currentUserContext.environment)) {
        return false;
      }
    }

    // 사용자 세그먼트 확인
    if (flag.userSegment && flag.userSegment.length > 0) {
      const userGroup = currentUserContext.userGroup || 'default';
      if (!flag.userSegment.includes(userGroup)) {
        return false;
      }
    }

    // 롤아웃 비율 확인 (A/B 테스트)
    if (flag.rolloutPercentage !== undefined && flag.rolloutPercentage < 100) {
      const userId = currentUserContext.userId || 'anonymous';
      const hash = this.hashString(flagName + userId) % 100;
      return hash < flag.rolloutPercentage;
    }

    return true;
  }

  /**
   * 기능 플래그 토글
   */
  toggleFlag(flagName: string): boolean {
    const flag = this.flags.get(flagName);
    if (!flag) {
      throw new Error(`Feature flag '${flagName}' not found`);
    }

    flag.enabled = !flag.enabled;
    this.flags.set(flagName, flag);
    
    console.log(`[FeatureFlagManager] Toggled flag '${flagName}': ${flag.enabled}`);
    this.saveConfiguration();
    
    return flag.enabled;
  }

  /**
   * 기능 플래그 활성화
   */
  enableFlag(flagName: string): void {
    const flag = this.flags.get(flagName);
    if (!flag) {
      throw new Error(`Feature flag '${flagName}' not found`);
    }

    flag.enabled = true;
    this.flags.set(flagName, flag);
    
    console.log(`[FeatureFlagManager] Enabled flag: ${flagName}`);
    this.saveConfiguration();
  }

  /**
   * 기능 플래그 비활성화
   */
  disableFlag(flagName: string): void {
    const flag = this.flags.get(flagName);
    if (!flag) {
      throw new Error(`Feature flag '${flagName}' not found`);
    }

    flag.enabled = false;
    this.flags.set(flagName, flag);
    
    console.log(`[FeatureFlagManager] Disabled flag: ${flagName}`);
    this.saveConfiguration();
  }

  /**
   * 사용자 컨텍스트 업데이트
   */
  updateUserContext(context: Partial<UserContext>): void {
    this.userContext = { ...this.userContext, ...context };
    console.log(`[FeatureFlagManager] Updated user context:`, this.userContext);
  }

  /**
   * 모든 기능 플래그 상태 조회
   */
  getAllFlags(): { [key: string]: boolean } {
    const result: { [key: string]: boolean } = {};
    
    for (const [name] of this.flags) {
      result[name] = this.isEnabled(name);
    }
    
    return result;
  }

  /**
   * 활성화된 기능 플래그 목록
   */
  getEnabledFlags(): string[] {
    return Array.from(this.flags.keys()).filter(name => this.isEnabled(name));
  }

  /**
   * 기능 플래그 메타데이터 조회
   */
  getFlagMetadata(flagName: string): FeatureFlag | null {
    return this.flags.get(flagName) || null;
  }

  /**
   * 기능 플래그 설정 내보내기
   */
  exportConfiguration(): FeatureFlagConfig {
    const flags: { [key: string]: FeatureFlag } = {};
    
    for (const [name, flag] of this.flags) {
      flags[name] = { ...flag };
    }

    return {
      ...this.config,
      flags
    };
  }

  /**
   * 기능 플래그 설정 가져오기
   */
  importConfiguration(config: FeatureFlagConfig): void {
    this.config = { ...config };
    this.flags.clear();
    
    for (const [name, flag] of Object.entries(config.flags)) {
      this.flags.set(name, { ...flag });
    }
    
    console.log(`[FeatureFlagManager] Imported ${this.flags.size} flags from configuration`);
    this.saveConfiguration();
  }

  // === Private Methods ===

  private async loadConfiguration(): Promise<void> {
    try {
      const saved = this.context.globalState.get<FeatureFlagConfig>('windwalker.featureFlags');
      if (saved) {
        this.importConfiguration(saved);
      }
    } catch (error) {
      console.error('[FeatureFlagManager] Failed to load configuration:', error);
    }
  }

  private async saveConfiguration(): Promise<void> {
    try {
      const config = this.exportConfiguration();
      await this.context.globalState.update('windwalker.featureFlags', config);
    } catch (error) {
      console.error('[FeatureFlagManager] Failed to save configuration:', error);
    }
  }

  private registerDefaultFlags(): void {
    // Phase 1 기본 기능 플래그들
    const defaultFlags: FeatureFlag[] = [
      {
        name: 'ai-conversation-builder',
        enabled: true,
        description: 'AI 대화식 웹사이트 빌더 기본 기능',
        environment: ['development', 'staging', 'production']
      },
      {
        name: 'git-integration',
        enabled: true,
        description: 'Git 자동 커밋 및 버전 관리',
        dependencies: ['ai-conversation-builder']
      },
      {
        name: 'conversation-history',
        enabled: true,
        description: 'IndexedDB 기반 대화 히스토리 저장',
        dependencies: ['ai-conversation-builder']
      },
      {
        name: 'personalization-engine',
        enabled: false,
        description: '사용자 패턴 기반 개인화 추천',
        dependencies: ['conversation-history'],
        rolloutPercentage: 20
      },
      {
        name: 'advanced-revert',
        enabled: false,
        description: '고급 되돌리기 기능 (N단계 되돌리기)',
        dependencies: ['git-integration'],
        userSegment: ['beta', 'advanced']
      },
      {
        name: 'conversation-analytics',
        enabled: false,
        description: '대화 패턴 분석 및 리포팅',
        dependencies: ['conversation-history'],
        environment: ['development']
      },
      {
        name: 'template-marketplace',
        enabled: false,
        description: '템플릿 마켓플레이스 연동',
        rolloutPercentage: 10,
        expiry: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30일 후
      }
    ];

    defaultFlags.forEach(flag => {
      if (!this.flags.has(flag.name)) {
        this.registerFlag(flag);
      }
    });
  }

  private applyEnvironmentConfig(): void {
    // VS Code 개발 환경 감지
    const isDevelopment = this.context.extensionMode === vscode.ExtensionMode.Development;
    
    this.userContext.environment = isDevelopment ? 'development' : 'production';
    this.config.environment = isDevelopment ? 'development' : 'production';
    
    // 개발 환경에서는 실험적 기능들 활성화
    if (isDevelopment) {
      this.userContext.beta = true;
      this.userContext.userGroup = 'beta';
    }

    console.log(`[FeatureFlagManager] Environment: ${this.config.environment}, Beta: ${this.userContext.beta}`);
  }

  private hashString(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // 32bit integer로 변환
    }
    return Math.abs(hash);
  }
}