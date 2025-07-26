import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Wind, BrainCircuit, MonitorPlay, Rocket, Github } from "lucide-react"
import Link from "next/link"

export default function Home() {
  const features = [
    {
      icon: <Wind className="h-10 w-10 text-primary" />,
      title: "Full VS Code Experience",
      description: "Code in a familiar, powerful environment, right in your browser, powered by Code-Server.",
    },
    {
      icon: <BrainCircuit className="h-10 w-10 text-primary" />,
      title: "AI-Powered Coding",
      description: "Leverage our integrated AI assistant to write code, debug, and learn faster than ever before.",
    },
    {
      icon: <MonitorPlay className="h-10 w-10 text-primary" />,
      title: "Live Previews",
      description: "See your changes live. No more switching tabs or refreshing. Your app updates as you code.",
    },
    {
      icon: <Rocket className="h-10 w-10 text-primary" />,
      title: "One-Click Deployment",
      description: "Go from code to live in seconds. Deploy your projects effortlessly to the web with a single click.",
    },
  ]

  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-14 max-w-screen-2xl items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <Wind className="h-6 w-6 text-primary" />
            <span className="font-headline text-xl font-bold">WindWalker</span>
          </Link>
          <nav className="flex items-center gap-4">
            <Button variant="ghost" size="icon" asChild>
              <a href="https://github.com" target="_blank" rel="noopener noreferrer">
                <Github className="h-5 w-5" />
                <span className="sr-only">GitHub</span>
              </a>
            </Button>
            <Button asChild className="font-headline font-semibold">
              <a href="http://localhost:8080" target="_blank" rel="noopener noreferrer">Launch IDE</a>
            </Button>
          </nav>
        </div>
      </header>

      <main className="flex-1">
        <section className="container mx-auto max-w-5xl px-4 py-24 text-center sm:py-32 md:py-40">
          <h1 className="font-headline text-4xl font-extrabold tracking-tighter sm:text-5xl md:text-6xl lg:text-7xl">
            The Future of Development is in the Cloud.
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground">
            WindWalker provides a seamless, AI-enhanced coding environment that moves with you. Build, test, and deploy powerful web applications from anywhere, on any device.
          </p>
          <div className="mt-8 flex justify-center gap-4">
            <Button size="lg" className="font-headline font-semibold text-lg" asChild>
              <a href="http://localhost:8080" target="_blank" rel="noopener noreferrer">
                Start Coding Now
              </a>
            </Button>
            <Button size="lg" variant="outline" className="font-headline font-semibold text-lg">
              Learn More
            </Button>
          </div>
        </section>

        <section id="features" className="w-full py-12 md:py-24 lg:py-32 bg-secondary">
          <div className="container mx-auto px-4 md:px-6">
            <div className="flex flex-col items-center justify-center space-y-4 text-center">
              <div className="space-y-2">
                <div className="inline-block rounded-lg bg-muted px-3 py-1 text-sm font-semibold text-primary">Key Features</div>
                <h2 className="font-headline text-3xl font-bold tracking-tighter sm:text-5xl">An IDE Built for Speed and Intelligence</h2>
                <p className="max-w-[900px] text-muted-foreground md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed">
                  Everything you need to go from idea to deployment, streamlined and enhanced with AI.
                </p>
              </div>
            </div>
            <div className="mx-auto grid max-w-5xl grid-cols-1 gap-8 py-12 sm:grid-cols-2">
              {features.map((feature, index) => (
                <Card key={index} className="transform-gpu transition-all duration-300 ease-in-out hover:-translate-y-2 hover:shadow-xl bg-background/80">
                  <CardHeader className="flex flex-row items-center gap-4 pb-4">
                    {feature.icon}
                    <CardTitle className="font-headline text-2xl">{feature.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground">{feature.description}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t py-6 md:py-8">
        <div className="container mx-auto flex flex-col items-center justify-center gap-2 text-center md:flex-row md:justify-between">
          <p className="text-sm text-muted-foreground">© {new Date().getFullYear()} WindWalker. All rights reserved.</p>
          <div className="flex items-center gap-4">
            <Link href="#" className="text-sm text-muted-foreground hover:text-primary">Terms of Service</Link>
            <Link href="#" className="text-sm text-muted-foreground hover:text-primary">Privacy Policy</Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
