"use strict";
// [의도] VS Code 파일 시스템 API를 래핑하여 WindWalker가 사용자 워크스페이스의 파일을 안전하게 읽고 쓸 수 있도록 합니다.
// [책임] 파일 CRUD 작업, 경로 검증, 에러 처리, 워크스페이스 상태 관리
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.FileManager = void 0;
const vscode = __importStar(require("vscode"));
const path = __importStar(require("path"));
class FileManager {
    constructor(context) {
        var _a, _b;
        this.context = context;
        this.workspaceRoot = (_b = (_a = vscode.workspace.workspaceFolders) === null || _a === void 0 ? void 0 : _a[0]) === null || _b === void 0 ? void 0 : _b.uri.fsPath;
        if (!this.workspaceRoot) {
            console.warn('[FileManager] No workspace folder found');
        }
        else {
            console.log(`[FileManager] Initialized with workspace: ${this.workspaceRoot}`);
        }
    }
    // Read file content
    async readFile(relativePath) {
        try {
            const fullPath = this.getFullPath(relativePath);
            const uri = vscode.Uri.file(fullPath);
            // Check if file exists
            try {
                await vscode.workspace.fs.stat(uri);
            }
            catch (error) {
                throw new Error(`File not found: ${relativePath}`);
            }
            const content = await vscode.workspace.fs.readFile(uri);
            const textContent = Buffer.from(content).toString('utf8');
            console.log(`[FileManager] Successfully read file: ${relativePath}`);
            return {
                content: textContent,
                encoding: 'utf8'
            };
        }
        catch (error) {
            console.error(`[FileManager] Error reading file ${relativePath}:`, error);
            throw error;
        }
    }
    // Write file content
    async writeFile(relativePath, content) {
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
        }
        catch (error) {
            console.error(`[FileManager] Error writing file ${relativePath}:`, error);
            const errorMessage = error instanceof Error ? error.message : String(error);
            return {
                success: false,
                path: relativePath,
                error: errorMessage
            };
        }
    }
    // Create new file
    async createFile(relativePath, content = '') {
        try {
            const fullPath = this.getFullPath(relativePath);
            const uri = vscode.Uri.file(fullPath);
            // Check if file already exists
            try {
                await vscode.workspace.fs.stat(uri);
                throw new Error(`File already exists: ${relativePath}`);
            }
            catch (error) {
                // File doesn't exist, which is what we want
                const errorMessage = error instanceof Error ? error.message : String(error);
                if (!errorMessage.includes('already exists')) {
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
        }
        catch (error) {
            console.error(`[FileManager] Error creating file ${relativePath}:`, error);
            const errorMessage = error instanceof Error ? error.message : String(error);
            return {
                success: false,
                path: relativePath,
                error: errorMessage
            };
        }
    }
    // Delete file
    async deleteFile(relativePath) {
        try {
            const fullPath = this.getFullPath(relativePath);
            const uri = vscode.Uri.file(fullPath);
            // Check if file exists
            try {
                await vscode.workspace.fs.stat(uri);
            }
            catch (error) {
                throw new Error(`File not found: ${relativePath}`);
            }
            // Confirm deletion with user
            const choice = await vscode.window.showWarningMessage(`Are you sure you want to delete ${path.basename(relativePath)}?`, 'Delete', 'Cancel');
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
        }
        catch (error) {
            console.error(`[FileManager] Error deleting file ${relativePath}:`, error);
            const errorMessage = error instanceof Error ? error.message : String(error);
            return {
                success: false,
                path: relativePath,
                error: errorMessage
            };
        }
    }
    // List files in directory
    async listFiles(relativePath = '') {
        try {
            const fullPath = this.getFullPath(relativePath);
            const uri = vscode.Uri.file(fullPath);
            const entries = await vscode.workspace.fs.readDirectory(uri);
            const fileInfos = [];
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
                }
                catch (error) {
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
        }
        catch (error) {
            console.error(`[FileManager] Error listing files in ${relativePath}:`, error);
            throw error;
        }
    }
    // Create directory if it doesn't exist
    async ensureDirectoryExists(fullPath) {
        const uri = vscode.Uri.file(fullPath);
        try {
            const stat = await vscode.workspace.fs.stat(uri);
            if (stat.type !== vscode.FileType.Directory) {
                throw new Error(`Path exists but is not a directory: ${fullPath}`);
            }
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            if (errorMessage.includes('not found')) {
                // Directory doesn't exist, create it
                await vscode.workspace.fs.createDirectory(uri);
                console.log(`[FileManager] Created directory: ${fullPath}`);
            }
            else {
                throw error;
            }
        }
    }
    // Get workspace relative files (commonly used files)
    async getWorkspaceFiles() {
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
        const existingFiles = [];
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
            }
            catch (error) {
                // File doesn't exist, skip
            }
        }
        return existingFiles;
    }
    // Helper method to get full path
    getFullPath(relativePath) {
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
    getWorkspaceRoot() {
        return this.workspaceRoot;
    }
    // Check if file exists
    async fileExists(relativePath) {
        try {
            const fullPath = this.getFullPath(relativePath);
            const uri = vscode.Uri.file(fullPath);
            await vscode.workspace.fs.stat(uri);
            return true;
        }
        catch (error) {
            return false;
        }
    }
}
exports.FileManager = FileManager;
//# sourceMappingURL=FileManager.js.map