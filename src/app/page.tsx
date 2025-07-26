export default function Home() {
  return (
    <div className="w-screen h-screen overflow-hidden">
      <iframe
        src="http://localhost:8080"
        className="w-full h-full border-0"
        title="WindWalker IDE"
      />
    </div>
  )
}
