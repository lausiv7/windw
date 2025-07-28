
'use client';

import { useState, useEffect } from 'react';

export default function Home() {
  const [ideUrl, setIdeUrl] = useState('');
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    // This code runs only on the client side, after the component has mounted.
    // This is to avoid issues with `window` being undefined on the server.
    if (typeof window !== 'undefined') {
      const currentHost = window.location.hostname;
      // The assumption is that the Next.js app is running on port 9003
      // and the code-server is on 8081, proxied by Firebase Studio.
      // We replace the port prefix in the hostname. e.g., 9003-host.app -> 8081-host.app
      const ideHost = currentHost.replace(/^[0-9]+-/, '8081-');
      const url = `https://${ideHost}/?folder=/home/user/studio`;
      setIdeUrl(url);
    }
  }, []);

  if (!isMounted || !ideUrl) {
    return (
        <div className="flex h-screen w-full items-center justify-center bg-background">
            <div className="flex flex-col items-center gap-4">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-muted border-t-primary" />
                <p className="text-muted-foreground">Starting WindWalker IDE...</p>
            </div>
        </div>
    );
  }

  return (
    <div className="h-screen w-screen bg-muted">
      <iframe
        src={ideUrl}
        className="h-full w-full border-0"
        title="WindWalker IDE"
      />
    </div>
  );
}
