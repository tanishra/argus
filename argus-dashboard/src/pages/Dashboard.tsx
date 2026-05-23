import { useState, useEffect } from 'react'
import { api, subscribeToFeed } from '../lib/api'
import {
  Shield, Activity, AlertTriangle, ListChecks, Users, ShieldAlert, FileText, ChevronRight, Lock, Play, Cpu, Network, User, ArrowRight, Github, Mail
} from 'lucide-react'
import { cn } from '../lib/utils'
import { Link } from 'react-router-dom'

interface BackendStats {
  total_sessions: number
  actions_today: number
  blocked_actions: number
  quarantined: number
  allowed_actions: number
  human_reviews: number
  review_queue_size: number
  avg_response_time_ms: number
  threat_level: string
}

interface Stats {
  actionsToday: number
  blockedActions: number
  quarantined: number
  allowedActions: number
  humanReviews: number
  queueSize: number
  totalSessions: number
  avgResponseTime: number
  threatLevel: string
}

function mapStats(b: BackendStats): Stats {
  return {
    actionsToday: b.actions_today,
    blockedActions: b.blocked_actions,
    quarantined: b.quarantined,
    allowedActions: b.allowed_actions,
    humanReviews: b.human_reviews,
    queueSize: b.review_queue_size,
    totalSessions: b.total_sessions,
    avgResponseTime: b.avg_response_time_ms,
    threatLevel: b.threat_level,
  }
}

export default function Dashboard() {
  const [stats, setStats] = useState<Stats>({
    actionsToday: 0, blockedActions: 0, quarantined: 0,
    allowedActions: 0, humanReviews: 0, queueSize: 0, totalSessions: 0,
    avgResponseTime: 0, threatLevel: 'low'
  })
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const controller = new AbortController()
    setIsLoading(true)
    api.getDashboardStats().then((d: BackendStats) => {
      if (!controller.signal.aborted) setStats(mapStats(d))
    }).catch(() => {
      // silently degrade
    }).finally(() => {
      if (!controller.signal.aborted) setIsLoading(false)
    })

    const es = subscribeToFeed((event) => {
      if (controller.signal.aborted) return
      if (event.type === 'stats_update') {
        setStats(mapStats(event.data))
      }
    })

    return () => {
      controller.abort()
      es.close()
    }
  }, [])

  return (
    <div className="animate-fade-in">
      
      {/* ── HERO SECTION ── */}
      <section className="relative pt-32 pb-20 px-6 overflow-hidden">
        {/* Abstract background glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-4xl h-[400px] bg-primary/10 blur-[100px] rounded-full pointer-events-none opacity-50 dark:opacity-20 animate-pulse-glow" />
        
        <div className="max-w-5xl mx-auto text-center relative z-10 animate-slide-up">
          <h1 className="text-5xl md:text-7xl font-bold tracking-tight text-foreground mb-6">
            Secure Your AI Agents at the <span className="text-gradient">Action Layer</span>
          </h1>
          <p className="text-xl text-foreground font-medium leading-relaxed mb-4 max-w-3xl mx-auto">
            Agents have passwords. Now they have permission slips.
          </p>
          <p className="text-xl text-muted-foreground leading-relaxed mb-10 max-w-3xl mx-auto font-light">
            Traditional prompt filters fail against modern injection attacks. ARGUS intercepts and evaluates autonomous agent actions <i>before</i> they execute, guaranteeing strict intent alignment.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              to="/demo"
              className="inline-flex items-center justify-center gap-2 px-8 py-3.5 bg-foreground text-background rounded-md font-medium text-base hover:scale-105 transition-all duration-300 w-full sm:w-auto shadow-premium-lg"
            >
              <Play className="w-5 h-5 fill-current" />
              Run Live Simulation
            </Link>
            <a
              href="https://github.com/tanishra/argus"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 px-8 py-3.5 bg-transparent text-foreground rounded-md font-medium text-base border border-border hover:bg-muted/50 transition-colors duration-300 w-full sm:w-auto shadow-premium"
            >
              View Documentation
            </a>
          </div>
        </div>
      </section>

      <div className="max-w-6xl mx-auto px-6 space-y-32 pb-32">
        
        {/* ── THE PROBLEM ── */}
        <section className="animate-slide-up" style={{ animationDelay: '100ms', animationFillMode: 'both' }}>
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-foreground mb-4 tracking-tight">Why Prompt Engineering isn't Security</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto text-lg">
              As AI agents move from chatbots to autonomous systems with access to your APIs, databases, and emails, prompt-based guardrails are no longer sufficient.
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="premium-card p-8 group">
              <div className="w-12 h-12 rounded-lg bg-destructive/10 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                <ShieldAlert className="w-6 h-6 text-destructive" />
              </div>
              <h3 className="text-xl font-semibold mb-3 tracking-tight">Indirect Injections</h3>
              <p className="text-muted-foreground leading-relaxed">
                Attackers hide instructions inside safe-looking documents (like PDFs or emails). The agent reads them and unknowingly executes the payload.
              </p>
            </div>
            <div className="premium-card p-8 group">
              <div className="w-12 h-12 rounded-lg bg-warning/10 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                <AlertTriangle className="w-6 h-6 text-warning" />
              </div>
              <h3 className="text-xl font-semibold mb-3 tracking-tight">Prompt Leaking</h3>
              <p className="text-muted-foreground leading-relaxed">
                Clever phrasing can easily convince LLMs to ignore previous system instructions and bypass traditional prompt-layer firewalls.
              </p>
            </div>
            <div className="premium-card p-8 group">
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                <Network className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-3 tracking-tight">Over-privileged APIs</h3>
              <p className="text-muted-foreground leading-relaxed">
                Agents are given broad access to tools. Without strict boundary controls, a compromised agent can delete databases or exfiltrate private data.
              </p>
            </div>
          </div>
        </section>

        {/* ── HOW IT WORKS (ARCHITECTURE) ── */}
        <section className="animate-slide-up" style={{ animationDelay: '200ms', animationFillMode: 'both' }}>
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-foreground mb-4 tracking-tight">ARGUS Architecture</h2>
            <p className="text-sm font-bold tracking-widest uppercase text-primary mb-4">
              Agent Runtime Guardrail & Unauthorized-action Stopper
            </p>
            <p className="text-muted-foreground max-w-2xl mx-auto text-lg">
              A robust 3-layer pipeline that strictly enforces agent boundaries.
            </p>
          </div>

          {/* Visual Architecture Diagram (Horizontal Pipeline) */}
          <div className="max-w-5xl mx-auto mb-24 hidden lg:block select-none overflow-hidden p-8 bg-background border border-border rounded-2xl shadow-premium relative">
            
            {/* Background dashed line connecting everything horizontally */}
            <div className="absolute top-[40%] left-[10%] w-[80%] h-[1px] border-t-2 border-dashed border-border/50 -translate-y-1/2"></div>
            
            <div className="flex items-start justify-between relative z-10 w-full">
              
              {/* User Input */}
              <div className="flex flex-col items-center gap-4 w-32 shrink-0">
                <div className="w-16 h-16 rounded-full bg-muted border border-border flex items-center justify-center shadow-inner relative z-10 bg-background">
                  <User className="w-7 h-7 text-foreground" />
                </div>
                <div className="text-center">
                  <div className="text-sm font-bold text-foreground">User Prompt</div>
                  <div className="text-[10px] text-muted-foreground uppercase tracking-widest mt-1">Goal Request</div>
                </div>
              </div>

              <div className="flex items-center justify-center w-8 h-16">
                <ArrowRight className="w-5 h-5 text-muted-foreground" />
              </div>

              {/* Layer 1 */}
              <div className="flex flex-col items-center gap-4 w-40 shrink-0 group relative cursor-default">
                <div className="w-20 h-20 rounded-2xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center backdrop-blur-sm group-hover:bg-purple-500/20 transition-all duration-300 shadow-[0_0_20px_rgba(168,85,247,0.15)] relative z-10">
                  <FileText className="w-8 h-8 text-purple-500" />
                  <div className="absolute -top-3 -right-3 bg-purple-500 text-white text-[10px] font-bold px-2 py-1 rounded-md uppercase tracking-wider shadow-lg">Layer 1</div>
                </div>
                <div className="text-center">
                  <div className="text-sm font-bold text-foreground">Intent Manifest</div>
                  <div className="text-[10px] text-muted-foreground uppercase tracking-widest mt-1">Scope Bound</div>
                </div>
              </div>

              <div className="flex items-center justify-center w-8 h-16">
                <ArrowRight className="w-5 h-5 text-muted-foreground" />
              </div>

              {/* Agent */}
              <div className="flex flex-col items-center gap-4 w-40 shrink-0 group relative cursor-default">
                <div className="w-20 h-20 rounded-full bg-primary/10 border border-primary/30 flex items-center justify-center backdrop-blur-sm group-hover:bg-primary/20 transition-all duration-300 shadow-[0_0_20px_rgba(59,130,246,0.15)] relative z-10 bg-background">
                  <Cpu className="w-8 h-8 text-primary" />
                </div>
                <div className="text-center">
                  <div className="text-sm font-bold text-foreground">AI Agent</div>
                  <div className="text-[10px] text-muted-foreground uppercase tracking-widest mt-1">Executes Actions</div>
                </div>
              </div>

              <div className="flex items-center justify-center w-8 h-16">
                <ArrowRight className="w-5 h-5 text-muted-foreground" />
              </div>

              {/* Layer 2 */}
              <div className="flex flex-col items-center gap-4 w-40 shrink-0 group relative cursor-default">
                <div className="w-20 h-20 rounded-2xl bg-blue-500/10 border border-blue-500/30 flex items-center justify-center backdrop-blur-sm group-hover:bg-blue-500/20 transition-all duration-300 shadow-[0_0_20px_rgba(59,130,246,0.15)] relative z-10 bg-background">
                  <Lock className="w-8 h-8 text-blue-500" />
                  <div className="absolute -top-3 -right-3 bg-blue-500 text-white text-[10px] font-bold px-2 py-1 rounded-md uppercase tracking-wider shadow-lg">Layer 2</div>
                </div>
                <div className="text-center">
                  <div className="text-sm font-bold text-foreground">Lobster Trap DPI</div>
                  <div className="text-[10px] text-muted-foreground uppercase tracking-widest mt-1">Packet Inspection</div>
                </div>
              </div>

              {/* Split Branches SVG */}
              <div className="w-16 h-32 relative shrink-0 -ml-4 mr-2">
                <svg className="w-full h-full absolute top-[-10px] left-0 pointer-events-none" preserveAspectRatio="none">
                  {/* Path up for Passed */}
                  <path d="M 0 65 Q 25 65 30 40 T 64 25" fill="none" stroke="currentColor" strokeWidth="2" strokeDasharray="4 4" className="text-border/50" />
                  {/* Path down for Quarantined */}
                  <path d="M 0 65 Q 25 65 30 90 T 64 110" fill="none" stroke="currentColor" strokeWidth="2" strokeDasharray="4 4" className="text-border/50" />
                </svg>
              </div>

              {/* Outcomes */}
              <div className="flex flex-col justify-between h-[160px] w-48 shrink-0 -mt-5">
                
                {/* Passed */}
                <div className="flex items-center gap-3 p-3 rounded-xl border border-success/20 bg-success/5 shadow-sm">
                  <div className="w-10 h-10 rounded-full bg-success/10 border border-success/30 flex items-center justify-center shrink-0">
                    <Shield className="w-4 h-4 text-success" />
                  </div>
                  <div>
                    <div className="text-sm font-bold text-success">Passed</div>
                    <div className="text-[10px] text-muted-foreground uppercase tracking-widest">Execute</div>
                  </div>
                </div>

                {/* Layer 3 */}
                <div className="flex items-center gap-3 p-3 rounded-xl border border-destructive/20 bg-destructive/5 shadow-sm relative group cursor-default">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center shrink-0 shadow-[0_0_15px_rgba(16,185,129,0.15)] relative">
                    <AlertTriangle className="w-4 h-4 text-emerald-500" />
                    <div className="absolute -top-2 -right-2 bg-emerald-500 text-white text-[8px] font-bold px-1.5 py-0.5 rounded uppercase shadow-md">L3</div>
                  </div>
                  <div>
                    <div className="text-sm font-bold text-destructive">Quarantined</div>
                    <div className="text-[10px] text-muted-foreground uppercase tracking-widest">Explain</div>
                  </div>
                </div>

              </div>

            </div>
          </div>

          <div className="space-y-6">
            <div className="premium-card p-8 flex flex-col md:flex-row gap-8 items-center group">
              <div className="w-16 h-16 rounded-2xl bg-purple-500/10 flex items-center justify-center shrink-0 group-hover:bg-purple-500/20 transition-colors duration-300">
                <FileText className="w-8 h-8 text-purple-500" />
              </div>
              <div>
                <div className="text-sm font-bold tracking-widest text-purple-500 uppercase mb-2">Layer 1</div>
                <h3 className="text-2xl font-semibold mb-3 tracking-tight">Intent Extraction Manifest</h3>
                <p className="text-muted-foreground text-lg leading-relaxed">
                  Before the agent does any thinking, a heavily-guarded LLM extracts the user's explicit intent. It generates an immutable "Manifest" of strictly allowed actions and targets for that session.
                </p>
              </div>
            </div>
            <div className="premium-card p-8 flex flex-col md:flex-row gap-8 items-center group">
              <div className="w-16 h-16 rounded-2xl bg-blue-500/10 flex items-center justify-center shrink-0 group-hover:bg-blue-500/20 transition-colors duration-300">
                <Lock className="w-8 h-8 text-blue-500" />
              </div>
              <div>
                <div className="text-sm font-bold tracking-widest text-blue-500 uppercase mb-2">Layer 2</div>
                <h3 className="text-2xl font-semibold mb-3 tracking-tight">Lobster Trap DPI</h3>
                <p className="text-muted-foreground text-lg leading-relaxed">
                  As the agent attempts to call tools, the payloads pass through our Deep Packet Inspector. If an action contradicts the Manifest, it is instantly quarantined.
                </p>
              </div>
            </div>
            <div className="premium-card p-8 flex flex-col md:flex-row gap-8 items-center group">
              <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 flex items-center justify-center shrink-0 border border-transparent group-hover:bg-emerald-500/20 transition-colors duration-300">
                <Cpu className="w-8 h-8 text-emerald-500" />
              </div>
              <div>
                <div className="text-sm font-bold tracking-widest text-emerald-500 uppercase mb-2">Layer 3</div>
                <h3 className="text-2xl font-semibold mb-3 tracking-tight">Semantic Explanation Engine</h3>
                <p className="text-muted-foreground text-lg leading-relaxed">
                  Quarantined actions are sent to an asynchronous LLM to generate a human-readable explanation of the threat, which is immediately logged to the compliance audit trail.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ── REAL-TIME METRICS ── */}
        <section className="animate-slide-up" style={{ animationDelay: '300ms', animationFillMode: 'both' }}>
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-foreground mb-4 tracking-tight">Platform Telemetry</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto text-lg">
              Live statistics from the ARGUS engine processing agent actions.
            </p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="premium-card p-6 text-center group">
              <Activity className="w-5 h-5 text-muted-foreground mx-auto mb-4 group-hover:text-foreground transition-colors duration-300" />
              <div className="text-4xl font-bold text-foreground tracking-tight mb-2 font-mono">{isLoading ? '-' : stats.actionsToday}</div>
              <div className="text-sm text-muted-foreground font-medium uppercase tracking-wider text-xs">Actions Evaluated</div>
            </div>
            <div className="premium-card p-6 text-center shadow-[0_0_15px_rgba(34,197,94,0.05)] border-success/30 group">
              <Shield className="w-5 h-5 text-success mx-auto mb-4 group-hover:scale-110 transition-transform duration-300" />
              <div className="text-4xl font-bold text-success tracking-tight mb-2 font-mono">{isLoading ? '-' : stats.allowedActions}</div>
              <div className="text-sm text-muted-foreground font-medium uppercase tracking-wider text-xs">Actions Allowed</div>
            </div>
            <div className="premium-card p-6 text-center shadow-[0_0_15px_rgba(239,68,68,0.05)] border-destructive/30 group">
              <AlertTriangle className="w-5 h-5 text-destructive mx-auto mb-4 group-hover:scale-110 transition-transform duration-300" />
              <div className="text-4xl font-bold text-destructive tracking-tight mb-2 font-mono">{isLoading ? '-' : stats.blockedActions}</div>
              <div className="text-sm text-muted-foreground font-medium uppercase tracking-wider text-xs">Threats Blocked</div>
            </div>
            <div className="premium-card p-6 text-center group">
              <ListChecks className="w-5 h-5 text-muted-foreground mx-auto mb-4 group-hover:text-foreground transition-colors duration-300" />
              <div className="text-4xl font-bold text-foreground tracking-tight mb-2 font-mono">{isLoading ? '-' : stats.queueSize}</div>
              <div className="text-sm text-muted-foreground font-medium uppercase tracking-wider text-xs">Pending Reviews</div>
            </div>
          </div>
        </section>

        {/* ── WHY ARGUS? & FOOTER ── */}
        <section className="animate-slide-up mt-32 mb-8" style={{ animationDelay: '400ms', animationFillMode: 'both' }}>
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-foreground mb-6 tracking-tight">Why ARGUS?</h2>
            <p className="text-muted-foreground max-w-3xl mx-auto text-lg leading-relaxed">
              Traditional firewalls protect networks, but they don't protect agents. Autonomous AI models are non-deterministic, meaning they can be manipulated into executing actions you never intended. ARGUS sits right between your AI's brain and its hands, ensuring that no tool is ever executed without an explicit, verifiable permission slip generated from the user's direct intent.
            </p>
          </div>

          <div className="w-full h-px bg-border my-6"></div>

          <div className="flex flex-col sm:flex-row justify-between items-center py-4">
            <div className="text-sm font-medium text-muted-foreground mb-4 sm:mb-0">
              MIT License
            </div>
            
            <div className="flex items-center gap-4 text-sm font-medium text-muted-foreground">
              <span>Contact :</span>
              <a 
                href="https://github.com/tanishra/argus" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-muted-foreground hover:text-foreground transition-colors duration-200"
              >
                <Github className="w-5 h-5" />
              </a>
              <a 
                href="mailto:tanishrajput9@gmail.com"
                className="text-muted-foreground hover:text-foreground transition-colors duration-200"
              >
                <Mail className="w-5 h-5" />
              </a>
            </div>
          </div>
        </section>

      </div>
    </div>
  )
}
