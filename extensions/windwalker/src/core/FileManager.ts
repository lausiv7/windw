// [의도] VS Code 파일 시스템 API를 래핑하여 WindWalker가 사용자 워크스페이스의 파일을 안전하게 읽고 쓸 수 있도록 합니다.
// [책임] 파일 CRUD 작업, 경로 검증, 에러 처리, 워크스페이스 상태 관리

import * as vscode from 'vscode';
import * as path from 'path';

export interface FileInfo {
    name: string;
    path: string;
    type: 'file' | 'directory';
    size: number;
    modified: number;
}

export interface FileOperation {
    success: boolean;
    path: string;
    message?: string;
    error?: string;
}

export class FileManager {
    private context: vscode.ExtensionContext;
    private workspaceRoot: string | undefined;

    constructor(context: vscode.ExtensionContext) {
        this.context = context;
        this.workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
        
        if (!this.workspaceRoot) {
            console.warn('[FileManager] No workspace folder found');
        } else {
            console.log(`[FileManager] Initialized with workspace: ${this.workspaceRoot}`);
        }
    }

    // Read file content
    async readFile(relativePath: string): Promise<{ content: string; encoding: string }> {
        try {
            const fullPath = this.getFullPath(relativePath);
            const uri = vscode.Uri.file(fullPath);
            
            // Check if file exists
            try {
                await vscode.workspace.fs.stat(uri);
            } catch (error) {
                throw new Error(`File not found: ${relativePath}`);
            }

            const content = await vscode.workspace.fs.readFile(uri);
            const textContent = Buffer.from(content).toString('utf8');
            
            console.log(`[FileManager] Successfully read file: ${relativePath}`);
            
            return {
                content: textContent,
                encoding: 'utf8'
            };

        } catch (error) {
            console.error(`[FileManager] Error reading file ${relativePath}:`, error);
            throw error;
        }
    }

    // Write file content
    async writeFile(relativePath: string, content: string): Promise<FileOperation> {
        try {
            const fullPath = this.getFullPath(relativePath);
            const uri = vscode.Uri.file(fullPath);
            
            // Ensure directory exists
            const dirPath = path.dirname(fullPath);
            await this.ensureDirectoryExists(dirPath);

            // Write file
            const contentBuffer = Buffer.from(content, 'utf8');
            await vscode.workspace.fs.writeFile(uri, contentBuffer);
            
            console.log(`[FileManager] Successfully wrote file: ${relativePath}`);
            
            // Show success message to user
            vscode.window.showInformationMessage(`File saved: ${path.basename(relativePath)}`);
            
            return {
                success: true,
                path: relativePath,
                message: `File ${relativePath} saved successfully`
            };

        } catch (error) {
            console.error(`[FileManager] Error writing file ${relativePath}:`, error);
            
            return {
                success: false,
                path: relativePath,
                error: error.message
            };
        }
    }

    // Create new file
    async createFile(relativePath: string, content: string = ''): Promise<FileOperation> {
        try {
            const fullPath = this.getFullPath(relativePath);
            const uri = vscode.Uri.file(fullPath);
            
            // Check if file already exists
            try {
                await vscode.workspace.fs.stat(uri);
                throw new Error(`File already exists: ${relativePath}`);
            } catch (error) {
                // File doesn't exist, which is what we want
                if (!error.message.includes('already exists')) {
                    // This is expected - file should not exist
                }
            }

            // Create the file
            const result = await this.writeFile(relativePath, content);
            
            if (result.success) {
                // Open the created file in editor
                const document = await vscode.workspace.openTextDocument(uri);
                await vscode.window.showTextDocument(document);
                
                console.log(`[FileManager] Successfully created and opened file: ${relativePath}`);
                
                return {
                    success: true,
                    path: relativePath,
                    message: `File ${relativePath} created and opened successfully`
                };
            }
            
            return result;

        } catch (error) {
            console.error(`[FileManager] Error creating file ${relativePath}:`, error);
            
            return {
                success: false,
                path: relativePath,
                error: error.message
            };
        }
    }

    // Delete file
    async deleteFile(relativePath: string): Promise<FileOperation> {
        try {
            const fullPath = this.getFullPath(relativePath);
            const uri = vscode.Uri.file(fullPath);
            
            // Check if file exists
            try {
                await vscode.workspace.fs.stat(uri);
            } catch (error) {
                throw new Error(`File not found: ${relativePath}`);
            }

            // Confirm deletion with user
            const choice = await vscode.window.showWarningMessage(
                `Are you sure you want to delete ${path.basename(relativePath)}?`,
                'Delete',
                'Cancel'
            );

            if (choice !== 'Delete') {
                return {
                    success: false,
                    path: relativePath,
                    message: 'Deletion cancelled by user'
                };
            }

            // Delete file
            await vscode.workspace.fs.delete(uri);
            
            console.log(`[FileManager] Successfully deleted file: ${relativePath}`);
            vscode.window.showInformationMessage(`File deleted: ${path.basename(relativePath)}`);
            
            return {
                success: true,
                path: relativePath,
                message: `File ${relativePath} deleted successfully`
            };

        } catch (error) {
            console.error(`[FileManager] Error deleting file ${relativePath}:`, error);
            
            return {
                success: false,
                path: relativePath,
                error: error.message
            };
        }
    }

    // List files in directory
    async listFiles(relativePath: string = ''): Promise<FileInfo[]> {
        try {
            const fullPath = this.getFullPath(relativePath);
            const uri = vscode.Uri.file(fullPath);
            
            const entries = await vscode.workspace.fs.readDirectory(uri);
            const fileInfos: FileInfo[] = [];

            for (const [name, type] of entries) {
                const entryPath = path.join(fullPath, name);
                const entryUri = vscode.Uri.file(entryPath);
                
                try {
                    const stat = await vscode.workspace.fs.stat(entryUri);
                    
                    fileInfos.push({
                        name,
                        path: path.join(relativePath, name),
                        type: type === vscode.FileType.Directory ? 'directory' : 'file',
                        size: stat.size,
                        modified: stat.mtime
                    });
                } catch (error) {
                    console.warn(`[FileManager] Could not stat ${name}:`, error);
                }
            }

            // Sort: directories first, then files, both alphabetically
            fileInfos.sort((a, b) => {
                if (a.type === b.type) {
                    return a.name.localeCompare(b.name);
                }
                return a.type === 'directory' ? -1 : 1;
            });

            console.log(`[FileManager] Listed ${fileInfos.length} items in: ${relativePath || 'workspace root'}`);
            
            return fileInfos;

        } catch (error) {
            console.error(`[FileManager] Error listing files in ${relativePath}:`, error);
            throw error;
        }
    }

    // Create directory if it doesn't exist
    async ensureDirectoryExists(fullPath: string): Promise<void> {
        const uri = vscode.Uri.file(fullPath);
        
        try {
            const stat = await vscode.workspace.fs.stat(uri);
            if (stat.type !== vscode.FileType.Directory) {
                throw new Error(`Path exists but is not a directory: ${fullPath}`);
            }
        } catch (error) {
            if (error.message.includes('not found')) {
                // Directory doesn't exist, create it
                await vscode.workspace.fs.createDirectory(uri);
                console.log(`[FileManager] Created directory: ${fullPath}`);
            } else {
                throw error;
            }
        }
    }

    // Get workspace relative files (commonly used files)
    async getWorkspaceFiles(): Promise<FileInfo[]> {
        const commonPaths = [
            'package.json',
            'src',
            'src/app',
            'src/components',
            'src/lib',
            'public',
            'README.md',
            'next.config.ts',
            'tailwind.config.ts'
        ];

        const existingFiles: FileInfo[] = [];

        for (const relativePath of commonPaths) {
            try {
                const fullPath = this.getFullPath(relativePath);
                const uri = vscode.Uri.file(fullPath);
                const stat = await vscode.workspace.fs.stat(uri);
                
                existingFiles.push({
                    name: path.basename(relativePath),
                    path: relativePath,
                    type: stat.type === vscode.FileType.Directory ? 'directory' : 'file',
                    size: stat.size,
                    modified: stat.mtime
                });
            } catch (error) {
                // File doesn't exist, skip
            }
        }

        return existingFiles;
    }

    // Helper method to get full path
    private getFullPath(relativePath: string): string {
        if (!this.workspaceRoot) {
            throw new Error('No workspace folder is open');
        }

        // Normalize path separators
        const normalizedPath = relativePath.replace(/\\/g, '/');
        
        // Remove leading slash if present
        const cleanPath = normalizedPath.startsWith('/') ? normalizedPath.slice(1) : normalizedPath;
        
        return path.join(this.workspaceRoot, cleanPath);
    }

    // Get workspace root
    getWorkspaceRoot(): string | undefined {
        return this.workspaceRoot;
    }

    // Check if file exists
    async fileExists(relativePath: string): Promise<boolean> {
        try {
            const fullPath = this.getFullPath(relativePath);
            const uri = vscode.Uri.file(fullPath);
            await vscode.workspace.fs.stat(uri);
            return true;
        } catch (error) {
            return false;
        }
    }
}