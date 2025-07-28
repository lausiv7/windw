
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
      const { protocol, hostname } = window.location;
      // Construct the URL by replacing the port in the hostname if it exists,
      // or by specifying it directly for environments like localhost.
      const ideHost = hostname.includes('localhost')
        ? `${hostname}:8081`
        : hostname.replace(/^[0-9]+-/, '8081-');

      const url = `${protocol}//${ideHost}/?folder=/home/user/studio`;
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
