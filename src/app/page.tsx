
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import PrototypingView from '@/components/PrototypingView';

export default function Home() {
  const [mode, setMode] = useState<'prototyping' | 'ide'>('prototyping');
  const [ideUrl, setIdeUrl] = useState('');

  const switchToIDE = () => {
    if (typeof window !== 'undefined') {
      const { protocol, hostname } = window.location;
      const ideHost = hostname.includes('localhost')
        ? `${hostname}:8081`
        : hostname.replace(/^[0-9]+-/, '8081-');
      const url = `${protocol}//${ideHost}/?folder=/home/user/studio`;
      setIdeUrl(url);
      setMode('ide');
    }
  };

  if (mode === 'ide') {
    return (
      <div className="h-screen w-screen bg-muted">
        <div className="absolute top-4 left-4 z-10">
          <Button 
            variant="secondary" 
            onClick={() => setMode('prototyping')}
            className="bg-white/90 backdrop-blur-sm"
          >
            ← 프로토타이핑 모드로 돌아가기
          </Button>
        </div>
        <iframe
          src={ideUrl}
          className="h-full w-full border-0"
          title="WindWalker IDE"
        />
      </div>
    );
  }

  return (
    <div className="h-screen w-screen relative">
      <div className="absolute top-4 right-4 z-10">
        <Button 
          variant="outline" 
          onClick={switchToIDE}
          className="bg-white/90 backdrop-blur-sm"
        >
          IDE 모드로 전환
        </Button>
      </div>
      <PrototypingView />
    </div>
  );
}
