// [의도] AI 대화식 웹사이트 빌더의 Git 통합 관리
// [책임] AI 생성 코드의 자동 커밋, 대화 기반 되돌리기, Git 히스토리 분석

import * as vscode from 'vscode';
import { simpleGit, SimpleGit, LogResult } from 'simple-git';
import * as path from 'path';

export interface GitCommitResult {
  commitHash: string;
  shortHash: string;
  message: string;
  filesChanged: string[];
  timestamp: Date;
}

export interface AIMetadata {
  model: string;
  confidence: number;
  processingTime: number;
  tokenCount?: number;
}

export interface RevertResult {
  targetCommit: string;
  commitMessage: string;
  stepsReverted: number;
  timestamp: Date;
}

export interface ConversationAnalytics {
  commitHash: string;
  conversationId: string;
  messageId: string;
  userRequest: string;
  aiModel: string;
  confidence: number;
  processingTime: number;
  filesModified: string[];
  timestamp: Date;
}

export class GitIntegrationManager {
  private git: SimpleGit;
  private workspacePath: string;
  
  constructor(context: vscode.ExtensionContext) {
    // 워크스페이스 경로 설정
    this.workspacePath = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath || process.cwd();
    
    // SimpleGit 인스턴스 생성
    this.git = simpleGit(this.workspacePath);
    
    console.log(`[GitIntegrationManager] Initialized for workspace: ${this.workspacePath}`);
  }
  
  /**
   * AI 대화 기반 자동 커밋 생성
   */
  async createAIConversationCommit(
    conversationId: string,
    messageId: string,
    userRequest: string,
    aiResponse: string,
    filesChanged: string[],
    aiMetadata: AIMetadata
  ): Promise<GitCommitResult> {
    try {
      console.log(`[GitIntegrationManager] Creating AI commit for conversation: ${conversationId}`);
      
      // 1. Git 상태 확인
      const status = await this.git.status();
      if (status.files.length === 0) {
        throw new Error('No changes to commit');
      }
      
      // 2. 변경된 파일들 스테이징
      if (filesChanged.length > 0) {
        await this.git.add(filesChanged);
      } else {
        // 모든 변경사항 스테이징
        await this.git.add('.');
      }
      
      // 3. 커밋 메시지 생성 (표준화된 형식)
      const changeType = this.inferChangeType(userRequest, filesChanged);
      const shortDescription = this.summarizeChanges(filesChanged, userRequest);
      const commitMessage = `[AI-Chat-${conversationId}] ${changeType}: ${shortDescription}`;
      
      // 4. 상세 메타데이터와 함께 커밋 생성
      const commit = await this.git.commit(commitMessage, filesChanged, {
        '--author': 'WindWalker AI <ai@windwalker.dev>',
        '--trailer': `Conversation-ID: ${conversationId}`,
        '--trailer': `Message-ID: ${messageId}`,
        '--trailer': `User-Request: "${this.sanitizeForGit(userRequest)}"`,
        '--trailer': `AI-Response: "${this.sanitizeForGit(aiResponse.substring(0, 100))}..."`,
        '--trailer': `AI-Model: ${aiMetadata.model}`,
        '--trailer': `Confidence: ${aiMetadata.confidence}`,
        '--trailer': `Processing-Time: ${aiMetadata.processingTime}ms`,
        '--trailer': `Generated-By: WindWalker-AI-Engine`,
        '--trailer': `Files-Modified: ${filesChanged.join(', ')}`
      });
      
      const result: GitCommitResult = {
        commitHash: commit.commit,
        shortHash: commit.commit.substring(0, 8),
        message: commitMessage,
        filesChanged: filesChanged.length > 0 ? filesChanged : status.files.map(f => f.path),
        timestamp: new Date()
      };
      
      console.log(`✅ AI commit created: ${result.shortHash} - ${shortDescription}`);
      return result;
      
    } catch (error) {
      console.error(`[GitIntegrationManager] Error creating AI commit:`, error);
      throw new Error(`Git commit failed: ${error.message}`);
    }
  }
  
  /**
   * 특정 대화로 되돌리기 (단계별 또는 전체)
   */
  async revertToConversationState(
    conversationId: string, 
    stepsBack?: number
  ): Promise<RevertResult> {
    try {
      console.log(`[GitIntegrationManager] Reverting conversation ${conversationId}, steps back: ${stepsBack || 'latest'}`);
      
      // 해당 대화의 모든 커밋 조회 (시간순)
      const logs = await this.git.log({
        '--grep': `Conversation-ID: ${conversationId}`,
        '--reverse': true
      });
      
      if (logs.all.length === 0) {
        throw new Error(`No commits found for conversation: ${conversationId}`);
      }
      
      // N번째 전 상태로 되돌리기
      let targetCommitIndex: number;
      if (stepsBack && stepsBack > 0) {
        targetCommitIndex = Math.max(0, logs.all.length - stepsBack);
      } else {
        targetCommitIndex = logs.all.length - 1; // 마지막 커밋
      }
      
      const targetCommit = logs.all[targetCommitIndex];
      
      // Hard reset으로 되돌리기 (주의: 작업 중인 변경사항 손실 가능)
      await this.git.reset(['--hard', targetCommit.hash]);
      
      const result: RevertResult = {
        targetCommit: targetCommit.hash,
        commitMessage: targetCommit.message,
        stepsReverted: logs.all.length - targetCommitIndex - 1,
        timestamp: new Date()
      };
      
      console.log(`✅ Reverted to commit: ${targetCommit.hash.substring(0, 8)} - ${targetCommit.message}`);
      return result;
      
    } catch (error) {
      console.error(`[GitIntegrationManager] Error reverting conversation:`, error);
      throw new Error(`Git revert failed: ${error.message}`);
    }
  }
  
  /**
   * 특정 커밋으로 되돌리기
   */
  async revertToCommit(commitHash: string): Promise<void> {
    try {
      await this.git.reset(['--hard', commitHash]);
      console.log(`✅ Reverted to commit: ${commitHash.substring(0, 8)}`);
    } catch (error) {
      console.error(`[GitIntegrationManager] Error reverting to commit:`, error);
      throw new Error(`Git revert to commit failed: ${error.message}`);
    }
  }
  
  /**
   * 대화 패턴 분석용 데이터 추출
   */
  async extractConversationAnalytics(): Promise<ConversationAnalytics[]> {
    try {
      const logs = await this.git.log({
        '--grep': 'AI-Chat-',
        '--pretty': 'format:%H|%s|%b|%an|%ad'
      });
      
      return logs.all.map(log => {
        const parts = log.hash.split('|');
        const body = parts[2] || '';
        
        return {
          commitHash: parts[0],
          conversationId: this.extractMetadata(body, 'Conversation-ID') || '',
          messageId: this.extractMetadata(body, 'Message-ID') || '',
          userRequest: this.extractMetadata(body, 'User-Request') || '',
          aiModel: this.extractMetadata(body, 'AI-Model') || '',
          confidence: parseFloat(this.extractMetadata(body, 'Confidence') || '0'),
          processingTime: parseInt(this.extractMetadata(body, 'Processing-Time') || '0'),
          filesModified: this.extractMetadata(body, 'Files-Modified')?.split(', ') || [],
          timestamp: new Date(parts[4])
        };
      });
    } catch (error) {
      console.error(`[GitIntegrationManager] Error extracting analytics:`, error);
      return [];
    }
  }
  
  /**
   * 특정 대화의 모든 커밋 조회
   */
  async getConversationCommits(conversationId: string): Promise<LogResult> {
    try {
      return await this.git.log({
        '--grep': `Conversation-ID: ${conversationId}`,
        '--oneline': true
      });
    } catch (error) {
      console.error(`[GitIntegrationManager] Error getting conversation commits:`, error);
      throw new Error(`Failed to get commits for conversation: ${conversationId}`);
    }
  }
  
  /**
   * 현재 Git 커밋 해시 조회
   */
  async getCurrentCommitHash(): Promise<string> {
    try {
      const log = await this.git.log({ maxCount: 1 });
      return log.latest?.hash || '';
    } catch (error) {
      console.error(`[GitIntegrationManager] Error getting current commit:`, error);
      return '';
    }
  }
  
  /**
   * 현재 Git 커밋 정보 조회
   */
  async getCurrentCommit(): Promise<{ hash: string; message: string }> {
    try {
      const log = await this.git.log({ maxCount: 1 });
      return {
        hash: log.latest?.hash || '',
        message: log.latest?.message || ''
      };
    } catch (error) {
      console.error(`[GitIntegrationManager] Error getting current commit info:`, error);
      return { hash: '', message: '' };
    }
  }
  
  /**
   * Git 상태 확인
   */
  async getStatus(): Promise<any> {
    try {
      return await this.git.status();
    } catch (error) {
      console.error(`[GitIntegrationManager] Error getting git status:`, error);
      throw new Error(`Git status check failed: ${error.message}`);
    }
  }
  
  /**
   * Git 브랜치 확인
   */
  async getCurrentBranch(): Promise<string> {
    try {
      const branches = await this.git.branch();
      return branches.current;
    } catch (error) {
      console.error(`[GitIntegrationManager] Error getting current branch:`, error);
      return 'main';
    }
  }
  
  // === Private Utility Methods ===
  
  private inferChangeType(userRequest: string, files: string[]): string {
    const request = userRequest.toLowerCase();
    
    if (request.includes('생성') || request.includes('추가') || request.includes('새로')) {
      return 'feat';
    }
    if (request.includes('수정') || request.includes('변경') || request.includes('업데이트')) {
      return 'update';
    }
    if (request.includes('삭제') || request.includes('제거')) {
      return 'remove';
    }
    if (request.includes('스타일') || request.includes('색상') || request.includes('디자인')) {
      return 'style';
    }
    if (request.includes('버그') || request.includes('오류') || request.includes('수정')) {
      return 'fix';
    }
    if (request.includes('테스트')) {
      return 'test';
    }
    if (request.includes('문서') || request.includes('설명')) {
      return 'docs';
    }
    
    return 'feat'; // 기본값
  }
  
  private summarizeChanges(files: string[], userRequest: string): string {
    const fileTypes = this.categorizeFiles(files);
    const shortRequest = userRequest.length > 50 ? 
      `${userRequest.substring(0, 47)}...` : userRequest;
    
    if (fileTypes.length > 0) {
      return `${fileTypes.join('+')} 수정: ${shortRequest}`;
    }
    
    return shortRequest;
  }
  
  private categorizeFiles(files: string[]): string[] {
    const categories = new Set<string>();
    
    files.forEach(file => {
      const ext = path.extname(file).toLowerCase();
      if (ext === '.html') categories.add('HTML');
      else if (ext === '.css') categories.add('CSS');
      else if (['.js', '.ts', '.jsx', '.tsx'].includes(ext)) categories.add('JS');
      else if (['.json', '.yml', '.yaml'].includes(ext)) categories.add('Config');
      else if (['.png', '.jpg', '.jpeg', '.gif', '.svg'].includes(ext)) categories.add('Asset');
      else categories.add('File');
    });
    
    return Array.from(categories);
  }
  
  private extractMetadata(body: string, key: string): string | undefined {
    const regex = new RegExp(`${key}:\\s*(.+)`, 'i');
    const match = body.match(regex);
    return match ? match[1].replace(/"/g, '').trim() : undefined;
  }
  
  private sanitizeForGit(text: string): string {
    // Git 커밋 메시지에서 문제가 될 수 있는 문자들 정리
    return text
      .replace(/"/g, "'")  // 큰따옴표를 작은따옴표로
      .replace(/\n/g, ' ') // 개행문자를 공백으로
      .replace(/\r/g, '')  // 캐리지 리턴 제거
      .trim();
  }
}