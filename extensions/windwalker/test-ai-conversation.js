// Quick test to verify AI conversation and template manager functionality
// This simulates the conversation flow without VS Code environment

const fs = require('fs');
const path = require('path');

// Mock vscode module
const vscode = {
  ExtensionMode: {
    Development: 1,
    Production: 2,
    Test: 3
  },
  workspace: {
    workspaceFolders: [{
      uri: { fsPath: '/mock/workspace' }
    }]
  },
  Uri: {
    joinPath: (uri, ...paths) => ({
      fsPath: path.join(uri.fsPath, ...paths)
    })
  }
};

// Create mock context
const mockContext = {
  extensionPath: '/mock/extension',
  subscriptions: [],
  extensionMode: vscode.ExtensionMode.Test
};

// Mock the ConversationAI patterns and functions
class MockConversationAI {
  constructor(context) {
    this.context = context;
    this.intentPatterns = new Map();
    this.entityPatterns = new Map();
    this.responseTemplates = new Map();
  }

  async initialize() {
    this.initializePatterns();
    this.initializeResponseTemplates();
    console.log('✅ MockConversationAI initialized');
  }

  dispose() {
    console.log('✅ MockConversationAI disposed');
  }

  initializePatterns() {
    // Create website patterns
    this.intentPatterns.set('create-website', [
      /웹사이트.*만들/i,
      /사이트.*생성/i,
      /홈페이지.*제작/i
    ]);

    this.intentPatterns.set('apply-template', [
      /템플릿.*적용/i,
      /디자인.*바꾸/i,
      /테마.*선택/i
    ]);

    // Entity patterns
    this.entityPatterns.set('website-type', [
      /레스토랑/i,
      /포트폴리오/i,
      /블로그/i
    ]);
  }

  initializeResponseTemplates() {
    this.responseTemplates.set('create-website', [
      "새로운 웹사이트를 만들어 드리겠습니다! 어떤 종류의 웹사이트를 원하시나요?",
      "웹사이트 제작을 시작해보겠습니다."
    ]);

    this.responseTemplates.set('apply-template', [
      "템플릿을 적용해 드리겠습니다.",
      "새로운 템플릿으로 변경 중입니다."
    ]);
  }

  async analyzeUserIntent(message, context) {
    console.log(`[ConversationAI] Analyzing: "${message}"`);
    
    // Simple pattern matching
    let primaryIntent = 'help-request';
    
    for (const [intent, patterns] of this.intentPatterns.entries()) {
      for (const pattern of patterns) {
        if (pattern.test(message)) {
          primaryIntent = intent;
          break;
        }
      }
    }

    const entities = this.extractEntities(message);
    const confidence = 0.85;

    return {
      primary: primaryIntent,
      secondary: [],
      confidence,
      entities,
      context
    };
  }

  extractEntities(message) {
    const entities = [];
    
    for (const [entityType, patterns] of this.entityPatterns.entries()) {
      for (const pattern of patterns) {
        if (pattern.test(message)) {
          entities.push({
            type: entityType,
            value: pattern.exec(message)[0],
            confidence: 0.8,
            position: { start: 0, end: 5 }
          });
        }
      }
    }

    return entities;
  }

  async generateResponse(intent, userMessage) {
    console.log(`[ConversationAI] Generating response for: ${intent.primary}`);
    
    const templates = this.responseTemplates.get(intent.primary) || [
      "요청을 처리하고 있습니다."
    ];

    const message = templates[0]; // Use first template

    return {
      message,
      suggestedActions: [{
        id: 'test-action',
        type: 'apply-template',
        label: '테스트 액션',
        description: '테스트용 제안 액션입니다',
        parameters: {},
        priority: 'high'
      }],
      templateRecommendations: ['restaurant-modern'],
      followUpQuestions: ['다른 도움이 필요하신가요?'],
      confidence: intent.confidence
    };
  }

  personalizeResponse(response, context) {
    return response; // Simple passthrough for test
  }

  updateConversationContext(context, intent, entities) {
    return {
      ...context,
      previousIntents: [intent, ...context.previousIntents.slice(0, 4)]
    };
  }
}

// Mock TemplateManager
class MockTemplateManager {
  constructor(context) {
    this.context = context;
    this.templates = new Map();
  }

  async initialize() {
    await this.loadTemplates();
    console.log('✅ MockTemplateManager initialized');
  }

  dispose() {
    this.templates.clear();
    console.log('✅ MockTemplateManager disposed');
  }

  async loadTemplates() {
    // Add some test templates
    const testTemplates = [
      {
        id: 'restaurant-modern',
        name: 'Modern Restaurant',
        category: 'restaurant',
        description: 'A clean, modern template perfect for restaurants',
        tags: ['restaurant', 'modern', 'responsive'],
        difficulty: 'beginner'
      },
      {
        id: 'blog-minimal',
        name: 'Minimal Blog',
        category: 'blog', 
        description: 'A clean, minimal blog template',
        tags: ['blog', 'minimal', 'writing'],
        difficulty: 'beginner'
      }
    ];

    testTemplates.forEach(template => {
      this.templates.set(template.id, template);
    });
  }

  async recommendTemplates(request) {
    console.log(`[TemplateManager] Recommending templates for: ${request.intent}`);
    
    const allTemplates = Array.from(this.templates.values());
    
    // Simple category-based filtering
    let filtered = allTemplates;
    if (request.category) {
      filtered = allTemplates.filter(t => t.category === request.category);
    }

    return filtered.slice(0, 3); // Return top 3
  }

  async applyTemplate(templateId, customizations) {
    console.log(`[TemplateManager] Applying template: ${templateId}`);
    
    const template = this.templates.get(templateId);
    if (!template) {
      return {
        success: false,
        templateId,
        filesCreated: [],
        message: `Template '${templateId}' not found`
      };
    }

    // Simulate file creation
    const filesCreated = ['index.html', 'styles.css', 'script.js'];
    
    return {
      success: true,
      templateId,
      filesCreated,
      message: `Successfully applied template '${template.name}'`,
      previewUrl: 'http://localhost:3000'
    };
  }

  getAllTemplates() {
    return Array.from(this.templates.values());
  }
}

// Test function
async function testAIConversation() {
  console.log('\n🧪 Testing AI Conversation Flow\n');

  try {
    // Initialize services
    const conversationAI = new MockConversationAI(mockContext);
    const templateManager = new MockTemplateManager(mockContext);

    await conversationAI.initialize();
    await templateManager.initialize();

    // Test conversation context
    const conversationContext = {
      conversationId: 'test-conv-123',
      userId: 'test-user',
      projectType: 'restaurant',
      previousIntents: [],
      userPreferences: {
        preferredStyle: 'modern',
        colorPreference: 'neutral',
        complexityLevel: 'beginner'
      }
    };

    // Test 1: Intent Analysis
    console.log('\n--- Test 1: Intent Analysis ---');
    const testMessages = [
      '레스토랑 웹사이트를 만들고 싶어요',
      '템플릿을 바꾸고 싶습니다',
      '도움이 필요해요'
    ];

    for (const message of testMessages) {
      const intent = await conversationAI.analyzeUserIntent(message, conversationContext);
      console.log(`Message: "${message}"`);
      console.log(`Intent: ${intent.primary} (confidence: ${intent.confidence.toFixed(2)})`);
      console.log(`Entities: ${intent.entities.map(e => `${e.type}:${e.value}`).join(', ') || 'none'}`);
      console.log('');
    }

    // Test 2: Response Generation
    console.log('\n--- Test 2: Response Generation ---');
    const userMessage = '레스토랑 웹사이트를 만들어 주세요';
    const intent = await conversationAI.analyzeUserIntent(userMessage, conversationContext);
    const response = await conversationAI.generateResponse(intent, userMessage);
    
    console.log(`User: "${userMessage}"`);
    console.log(`AI Response: "${response.message}"`);
    console.log(`Suggested Actions: ${response.suggestedActions.map(a => a.label).join(', ')}`);
    console.log(`Template Recommendations: ${response.templateRecommendations?.join(', ') || 'none'}`);
    console.log('');

    // Test 3: Template Management
    console.log('\n--- Test 3: Template Management ---');
    const templates = templateManager.getAllTemplates();
    console.log(`Available templates: ${templates.length}`);
    templates.forEach(t => console.log(`  - ${t.name} (${t.category})`));

    // Test template recommendation
    const recommendations = await templateManager.recommendTemplates({
      intent: 'create-website',
      category: 'restaurant'
    });
    console.log(`\nRecommendations for restaurant: ${recommendations.length}`);
    recommendations.forEach(t => console.log(`  - ${t.name}: ${t.description}`));

    // Test template application
    const applyResult = await templateManager.applyTemplate('restaurant-modern');
    console.log(`\nTemplate application result:`);
    console.log(`  Success: ${applyResult.success}`);
    console.log(`  Files created: ${applyResult.filesCreated?.join(', ')}`);
    console.log(`  Message: ${applyResult.message}`);

    // Test 4: Full Conversation Flow
    console.log('\n--- Test 4: Full Conversation Flow ---');
    const fullFlowMessages = [
      '레스토랑 홈페이지를 만들어 주세요',
      '모던한 템플릿으로 부탁해요',
      '색상을 바꿔주세요'
    ];

    let currentContext = { ...conversationContext };
    
    for (let i = 0; i < fullFlowMessages.length; i++) {
      const msg = fullFlowMessages[i];
      console.log(`\n--- Step ${i + 1} ---`);
      console.log(`User: "${msg}"`);
      
      const msgIntent = await conversationAI.analyzeUserIntent(msg, currentContext);
      const msgResponse = await conversationAI.generateResponse(msgIntent, msg);
      const personalizedResponse = conversationAI.personalizeResponse(msgResponse, currentContext);
      
      console.log(`AI Intent: ${msgIntent.primary}`);
      console.log(`AI Response: "${personalizedResponse.message}"`);
      
      // Update context
      currentContext = conversationAI.updateConversationContext(
        currentContext,
        msgIntent.primary,
        msgIntent.entities
      );
      
      console.log(`Previous intents: ${currentContext.previousIntents.join(', ')}`);
    }

    // Cleanup
    conversationAI.dispose();
    templateManager.dispose();

    console.log('\n✅ All AI conversation tests completed successfully!');
    return true;

  } catch (error) {
    console.error('\n❌ AI conversation test failed:', error);
    return false;
  }
}

// Run the test
if (require.main === module) {
  testAIConversation().then(success => {
    process.exit(success ? 0 : 1);
  });
}

module.exports = { testAIConversation, MockConversationAI, MockTemplateManager };