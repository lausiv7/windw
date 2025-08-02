'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Palette, 
  Layout, 
  Component, 
  Smartphone, 
  Monitor, 
  Tablet,
  Eye,
  Code2,
  Play,
  Square,
  RotateCcw
} from 'lucide-react';

interface PrototypeComponent {
  id: string;
  name: string;
  category: string;
  description: string;
  code: string;
  preview: React.ReactNode;
}

export default function PrototypingView() {
  const [activeComponent, setActiveComponent] = useState<string>('');
  const [viewMode, setViewMode] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');
  const [showCode, setShowCode] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);

  // 프로토타이핑용 컴포넌트 라이브러리
  const componentLibrary: PrototypeComponent[] = [
    {
      id: 'hero-section',
      name: '히어로 섹션',
      category: '레이아웃',
      description: '메인 화면 히어로 섹션',
      code: `<div className="hero-section">
  <h1>WindWalker로 빠른 프로토타이핑</h1>
  <p>AI와 함께 웹 애플리케이션을 빠르게 구축하세요</p>
  <button>시작하기</button>
</div>`,
      preview: (
        <div className="p-8 bg-gradient-to-r from-blue-500 to-purple-600 text-white text-center rounded-lg">
          <h1 className="text-3xl font-bold mb-4">WindWalker로 빠른 프로토타이핑</h1>
          <p className="text-lg mb-6">AI와 함께 웹 애플리케이션을 빠르게 구축하세요</p>
          <Button className="bg-white text-blue-600 hover:bg-gray-100">시작하기</Button>
        </div>
      )
    },
    {
      id: 'feature-card',
      name: '기능 카드',
      category: '컴포넌트',
      description: '제품 기능을 소개하는 카드',
      code: `<div className="feature-card">
  <div className="icon">🚀</div>
  <h3>빠른 개발</h3>
  <p>AI 도움으로 더 빠르게 개발하세요</p>
</div>`,
      preview: (
        <Card className="w-full">
          <CardHeader className="text-center">
            <div className="text-4xl mb-2">🚀</div>
            <CardTitle>빠른 개발</CardTitle>
          </CardHeader>
          <CardContent>
            <CardDescription>AI 도움으로 더 빠르게 개발하세요</CardDescription>
          </CardContent>
        </Card>
      )
    },
    {
      id: 'navigation',
      name: '네비게이션',
      category: '레이아웃',
      description: '상단 네비게이션 바',
      code: `<nav className="navigation">
  <div className="logo">WindWalker</div>
  <ul className="nav-links">
    <li><a href="#home">홈</a></li>
    <li><a href="#features">기능</a></li>
    <li><a href="#about">소개</a></li>
  </ul>
</nav>`,
      preview: (
        <nav className="flex justify-between items-center p-4 bg-white shadow-sm rounded-lg">
          <div className="font-bold text-xl text-blue-600">WindWalker</div>
          <div className="flex gap-6">
            <a href="#" className="text-gray-600 hover:text-blue-600">홈</a>
            <a href="#" className="text-gray-600 hover:text-blue-600">기능</a>
            <a href="#" className="text-gray-600 hover:text-blue-600">소개</a>
          </div>
        </nav>
      )
    }
  ];

  const getViewportSize = () => {
    switch (viewMode) {
      case 'mobile': return 'max-w-sm';
      case 'tablet': return 'max-w-2xl';
      default: return 'max-w-6xl';
    }
  };

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* 상단 툴바 */}
      <div className="bg-white border-b p-4 flex justify-between items-center">
        <div className="flex items-center gap-4">
          <h1 className="text-xl font-bold text-gray-800">🌪️ WindWalker Prototyping</h1>
          <Badge variant="secondary">Phase 5</Badge>
        </div>
        
        <div className="flex items-center gap-2">
          {/* 뷰포트 선택 */}
          <div className="flex border rounded-lg overflow-hidden">
            <Button 
              variant={viewMode === 'desktop' ? 'default' : 'ghost'} 
              size="sm"
              onClick={() => setViewMode('desktop')}
            >
              <Monitor className="w-4 h-4" />
            </Button>
            <Button 
              variant={viewMode === 'tablet' ? 'default' : 'ghost'} 
              size="sm"
              onClick={() => setViewMode('tablet')}
            >
              <Tablet className="w-4 h-4" />
            </Button>
            <Button 
              variant={viewMode === 'mobile' ? 'default' : 'ghost'} 
              size="sm"
              onClick={() => setViewMode('mobile')}
            >
              <Smartphone className="w-4 h-4" />
            </Button>
          </div>

          {/* 컨트롤 버튼 */}
          <Button 
            variant={showCode ? 'default' : 'outline'} 
            size="sm"
            onClick={() => setShowCode(!showCode)}
          >
            <Code2 className="w-4 h-4 mr-1" />
            코드
          </Button>
          
          <Button 
            variant={isPlaying ? 'destructive' : 'default'} 
            size="sm"
            onClick={() => setIsPlaying(!isPlaying)}
          >
            {isPlaying ? <Square className="w-4 h-4" /> : <Play className="w-4 h-4" />}
          </Button>

          <Button variant="outline" size="sm">
            <RotateCcw className="w-4 h-4" />
          </Button>
        </div>
      </div>

      <div className="flex-1 flex">
        {/* 사이드바 - 컴포넌트 라이브러리 */}
        <div className="w-80 bg-white border-r overflow-y-auto">
          <div className="p-4">
            <h2 className="font-semibold mb-4 flex items-center gap-2">
              <Component className="w-4 h-4" />
              컴포넌트 라이브러리
            </h2>
            
            <Tabs defaultValue="components">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="components">컴포넌트</TabsTrigger>
                <TabsTrigger value="layouts">레이아웃</TabsTrigger>
                <TabsTrigger value="themes">테마</TabsTrigger>
              </TabsList>
              
              <TabsContent value="components" className="space-y-3 mt-4">
                {componentLibrary.map((component) => (
                  <Card 
                    key={component.id} 
                    className={`cursor-pointer transition-all hover:shadow-md ${
                      activeComponent === component.id ? 'ring-2 ring-blue-500' : ''
                    }`}
                    onClick={() => setActiveComponent(component.id)}
                  >
                    <CardHeader className="pb-2">
                      <div className="flex justify-between items-start">
                        <CardTitle className="text-sm">{component.name}</CardTitle>
                        <Badge variant="outline" className="text-xs">
                          {component.category}
                        </Badge>
                      </div>
                      <CardDescription className="text-xs">
                        {component.description}
                      </CardDescription>
                    </CardHeader>
                  </Card>
                ))}
              </TabsContent>
              
              <TabsContent value="layouts" className="mt-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Layout className="w-4 h-4" />
                      레이아웃 템플릿
                    </CardTitle>
                    <CardDescription className="text-xs">
                      사전 정의된 페이지 레이아웃
                    </CardDescription>
                  </CardHeader>
                </Card>
              </TabsContent>
              
              <TabsContent value="themes" className="mt-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Palette className="w-4 h-4" />
                      디자인 테마
                    </CardTitle>
                    <CardDescription className="text-xs">
                      색상과 스타일 테마
                    </CardDescription>
                  </CardHeader>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </div>

        {/* 메인 프리뷰 영역 */}
        <div className="flex-1 flex">
          <div className="flex-1 p-6 overflow-auto">
            <div className={`mx-auto ${getViewportSize()} transition-all duration-300`}>
              <div className="bg-white rounded-lg shadow-lg min-h-[600px] overflow-hidden">
                {/* 프리뷰 헤더 */}
                <div className="bg-gray-100 px-4 py-2 flex items-center gap-2 text-sm text-gray-600">
                  <Eye className="w-4 h-4" />
                  프리뷰 - {viewMode === 'desktop' ? '데스크톱' : viewMode === 'tablet' ? '태블릿' : '모바일'}
                </div>
                
                {/* 프리뷰 콘텐츠 */}
                <div className="p-6 space-y-6">
                  {activeComponent ? (
                    componentLibrary
                      .filter(comp => comp.id === activeComponent)
                      .map(component => (
                        <div key={component.id}>
                          {component.preview}
                        </div>
                      ))
                  ) : (
                    <div className="text-center py-20 text-gray-500">
                      <Component className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                      <h3 className="text-lg font-medium mb-2">프로토타입 시작하기</h3>
                      <p>왼쪽에서 컴포넌트를 선택하여 프리뷰를 확인하세요</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* 코드 패널 */}
          {showCode && activeComponent && (
            <div className="w-96 bg-gray-900 text-gray-100 overflow-auto">
              <div className="p-4">
                <h3 className="font-semibold mb-4 flex items-center gap-2">
                  <Code2 className="w-4 h-4" />
                  코드 미리보기
                </h3>
                <pre className="text-sm bg-gray-800 p-4 rounded overflow-x-auto">
                  <code>
                    {componentLibrary.find(comp => comp.id === activeComponent)?.code}
                  </code>
                </pre>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}