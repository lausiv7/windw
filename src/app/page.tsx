export default function Home() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      <header style={{ padding: '1rem', backgroundColor: '#0A3141' }}>
        <h1 style={{ color: 'white', margin: 0, fontFamily: '"Space Grotesk", sans-serif' }}>WindWalker IDE</h1>
      </header>
      <iframe
        src="/ide/"
        style={{ flex: 1, border: 'none' }}
        title="code-server"
      />
    </div>
  )
}
