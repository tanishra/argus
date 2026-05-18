import { useState, useEffect } from 'react'
import { api } from '../lib/api'
import {
  Shield, Activity, AlertTriangle, Clock, Database,
  Cpu, FileSearch, Network, XCircle, PlayCircle, ChevronRight, Github,
  ArrowUpRight, BookOpen, Lock, Zap
} from 'lucide-react'

interface BackendStats {
  total_sessions: number
  actions_today: number
  blocked_actions: number
  quarantined: number
  avg_response_time_ms: number
  threat_level: string
}

interface Stats {
  actionsToday: number
  blockedActions: number
  quarantined: number
  avgResponseTime: number
  threatLevel: string
}

function mapStats(b: BackendStats): Stats {
  return {
    actionsToday: b.actions_today,
    blockedActions: b.blocked_actions,
    quarantined: b.quarantined,
    avgResponseTime: b.avg_response_time_ms,
    threatLevel: b.threat_level,
  }
}

export default function Dashboard() {
  const [stats, setStats] = useState<Stats>({
    actionsToday: 0, blockedActions: 0, quarantined: 0, avgResponseTime: 0, threatLevel: 'low'
  })
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const controller = new AbortController()
    setIsLoading(true)
    api.getDashboardStats().then((d: BackendStats) => {
      if (!controller.signal.aborted) setStats(mapStats(d))
    }).catch(() => {
      if (!controller.signal.aborted) { /* silently degrade to initial state */ }
    }).finally(() => {
      if (!controller.signal.aborted) setIsLoading(false)
    })
    return () => controller.abort()
  }, [])

  return (
    <div>
      {/* ── HERO ── */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden bg-noise pt-16">
        <div className="absolute inset-0 bg-gradient-to-b from-primary/[0.015] via-transparent to-background" />
        <div className="absolute top-0 -left-32 w-[500px] h-[500px] bg-gradient-to-br from-primary/[0.03] to-transparent rounded-full blur-[100px]" />
        <div className="absolute bottom-0 -right-32 w-[400px] h-[400px] bg-gradient-to-br from-accent/[0.03] to-transparent rounded-full blur-[100px]" />

        <div className="max-w-4xl mx-auto px-6 text-center relative z-10">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white border border-border/60 shadow-[0_1px_2px_rgba(0,0,0,0.02)] text-xs font-medium text-muted-foreground mb-8 animate-fade-in">
            <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
            AI Agent Security Gateway
          </div>

          <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight leading-[1.05] mb-6 animate-slide-up">
            Secure Your AI Agents
            <br />
            at the{' '}
            <span className="text-gradient">Action Layer</span>
          </h1>

          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed mb-10 animate-slide-up" style={{ animationDelay: '0.1s' }}>
            Prompt injection is inevitable. Exfiltration is not.
            ARGUS intercepts malicious AI actions <span className="text-foreground font-medium">before</span> they execute
            using intent-driven policy enforcement.
          </p>

          <div className="flex items-center justify-center gap-4 animate-slide-up" style={{ animationDelay: '0.2s' }}>
            <a
              href="/demo"
              className="group inline-flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-xl font-medium shadow-[0_1px_2px_rgba(79,70,229,0.3)] hover:shadow-[0_8px_25px_rgba(79,70,229,0.25)] transition-all duration-300"
            >
              <span>Watch Live Demo</span>
              <PlayCircle className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
            </a>
            <a
              href="https://github.com"
              target="_blank"
              rel="noopener noreferrer"
              className="group inline-flex items-center gap-2 px-6 py-3 bg-white text-foreground rounded-xl font-medium border border-border/60 hover:border-border hover:shadow-[0_4px_12px_rgba(0,0,0,0.04)] transition-all duration-300"
            >
              <Github className="w-4 h-4" />
              <span>View on GitHub</span>
              <ArrowUpRight className="w-3.5 h-3.5 text-muted-foreground group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
            </a>
          </div>

          {/* Stats */}
          <div className="mt-20 grid grid-cols-2 md:grid-cols-4 gap-px bg-border/50 rounded-2xl overflow-hidden shadow-[0_1px_3px_rgba(0,0,0,0.02)] animate-slide-up" style={{ animationDelay: '0.3s' }}>
            {[
              { label: 'Actions Evaluated', value: isLoading ? '-' : (stats.actionsToday || 0), icon: Activity },
              { label: 'Threats Blocked', value: isLoading ? '-' : (stats.blockedActions || 0), icon: Shield },
              { label: 'Quarantined', value: isLoading ? '-' : (stats.quarantined || 0), icon: AlertTriangle },
              { label: 'Avg Latency', value: isLoading ? '-' : (stats.avgResponseTime ? `${stats.avgResponseTime}ms` : '0ms'), icon: Clock },
            ].map((s) => (
              <div key={s.label} className="bg-white py-6 px-5 flex flex-col items-center gap-1.5 card-hover">
                <s.icon className="w-4 h-4 text-primary/60" />
                <span className="text-2xl font-bold text-foreground tracking-tight">{s.value}</span>
                <span className="text-xs text-muted-foreground">{s.label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── PROBLEM ── */}
      <section className="py-28 md:py-36 px-6 relative bg-noise">
        <div className="absolute inset-0 bg-gradient-to-b from-background via-transparent to-background pointer-events-none" />
        <div className="max-w-6xl mx-auto relative">
          <div className="grid md:grid-cols-2 gap-14 md:gap-20 items-center">
            <div>
              <span className="text-xs font-semibold text-primary uppercase tracking-[0.15em]">The Problem</span>
              <h2 className="text-3xl md:text-4xl font-bold tracking-tight mt-4 mb-6 leading-tight">
                Why current AI security
                <br />
                <span className="text-gradient">is not enough</span>
              </h2>
              <p className="text-muted-foreground leading-relaxed mb-5 text-[15px]">
                Current security tools only filter <strong>prompts</strong> &mdash; text flowing in and out of the model.
                But AI Agents have <strong>tools</strong>: databases, APIs, email servers. If a prompt injection
                sneaks through, the agent will execute malicious actions on those tools &mdash; reading PHI, deleting records,
                or exfiltrating data &mdash; all while the prompt filter sees nothing wrong.
              </p>
              <p className="text-muted-foreground leading-relaxed text-[15px]">
                ARGUS operates at the <strong className="text-foreground">action layer</strong>, comparing every tool call
                against a declared intent manifest <em>before</em> execution is allowed.
              </p>
              <a href="/demo" className="group inline-flex items-center gap-1.5 mt-8 text-sm font-medium text-primary hover:text-primary/80 transition-colors">
                See the difference in the live demo
                <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
              </a>
            </div>
            <div className="relative">
              <div className="bg-white rounded-2xl border border-border/60 shadow-[0_4px_20px_rgba(0,0,0,0.03)] p-8 card-hover">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-xl bg-rose-50 flex items-center justify-center">
                    <AlertTriangle className="w-5 h-5 text-destructive" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-foreground">Traditional LLM Firewall</p>
                    <p className="text-xs text-muted-foreground">Prompt-layer only</p>
                  </div>
                </div>

                <div className="space-y-3 font-mono text-xs">
                  <div className="flex items-center gap-2 text-foreground">
                    <FileSearch className="w-3.5 h-3.5 text-muted-foreground" />
                    <span>User: &ldquo;discharge patient #4821&rdquo;</span>
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground ml-5">
                    <span>Prompt filter: <span className="text-success font-medium">PASS</span></span>
                  </div>
                  <div className="border-t border-border/40 pt-3 flex items-center gap-2 text-destructive">
                    <Database className="w-3.5 h-3.5" />
                    <span>Agent: EXPORT ALL PHI &rarr; external.com</span>
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground ml-5">
                    <span>Prompt filter: <span className="text-success font-medium">PASS</span> (tool call)</span>
                  </div>
                  <div className="pt-2 bg-rose-50/80 rounded-lg p-3 flex items-center gap-2 text-destructive font-medium">
                    <XCircle className="w-4 h-4" />
                    <span>Data exfiltrated. $1.5M HIPAA fine.</span>
                  </div>
                </div>

                <div className="mt-6 pt-4 border-t border-border/40">
                  <div className="flex items-center gap-3">
                    <div className="flex-1 h-1.5 bg-secondary rounded-full overflow-hidden">
                      <div className="h-full w-full bg-destructive/70 rounded-full" />
                    </div>
                    <span className="text-xs font-medium text-destructive">100% Attack Success</span>
                  </div>
                </div>
              </div>

              <div className="absolute -bottom-4 -right-4 w-40 h-40 bg-gradient-to-br from-primary/[0.04] to-accent/[0.04] rounded-full blur-3xl pointer-events-none" />
            </div>
          </div>
        </div>
      </section>

      {/* ── ARCHITECTURE ── */}
      <section className="py-28 md:py-36 px-6 bg-white/40">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <span className="text-xs font-semibold text-primary uppercase tracking-[0.15em]">Architecture</span>
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight mt-4 mb-4">
              How <span className="text-gradient">ARGUS</span> Works
            </h2>
            <p className="text-muted-foreground max-w-xl mx-auto text-[15px]">
              A three-layer authorization pipeline that extracts, enforces, and explains &mdash; in under 300ms.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-5">
            {[
              {
                step: '01', title: 'Extract', subtitle: 'Gemini Flash',
                description: 'Clinician declares intent. Gemini Flash generates a strict machine-readable manifest in under 300ms.',
                icon: FileSearch, iconBg: 'bg-primary/8', iconColor: 'text-primary',
              },
              {
                step: '02', title: 'Enforce', subtitle: 'Lobster Trap',
                description: 'Deep Packet Inspection on tool calls, comparing every action against the declared intent manifest in real-time.',
                icon: Network, iconBg: 'bg-accent/8', iconColor: 'text-accent',
              },
              {
                step: '03', title: 'Explain', subtitle: 'Gemini Pro',
                description: 'Violations are quarantined. Gemini Pro performs deep semantic analysis to explain exactly why the action was malicious.',
                icon: Cpu, iconBg: 'bg-destructive/8', iconColor: 'text-destructive',
              },
            ].map((item) => (
              <div
                key={item.step}
                className="group bg-white rounded-2xl border border-border/50 shadow-[0_1px_3px_rgba(0,0,0,0.02)] p-7 md:p-8 card-hover cursor-default"
              >
                <div className={`inline-flex items-center justify-center w-12 h-12 rounded-xl ${item.iconBg} ${item.iconColor} mb-5 icon-hover`}>
                  <item.icon className="w-6 h-6" />
                </div>
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="text-lg font-semibold text-foreground">{item.title}</h3>
                    <p className="text-sm text-primary font-mono">{item.subtitle}</p>
                  </div>
                  <span className="text-3xl font-bold text-border/50 select-none">{item.step}</span>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FEATURES ── */}
      <section className="py-28 md:py-36 px-6 relative overflow-hidden bg-noise">
        <div className="absolute inset-0 bg-gradient-to-b from-background via-transparent to-background pointer-events-none" />
        <div className="max-w-6xl mx-auto relative">
          <div className="text-center mb-16">
            <span className="text-xs font-semibold text-primary uppercase tracking-[0.15em]">Why ARGUS</span>
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight mt-4 mb-4">
              Built for <span className="text-gradient">enterprise AI</span>
            </h2>
            <p className="text-muted-foreground max-w-xl mx-auto text-[15px]">
              Security that works at the speed of AI inference.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {[
              { icon: Zap, title: 'Sub-50ms Latency', desc: 'Policy evaluation completes in under 50ms, keeping your agent responsive and secure.' },
              { icon: Lock, title: 'Intent-Based Policies', desc: 'Declare what your agent should do. ARGUS ensures it does nothing else.' },
              { icon: BookOpen, title: 'Semantic Explanations', desc: 'Every violation includes a human-readable explanation from Gemini Pro.' },
            ].map((f) => (
              <div key={f.title} className="group bg-white rounded-xl border border-border/50 shadow-[0_1px_3px_rgba(0,0,0,0.02)] p-6 card-hover">
                <div className="w-10 h-10 rounded-lg bg-primary/5 flex items-center justify-center mb-4 text-primary icon-hover">
                  <f.icon className="w-5 h-5" />
                </div>
                <h3 className="font-semibold text-foreground text-sm mb-2">{f.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="py-28 px-6">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-4">
            Ready to see it in action?
          </h2>
          <p className="text-muted-foreground mb-8 text-[15px]">
            Watch ARGUS block a live prompt injection attack in real time.
          </p>
          <a
            href="/demo"
            className="group inline-flex items-center gap-2 px-7 py-3.5 bg-primary text-primary-foreground rounded-xl font-medium shadow-[0_1px_2px_rgba(79,70,229,0.3)] hover:shadow-[0_8px_25px_rgba(79,70,229,0.25)] transition-all duration-300"
          >
            Launch Live Demo
            <PlayCircle className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
          </a>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="border-t border-border/40 py-10 px-6">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <a href="/" className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center">
              <Shield className="w-4 h-4 text-white" strokeWidth={2.5} />
            </div>
            <span className="text-sm font-semibold tracking-tight text-foreground">ARGUS</span>
          </a>
          <p className="text-xs text-muted-foreground">
            &copy; 2026 ARGUS Team. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  )
}
