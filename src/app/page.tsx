'use client';

import { useState, useEffect } from 'react';

export default function Home() {
  const [ideUrl, setIdeUrl] = useState('');

  useEffect(() => {
    // This code runs only on the client side
    if (typeof window !== 'undefined') {
      const currentHost = window.location.hostname;
      // Replace the port part of the hostname (e.g., 9003-...) with 8081-...
      const ideHost = currentHost.replace(/^[0-9]+-/, '8081-');
      const url = `https://${ideHost}/?folder=/home/user/studio`;
      setIdeUrl(url);
    }
  }, []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      <header style={{ padding: '1rem', backgroundColor: '#0A3141' }}>
        <h1 style={{ color: 'white', margin: 0, fontFamily: '"Space Grotesk", sans-serif' }}>WindWalker IDE</h1>
      </header>
      {ideUrl ? (
        <iframe
          src={ideUrl}
          style={{ flex: 1, border: 'none' }}
          title="code-server"
        />
      ) : (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <p>Loading IDE...</p>
        </div>
      )}
    </div>
  );
}
