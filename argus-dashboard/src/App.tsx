import { BrowserRouter, Routes, Route, Link, useLocation } from 'react-router-dom'
import Dashboard from './pages/Dashboard'
import ReviewQueue from './pages/ReviewQueue'
import CompliancePage from './pages/CompliancePage'
import DemoPage from './pages/DemoPage'
import { Shield, LayoutDashboard, ListChecks, FileText, PlayCircle } from 'lucide-react'
import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

function Sidebar() {
  const location = useLocation()
  
  const navItems = [
    { name: 'Overview', path: '/', icon: LayoutDashboard },
    { name: 'Review Queue', path: '/reviews', icon: ListChecks },
    { name: 'Compliance', path: '/compliance', icon: FileText },
    { name: 'Live Demo', path: '/demo', icon: PlayCircle },
  ]

  return (
    <div className="w-64 bg-slate-900 border-r border-slate-800 min-h-screen flex flex-col">
      <div className="p-6">
        <div className="flex items-center gap-3">
          <Shield className="h-8 w-8 text-blue-500" />
          <h1 className="text-xl font-bold tracking-tight text-white">ARGUS</h1>
        </div>
        <p className="text-xs text-slate-500 mt-1 uppercase tracking-wider font-semibold">Security Gateway</p>
      </div>
      <nav className="flex-1 px-4 py-4 space-y-2">
        {navItems.map((item) => {
          const active = location.pathname === item.path
          return (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                active ? "bg-slate-800 text-blue-400" : "text-slate-400 hover:bg-slate-800 hover:text-slate-200"
              )}
            >
              <item.icon className="h-5 w-5" />
              {item.name}
            </Link>
          )
        })}
      </nav>
    </div>
  )
}

function App() {
  return (
    <BrowserRouter>
      <div className="flex bg-slate-950 text-slate-200 min-h-screen font-sans">
        <Sidebar />
        <main className="flex-1 overflow-y-auto">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/reviews" element={<ReviewQueue />} />
            <Route path="/compliance" element={<CompliancePage />} />
            <Route path="/demo" element={<DemoPage />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  )
}

export default App