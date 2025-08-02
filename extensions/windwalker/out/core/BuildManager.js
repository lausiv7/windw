"use strict";
// [의도] VS Code 터미널 및 태스크 API를 사용하여 npm 빌드/개발 서버를 관리합니다. 파일 변경 시 자동으로 빌드를 트리거하고 프리뷰를 업데이트합니다.
// [책임] npm 스크립트 실행, 개발 서버 관리, 빌드 상태 추적, 프리뷰 연동
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
exports.BuildManager = void 0;
const vscode = __importStar(require("vscode"));
class BuildManager {
    constructor(context) {
        this.context = context;
        this.buildStatus = { isRunning: false };
        this.outputChannel = vscode.window.createOutputChannel('WindWalker Build');
        // Listen for task completion
        vscode.tasks.onDidEndTaskProcess((e) => {
            if (e.execution === this.currentTask) {
                this.handleTaskEnd(e);
            }
        });
        console.log('[BuildManager] Initialized');
    }
    // Start build/dev server
    startBuild() {
        return __awaiter(this, arguments, void 0, function* (command = 'npm run dev') {
            try {
                this.outputChannel.appendLine(`[${new Date().toISOString()}] Starting build: ${command}`);
                // Stop existing build if running
                if (this.buildStatus.isRunning) {
                    yield this.stopBuild();
                }
                // Parse command
                const [cmd, ...args] = command.split(' ');
                // Create VS Code task
                const task = new vscode.Task({ type: 'windwalker-build' }, vscode.TaskScope.Workspace, 'WindWalker Build', 'windwalker', new vscode.ShellExecution(cmd, args), []);
                // Set task properties
                task.group = vscode.TaskGroup.Build;
                task.presentationOptions = {
                    echo: true,
                    reveal: vscode.TaskRevealKind.Silent,
                    focus: false,
                    panel: vscode.TaskPanelKind.Dedicated,
                    showReuseMessage: false,
                    clear: true
                };
                // Execute task
                this.currentTask = yield vscode.tasks.executeTask(task);
                // Update status
                this.buildStatus = {
                    isRunning: true,
                    command,
                    startTime: Date.now()
                };
                // Show status in VS Code
                vscode.window.showInformationMessage(`WindWalker: Started ${command}`);
                console.log(`[BuildManager] Started build with command: ${command}`);
                return {
                    success: true,
                    message: `Build started successfully: ${command}`,
                    port: this.extractPortFromCommand(command)
                };
            }
            catch (error) {
                console.error('[BuildManager] Error starting build:', error);
                const errorMessage = error instanceof Error ? error.message : String(error);
                this.outputChannel.appendLine(`[ERROR] ${errorMessage}`);
                return {
                    success: false,
                    message: 'Failed to start build',
                    error: errorMessage
                };
            }
        });
    }
    // Stop build/dev server
    stopBuild() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                if (!this.buildStatus.isRunning) {
                    return {
                        success: true,
                        message: 'No build process is currently running'
                    };
                }
                this.outputChannel.appendLine(`[${new Date().toISOString()}] Stopping build...`);
                // Terminate task
                if (this.currentTask) {
                    this.currentTask.terminate();
                    this.currentTask = undefined;
                }
                // Close terminal if exists
                if (this.terminal) {
                    this.terminal.dispose();
                    this.terminal = undefined;
                }
                // Update status
                this.buildStatus = { isRunning: false };
                console.log('[BuildManager] Build stopped');
                vscode.window.showInformationMessage('WindWalker: Build stopped');
                return {
                    success: true,
                    message: 'Build stopped successfully'
                };
            }
            catch (error) {
                console.error('[BuildManager] Error stopping build:', error);
                const errorMessage = error instanceof Error ? error.message : String(error);
                return {
                    success: false,
                    message: 'Failed to stop build',
                    error: errorMessage
                };
            }
        });
    }
    // Restart build
    restartBuild() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const command = this.buildStatus.command || 'npm run dev';
                this.outputChannel.appendLine(`[${new Date().toISOString()}] Restarting build...`);
                yield this.stopBuild();
                // Wait a moment before restarting
                yield new Promise(resolve => setTimeout(resolve, 1000));
                return yield this.startBuild(command);
            }
            catch (error) {
                console.error('[BuildManager] Error restarting build:', error);
                const errorMessage = error instanceof Error ? error.message : String(error);
                return {
                    success: false,
                    message: 'Failed to restart build',
                    error: errorMessage
                };
            }
        });
    }
    // Get current build status
    getBuildStatus() {
        return Object.assign({}, this.buildStatus);
    }
    // Check if dev server is running
    isDevServerRunning() {
        return __awaiter(this, arguments, void 0, function* (port = 9003) {
            try {
                // Simple check - in real implementation might ping the server
                return this.buildStatus.isRunning && this.buildStatus.port === port;
            }
            catch (error) {
                return false;
            }
        });
    }
    // Get available npm scripts from package.json
    getAvailableScripts() {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            try {
                const workspaceRoot = (_a = vscode.workspace.workspaceFolders) === null || _a === void 0 ? void 0 : _a[0];
                if (!workspaceRoot) {
                    return [];
                }
                const packageJsonUri = vscode.Uri.joinPath(workspaceRoot.uri, 'package.json');
                try {
                    const content = yield vscode.workspace.fs.readFile(packageJsonUri);
                    const packageJson = JSON.parse(content.toString());
                    if (packageJson.scripts) {
                        return Object.keys(packageJson.scripts).map(script => `npm run ${script}`);
                    }
                }
                catch (error) {
                    console.warn('[BuildManager] Could not read package.json:', error);
                }
                return ['npm run dev', 'npm run build', 'npm start'];
            }
            catch (error) {
                console.error('[BuildManager] Error getting available scripts:', error);
                return [];
            }
        });
    }
    // Execute custom command
    executeCommand(command) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b;
            try {
                this.outputChannel.appendLine(`[${new Date().toISOString()}] Executing: ${command}`);
                // Create terminal for one-time commands
                const terminal = vscode.window.createTerminal({
                    name: 'WindWalker Command',
                    cwd: (_b = (_a = vscode.workspace.workspaceFolders) === null || _a === void 0 ? void 0 : _a[0]) === null || _b === void 0 ? void 0 : _b.uri
                });
                terminal.sendText(command);
                terminal.show();
                console.log(`[BuildManager] Executed command: ${command}`);
                return {
                    success: true,
                    message: `Command executed: ${command}`
                };
            }
            catch (error) {
                console.error('[BuildManager] Error executing command:', error);
                const errorMessage = error instanceof Error ? error.message : String(error);
                return {
                    success: false,
                    message: 'Failed to execute command',
                    error: errorMessage
                };
            }
        });
    }
    // Handle task end event
    handleTaskEnd(event) {
        const exitCode = event.exitCode;
        const executionTime = Date.now() - (this.buildStatus.startTime || 0);
        this.outputChannel.appendLine(`[${new Date().toISOString()}] Task ended with exit code: ${exitCode}`);
        this.outputChannel.appendLine(`[${new Date().toISOString()}] Execution time: ${executionTime}ms`);
        // Update status
        this.buildStatus.isRunning = false;
        this.currentTask = undefined;
        if (exitCode === 0) {
            console.log('[BuildManager] Task completed successfully');
            vscode.window.showInformationMessage('WindWalker: Build completed successfully');
        }
        else {
            console.log(`[BuildManager] Task failed with exit code: ${exitCode}`);
            vscode.window.showErrorMessage(`WindWalker: Build failed (exit code: ${exitCode})`);
        }
    }
    // Extract port number from command
    extractPortFromCommand(command) {
        // Look for port in common patterns
        const portMatch = command.match(/-p\s+(\d+)|--port[=\s]+(\d+)/);
        if (portMatch) {
            return parseInt(portMatch[1] || portMatch[2]);
        }
        // Default ports for common commands
        if (command.includes('npm run dev')) {
            return 9003; // Based on package.json
        }
        if (command.includes('next dev')) {
            return 3000;
        }
        return undefined;
    }
    // Dispose resources
    dispose() {
        if (this.currentTask) {
            this.currentTask.terminate();
        }
        if (this.terminal) {
            this.terminal.dispose();
        }
        this.outputChannel.dispose();
    }
}
exports.BuildManager = BuildManager;
//# sourceMappingURL=BuildManager.js.map