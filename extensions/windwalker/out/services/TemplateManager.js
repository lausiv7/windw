"use strict";
// [의도] AI 대화식 웹사이트 빌더의 템플릿 추천 및 적용 시스템
// [책임] 템플릿 데이터 관리, 의도 기반 추천, 파일 생성 및 적용
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
exports.TemplateManager = void 0;
const vscode = __importStar(require("vscode"));
const path = __importStar(require("path"));
const fs = __importStar(require("fs/promises"));
class TemplateManager {
    constructor(context) {
        this.name = 'TemplateManager';
        this.templates = new Map();
        this.context = context;
        this.templatePath = path.join(context.extensionPath, 'templates');
    }
    async initialize() {
        await this.loadTemplates();
        console.log('✅ TemplateManager initialized');
    }
    dispose() {
        this.templates.clear();
        console.log('✅ TemplateManager disposed');
    }
    /**
     * 의도 기반 템플릿 추천
     */
    async recommendTemplates(request) {
        try {
            console.log(`[TemplateManager] Recommending templates for: ${request.intent}`);
            // 1. 카테고리 추출 (미지정 시)
            const category = request.category || this.inferCategoryFromIntent(request.intent);
            // 2. 카테고리별 템플릿 필터링
            const categoryTemplates = Array.from(this.templates.values())
                .filter(template => template.category === category);
            // 3. 사용자 레벨에 따른 필터링
            const levelFiltered = request.userLevel ?
                categoryTemplates.filter(t => t.difficulty === request.userLevel) :
                categoryTemplates;
            // 4. 요구사항에 따른 필터링
            const requirementFiltered = this.filterByRequirements(levelFiltered, request.requirements);
            // 5. 선호도에 따른 스코어링 및 정렬
            const scored = this.scoreTemplatesByPreferences(requirementFiltered, request.preferences);
            // 6. 상위 3개 추천
            const recommendations = scored
                .sort((a, b) => b.score - a.score)
                .slice(0, 3)
                .map(item => item.template);
            console.log(`[TemplateManager] Recommended ${recommendations.length} templates for category: ${category}`);
            return recommendations;
        }
        catch (error) {
            console.error('[TemplateManager] Error in template recommendation:', error);
            return this.getFallbackTemplates();
        }
    }
    /**
     * 템플릿 적용
     */
    async applyTemplate(templateId, customizations) {
        var _a;
        try {
            console.log(`[TemplateManager] Applying template: ${templateId}`);
            const template = this.templates.get(templateId);
            if (!template) {
                return {
                    success: false,
                    templateId,
                    filesCreated: [],
                    message: `Template '${templateId}' not found`,
                    errors: [`Template ID '${templateId}' does not exist`]
                };
            }
            // 1. 워크스페이스 확인
            const workspaceFolder = (_a = vscode.workspace.workspaceFolders) === null || _a === void 0 ? void 0 : _a[0];
            if (!workspaceFolder) {
                return {
                    success: false,
                    templateId,
                    filesCreated: [],
                    message: 'No workspace folder available',
                    errors: ['Please open a workspace folder before applying a template']
                };
            }
            // 2. 템플릿 파일들 생성
            const filesCreated = await this.createTemplateFiles(template, workspaceFolder, customizations);
            // 3. 프리뷰 URL 생성 (개발 서버 주소)
            const previewUrl = 'http://localhost:3000';
            return {
                success: true,
                templateId,
                filesCreated,
                previewUrl,
                message: `Successfully applied template '${template.name}'`
            };
        }
        catch (error) {
            const errorMsg = error instanceof Error ? error.message : String(error);
            console.error(`[TemplateManager] Error applying template ${templateId}:`, error);
            return {
                success: false,
                templateId,
                filesCreated: [],
                message: `Failed to apply template: ${errorMsg}`,
                errors: [errorMsg]
            };
        }
    }
    /**
     * 모든 템플릿 조회
     */
    getAllTemplates() {
        return Array.from(this.templates.values());
    }
    /**
     * 카테고리별 템플릿 조회
     */
    getTemplatesByCategory(category) {
        return Array.from(this.templates.values())
            .filter(template => template.category === category);
    }
    /**
     * 템플릿 상세 정보 조회
     */
    getTemplate(templateId) {
        return this.templates.get(templateId) || null;
    }
    // === Private Methods ===
    async loadTemplates() {
        // Phase 1: 하드코딩된 템플릿 데이터
        // TODO: Phase 2에서 실제 템플릿 파일 시스템으로 교체
        const defaultTemplates = [
            {
                id: 'restaurant-modern',
                name: 'Modern Restaurant',
                category: 'restaurant',
                description: 'A clean, modern template perfect for restaurants and cafes',
                tags: ['restaurant', 'food', 'modern', 'responsive'],
                difficulty: 'beginner',
                structure: {
                    layout: 'single-page',
                    sections: [
                        { id: 'header', name: 'Header', type: 'header', required: true, customizable: true },
                        { id: 'hero', name: 'Hero Section', type: 'hero', required: true, customizable: true },
                        { id: 'menu', name: 'Menu', type: 'content', required: true, customizable: true },
                        { id: 'about', name: 'About Us', type: 'content', required: false, customizable: true },
                        { id: 'contact', name: 'Contact', type: 'contact', required: true, customizable: true },
                        { id: 'footer', name: 'Footer', type: 'footer', required: true, customizable: false }
                    ],
                    navigation: 'header',
                    responsive: true
                },
                defaultStyles: {
                    colorScheme: {
                        primary: '#2c5f4f',
                        secondary: '#8bc34a',
                        accent: '#ff5722',
                        background: '#ffffff',
                        text: '#333333'
                    },
                    typography: {
                        headingFont: 'Playfair Display',
                        bodyFont: 'Source Sans Pro',
                        fontSize: {
                            base: '16px',
                            heading: '2.5em'
                        }
                    },
                    spacing: {
                        unit: 'rem',
                        scale: [0.5, 1, 1.5, 2, 3, 4, 6]
                    }
                },
                customizableAreas: [
                    {
                        id: 'hero-title',
                        name: 'Hero Title',
                        type: 'text',
                        selector: '.hero h1',
                        constraints: { maxLength: 60 }
                    },
                    {
                        id: 'hero-image',
                        name: 'Hero Background',
                        type: 'image',
                        selector: '.hero',
                        constraints: { allowedFormats: ['jpg', 'png', 'webp'] }
                    }
                ],
                preview: {
                    desktop: '/templates/restaurant-modern/preview-desktop.png',
                    mobile: '/templates/restaurant-modern/preview-mobile.png',
                    thumbnail: '/templates/restaurant-modern/thumbnail.png'
                },
                metadata: {
                    author: 'WindWalker AI',
                    version: '1.0.0',
                    lastUpdated: '2025-08-06',
                    popularity: 95
                }
            },
            {
                id: 'portfolio-creative',
                name: 'Creative Portfolio',
                category: 'portfolio',
                description: 'A creative portfolio template for designers and artists',
                tags: ['portfolio', 'creative', 'art', 'design'],
                difficulty: 'intermediate',
                structure: {
                    layout: 'multi-page',
                    sections: [
                        { id: 'header', name: 'Header', type: 'header', required: true, customizable: true },
                        { id: 'hero', name: 'Hero Section', type: 'hero', required: true, customizable: true },
                        { id: 'portfolio', name: 'Portfolio Gallery', type: 'gallery', required: true, customizable: true },
                        { id: 'about', name: 'About', type: 'content', required: true, customizable: true },
                        { id: 'testimonials', name: 'Testimonials', type: 'testimonials', required: false, customizable: true },
                        { id: 'contact', name: 'Contact', type: 'contact', required: true, customizable: true }
                    ],
                    navigation: 'header',
                    responsive: true
                },
                defaultStyles: {
                    colorScheme: {
                        primary: '#1976d2',
                        secondary: '#ff5722',
                        accent: '#ffc107',
                        background: '#fafafa',
                        text: '#212121'
                    },
                    typography: {
                        headingFont: 'Montserrat',
                        bodyFont: 'Open Sans',
                        fontSize: {
                            base: '18px',
                            heading: '3em'
                        }
                    },
                    spacing: {
                        unit: 'rem',
                        scale: [0.25, 0.5, 1, 2, 4, 8]
                    }
                },
                customizableAreas: [
                    {
                        id: 'portfolio-items',
                        name: 'Portfolio Items',
                        type: 'component',
                        selector: '.portfolio-grid',
                        constraints: { requiredFields: ['title', 'image', 'description'] }
                    }
                ],
                preview: {
                    desktop: '/templates/portfolio-creative/preview-desktop.png',
                    mobile: '/templates/portfolio-creative/preview-mobile.png',
                    thumbnail: '/templates/portfolio-creative/thumbnail.png'
                },
                metadata: {
                    author: 'WindWalker AI',
                    version: '1.0.0',
                    lastUpdated: '2025-08-06',
                    popularity: 88
                }
            },
            {
                id: 'blog-minimal',
                name: 'Minimal Blog',
                category: 'blog',
                description: 'A clean, minimal blog template focused on content',
                tags: ['blog', 'minimal', 'writing', 'content'],
                difficulty: 'beginner',
                structure: {
                    layout: 'multi-page',
                    sections: [
                        { id: 'header', name: 'Header', type: 'header', required: true, customizable: true },
                        { id: 'hero', name: 'Hero Section', type: 'hero', required: false, customizable: true },
                        { id: 'posts', name: 'Blog Posts', type: 'content', required: true, customizable: true },
                        { id: 'sidebar', name: 'Sidebar', type: 'sidebar', required: false, customizable: true },
                        { id: 'footer', name: 'Footer', type: 'footer', required: true, customizable: false }
                    ],
                    navigation: 'header',
                    responsive: true
                },
                defaultStyles: {
                    colorScheme: {
                        primary: '#333333',
                        secondary: '#666666',
                        accent: '#0066cc',
                        background: '#ffffff',
                        text: '#444444'
                    },
                    typography: {
                        headingFont: 'Merriweather',
                        bodyFont: 'Georgia',
                        fontSize: {
                            base: '18px',
                            heading: '2.2em'
                        }
                    },
                    spacing: {
                        unit: 'em',
                        scale: [0.5, 1, 1.5, 2, 3, 4]
                    }
                },
                customizableAreas: [
                    {
                        id: 'blog-title',
                        name: 'Blog Title',
                        type: 'text',
                        selector: '.blog-title',
                        constraints: { maxLength: 50 }
                    }
                ],
                preview: {
                    desktop: '/templates/blog-minimal/preview-desktop.png',
                    mobile: '/templates/blog-minimal/preview-mobile.png',
                    thumbnail: '/templates/blog-minimal/thumbnail.png'
                },
                metadata: {
                    author: 'WindWalker AI',
                    version: '1.0.0',
                    lastUpdated: '2025-08-06',
                    popularity: 82
                }
            }
        ];
        // 템플릿 데이터 로드
        defaultTemplates.forEach(template => {
            this.templates.set(template.id, template);
        });
        console.log(`[TemplateManager] Loaded ${this.templates.size} templates`);
    }
    inferCategoryFromIntent(intent) {
        const lowerIntent = intent.toLowerCase();
        if (lowerIntent.includes('restaurant') || lowerIntent.includes('food') || lowerIntent.includes('cafe') || lowerIntent.includes('menu')) {
            return 'restaurant';
        }
        if (lowerIntent.includes('portfolio') || lowerIntent.includes('showcase') || lowerIntent.includes('artist') || lowerIntent.includes('designer')) {
            return 'portfolio';
        }
        if (lowerIntent.includes('blog') || lowerIntent.includes('article') || lowerIntent.includes('writing') || lowerIntent.includes('journal')) {
            return 'blog';
        }
        if (lowerIntent.includes('shop') || lowerIntent.includes('store') || lowerIntent.includes('ecommerce') || lowerIntent.includes('buy') || lowerIntent.includes('sell')) {
            return 'ecommerce';
        }
        if (lowerIntent.includes('business') || lowerIntent.includes('company') || lowerIntent.includes('corporate') || lowerIntent.includes('professional')) {
            return 'business';
        }
        if (lowerIntent.includes('landing') || lowerIntent.includes('product') || lowerIntent.includes('service') || lowerIntent.includes('marketing')) {
            return 'landing';
        }
        return 'personal'; // 기본값
    }
    filterByRequirements(templates, requirements) {
        if (!requirements)
            return templates;
        return templates.filter(template => {
            // 반응형 요구사항
            if (requirements.responsive !== undefined && template.structure.responsive !== requirements.responsive) {
                return false;
            }
            // 다중 페이지 요구사항
            if (requirements.multiPage !== undefined) {
                const isMultiPage = template.structure.layout === 'multi-page';
                if (isMultiPage !== requirements.multiPage) {
                    return false;
                }
            }
            return true;
        });
    }
    scoreTemplatesByPreferences(templates, preferences) {
        return templates.map(template => {
            let score = template.metadata.popularity; // 기본 점수는 인기도
            if (preferences) {
                // 스타일 선호도에 따른 가산점
                if (preferences.style) {
                    if (template.tags.includes(preferences.style)) {
                        score += 20;
                    }
                }
                // 컬러 선호도에 따른 가산점
                if (preferences.colorScheme) {
                    if (preferences.colorScheme === 'minimal' && template.name.toLowerCase().includes('minimal')) {
                        score += 15;
                    }
                }
            }
            return { template, score };
        });
    }
    getFallbackTemplates() {
        // 추천 실패 시 인기도 상위 3개 반환
        return Array.from(this.templates.values())
            .sort((a, b) => b.metadata.popularity - a.metadata.popularity)
            .slice(0, 3);
    }
    async createTemplateFiles(template, workspaceFolder, customizations) {
        const filesCreated = [];
        try {
            // 1. HTML 파일 생성
            const htmlContent = this.generateHTMLContent(template, customizations);
            const htmlPath = path.join(workspaceFolder.uri.fsPath, 'index.html');
            await fs.writeFile(htmlPath, htmlContent, 'utf-8');
            filesCreated.push('index.html');
            // 2. CSS 파일 생성
            const cssContent = this.generateCSSContent(template, customizations);
            const cssPath = path.join(workspaceFolder.uri.fsPath, 'styles.css');
            await fs.writeFile(cssPath, cssContent, 'utf-8');
            filesCreated.push('styles.css');
            // 3. JavaScript 파일 생성 (필요시)
            const jsContent = this.generateJSContent(template, customizations);
            const jsPath = path.join(workspaceFolder.uri.fsPath, 'script.js');
            await fs.writeFile(jsPath, jsContent, 'utf-8');
            filesCreated.push('script.js');
            console.log(`[TemplateManager] Created ${filesCreated.length} files for template: ${template.id}`);
            return filesCreated;
        }
        catch (error) {
            console.error('[TemplateManager] Error creating template files:', error);
            throw error;
        }
    }
    generateHTMLContent(template, customizations) {
        // Phase 1: 기본 HTML 구조 생성
        const title = (customizations === null || customizations === void 0 ? void 0 : customizations.title) || template.name;
        const description = (customizations === null || customizations === void 0 ? void 0 : customizations.description) || template.description;
        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="description" content="${description}">
    <title>${title}</title>
    <link rel="stylesheet" href="styles.css">
    <link href="https://fonts.googleapis.com/css2?family=${template.defaultStyles.typography.headingFont.replace(' ', '+')}:wght@400;600;700&family=${template.defaultStyles.typography.bodyFont.replace(' ', '+')}:wght@400;500&display=swap" rel="stylesheet">
</head>
<body>
    ${this.generateSectionHTML(template, customizations)}
    <script src="script.js"></script>
</body>
</html>`;
    }
    generateSectionHTML(template, customizations) {
        return template.structure.sections.map(section => {
            switch (section.type) {
                case 'header':
                    return this.generateHeaderHTML(template, customizations);
                case 'hero':
                    return this.generateHeroHTML(template, customizations);
                case 'content':
                    return this.generateContentHTML(template, section, customizations);
                case 'gallery':
                    return this.generateGalleryHTML(template, customizations);
                case 'contact':
                    return this.generateContactHTML(template, customizations);
                case 'footer':
                    return this.generateFooterHTML(template, customizations);
                default:
                    return `<section class="${section.id}"><!-- ${section.name} Section --></section>`;
            }
        }).join('\n    ');
    }
    generateHeaderHTML(template, customizations) {
        const siteName = (customizations === null || customizations === void 0 ? void 0 : customizations.siteName) || template.name;
        return `
    <header class="header">
        <nav class="nav">
            <div class="nav-brand">
                <h1>${siteName}</h1>
            </div>
            <ul class="nav-menu">
                <li><a href="#home">Home</a></li>
                <li><a href="#about">About</a></li>
                <li><a href="#services">Services</a></li>
                <li><a href="#contact">Contact</a></li>
            </ul>
        </nav>
    </header>`;
    }
    generateHeroHTML(template, customizations) {
        const heroTitle = (customizations === null || customizations === void 0 ? void 0 : customizations.heroTitle) || `Welcome to ${template.name}`;
        const heroSubtitle = (customizations === null || customizations === void 0 ? void 0 : customizations.heroSubtitle) || template.description;
        return `
    <section class="hero">
        <div class="hero-content">
            <h1 class="hero-title">${heroTitle}</h1>
            <p class="hero-subtitle">${heroSubtitle}</p>
            <div class="hero-actions">
                <button class="btn btn-primary">Get Started</button>
                <button class="btn btn-secondary">Learn More</button>
            </div>
        </div>
    </section>`;
    }
    generateContentHTML(template, section, customizations) {
        return `
    <section class="${section.id}">
        <div class="container">
            <h2>${section.name}</h2>
            <p>This is the ${section.name} section. Content will be customized based on your needs.</p>
        </div>
    </section>`;
    }
    generateGalleryHTML(template, customizations) {
        return `
    <section class="gallery">
        <div class="container">
            <h2>Gallery</h2>
            <div class="gallery-grid">
                <div class="gallery-item">
                    <img src="https://via.placeholder.com/400x300" alt="Gallery Item 1">
                    <h3>Project 1</h3>
                    <p>Description of project 1</p>
                </div>
                <div class="gallery-item">
                    <img src="https://via.placeholder.com/400x300" alt="Gallery Item 2">
                    <h3>Project 2</h3>
                    <p>Description of project 2</p>
                </div>
                <div class="gallery-item">
                    <img src="https://via.placeholder.com/400x300" alt="Gallery Item 3">
                    <h3>Project 3</h3>
                    <p>Description of project 3</p>
                </div>
            </div>
        </div>
    </section>`;
    }
    generateContactHTML(template, customizations) {
        return `
    <section class="contact">
        <div class="container">
            <h2>Contact Us</h2>
            <div class="contact-content">
                <div class="contact-info">
                    <h3>Get in Touch</h3>
                    <p>Email: contact@example.com</p>
                    <p>Phone: (555) 123-4567</p>
                    <p>Address: 123 Main St, City, State 12345</p>
                </div>
                <form class="contact-form">
                    <input type="text" placeholder="Your Name" required>
                    <input type="email" placeholder="Your Email" required>
                    <textarea placeholder="Your Message" rows="5" required></textarea>
                    <button type="submit" class="btn btn-primary">Send Message</button>
                </form>
            </div>
        </div>
    </section>`;
    }
    generateFooterHTML(template, customizations) {
        const currentYear = new Date().getFullYear();
        const siteName = (customizations === null || customizations === void 0 ? void 0 : customizations.siteName) || template.name;
        return `
    <footer class="footer">
        <div class="container">
            <p>&copy; ${currentYear} ${siteName}. All rights reserved.</p>
            <p>Created with WindWalker AI Website Builder</p>
        </div>
    </footer>`;
    }
    generateCSSContent(template, customizations) {
        const styles = template.defaultStyles;
        return `/* Generated by WindWalker AI - ${template.name} */
/* Template: ${template.id} */

:root {
    --color-primary: ${styles.colorScheme.primary};
    --color-secondary: ${styles.colorScheme.secondary};
    --color-accent: ${styles.colorScheme.accent};
    --color-background: ${styles.colorScheme.background};
    --color-text: ${styles.colorScheme.text};
    
    --font-heading: '${styles.typography.headingFont}', serif;
    --font-body: '${styles.typography.bodyFont}', sans-serif;
    --font-size-base: ${styles.typography.fontSize.base};
    --font-size-heading: ${styles.typography.fontSize.heading};
}

* {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
}

body {
    font-family: var(--font-body);
    font-size: var(--font-size-base);
    line-height: 1.6;
    color: var(--color-text);
    background-color: var(--color-background);
}

.container {
    max-width: 1200px;
    margin: 0 auto;
    padding: 0 20px;
}

/* Header Styles */
.header {
    background: var(--color-background);
    box-shadow: 0 2px 5px rgba(0,0,0,0.1);
    position: sticky;
    top: 0;
    z-index: 1000;
}

.nav {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 1rem 2rem;
}

.nav-brand h1 {
    color: var(--color-primary);
    font-family: var(--font-heading);
    font-size: 1.8rem;
}

.nav-menu {
    display: flex;
    list-style: none;
    gap: 2rem;
}

.nav-menu a {
    text-decoration: none;
    color: var(--color-text);
    font-weight: 500;
    transition: color 0.3s;
}

.nav-menu a:hover {
    color: var(--color-primary);
}

/* Hero Section */
.hero {
    background: linear-gradient(135deg, var(--color-primary), var(--color-secondary));
    color: white;
    padding: 4rem 2rem;
    text-align: center;
    min-height: 60vh;
    display: flex;
    align-items: center;
    justify-content: center;
}

.hero-content {
    max-width: 800px;
}

.hero-title {
    font-family: var(--font-heading);
    font-size: var(--font-size-heading);
    margin-bottom: 1rem;
    font-weight: 700;
}

.hero-subtitle {
    font-size: 1.2rem;
    margin-bottom: 2rem;
    opacity: 0.9;
}

.hero-actions {
    display: flex;
    gap: 1rem;
    justify-content: center;
    flex-wrap: wrap;
}

/* Button Styles */
.btn {
    padding: 0.75rem 1.5rem;
    border: none;
    border-radius: 5px;
    font-size: 1rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.3s;
    text-decoration: none;
    display: inline-block;
}

.btn-primary {
    background: var(--color-accent);
    color: white;
}

.btn-primary:hover {
    background: color-mix(in srgb, var(--color-accent) 85%, black);
    transform: translateY(-2px);
}

.btn-secondary {
    background: transparent;
    color: white;
    border: 2px solid white;
}

.btn-secondary:hover {
    background: white;
    color: var(--color-primary);
}

/* Section Styles */
section {
    padding: 4rem 0;
}

section h2 {
    font-family: var(--font-heading);
    font-size: 2.5rem;
    text-align: center;
    margin-bottom: 3rem;
    color: var(--color-primary);
}

/* Gallery Styles */
.gallery-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
    gap: 2rem;
    margin-top: 2rem;
}

.gallery-item {
    background: white;
    border-radius: 10px;
    overflow: hidden;
    box-shadow: 0 5px 15px rgba(0,0,0,0.1);
    transition: transform 0.3s;
}

.gallery-item:hover {
    transform: translateY(-5px);
}

.gallery-item img {
    width: 100%;
    height: 200px;
    object-fit: cover;
}

.gallery-item h3 {
    padding: 1rem;
    color: var(--color-primary);
}

.gallery-item p {
    padding: 0 1rem 1rem;
    color: var(--color-text);
}

/* Contact Section */
.contact-content {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 3rem;
    max-width: 800px;
    margin: 0 auto;
}

.contact-info h3 {
    color: var(--color-primary);
    margin-bottom: 1rem;
}

.contact-info p {
    margin-bottom: 0.5rem;
}

.contact-form {
    display: flex;
    flex-direction: column;
    gap: 1rem;
}

.contact-form input,
.contact-form textarea {
    padding: 0.75rem;
    border: 2px solid #e0e0e0;
    border-radius: 5px;
    font-size: 1rem;
    transition: border-color 0.3s;
}

.contact-form input:focus,
.contact-form textarea:focus {
    outline: none;
    border-color: var(--color-primary);
}

/* Footer */
.footer {
    background: var(--color-primary);
    color: white;
    text-align: center;
    padding: 2rem;
}

.footer p {
    margin-bottom: 0.5rem;
}

/* Responsive Design */
@media (max-width: 768px) {
    .nav {
        flex-direction: column;
        gap: 1rem;
    }
    
    .nav-menu {
        gap: 1rem;
    }
    
    .hero {
        padding: 3rem 1rem;
    }
    
    .hero-title {
        font-size: 2rem;
    }
    
    .hero-actions {
        flex-direction: column;
        align-items: center;
    }
    
    .contact-content {
        grid-template-columns: 1fr;
        gap: 2rem;
    }
    
    section {
        padding: 2rem 0;
    }
}`;
    }
    generateJSContent(template, customizations) {
        return `// Generated by WindWalker AI - ${template.name}
// Template: ${template.id}

document.addEventListener('DOMContentLoaded', function() {
    console.log('WindWalker AI Template loaded: ${template.name}');
    
    // Initialize template functionality
    initializeTemplate();
    
    // Contact form handling
    initializeContactForm();
    
    // Smooth scrolling for navigation links
    initializeSmoothScrolling();
});

function initializeTemplate() {
    // Add any template-specific initialization here
    console.log('Template initialized successfully');
    
    // Add loading animation
    document.body.style.opacity = '0';
    setTimeout(() => {
        document.body.style.transition = 'opacity 0.5s';
        document.body.style.opacity = '1';
    }, 100);
}

function initializeContactForm() {
    const contactForm = document.querySelector('.contact-form');
    
    if (contactForm) {
        contactForm.addEventListener('submit', function(e) {
            e.preventDefault();
            
            // Get form data
            const formData = new FormData(this);
            const name = formData.get('name') || this.querySelector('input[type="text"]').value;
            const email = formData.get('email') || this.querySelector('input[type="email"]').value;
            const message = formData.get('message') || this.querySelector('textarea').value;
            
            // Simple validation
            if (!name || !email || !message) {
                alert('Please fill in all fields');
                return;
            }
            
            // Simulate form submission
            alert('Thank you for your message! We\\'ll get back to you soon.');
            this.reset();
        });
    }
}

function initializeSmoothScrolling() {
    // Smooth scrolling for anchor links
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                target.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        });
    });
}

// Utility functions
function animateOnScroll() {
    const elements = document.querySelectorAll('.gallery-item, .contact-content');
    
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.opacity = '1';
                entry.target.style.transform = 'translateY(0)';
            }
        });
    });
    
    elements.forEach(el => {
        el.style.opacity = '0';
        el.style.transform = 'translateY(20px)';
        el.style.transition = 'opacity 0.6s, transform 0.6s';
        observer.observe(el);
    });
}

// Initialize animations when page loads
setTimeout(animateOnScroll, 500);`;
    }
}
exports.TemplateManager = TemplateManager;
//# sourceMappingURL=TemplateManager.js.map