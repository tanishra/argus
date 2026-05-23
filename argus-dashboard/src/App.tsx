import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom'
import { useEffect, useState } from 'react'
import Dashboard from './pages/Dashboard'
import ReviewQueue from './pages/ReviewQueue'
import CompliancePage from './pages/CompliancePage'
import DemoPage from './pages/DemoPage'
import { Shield, ListChecks, FileText, PlayCircle, Menu, X, Home, AlertTriangle } from 'lucide-react'
import { cn } from './lib/utils'

const navItems = [
  { name: 'Review Queue', path: '/reviews', icon: ListChecks, label: 'Pending reviews' },
  { name: 'Compliance', path: '/compliance', icon: FileText, label: 'Audit reports' },
]

function Navbar() {
  const location = useLocation()
  const [scrolled, setScrolled] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <header className={cn(
      "fixed top-0 left-0 right-0 z-50 transition-colors duration-300 border-b",
      scrolled ? "bg-background/80 backdrop-blur-md border-border" : "bg-transparent border-transparent"
    )}>
      <div className="max-w-7xl mx-auto px-6">
        <div className="flex items-center justify-between h-16">
          <a href="/" className="flex items-center gap-2 group">
            <span className="text-2xl font-extrabold tracking-tighter text-foreground lowercase transition-transform group-hover:scale-[1.02]">argus.</span>
          </a>

          <div className="hidden md:flex items-center gap-6">
            {navItems.map((item) => {
              const active = location.pathname === item.path
              return (
                <a
                  key={item.path}
                  href={item.path}
                  className={cn(
                    "text-sm transition-colors",
                    active ? "text-foreground font-medium" : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {item.name}
                </a>
              )
            })}
            <div className="w-px h-4 bg-border" />
            <a
              href="/demo"
              className="inline-flex items-center gap-2 text-sm font-medium text-foreground hover:opacity-80 transition-opacity"
            >
              <PlayCircle className="w-4 h-4" />
              Live Demo
            </a>
            <div className="flex items-center gap-3 ml-2 border-l border-border pl-5">
              <a 
                href="https://github.com/tanishra/argus" 
                target="_blank" 
                rel="noreferrer"
                className="text-muted-foreground hover:text-foreground transition-colors"
                aria-label="GitHub Repository"
              >
                <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current">
                  <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                </svg>
              </a>
            </div>
          </div>

          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="md:hidden text-foreground p-2"
            aria-label="Toggle menu"
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {mobileOpen && (
        <div className="md:hidden bg-background border-b border-border px-6 py-4 space-y-4">
          {[...navItems, { name: 'Live Demo', path: '/demo', icon: PlayCircle, label: '' }].map((item) => (
            <a
              key={item.path}
              href={item.path}
              onClick={() => setMobileOpen(false)}
              className="block text-sm font-medium text-foreground"
            >
              {item.name}
            </a>
          ))}
        </div>
      )}
    </header>
  )
}

function NotFound() {
  return (
    <div className="pt-24 min-h-screen flex items-center justify-center">
      <div className="text-center px-6">
        <h1 className="text-4xl font-semibold mb-4 text-foreground">404</h1>
        <p className="text-muted-foreground mb-8">This page doesn't exist.</p>
        <a href="/" className="text-sm font-medium text-foreground hover:underline">
          Back to Dashboard
        </a>
      </div>
    </div>
  )
}

function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-background text-foreground font-sans selection:bg-primary selection:text-primary-foreground flex flex-col">
        <Navbar />
        
        {/* Technical Failure Banner */}
        <div className="w-full bg-destructive/10 border-b border-destructive/20 pt-16">
          <div className="max-w-7xl mx-auto px-6 py-3 flex items-center justify-center gap-3 text-destructive">
            <AlertTriangle className="w-5 h-5 shrink-0" />
            <span className="text-sm font-medium">
              We are currently experiencing a technical failure with our infrastructure. Live demo and dashboard data are temporarily unavailable.
            </span>
          </div>
        </div>

        <main className="flex-1">
          <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/demo" element={<DemoPage />} />
          <Route path="/reviews" element={<ReviewQueue />} />
          <Route path="/compliance" element={<CompliancePage />} />
          <Route path="*" element={<NotFound />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  )
}

export default App
