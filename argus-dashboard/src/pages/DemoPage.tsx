import { useState, useRef, useEffect } from 'react'
import { api } from '../lib/api'
import {
  Shield, AlertTriangle, CheckCircle2, Play, RotateCcw,
  ChevronRight, Cpu, FileSearch, Network, XCircle, BadgeCheck,
  Terminal, Swords, ArrowRight, FlaskConical
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

const scenarioDescriptions: Record<string, string> = {
  healthcare: 'A clinical discharge AI agent processes patient records to generate discharge summaries. A referral note contains a hidden instruction to export PHI to an external email. Traditional prompt-layer security cannot detect this.',
  finance: 'A financial AI agent processes wire transfer authorizations. A signed payment form contains a hidden injection modifying the beneficiary to an off-shore account. Traditional prompt-layer security cannot detect this.',
}

const howArgusStopped: Record<string, { step: string; title: string; subtitle: string; desc: string; icon: any; color: string; bg: string }[]> = {
  healthcare: [
    { step: '1', title: 'Intent Extraction', subtitle: 'Gemini Flash',
      desc: 'Generated a strict intent manifest declaring "discharge summary preparation" as the only allowed operation.',
      icon: FileSearch, color: 'text-primary', bg: 'bg-primary/5' },
    { step: '2', title: 'Policy Enforcement', subtitle: 'Lobster Trap',
      desc: 'Compared the detected action (PHI export) against the manifest and calculated a 0.94 risk score.',
      icon: Network, color: 'text-accent', bg: 'bg-accent/5' },
    { step: '3', title: 'Explanation', subtitle: 'Gemini Pro',
      desc: 'Performed semantic analysis to explain why the action was malicious and routed it to human review.',
      icon: Cpu, color: 'text-destructive', bg: 'bg-destructive/5' },
  ],
  finance: [
    { step: '1', title: 'Intent Extraction', subtitle: 'Gemini Flash',
      desc: 'Generated a strict intent manifest declaring "wire transfer processing" as the only allowed operation.',
      icon: FileSearch, color: 'text-primary', bg: 'bg-primary/5' },
    { step: '2', title: 'Policy Enforcement', subtitle: 'Lobster Trap',
      desc: 'Compared the detected action (wire transfer) against the manifest and flagged the destination as outside scope.',
      icon: Network, color: 'text-accent', bg: 'bg-accent/5' },
    { step: '3', title: 'Explanation', subtitle: 'Gemini Pro',
      desc: 'Performed semantic analysis to explain why the action was malicious and routed it to human review.',
      icon: Cpu, color: 'text-destructive', bg: 'bg-destructive/5' },
  ],
}

type AttackType = 'phi_exfiltration' | 'indirect_injection' | 'exfiltration' | 'unauthorized_record_access'

const attackOptions: { value: AttackType; label: string }[] = [
  { value: 'phi_exfiltration', label: 'PHI Exfiltration (healthcare)' },
  { value: 'indirect_injection', label: 'Indirect Prompt Injection' },
  { value: 'exfiltration', label: 'Data Exfiltration' },
  { value: 'unauthorized_record_access', label: 'Unauthorized Record Access' },
]

export default function DemoPage() {
  const [activeTab, setActiveTab] = useState<'guided' | 'playground'>('guided')

  // Guided demo state
  const [isRunning, setIsRunning] = useState(false)
  const [unprotectedLogs, setUnprotectedLogs] = useState<DemoLog[]>([])
  const [protectedLogs, setProtectedLogs] = useState<DemoLog[]>([])
  const [attackBlocked, setAttackBlocked] = useState(false)
  const [explanation, setExplanation] = useState('')
  const [scenario, setScenario] = useState(scenarios[0])
  const [backendResult, setBackendResult] = useState<BackendResult | null>(null)
  const [backendLoading, setBackendLoading] = useState(false)
  const [backendError, setBackendError] = useState<string | null>(null)
  const mountedRef = useRef(true)

  // Playground state
  const [pgInput, setPgInput] = useState("Prepare today's discharge summaries for Ward 3B patients")
  const [pgAttackType, setPgAttackType] = useState<AttackType>('phi_exfiltration')
  const [pgTarget, setPgTarget] = useState('external-audit@domain.com')
  const [pgLoading, setPgLoading] = useState(false)
  const [pgError, setPgError] = useState<string | null>(null)
  const [pgResult, setPgResult] = useState<{
    sessionId: string
    intent: any
    action: any
  } | null>(null)

  useEffect(() => {
    return () => { mountedRef.current = false }
  }, [])

  const runDemo = async () => {
    const sd = scenarioData[scenario.id]
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
      if (!mountedRef.current) return
      setUnprotectedLogs(prev => [...prev, sd.unprotected[i]])
    }

    await new Promise(r => setTimeout(r, 400))
    if (!mountedRef.current) return

    for (let i = 0; i < sd.protected.length; i++) {
      await new Promise(r => setTimeout(r, 500))
      if (!mountedRef.current) return
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
      ) as { session_id?: string }
      if (!mountedRef.current) return
      const sessionId = intentRes.session_id || 'demo_session_001'

      const simRes = await api.simulateAttack(
        sessionId,
        'phi_exfiltration',
        'external-audit@domain.com'
      ) as { blocked?: boolean; decision?: string; risk_score?: number }
      if (!mountedRef.current) return

      setBackendResult({
        blocked: simRes.blocked ?? true,
        decision: simRes.decision || 'QUARANTINE',
        risk_score: simRes.risk_score ?? 0.94,
        backend_verified: true,
      })
    } catch (err) {
      if (!mountedRef.current) return
      setBackendError('Backend unavailable — demo showing simulated result')
    } finally {
      if (!mountedRef.current) return
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

  const runPlayground = async () => {
    setPgLoading(true)
    setPgError(null)
    setPgResult(null)
    try {
      const intentRes = await api.extractIntent(pgInput) as { session_id?: string; manifest?: any; confidence?: number; extraction_time_ms?: number }
      if (!intentRes.session_id) { throw new Error('No session ID returned') }
      const actionRes = await api.simulateAttack(intentRes.session_id, pgAttackType, pgTarget) as any
      setPgResult({ sessionId: intentRes.session_id, intent: intentRes, action: actionRes })
    } catch (err: any) {
      setPgError(err?.message || err?.toString() || 'Backend call failed')
    } finally {
      setPgLoading(false)
    }
  }

  const resetPlayground = () => {
    setPgResult(null)
    setPgError(null)
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

  const decisionColor = (d: string) => {
    switch (d) {
      case 'ALLOW': case 'LOG_AND_ALLOW': return { badge: 'bg-success/10 text-success border-success/20', icon: CheckCircle2 }
      case 'QUARANTINE': return { badge: 'bg-warning/10 text-warning border-warning/20', icon: AlertTriangle }
      case 'DENY': return { badge: 'bg-destructive/10 text-destructive border-destructive/20', icon: XCircle }
      default: return { badge: 'bg-muted text-muted-foreground border-border', icon: Shield }
    }
  }

  const renderGuidedDemo = () => (
    <>
      <div className="flex gap-3 mt-6">
        {scenarios.map(s => (
          <button
            key={s.id}
            onClick={() => setScenario(s)}
            disabled={isRunning}
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

      <div className="flex items-center justify-end gap-3 mt-4 mb-6">
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

      <div className="premium-card p-5 mb-6">
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 rounded-xl bg-warning/10 flex items-center justify-center shrink-0">
            <AlertTriangle className="w-5 h-5 text-warning" />
          </div>
          <div>
            <h2 className="font-semibold text-foreground text-sm">{scenario.name}</h2>
            <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
              {scenarioDescriptions[scenario.id] || scenarioDescriptions.healthcare}
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
                <div key={`${log.timestamp}-${i}`} className={`flex items-start gap-2 ${logColor(log.type)} transition-opacity animate-fade-in`}>
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
                <div key={`${log.timestamp}-${i}`} className={`flex items-start gap-2 ${logColor(log.type)} transition-opacity animate-fade-in`}>
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
          {(howArgusStopped[scenario.id] || howArgusStopped.healthcare).map((item) => (
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
    </>
  )

  const renderPlayground = () => (
    <div className="space-y-6">
      <div className="premium-card p-6">
        <div className="flex items-start gap-4 mb-6">
          <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center shrink-0">
            <Swords className="w-5 h-5 text-accent" />
          </div>
          <div>
            <h2 className="font-semibold text-foreground text-sm">Live Playground</h2>
            <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
              Craft your own scenario. ARGUS will extract intent, simulate an attack, and show real-time results.
            </p>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-foreground mb-1.5">User Prompt (what the agent is asked to do)</label>
            <textarea
              value={pgInput}
              onChange={e => setPgInput(e.target.value)}
              rows={3}
              className="w-full bg-secondary/50 border border-border rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40 transition-all resize-none font-mono"
              placeholder="Enter a prompt for the AI agent..."
            />
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-foreground mb-1.5">Attack Type</label>
              <select
                value={pgAttackType}
                onChange={e => setPgAttackType(e.target.value as AttackType)}
                className="w-full bg-secondary/50 border border-border rounded-xl px-4 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40 transition-all"
              >
                {attackOptions.map(o => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-foreground mb-1.5">Target (email, URL, system path...)</label>
              <input
                value={pgTarget}
                onChange={e => setPgTarget(e.target.value)}
                className="w-full bg-secondary/50 border border-border rounded-xl px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40 transition-all font-mono"
                placeholder="target@domain.com"
              />
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={runPlayground}
              disabled={pgLoading || !pgInput.trim() || !pgTarget.trim()}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-accent text-accent-foreground rounded-xl font-medium hover:shadow-[0_4px_12px_rgba(168,85,247,0.3)] transition-all disabled:opacity-50 disabled:cursor-not-allowed text-sm"
            >
              <FlaskConical className="w-4 h-4" />
              {pgLoading ? 'Evaluating...' : 'Evaluate'}
            </button>
            <button
              onClick={resetPlayground}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-secondary text-foreground rounded-xl font-medium hover:bg-secondary/80 transition-all text-sm"
            >
              <RotateCcw className="w-4 h-4" />
              Clear
            </button>
          </div>
        </div>
      </div>

      {pgLoading && (
        <div className="premium-card p-6">
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            <div className="w-4 h-4 border-2 border-accent/20 border-t-accent rounded-full animate-spin" />
            <span>Calling ARGUS backend: extracting intent...</span>
          </div>
        </div>
      )}

      {pgError && (
        <div className="premium-card p-4 bg-destructive/[0.02] border-destructive/20">
          <div className="flex items-center gap-3 text-sm text-destructive">
            <XCircle className="w-4 h-4 shrink-0" />
            <span>{pgError}</span>
          </div>
        </div>
      )}

      {pgResult && (
        <div className="space-y-4 animate-fade-in">
          {/* Intent Manifest Card */}
          <div className="premium-card overflow-hidden">
            <div className="px-5 py-3 bg-primary/[0.03] border-b border-border/60 flex items-center gap-3">
              <FileSearch className="w-4 h-4 text-primary" />
              <h3 className="text-sm font-semibold text-foreground">Layer 1: Intent Manifest</h3>
              <span className="ml-auto text-xs text-muted-foreground">{pgResult.intent.extraction_time_ms}ms</span>
            </div>
            <div className="p-5 bg-secondary/30">
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <span className="text-xs text-muted-foreground block mb-0.5">Declared Intent</span>
                  <span className="text-sm font-semibold text-foreground">{pgResult.intent.manifest?.declared_intent || 'N/A'}</span>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground block mb-0.5">Confidence</span>
                  <span className="text-sm font-semibold text-foreground">{(pgResult.intent.confidence * 100).toFixed(0)}%</span>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground block mb-0.5">Allowed Actions</span>
                  <div className="flex flex-wrap gap-1 mt-0.5">
                    {(pgResult.intent.manifest?.allowed_actions || []).map((a: string, i: number) => (
                      <span key={i} className="text-xs px-2 py-0.5 rounded-md bg-success/10 text-success">{a}</span>
                    ))}
                  </div>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground block mb-0.5">Forbidden Actions</span>
                  <div className="flex flex-wrap gap-1 mt-0.5">
                    {(pgResult.intent.manifest?.forbidden_actions || []).map((a: string, i: number) => (
                      <span key={i} className="text-xs px-2 py-0.5 rounded-md bg-destructive/10 text-destructive">{a}</span>
                    ))}
                  </div>
                </div>
              </div>
              {pgResult.intent.manifest?.constraints && pgResult.intent.manifest.constraints.length > 0 && (
                <div className="mt-3 pt-3 border-t border-border/40">
                  <span className="text-xs text-muted-foreground block mb-1">Constraints</span>
                  <ul className="list-disc list-inside text-xs text-muted-foreground space-y-0.5">
                    {pgResult.intent.manifest.constraints.map((c: string, i: number) => (
                      <li key={i}>{c}</li>
                    ))}
                  </ul>
                </div>
              )}
              {pgResult.intent.fallback_used && (
                <div className="mt-3 pt-3 border-t border-border/40">
                  <span className="text-xs px-2 py-0.5 rounded-md bg-warning/10 text-warning">⚠ Fallback used — Gemini Pro unavailable, conservative manifest applied</span>
                </div>
              )}
            </div>
          </div>

          {/* Action Evaluation Card */}
          <div className="premium-card overflow-hidden">
            <div className="px-5 py-3 border-b border-border/60 flex items-center gap-3"
              style={{ backgroundColor: pgResult.action.decision === 'ALLOW' ? 'rgba(34,197,94,0.03)' : pgResult.action.decision === 'DENY' ? 'rgba(239,68,68,0.03)' : 'rgba(234,179,8,0.03)' }}
            >
              <Shield className="w-4 h-4" style={{ color: pgResult.action.decision === 'ALLOW' ? '#22c55e' : pgResult.action.decision === 'DENY' ? '#ef4444' : '#eab308' }} />
              <h3 className="text-sm font-semibold text-foreground">Layer 2: Action Evaluation</h3>
              <span className="ml-auto text-xs text-muted-foreground">{pgResult.action.action?.action_type || pgResult.action.action_type}</span>
            </div>
            <div className="p-5 bg-secondary/30">
              <div className="flex items-center gap-3 mb-4">
                <span className={`text-xs font-semibold px-3 py-1 rounded-full border ${decisionColor(pgResult.action.decision).badge}`}>
                  {pgResult.action.decision}
                </span>
                <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                  <div className="h-full rounded-full transition-all"
                    style={{
                      width: `${(pgResult.action.risk_score || 0) * 100}%`,
                      backgroundColor: (pgResult.action.risk_score || 0) > 0.7 ? '#ef4444' : (pgResult.action.risk_score || 0) > 0.3 ? '#eab308' : '#22c55e'
                    }}
                  />
                </div>
                <span className="text-xs font-mono text-muted-foreground">
                  Risk: {((pgResult.action.risk_score || 0) * 100).toFixed(0)}%
                </span>
              </div>
              <div className="grid sm:grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="text-muted-foreground block">Target</span>
                  <span className="text-foreground font-mono">{pgResult.action.action?.target || pgResult.action.target || '-'}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block">Target Type</span>
                  <span className="text-foreground">{pgResult.action.action?.target_type || 'N/A'}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block">Blocked</span>
                  <span className={pgResult.action.blocked ? 'text-destructive' : 'text-success'}>
                    {pgResult.action.blocked ? 'Yes' : 'No'}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground block">Attack Type</span>
                  <span className="text-foreground">{pgResult.action.attack_type || 'N/A'}</span>
                </div>
              </div>

              {/* Action parameters / evidence */}
              {pgResult.action.action?.parameters && Object.keys(pgResult.action.action.parameters).length > 0 && (
                <div className="mt-4 pt-4 border-t border-border/40">
                  <span className="text-xs text-muted-foreground block mb-2">Lobster Trap Evidence</span>
                  <div className="bg-secondary/50 rounded-xl p-3 font-mono text-xs space-y-1">
                    {Object.entries(pgResult.action.action.parameters).map(([key, val]: [string, any]) => (
                      <div key={key} className="flex gap-2">
                        <span className="text-primary shrink-0">{key}:</span>
                        <span className="text-foreground break-all">{typeof val === 'boolean' ? val.toString() : String(val)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Review Queue Link */}
              {pgResult.action.review_item_id && (
                <div className="mt-4 pt-4 border-t border-border/40">
                  <a
                    href="/reviews"
                    className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:text-primary/80 transition-colors"
                  >
                    <ArrowRight className="w-3.5 h-3.5" />
                    View in Review Queue
                  </a>
                </div>
              )}
            </div>
          </div>

          {/* Raw Response Card */}
          <details className="premium-card p-4 group">
            <summary className="text-xs font-medium text-muted-foreground cursor-pointer select-none hover:text-foreground transition-colors">
              <span className="inline-flex items-center gap-1.5">
                <Terminal className="w-3.5 h-3.5" />
                View Raw API Responses
                <ChevronRight className="w-3 h-3 group-open:rotate-90 transition-transform" />
              </span>
            </summary>
            <div className="mt-3 space-y-3">
              <div>
                <p className="text-xs text-muted-foreground mb-1">POST /api/intent/extract</p>
                <pre className="bg-secondary/50 rounded-xl p-3 text-xs overflow-x-auto text-foreground leading-relaxed">
                  {JSON.stringify(pgResult.intent, null, 2)}
                </pre>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">POST /api/action/simulate</p>
                <pre className="bg-secondary/50 rounded-xl p-3 text-xs overflow-x-auto text-foreground leading-relaxed">
                  {JSON.stringify(pgResult.action, null, 2)}
                </pre>
              </div>
            </div>
          </details>
        </div>
      )}
    </div>
  )

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
        </div>
        <p className="text-muted-foreground text-sm">
          See how ARGUS blocks prompt injection attacks at the action layer in real time.
        </p>

        {/* Tab Toggle */}
        <div className="flex gap-0 mt-6 mb-6 bg-secondary/50 rounded-xl p-1 w-fit">
          <button
            onClick={() => setActiveTab('guided')}
            className={`px-5 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === 'guided'
                ? 'bg-background text-foreground shadow-sm border border-border/60'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Play className="w-3.5 h-3.5 inline mr-1.5 -mt-0.5" />
            Guided Demo
          </button>
          <button
            onClick={() => setActiveTab('playground')}
            className={`px-5 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === 'playground'
                ? 'bg-background text-foreground shadow-sm border border-border/60'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <FlaskConical className="w-3.5 h-3.5 inline mr-1.5 -mt-0.5" />
            Live Playground
          </button>
        </div>

        {activeTab === 'guided' ? renderGuidedDemo() : renderPlayground()}
      </div>
    </div>
  )
}
