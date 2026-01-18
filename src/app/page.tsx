import Link from 'next/link'

export default function Home() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-background to-muted">
      <div className="container mx-auto px-4 py-16">
        {/* Header */}
        <div className="text-center mb-16">
          <h1 className="text-5xl font-bold tracking-tight mb-4">
            <span className="text-primary">X</span>Bot
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            AI-powered tweet generation with authentic style analysis.
            Create content that sounds like you.
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-16">
          <FeatureCard
            title="Style Analysis"
            description="Analyze your existing tweets to capture your unique voice and writing style"
            icon="analyze"
          />
          <FeatureCard
            title="Multi-AI Providers"
            description="Choose from OpenAI, Claude, Gemini, or local Ollama models"
            icon="ai"
          />
          <FeatureCard
            title="Smart Scheduling"
            description="Schedule tweets for optimal engagement times"
            icon="schedule"
          />
          <FeatureCard
            title="Browser Automation"
            description="Seamless posting with Playwright-powered automation"
            icon="browser"
          />
          <FeatureCard
            title="Analytics"
            description="Track performance and optimize your content strategy"
            icon="analytics"
          />
          <FeatureCard
            title="Thread Support"
            description="Create engaging multi-tweet threads automatically"
            icon="thread"
          />
        </div>

        {/* CTA */}
        <div className="text-center">
          <Link
            href="/dashboard"
            className="inline-flex items-center justify-center rounded-lg bg-primary px-8 py-4 text-lg font-semibold text-primary-foreground shadow-lg hover:bg-primary/90 transition-colors"
          >
            Open Dashboard
          </Link>
        </div>
      </div>
    </main>
  )
}

function FeatureCard({
  title,
  description,
  icon,
}: {
  title: string
  description: string
  icon: string
}) {
  const icons: Record<string, string> = {
    analyze: '🎯',
    ai: '🤖',
    schedule: '📅',
    browser: '🌐',
    analytics: '📊',
    thread: '🧵',
  }

  return (
    <div className="group rounded-xl border bg-card p-6 shadow-sm hover:shadow-md transition-all hover:border-primary/50">
      <div className="text-4xl mb-4">{icons[icon]}</div>
      <h3 className="text-lg font-semibold mb-2">{title}</h3>
      <p className="text-muted-foreground">{description}</p>
    </div>
  )
}
