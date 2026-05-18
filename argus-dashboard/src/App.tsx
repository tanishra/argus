import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom'
import { useEffect, useState } from 'react'
import Dashboard from './pages/Dashboard'
import ReviewQueue from './pages/ReviewQueue'
import CompliancePage from './pages/CompliancePage'
import DemoPage from './pages/DemoPage'
import { Shield, ListChecks, FileText, PlayCircle, Menu, X, Home, Sun, Moon } from 'lucide-react'
import { useTheme } from './ThemeContext'

const navItems = [
  { name: 'Review Queue', path: '/reviews', icon: ListChecks, label: 'Pending reviews' },
  { name: 'Compliance', path: '/compliance', icon: FileText, label: 'Audit reports' },
]

function Navbar() {
  const { theme, toggleTheme } = useTheme()
  const location = useLocation()
  const [scrolled, setScrolled] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <header className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
      scrolled ? 'bg-white/85 backdrop-blur-xl border-b border-border/40 shadow-[0_1px_3px_rgba(0,0,0,0.02)]' : 'bg-transparent'
    }`}>
      <div className="max-w-7xl mx-auto px-6">
        <div className="flex items-center justify-between h-16">
          <a href="/" className="flex items-center gap-2.5 group">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-[0_2px_8px_rgba(79,70,229,0.15)] transition-all duration-300 group-hover:shadow-[0_4px_16px_rgba(79,70,229,0.25)] group-hover:scale-105">
              <Shield className="w-[18px] h-[18px] text-white" strokeWidth={2.5} />
            </div>
            <span className="text-base font-semibold tracking-tight text-foreground">ARGUS</span>
          </a>

          <div className="hidden md:flex items-center gap-1">
            <button
              onClick={toggleTheme}
              className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary/70 transition-all duration-200"
              aria-label="Toggle theme"
            >
              {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
            {navItems.map((item) => {
              const active = location.pathname === item.path
              return (
                <a
                  key={item.path}
                  href={item.path}
                  className={`relative px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200 ${
                    active
                      ? 'text-primary bg-primary/[0.04]'
                      : 'text-muted-foreground hover:text-foreground hover:bg-secondary/70'
                  }`}
                >
                  {item.name}
                </a>
              )
            })}
            <div className="w-px h-5 bg-border/60 mx-2" />
            <a
              href="/demo"
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-primary text-primary-foreground text-sm font-medium rounded-lg hover:shadow-[0_4px_12px_rgba(79,70,229,0.3)] transition-all duration-300"
            >
              <PlayCircle className="w-4 h-4" />
              Live Demo
            </a>
          </div>

          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="md:hidden p-2 rounded-lg hover:bg-secondary transition-colors"
            aria-label="Toggle menu"
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {mobileOpen && (
        <div className="md:hidden bg-white border-b border-border/40 px-4 pb-4 pt-2 space-y-1 animate-fade-in shadow-sm">
          <button
            onClick={() => { toggleTheme(); setMobileOpen(false) }}
            className="flex items-center gap-3 w-full px-4 py-2.5 rounded-lg text-sm font-medium text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
          >
            {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            <span>{theme === 'dark' ? 'Light Mode' : 'Dark Mode'}</span>
          </button>
          <div className="w-full h-px bg-border/40 my-1" />
          {[...navItems, { name: 'Live Demo', path: '/demo', icon: PlayCircle, label: 'Interactive playground' }].map((item) => {
            const active = location.pathname === item.path
            const Icon = item.icon
            const isDemo = item.path === '/demo'
            return (
              <a
                key={item.path}
                href={item.path}
                onClick={() => setMobileOpen(false)}
                className={`flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  active
                    ? isDemo ? 'bg-primary text-primary-foreground' : 'bg-primary/5 text-primary'
                    : isDemo
                      ? 'bg-primary/5 text-primary hover:bg-primary/10'
                      : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
                }`}
              >
                <Icon className="w-4 h-4" />
                <div>
                  <span>{item.name}</span>
                  <span className="block text-xs text-inherit opacity-70">{item.label}</span>
                </div>
              </a>
            )
          })}
        </div>
      )}
    </header>
  )
}

function NotFound() {
  return (
    <div className="pt-16 min-h-screen flex items-center justify-center">
      <div className="text-center px-6">
        <h1 className="text-6xl font-bold text-gradient mb-4">404</h1>
        <p className="text-lg text-muted-foreground mb-6">This page doesn't exist.</p>
        <a href="/" className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary text-primary-foreground rounded-xl font-medium text-sm hover:shadow-[0_4px_12px_rgba(79,70,229,0.3)] transition-all">
          <Home className="w-4 h-4" />
          Back to Dashboard
        </a>
      </div>
    </div>
  )
}

function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-background font-sans">
        <Navbar />
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/demo" element={<DemoPage />} />
          <Route path="/reviews" element={<ReviewQueue />} />
          <Route path="/compliance" element={<CompliancePage />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </div>
    </BrowserRouter>
  )
}

export default App
