export default function Home() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      <header style={{ padding: '1rem', backgroundColor: '#222' }}>
        <h1 style={{ color: 'white', margin: 0 }}>WindWalker IDE</h1>
      </header>
      <iframe
        src="/ide/"
        style={{ flex: 1, border: 'none' }}
        title="code-server"
      />
    </div>
  )
}
