
'use client';

import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable"
import { Separator } from "@/components/ui/separator"
import { TooltipProvider, Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { Book, Code, MessagesSquare } from "lucide-react";
import { useState, useEffect } from 'react';

export default function Home() {
  const [ideUrl, setIdeUrl] = useState('');
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    if (typeof window !== 'undefined') {
      const currentHost = window.location.hostname;
      const ideHost = currentHost.replace(/^[0-9]+-/, '8081-');
      const url = `https://${ideHost}/?folder=/home/user/studio`;
      setIdeUrl(url);
    }
  }, []);

  if (!isMounted) {
    return (
        <div className="flex h-screen w-full items-center justify-center bg-background">
            <div className="flex flex-col items-center gap-4">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-muted border-t-primary" />
                <p className="text-muted-foreground">Loading WindWalker IDE...</p>
            </div>
        </div>
    );
  }

  return (
    <TooltipProvider delayDuration={0}>
      <ResizablePanelGroup
        direction="horizontal"
        className="h-full max-h-screen items-stretch"
      >
        <ResizablePanel defaultSize={440} minSize={30} maxSize={40} className="min-w-[320px]">
          <div className="flex h-full flex-col p-4">
            <header className="flex items-center justify-between pb-4">
                <h1 className="text-xl font-headline font-bold text-foreground">WindWalker AI</h1>
                <div className="flex items-center gap-2">
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                                <MessagesSquare className="h-4 w-4" />
                                <span className="sr-only">Chat</span>
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent side="bottom">Chat</TooltipContent>
                    </Tooltip>
                    <Tooltip>
                        <TooltipTrigger asChild>
                             <Button variant="ghost" size="icon" className="h-8 w-8">
                                <Code className="h-4 w-4" />
                                <span className="sr-only">Code</span>
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent side="bottom">Code</TooltipContent>
                    </Tooltip>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                                <Book className="h-4 w-4" />
                                <span className="sr-only">Docs</span>
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent side="bottom">Docs</TooltipContent>
                    </Tooltip>
                </div>
            </header>
            <Separator />
            <div className="flex-grow mt-4 overflow-y-auto">
                {/* AI Chat Panel Placeholder */}
                <div className="flex flex-col h-full">
                    <div className="flex-grow space-y-4 p-1">
                        <div className="flex items-start gap-4">
                            <div className="rounded-full bg-secondary p-2">
                                <Code className="h-5 w-5 text-secondary-foreground" />
                            </div>
                            <div className="flex-1 rounded-lg bg-muted p-4 text-sm">
                                <p className="font-semibold">WindWalker AI</p>
                                <p className="text-muted-foreground">
                                    Hello! How can I help you build today?
                                </p>
                            </div>
                        </div>
                    </div>
                    <div className="mt-auto flex gap-2 p-1">
                         <textarea
                            placeholder="Message WindWalker AI..."
                            className="w-full resize-none rounded-lg border border-input bg-background p-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                            rows={1}
                        />
                        <Button>Send</Button>
                    </div>
                </div>
            </div>
          </div>
        </ResizablePanel>
        <ResizableHandle withHandle />
        <ResizablePanel defaultSize={100-440}>
           {ideUrl ? (
            <iframe
              src={ideUrl}
              className="h-full w-full bg-muted"
              title="Live Preview"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-muted">
              <p>Loading Preview...</p>
            </div>
          )}
        </ResizablePanel>
      </ResizablePanelGroup>
    </TooltipProvider>
  );
}
