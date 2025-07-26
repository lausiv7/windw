export default function Home() {
  return (
    <div className="w-screen h-screen overflow-hidden">
      <iframe
        src="/ide"
        className="w-full h-full border-0"
        title="WindWalker IDE"
      />
    </div>
  )
}
