// [의도] WindWalker 서비스 레지스트리 패턴 구현
// [책임] 서비스 의존성 주입, 생명주기 관리, 모듈간 통신 조율

import * as vscode from 'vscode';

export interface ServiceInterface {
  name: string;
  initialize(): Promise<void>;
  dispose(): void;
}

export interface ServiceDependency {
  name: string;
  required: boolean;
}

export interface ServiceConfig {
  name: string;
  implementation: new (...args: any[]) => ServiceInterface;
  dependencies: ServiceDependency[];
  singleton: boolean;
  autoStart: boolean;
}

export class ServiceRegistry {
  private static instance: ServiceRegistry;
  private services: Map<string, ServiceInterface> = new Map();
  private configs: Map<string, ServiceConfig> = new Map();
  private initializing: Set<string> = new Set();
  private initialized: Set<string> = new Set();
  private context: vscode.ExtensionContext;

  constructor(context: vscode.ExtensionContext) {
    this.context = context;
    console.log('[ServiceRegistry] Initialized');
  }

  static getInstance(context: vscode.ExtensionContext): ServiceRegistry {
    if (!ServiceRegistry.instance) {
      ServiceRegistry.instance = new ServiceRegistry(context);
    }
    return ServiceRegistry.instance;
  }

  /**
   * 서비스 등록
   */
  register(config: ServiceConfig): void {
    if (this.configs.has(config.name)) {
      throw new Error(`Service '${config.name}' is already registered`);
    }

    this.configs.set(config.name, config);
    console.log(`[ServiceRegistry] Registered service: ${config.name}`);

    // 자동 시작 서비스는 즉시 초기화
    if (config.autoStart) {
      this.getService(config.name).catch(error => {
        console.error(`[ServiceRegistry] Auto-start failed for ${config.name}:`, error);
      });
    }
  }

  /**
   * 서비스 조회 (지연 초기화)
   */
  async getService<T extends ServiceInterface>(name: string): Promise<T> {
    // 이미 초기화된 서비스 반환
    if (this.services.has(name)) {
      return this.services.get(name) as T;
    }

    // 초기화 중인 서비스는 대기
    if (this.initializing.has(name)) {
      return this.waitForInitialization<T>(name);
    }

    return this.initializeService<T>(name);
  }

  /**
   * 서비스 존재 여부 확인
   */
  hasService(name: string): boolean {
    return this.configs.has(name);
  }

  /**
   * 모든 서비스 초기화
   */
  async initializeAllServices(): Promise<void> {
    const autoStartServices = Array.from(this.configs.entries())
      .filter(([, config]) => config.autoStart)
      .map(([name]) => name);

    console.log(`[ServiceRegistry] Initializing ${autoStartServices.length} auto-start services`);

    await Promise.all(
      autoStartServices.map(async (name) => {
        try {
          await this.getService(name);
        } catch (error) {
          console.error(`[ServiceRegistry] Failed to initialize ${name}:`, error);
        }
      })
    );
  }

  /**
   * 모든 서비스 정리
   */
  dispose(): void {
    console.log(`[ServiceRegistry] Disposing ${this.services.size} services`);

    // 서비스들을 역순으로 정리 (의존성 순서 고려)
    const serviceNames = Array.from(this.services.keys()).reverse();
    
    for (const name of serviceNames) {
      try {
        const service = this.services.get(name);
        if (service) {
          service.dispose();
          console.log(`[ServiceRegistry] Disposed service: ${name}`);
        }
      } catch (error) {
        console.error(`[ServiceRegistry] Error disposing ${name}:`, error);
      }
    }

    this.services.clear();
    this.initialized.clear();
    this.initializing.clear();
  }

  /**
   * 등록된 모든 서비스 목록 조회
   */
  getRegisteredServices(): string[] {
    return Array.from(this.configs.keys());
  }

  /**
   * 초기화된 서비스 목록 조회
   */
  getInitializedServices(): string[] {
    return Array.from(this.initialized);
  }

  /**
   * 서비스 상태 조회
   */
  getServiceStatus(): { [key: string]: 'registered' | 'initializing' | 'initialized' | 'error' } {
    const status: { [key: string]: 'registered' | 'initializing' | 'initialized' | 'error' } = {};

    for (const name of this.configs.keys()) {
      if (this.initialized.has(name)) {
        status[name] = 'initialized';
      } else if (this.initializing.has(name)) {
        status[name] = 'initializing';
      } else {
        status[name] = 'registered';
      }
    }

    return status;
  }

  // === Private Methods ===

  private async initializeService<T extends ServiceInterface>(name: string): Promise<T> {
    const config = this.configs.get(name);
    if (!config) {
      throw new Error(`Service '${name}' is not registered`);
    }

    this.initializing.add(name);

    try {
      console.log(`[ServiceRegistry] Initializing service: ${name}`);

      // 의존성 서비스들 먼저 초기화
      await this.resolveDependencies(config.dependencies);

      // 서비스 인스턴스 생성
      const serviceInstance = new config.implementation(this.context, this);

      // 서비스 초기화
      await serviceInstance.initialize();

      // 등록 및 상태 업데이트
      this.services.set(name, serviceInstance);
      this.initialized.add(name);
      this.initializing.delete(name);

      console.log(`✅ Service initialized: ${name}`);
      return serviceInstance as T;

    } catch (error) {
      this.initializing.delete(name);
      console.error(`[ServiceRegistry] Failed to initialize ${name}:`, error);
      throw new Error(`Service initialization failed: ${name} - ${error.message}`);
    }
  }

  private async resolveDependencies(dependencies: ServiceDependency[]): Promise<void> {
    const requiredDeps = dependencies.filter(dep => dep.required);
    const optionalDeps = dependencies.filter(dep => !dep.required);

    // 필수 의존성들을 병렬로 초기화
    if (requiredDeps.length > 0) {
      await Promise.all(
        requiredDeps.map(async (dep) => {
          if (!this.configs.has(dep.name)) {
            throw new Error(`Required dependency '${dep.name}' is not registered`);
          }
          await this.getService(dep.name);
        })
      );
    }

    // 선택적 의존성들은 에러 무시하고 초기화 시도
    if (optionalDeps.length > 0) {
      await Promise.allSettled(
        optionalDeps.map(async (dep) => {
          if (this.configs.has(dep.name)) {
            try {
              await this.getService(dep.name);
            } catch (error) {
              console.warn(`[ServiceRegistry] Optional dependency ${dep.name} failed to initialize:`, error);
            }
          }
        })
      );
    }
  }

  private async waitForInitialization<T extends ServiceInterface>(name: string): Promise<T> {
    // 초기화 완료를 폴링으로 대기 (최대 10초)
    const maxWait = 10000; // 10초
    const pollInterval = 100; // 100ms
    let waited = 0;

    while (this.initializing.has(name) && waited < maxWait) {
      await new Promise(resolve => setTimeout(resolve, pollInterval));
      waited += pollInterval;
    }

    if (this.services.has(name)) {
      return this.services.get(name) as T;
    }

    throw new Error(`Service '${name}' initialization timed out`);
  }
}