import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function Home() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-background text-foreground">
      <div className="text-center space-y-4">
        <h1 className="text-5xl font-bold font-headline">WindWalker IDE</h1>
        <p className="text-muted-foreground text-lg">AI-powered web development environment</p>
        <div className="w-full h-px bg-border my-8"></div>
        <div className="w-screen h-[calc(100vh-200px)] overflow-hidden">
             <iframe
                src="/ide"
                className="w-full h-full border-0"
                title="WindWalker IDE"
             />
        </div>
      </div>
    </div>
  )
}
