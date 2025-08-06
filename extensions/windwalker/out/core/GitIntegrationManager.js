"use strict";
// [의도] AI 대화식 웹사이트 빌더의 Git 통합 관리
// [책임] AI 생성 코드의 자동 커밋, 대화 기반 되돌리기, Git 히스토리 분석
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.GitIntegrationManager = void 0;
const vscode = __importStar(require("vscode"));
const simple_git_1 = require("simple-git");
const path = __importStar(require("path"));
class GitIntegrationManager {
    constructor(context) {
        var _a, _b;
        // 워크스페이스 경로 설정
        this.workspacePath = ((_b = (_a = vscode.workspace.workspaceFolders) === null || _a === void 0 ? void 0 : _a[0]) === null || _b === void 0 ? void 0 : _b.uri.fsPath) || process.cwd();
        // SimpleGit 인스턴스 생성
        this.git = (0, simple_git_1.simpleGit)(this.workspacePath);
        console.log(`[GitIntegrationManager] Initialized for workspace: ${this.workspacePath}`);
    }
    /**
     * AI 대화 기반 자동 커밋 생성
     */
    createAIConversationCommit(conversationId, messageId, userRequest, aiResponse, filesChanged, aiMetadata) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                console.log(`[GitIntegrationManager] Creating AI commit for conversation: ${conversationId}`);
                // 1. Git 상태 확인
                const status = yield this.git.status();
                if (status.files.length === 0) {
                    throw new Error('No changes to commit');
                }
                // 2. 변경된 파일들 스테이징
                if (filesChanged.length > 0) {
                    yield this.git.add(filesChanged);
                }
                else {
                    // 모든 변경사항 스테이징
                    yield this.git.add('.');
                }
                // 3. 커밋 메시지 생성 (표준화된 형식)
                const changeType = this.inferChangeType(userRequest, filesChanged);
                const shortDescription = this.summarizeChanges(filesChanged, userRequest);
                const commitMessage = `[AI-Chat-${conversationId}] ${changeType}: ${shortDescription}`;
                // 4. 상세 메타데이터와 함께 커밋 생성
                const commit = yield this.git.commit(commitMessage, filesChanged, {
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
                const result = {
                    commitHash: commit.commit,
                    shortHash: commit.commit.substring(0, 8),
                    message: commitMessage,
                    filesChanged: filesChanged.length > 0 ? filesChanged : status.files.map(f => f.path),
                    timestamp: new Date()
                };
                console.log(`✅ AI commit created: ${result.shortHash} - ${shortDescription}`);
                return result;
            }
            catch (error) {
                console.error(`[GitIntegrationManager] Error creating AI commit:`, error);
                throw new Error(`Git commit failed: ${error.message}`);
            }
        });
    }
    /**
     * 특정 대화로 되돌리기 (단계별 또는 전체)
     */
    revertToConversationState(conversationId, stepsBack) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                console.log(`[GitIntegrationManager] Reverting conversation ${conversationId}, steps back: ${stepsBack || 'latest'}`);
                // 해당 대화의 모든 커밋 조회 (시간순)
                const logs = yield this.git.log({
                    '--grep': `Conversation-ID: ${conversationId}`,
                    '--reverse': true
                });
                if (logs.all.length === 0) {
                    throw new Error(`No commits found for conversation: ${conversationId}`);
                }
                // N번째 전 상태로 되돌리기
                let targetCommitIndex;
                if (stepsBack && stepsBack > 0) {
                    targetCommitIndex = Math.max(0, logs.all.length - stepsBack);
                }
                else {
                    targetCommitIndex = logs.all.length - 1; // 마지막 커밋
                }
                const targetCommit = logs.all[targetCommitIndex];
                // Hard reset으로 되돌리기 (주의: 작업 중인 변경사항 손실 가능)
                yield this.git.reset(['--hard', targetCommit.hash]);
                const result = {
                    targetCommit: targetCommit.hash,
                    commitMessage: targetCommit.message,
                    stepsReverted: logs.all.length - targetCommitIndex - 1,
                    timestamp: new Date()
                };
                console.log(`✅ Reverted to commit: ${targetCommit.hash.substring(0, 8)} - ${targetCommit.message}`);
                return result;
            }
            catch (error) {
                console.error(`[GitIntegrationManager] Error reverting conversation:`, error);
                throw new Error(`Git revert failed: ${error.message}`);
            }
        });
    }
    /**
     * 특정 커밋으로 되돌리기
     */
    revertToCommit(commitHash) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                yield this.git.reset(['--hard', commitHash]);
                console.log(`✅ Reverted to commit: ${commitHash.substring(0, 8)}`);
            }
            catch (error) {
                console.error(`[GitIntegrationManager] Error reverting to commit:`, error);
                throw new Error(`Git revert to commit failed: ${error.message}`);
            }
        });
    }
    /**
     * 대화 패턴 분석용 데이터 추출
     */
    extractConversationAnalytics() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const logs = yield this.git.log({
                    '--grep': 'AI-Chat-',
                    '--pretty': 'format:%H|%s|%b|%an|%ad'
                });
                return logs.all.map(log => {
                    var _a;
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
                        filesModified: ((_a = this.extractMetadata(body, 'Files-Modified')) === null || _a === void 0 ? void 0 : _a.split(', ')) || [],
                        timestamp: new Date(parts[4])
                    };
                });
            }
            catch (error) {
                console.error(`[GitIntegrationManager] Error extracting analytics:`, error);
                return [];
            }
        });
    }
    /**
     * 특정 대화의 모든 커밋 조회
     */
    getConversationCommits(conversationId) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                return yield this.git.log({
                    '--grep': `Conversation-ID: ${conversationId}`,
                    '--oneline': true
                });
            }
            catch (error) {
                console.error(`[GitIntegrationManager] Error getting conversation commits:`, error);
                throw new Error(`Failed to get commits for conversation: ${conversationId}`);
            }
        });
    }
    /**
     * 현재 Git 커밋 해시 조회
     */
    getCurrentCommitHash() {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            try {
                const log = yield this.git.log({ maxCount: 1 });
                return ((_a = log.latest) === null || _a === void 0 ? void 0 : _a.hash) || '';
            }
            catch (error) {
                console.error(`[GitIntegrationManager] Error getting current commit:`, error);
                return '';
            }
        });
    }
    /**
     * 현재 Git 커밋 정보 조회
     */
    getCurrentCommit() {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b;
            try {
                const log = yield this.git.log({ maxCount: 1 });
                return {
                    hash: ((_a = log.latest) === null || _a === void 0 ? void 0 : _a.hash) || '',
                    message: ((_b = log.latest) === null || _b === void 0 ? void 0 : _b.message) || ''
                };
            }
            catch (error) {
                console.error(`[GitIntegrationManager] Error getting current commit info:`, error);
                return { hash: '', message: '' };
            }
        });
    }
    /**
     * Git 상태 확인
     */
    getStatus() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                return yield this.git.status();
            }
            catch (error) {
                console.error(`[GitIntegrationManager] Error getting git status:`, error);
                throw new Error(`Git status check failed: ${error.message}`);
            }
        });
    }
    /**
     * Git 브랜치 확인
     */
    getCurrentBranch() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const branches = yield this.git.branch();
                return branches.current;
            }
            catch (error) {
                console.error(`[GitIntegrationManager] Error getting current branch:`, error);
                return 'main';
            }
        });
    }
    // === Private Utility Methods ===
    inferChangeType(userRequest, files) {
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
    summarizeChanges(files, userRequest) {
        const fileTypes = this.categorizeFiles(files);
        const shortRequest = userRequest.length > 50 ?
            `${userRequest.substring(0, 47)}...` : userRequest;
        if (fileTypes.length > 0) {
            return `${fileTypes.join('+')} 수정: ${shortRequest}`;
        }
        return shortRequest;
    }
    categorizeFiles(files) {
        const categories = new Set();
        files.forEach(file => {
            const ext = path.extname(file).toLowerCase();
            if (ext === '.html')
                categories.add('HTML');
            else if (ext === '.css')
                categories.add('CSS');
            else if (['.js', '.ts', '.jsx', '.tsx'].includes(ext))
                categories.add('JS');
            else if (['.json', '.yml', '.yaml'].includes(ext))
                categories.add('Config');
            else if (['.png', '.jpg', '.jpeg', '.gif', '.svg'].includes(ext))
                categories.add('Asset');
            else
                categories.add('File');
        });
        return Array.from(categories);
    }
    extractMetadata(body, key) {
        const regex = new RegExp(`${key}:\\s*(.+)`, 'i');
        const match = body.match(regex);
        return match ? match[1].replace(/"/g, '').trim() : undefined;
    }
    sanitizeForGit(text) {
        // Git 커밋 메시지에서 문제가 될 수 있는 문자들 정리
        return text
            .replace(/"/g, "'") // 큰따옴표를 작은따옴표로
            .replace(/\n/g, ' ') // 개행문자를 공백으로
            .replace(/\r/g, '') // 캐리지 리턴 제거
            .trim();
    }
}
exports.GitIntegrationManager = GitIntegrationManager;
//# sourceMappingURL=GitIntegrationManager.js.map