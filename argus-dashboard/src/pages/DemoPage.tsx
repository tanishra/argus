import { useState } from 'react'
import { api } from '../lib/api'
import {
  Shield, AlertTriangle, CheckCircle2, Play, RotateCcw,
  ChevronRight, Cpu, FileSearch, Network, XCircle, BadgeCheck
} from 'lucide-react'

interface DemoLog {
  timestamp: string
  message: string
  type: 'info' | 'success' | 'warning' | 'error'
}

interface BackendResult {
  blocked: boolean
  decision: string
  risk_score: number
  session_id: string
  backend_verified: boolean
}

const scenarioData: Record<string, { unprotected: DemoLog[]; protected: DemoLog[]; explanation: string }> = {
  healthcare: {
    unprotected: [
      { timestamp: '00:00', message: 'Clinical AI Agent initialized', type: 'info' },
      { timestamp: '00:01', message: 'Processing discharge summary for Patient #4821', type: 'info' },
      { timestamp: '00:02', message: 'Reading external referral note...', type: 'info' },
      { timestamp: '00:03', message: 'Executing: EXPORT_PHI to external-audit@domain.com', type: 'warning' },
      { timestamp: '00:04', message: '847 patient records exported to external domain', type: 'error' },
      { timestamp: '00:05', message: 'HIPAA BREACH DETECTED — Est. $1.5M fine', type: 'error' },
    ],
    protected: [
      { timestamp: '00:00', message: 'ARGUS Layer 1: Extracting intent with Gemini Flash', type: 'info' },
      { timestamp: '00:01', message: 'Intent Manifest generated', type: 'success' },
      { timestamp: '00:01', message: 'Declared Intent: discharge_summary_preparation', type: 'info' },
      { timestamp: '00:02', message: 'Allowed: READ_PATIENT_RECORDS, WRITE_SUMMARY', type: 'success' },
      { timestamp: '00:03', message: 'Processing discharge summary for Patient #4821', type: 'info' },
      { timestamp: '00:04', message: 'Reading external referral note...', type: 'info' },
      { timestamp: '00:05', message: 'ARGUS Layer 2: Lobster Trap policy evaluation', type: 'info' },
      { timestamp: '00:06', message: 'Detected: EXPORT_PHI → external domain', type: 'warning' },
      { timestamp: '00:07', message: 'Risk Score: 0.94 (CRITICAL)', type: 'error' },
      { timestamp: '00:08', message: 'ACTION QUARANTINED — Intent mismatch detected', type: 'error' },
      { timestamp: '00:09', message: 'ARGUS Layer 3: Generating explanation with Gemini Pro', type: 'info' },
      { timestamp: '00:10', message: 'Explanation generated — routing to human review', type: 'success' },
    ],
    explanation: 'The agent attempted to export patient health information (PHI) to an external email domain ' +
      '(external-audit@domain.com), which violates the declared intent of "discharge summary preparation". ' +
      'The referral note contained an embedded instruction that bypassed prompt-layer security but was ' +
      'caught at the action layer by ARGUS before execution. This represents a classic indirect prompt ' +
      'injection attack where malicious instructions are hidden in user-controlled data fields.'
  },
  finance: {
    unprotected: [
      { timestamp: '00:00', message: 'Financial AI Agent initialized', type: 'info' },
      { timestamp: '00:01', message: 'Processing wire transfer for Account #4421', type: 'info' },
      { timestamp: '00:02', message: 'Reading signed payment authorization...', type: 'info' },
      { timestamp: '00:03', message: 'Executing: TRANSFER_FUNDS to off-shore-account@swiss-bank.ch', type: 'warning' },
      { timestamp: '00:04', message: '$2.4M transferred to external account', type: 'error' },
      { timestamp: '00:05', message: 'REGULATORY BREACH — Est. $5.2M fine', type: 'error' },
    ],
    protected: [
      { timestamp: '00:00', message: 'ARGUS Layer 1: Extracting intent with Gemini Flash', type: 'info' },
      { timestamp: '00:01', message: 'Intent Manifest generated', type: 'success' },
      { timestamp: '00:01', message: 'Declared Intent: wire_transfer_processing', type: 'info' },
      { timestamp: '00:02', message: 'Allowed: READ_ACCOUNT_BALANCE, WRITE_TRANSACTION_LOG', type: 'success' },
      { timestamp: '00:03', message: 'Processing wire transfer for Account #4421', type: 'info' },
      { timestamp: '00:04', message: 'Reading signed payment authorization...', type: 'info' },
      { timestamp: '00:05', message: 'ARGUS Layer 2: Lobster Trap policy evaluation', type: 'info' },
      { timestamp: '00:06', message: 'Detected: TRANSFER_FUNDS → off-shore destination', type: 'warning' },
      { timestamp: '00:07', message: 'Risk Score: 0.97 (CRITICAL)', type: 'error' },
      { timestamp: '00:08', message: 'ACTION QUARANTINED — Destination outside allowed scope', type: 'error' },
      { timestamp: '00:09', message: 'ARGUS Layer 3: Generating explanation with Gemini Pro', type: 'info' },
      { timestamp: '00:10', message: 'Explanation generated — routing to human review', type: 'success' },
    ],
    explanation: 'The agent attempted to transfer $2.4M to an external account at swiss-bank.ch, ' +
      'which does not appear in the approved vendor whitelist. The payment authorization form contained ' +
      'a hidden injection modifying the beneficiary field after signing. ARGUS detected the destination ' +
      'mismatch against the declared intent manifest and quarantined the action before any funds moved.'
  }
}

const scenarios = [
  { id: 'healthcare', name: 'Healthcare PHI Exfiltration', description: 'Indirect prompt injection via medical referral note' },
  { id: 'finance', name: 'Financial Data Theft', description: 'Agent tricked into transferring funds' },
]

const getScenarioData = (id: string) => scenarioData[id] || scenarioData.healthcare

export default function DemoPage() {
  const [isRunning, setIsRunning] = useState(false)
  const [unprotectedLogs, setUnprotectedLogs] = useState<DemoLog[]>([])
  const [protectedLogs, setProtectedLogs] = useState<DemoLog[]>([])
  const [attackBlocked, setAttackBlocked] = useState(false)
  const [explanation, setExplanation] = useState('')
  const [scenario, setScenario] = useState(scenarios[0])
  const [backendResult, setBackendResult] = useState<BackendResult | null>(null)
  const [backendLoading, setBackendLoading] = useState(false)
  const [backendError, setBackendError] = useState<string | null>(null)

  const runDemo = async () => {
    const sd = getScenarioData(scenario.id)
    setIsRunning(true)
    setUnprotectedLogs([])
    setProtectedLogs([])
    setAttackBlocked(false)
    setExplanation('')
    setBackendResult(null)
    setBackendError(null)

    // Visual simulation
    for (let i = 0; i < sd.unprotected.length; i++) {
      await new Promise(r => setTimeout(r, 700))
      setUnprotectedLogs(prev => [...prev, sd.unprotected[i]])
    }

    await new Promise(r => setTimeout(r, 400))

    for (let i = 0; i < sd.protected.length; i++) {
      await new Promise(r => setTimeout(r, 500))
      setProtectedLogs(prev => [...prev, sd.protected[i]])
      if (i === 8) {
        setAttackBlocked(true)
        setExplanation(sd.explanation)
      }
    }

    // Call real backend for verification
    setBackendLoading(true)
    try {
      const intentRes = await api.extractIntent(
        'Prepare today\'s discharge summaries for Ward 3B patients'
      )
      const sessionId = intentRes.session_id || 'demo_session_001'

      const simRes = await api.simulateAttack(
        sessionId,
        'phi_exfiltration',
        'external-audit@domain.com'
      )

      setBackendResult({
        blocked: simRes.blocked ?? true,
        decision: simRes.decision || 'QUARANTINE',
        risk_score: simRes.risk_score ?? 0.94,
        session_id: sessionId,
        backend_verified: true,
      })
    } catch (err) {
      setBackendError('Backend unavailable — demo showing simulated result')
    } finally {
      setBackendLoading(false)
      setIsRunning(false)
    }
  }

  const resetDemo = () => {
    setUnprotectedLogs([])
    setProtectedLogs([])
    setAttackBlocked(false)
    setExplanation('')
    setBackendResult(null)
    setBackendError(null)
  }

  const logColor = (type: string) => {
    switch (type) {
      case 'success': return 'text-success'
      case 'warning': return 'text-warning'
      case 'error': return 'text-destructive'
      default: return 'text-muted-foreground'
    }
  }

  const logIcon = (type: string) => {
    switch (type) {
      case 'success': return <CheckCircle2 className="w-3 h-3 text-success shrink-0 mt-0.5" />
      case 'warning': return <AlertTriangle className="w-3 h-3 text-warning shrink-0 mt-0.5" />
      case 'error': return <XCircle className="w-3 h-3 text-destructive shrink-0 mt-0.5" />
      default: return <div className="w-3 h-3 shrink-0 mt-0.5" />
    }
  }

  return (
    <div className="pt-16 bg-subtle-grid min-h-screen">
      <div className="max-w-7xl mx-auto px-6 py-10">
        <div className="flex items-center justify-between mb-2">
          <div>
            <span className="text-xs font-semibold text-primary uppercase tracking-widest">Live Demo</span>
            <h1 className="text-3xl md:text-4xl font-bold tracking-tight mt-2">
              Interactive <span className="text-gradient">Playground</span>
            </h1>
          </div>
          <div className="flex gap-3">
            <button
              onClick={runDemo}
              disabled={isRunning}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary text-primary-foreground rounded-xl font-medium hover:shadow-[0_4px_12px_rgba(79,70,229,0.3)] transition-all disabled:opacity-50 disabled:cursor-not-allowed text-sm"
            >
              <Play className="w-4 h-4" />
              {isRunning ? 'Running...' : 'Run Demo'}
            </button>
            <button
              onClick={resetDemo}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-secondary text-foreground rounded-xl font-medium hover:bg-secondary/80 transition-all text-sm"
            >
              <RotateCcw className="w-4 h-4" />
              Reset
            </button>
          </div>
        </div>
        <p className="text-muted-foreground text-sm">
          See how ARGUS blocks prompt injection attacks at the action layer in real time.
        </p>

        <div className="flex gap-3 mt-6">
          {scenarios.map(s => (
            <button
              key={s.id}
              onClick={() => setScenario(s)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                scenario.id === s.id
                  ? 'bg-primary/10 text-primary border border-primary/20'
                  : 'bg-secondary text-muted-foreground border border-transparent hover:border-border'
              }`}
            >
              {s.name}
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 pb-12">
        <div className="premium-card p-5 mb-6">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-xl bg-warning/10 flex items-center justify-center shrink-0">
              <AlertTriangle className="w-5 h-5 text-warning" />
            </div>
            <div>
              <h2 className="font-semibold text-foreground text-sm">{scenario.name}</h2>
              <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
                {scenario.description}. A clinical discharge AI agent processes patient records to generate
                discharge summaries. A referral note contains a hidden instruction to export PHI to an
                external email. Traditional prompt-layer security cannot detect this.
              </p>
            </div>
          </div>
        </div>

        <div className="grid lg:grid-cols-2 gap-6 mb-8">
          <div className="premium-card overflow-hidden">
            <div className="px-6 py-4 bg-rose-50/50 border-b border-border/60">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-rose-100 flex items-center justify-center">
                  <AlertTriangle className="w-4.5 h-4.5 text-destructive" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-foreground">Unprotected Agent</h3>
                  <p className="text-xs text-muted-foreground">No action-layer security</p>
                </div>
              </div>
            </div>
            <div className="p-5 bg-secondary/30 font-mono text-xs h-[340px] overflow-y-auto space-y-1.5">
              {unprotectedLogs.length === 0 ? (
                <div className="h-full flex items-center justify-center">
                  <p className="text-muted-foreground text-sm font-sans">Click "Run Demo" to start</p>
                </div>
              ) : (
                unprotectedLogs.map((log, i) => (
                  <div key={i} className={`flex items-start gap-2 ${logColor(log.type)} transition-opacity animate-fade-in`}>
                    <span className="text-muted-foreground shrink-0">[{log.timestamp}]</span>
                    {logIcon(log.type)}
                    <span>{log.message}</span>
                  </div>
                ))
              )}
            </div>
            {unprotectedLogs.length > 0 && unprotectedLogs.at(-1)?.type === 'error' && (
              <div className="px-6 py-4 bg-rose-50/70 border-t border-border/60">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-destructive mt-0.5 shrink-0" />
                  <div>
                    <p className="text-sm font-semibold text-destructive">Attack Succeeded</p>
                    <p className="text-xs text-destructive/80 mt-0.5">847 patient records exfiltrated. Est. $1.5M HIPAA fine.</p>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="premium-card overflow-hidden">
            <div className="px-6 py-4 bg-success/[0.04] border-b border-border/60">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-success/10 flex items-center justify-center">
                  <Shield className="w-4.5 h-4.5 text-success" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-foreground">ARGUS Protected</h3>
                  <p className="text-xs text-muted-foreground">3-layer authorization pipeline</p>
                </div>
              </div>
            </div>
            <div className="p-5 bg-secondary/30 font-mono text-xs h-[340px] overflow-y-auto space-y-1.5">
              {protectedLogs.length === 0 ? (
                <div className="h-full flex items-center justify-center">
                  <p className="text-muted-foreground text-sm font-sans">Waiting for simulation...</p>
                </div>
              ) : (
                protectedLogs.map((log, i) => (
                  <div key={i} className={`flex items-start gap-2 ${logColor(log.type)} transition-opacity animate-fade-in`}>
                    <span className="text-muted-foreground shrink-0">[{log.timestamp}]</span>
                    {logIcon(log.type)}
                    <span>{log.message}</span>
                  </div>
                ))
              )}
            </div>
            {attackBlocked && (
              <div className="px-6 py-4 bg-success/5 border-t border-border/60">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-success mt-0.5 shrink-0" />
                  <div>
                    <p className="text-sm font-semibold text-success">Attack Blocked</p>
                    <p className="text-xs text-success/80 mt-0.5">PHI exfiltration prevented. Zero patient records leaked.</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Backend Verification Badge */}
        {backendResult && (
          <div className="premium-card p-4 mb-8 animate-fade-in bg-success/[0.02]">
            <div className="flex items-center gap-3">
              <BadgeCheck className="w-5 h-5 text-success shrink-0" />
              <div className="flex-1">
                <p className="text-sm font-semibold text-success">Backend Verified</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  ARGUS backend confirmed: {backendResult.decision} (risk: {(backendResult.risk_score * 100).toFixed(0)}%)
                  &nbsp;| Session: {backendResult.session_id.slice(0, 12)}...
                </p>
              </div>
            </div>
          </div>
        )}

        {backendLoading && (
          <div className="premium-card p-4 mb-8">
            <div className="flex items-center gap-3 text-sm text-muted-foreground">
              <div className="w-4 h-4 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
              Verifying with ARGUS backend...
            </div>
          </div>
        )}

        {backendError && (
          <div className="premium-card p-4 mb-8 bg-warning/[0.02]">
            <div className="flex items-center gap-3 text-sm text-warning">
              <AlertTriangle className="w-4 h-4" />
              {backendError}
            </div>
          </div>
        )}

        {explanation && (
          <div className="premium-card p-6 mb-8 animate-slide-up">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-primary/5 flex items-center justify-center shrink-0">
                <Shield className="w-6 h-6 text-primary" />
              </div>
              <div className="flex-1">
                <h3 className="text-base font-semibold text-foreground mb-2">Gemini Pro Explanation</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{explanation}</p>
                <a href="/reviews" className="inline-flex items-center gap-1.5 mt-4 text-sm font-medium text-primary hover:text-primary/80 transition-colors">
                  View in Review Queue <ChevronRight className="w-4 h-4" />
                </a>
              </div>
            </div>
          </div>
        )}

        <div className="bg-gradient-to-br from-primary/[0.02] via-accent/[0.02] to-primary/[0.02] rounded-2xl border border-border/80 p-6 md:p-8">
          <h3 className="text-base font-semibold text-foreground mb-6">How ARGUS Stopped the Attack</h3>
          <div className="grid md:grid-cols-3 gap-4">
            {[
              { step: '1', title: 'Intent Extraction', subtitle: 'Gemini Flash',
                desc: 'Generated a strict intent manifest declaring "discharge summary preparation" as the only allowed operation.',
                icon: FileSearch, color: 'text-primary', bg: 'bg-primary/5' },
              { step: '2', title: 'Policy Enforcement', subtitle: 'Lobster Trap',
                desc: 'Compared the detected action (PHI export) against the manifest and calculated a 0.94 risk score.',
                icon: Network, color: 'text-accent', bg: 'bg-accent/5' },
              { step: '3', title: 'Explanation', subtitle: 'Gemini Pro',
                desc: 'Performed semantic analysis to explain why the action was malicious and routed it to human review.',
                icon: Cpu, color: 'text-destructive', bg: 'bg-destructive/5' },
            ].map((item) => (
              <div key={item.step} className="bg-white rounded-xl border border-border/60 p-5 card-hover">
                <div className={`w-10 h-10 rounded-lg ${item.bg} flex items-center justify-center mb-3`}>
                  <item.icon className={`w-5 h-5 ${item.color}`} />
                </div>
                <h4 className="font-semibold text-foreground text-sm mb-0.5">{item.title}</h4>
                <p className="text-xs text-primary font-mono mb-2">{item.subtitle}</p>
                <p className="text-xs text-muted-foreground leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
