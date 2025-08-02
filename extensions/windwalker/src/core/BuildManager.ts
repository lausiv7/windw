// [의도] VS Code 터미널 및 태스크 API를 사용하여 npm 빌드/개발 서버를 관리합니다. 파일 변경 시 자동으로 빌드를 트리거하고 프리뷰를 업데이트합니다.
// [책임] npm 스크립트 실행, 개발 서버 관리, 빌드 상태 추적, 프리뷰 연동

import * as vscode from 'vscode';

export interface BuildStatus {
    isRunning: boolean;
    command?: string;
    port?: number;
    pid?: number;
    startTime?: number;
    lastOutput?: string;
}

export interface BuildResult {
    success: boolean;
    message: string;
    output?: string;
    error?: string;
    port?: number;
}

export class BuildManager {
    private context: vscode.ExtensionContext;
    private currentTask: vscode.TaskExecution | undefined;
    private buildStatus: BuildStatus;
    private terminal: vscode.Terminal | undefined;
    private outputChannel: vscode.OutputChannel;

    constructor(context: vscode.ExtensionContext) {
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
    async startBuild(command: string = 'npm run dev'): Promise<BuildResult> {
        try {
            this.outputChannel.appendLine(`[${new Date().toISOString()}] Starting build: ${command}`);
            
            // Stop existing build if running
            if (this.buildStatus.isRunning) {
                await this.stopBuild();
            }

            // Parse command
            const [cmd, ...args] = command.split(' ');
            
            // Create VS Code task
            const task = new vscode.Task(
                { type: 'windwalker-build' },
                vscode.TaskScope.Workspace,
                'WindWalker Build',
                'windwalker',
                new vscode.ShellExecution(cmd, args),
                []
            );

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
            this.currentTask = await vscode.tasks.executeTask(task);
            
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

        } catch (error) {
            console.error('[BuildManager] Error starting build:', error);
            const errorMessage = error instanceof Error ? error.message : String(error);
            this.outputChannel.appendLine(`[ERROR] ${errorMessage}`);
            
            return {
                success: false,
                message: 'Failed to start build',
                error: errorMessage
            };
        }
    }

    // Stop build/dev server
    async stopBuild(): Promise<BuildResult> {
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

        } catch (error) {
            console.error('[BuildManager] Error stopping build:', error);
            const errorMessage = error instanceof Error ? error.message : String(error);
            
            return {
                success: false,
                message: 'Failed to stop build',
                error: errorMessage
            };
        }
    }

    // Restart build
    async restartBuild(): Promise<BuildResult> {
        try {
            const command = this.buildStatus.command || 'npm run dev';
            
            this.outputChannel.appendLine(`[${new Date().toISOString()}] Restarting build...`);
            
            await this.stopBuild();
            
            // Wait a moment before restarting
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            return await this.startBuild(command);

        } catch (error) {
            console.error('[BuildManager] Error restarting build:', error);
            const errorMessage = error instanceof Error ? error.message : String(error);
            
            return {
                success: false,
                message: 'Failed to restart build',
                error: errorMessage
            };
        }
    }

    // Get current build status
    getBuildStatus(): BuildStatus {
        return { ...this.buildStatus };
    }

    // Check if dev server is running
    async isDevServerRunning(port: number = 9003): Promise<boolean> {
        try {
            // Simple check - in real implementation might ping the server
            return this.buildStatus.isRunning && this.buildStatus.port === port;
        } catch (error) {
            return false;
        }
    }

    // Get available npm scripts from package.json
    async getAvailableScripts(): Promise<string[]> {
        try {
            const workspaceRoot = vscode.workspace.workspaceFolders?.[0];
            if (!workspaceRoot) {
                return [];
            }

            const packageJsonUri = vscode.Uri.joinPath(workspaceRoot.uri, 'package.json');
            
            try {
                const content = await vscode.workspace.fs.readFile(packageJsonUri);
                const packageJson = JSON.parse(content.toString());
                
                if (packageJson.scripts) {
                    return Object.keys(packageJson.scripts).map(script => `npm run ${script}`);
                }
            } catch (error) {
                console.warn('[BuildManager] Could not read package.json:', error);
            }

            return ['npm run dev', 'npm run build', 'npm start'];

        } catch (error) {
            console.error('[BuildManager] Error getting available scripts:', error);
            return [];
        }
    }

    // Execute custom command
    async executeCommand(command: string): Promise<BuildResult> {
        try {
            this.outputChannel.appendLine(`[${new Date().toISOString()}] Executing: ${command}`);
            
            // Create terminal for one-time commands
            const terminal = vscode.window.createTerminal({
                name: 'WindWalker Command',
                cwd: vscode.workspace.workspaceFolders?.[0]?.uri
            });

            terminal.sendText(command);
            terminal.show();

            console.log(`[BuildManager] Executed command: ${command}`);
            
            return {
                success: true,
                message: `Command executed: ${command}`
            };

        } catch (error) {
            console.error('[BuildManager] Error executing command:', error);
            const errorMessage = error instanceof Error ? error.message : String(error);
            
            return {
                success: false,
                message: 'Failed to execute command',
                error: errorMessage
            };
        }
    }

    // Handle task end event
    private handleTaskEnd(event: vscode.TaskProcessEndEvent): void {
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
        } else {
            console.log(`[BuildManager] Task failed with exit code: ${exitCode}`);
            vscode.window.showErrorMessage(`WindWalker: Build failed (exit code: ${exitCode})`);
        }
    }

    // Extract port number from command
    private extractPortFromCommand(command: string): number | undefined {
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
    dispose(): void {
        if (this.currentTask) {
            this.currentTask.terminate();
        }
        
        if (this.terminal) {
            this.terminal.dispose();
        }
        
        this.outputChannel.dispose();
    }
}