import { FileText, Download, CheckCircle2, Shield, AlertTriangle, XCircle, Clock, Database, Activity, ChevronRight } from 'lucide-react'
import { api } from '../lib/api'
import { useState } from 'react'

interface BackendReport {
  session_id: string
  timestamp: string
  actions_evaluated: number
  actions_blocked: number
  actions_quarantined: number
  [key: string]: unknown
}

interface Report {
  sessionId: string
  generatedAt: string
  totalActions: number
  blocked: number
  quarantined: number
  passed: number
  complianceStatus: string
  standardsCovered: string[]
  raw: BackendReport
}

function mapReport(b: BackendReport): Report {
  return {
    sessionId: b.session_id,
    generatedAt: b.timestamp,
    totalActions: b.actions_evaluated,
    blocked: b.actions_blocked,
    quarantined: b.actions_quarantined,
    passed: b.actions_evaluated - b.actions_blocked - b.actions_quarantined,
    complianceStatus: b.actions_blocked + b.actions_quarantined > 0 ? 'REVIEW REQUIRED' : 'PASS',
    standardsCovered: ['SOC 2 Type II', 'HIPAA', 'GDPR'],
    raw: b,
  }
}

const formats = [
  { value: 'json', label: 'Structured Report', desc: 'Full JSON audit trail', icon: Shield, color: 'text-primary', bg: 'bg-primary/5', border: 'hover:border-primary/30' },
  { value: 'pdf', label: 'Regulatory Summary', desc: 'Printable HTML report', icon: FileText, color: 'text-accent', bg: 'bg-accent/5', border: 'hover:border-accent/30' },
  { value: 'csv', label: 'Data Export', desc: 'Spreadsheet-compatible CSV', icon: Download, color: 'text-success', bg: 'bg-success/5', border: 'hover:border-success/30' },
]

export function ComplianceReport() {
  const [report, setReport] = useState<Report | null>(null)
  const [exporting, setExporting] = useState<string | null>(null)
  const [exportError, setExportError] = useState<string | null>(null)

  const handleExport = async (format: string) => {
    setExporting(format)
    setExportError(null)
    const sessionId = import.meta.env.VITE_DEMO_SESSION_ID || 'demo_session_001'

    if (format === 'json') {
      try {
        const res = await api.exportComplianceReport(sessionId, format) as unknown as BackendReport
        setReport(mapReport(res))
      } catch {
        setExportError('Failed to fetch compliance data from backend')
      } finally {
        setExporting(null)
      }
      return
    }

    const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000'
    const url = `${baseUrl}/api/compliance/export/${sessionId}?format=${format}`

    try {
      if (format === 'pdf') {
        window.open(url, '_blank')
      } else {
        const res = await fetch(url)
        if (!res.ok) throw new Error()
        const blob = await res.blob()
        const blobUrl = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = blobUrl
        a.download = `argus-compliance-${sessionId}.csv`
        a.click()
        URL.revokeObjectURL(blobUrl)
      }
    } catch {
      setExportError('Failed to fetch compliance data from backend')
    } finally {
      setExporting(null)
    }
  }

  return (
    <div className="space-y-6">
      <div className="premium-card p-6 md:p-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-bold text-foreground flex items-center gap-2.5">
              <FileText className="h-5 w-5 text-primary" />
              Compliance Export
            </h2>
            <p className="text-sm text-muted-foreground mt-1">Generate automated audit trails for regulatory compliance.</p>
          </div>
        </div>

        <div className="grid sm:grid-cols-3 gap-4 mb-6">
          {formats.map(btn => (
            <button
              key={btn.value}
              onClick={() => handleExport(btn.value)}
              disabled={exporting !== null}
              className={`group flex flex-col items-center gap-3 p-6 bg-secondary/30 rounded-xl border border-border/60 ${btn.border} transition-all duration-200 disabled:opacity-50 hover:shadow-[0_4px_12px_rgba(0,0,0,0.03)]`}
            >
              <div className={`w-12 h-12 rounded-xl ${btn.bg} flex items-center justify-center group-hover:scale-105 transition-transform`}>
                {exporting === btn.value ? (
                  <div className="w-5 h-5 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
                ) : (
                  <btn.icon className={`w-6 h-6 ${btn.color}`} />
                )}
              </div>
              <div className="text-center">
                <p className="text-sm font-semibold text-foreground">{btn.label}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{btn.desc}</p>
              </div>
            </button>
          ))}
        </div>

        {exportError && (
          <div className="flex items-center gap-2.5 text-sm text-warning bg-warning/5 border border-warning/20 rounded-xl px-4 py-3">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            {exportError}
          </div>
        )}
      </div>

      {report && (
        <div className="animate-fade-in space-y-6">
          {/* Metrics Grid */}
          <div className="premium-card p-6 md:p-8">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-5">Report Preview</h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
              {[
                { label: 'Total Actions', value: report.totalActions.toLocaleString(), icon: Activity, color: 'text-foreground', bg: 'bg-secondary/50' },
                { label: 'Passed', value: report.passed.toLocaleString(), icon: CheckCircle2, color: 'text-success', bg: 'bg-success/5' },
                { label: 'Blocked', value: report.blocked.toLocaleString(), icon: XCircle, color: 'text-destructive', bg: 'bg-destructive/5' },
                { label: 'Quarantined', value: report.quarantined.toLocaleString(), icon: AlertTriangle, color: 'text-warning', bg: 'bg-warning/5' },
              ].map(s => {
                const Icon = s.icon
                return (
                  <div key={s.label} className={`${s.bg} rounded-xl border border-border/50 p-4 card-hover`}>
                    <div className="flex items-center justify-between mb-2">
                      <Icon className={`w-4 h-4 ${s.color}`} />
                      <span className="text-2xl font-bold text-foreground tracking-tight">{s.value}</span>
                    </div>
                    <p className="text-xs text-muted-foreground">{s.label}</p>
                  </div>
                )
              })}
            </div>

            {/* Compliance Status */}
            <div className={`flex items-center gap-3 ${
              report.complianceStatus === 'PASS' ? 'bg-success/5 border-success/15' : 'bg-warning/5 border-warning/15'
            } border rounded-xl px-5 py-4`}>
              <CheckCircle2 className={`w-5 h-5 shrink-0 ${report.complianceStatus === 'PASS' ? 'text-success' : 'text-warning'}`} />
              <div className="flex-1">
                <p className={`text-sm font-semibold ${report.complianceStatus === 'PASS' ? 'text-success' : 'text-warning'}`}>
                  Compliance Status: {report.complianceStatus}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {report.complianceStatus === 'PASS'
                    ? 'All actions within acceptable risk thresholds'
                    : 'Some actions require manual review'}
                </p>
              </div>
            </div>

            {/* Standards Badges */}
            <div className="flex flex-wrap gap-2 mt-5">
              {report.standardsCovered.map((s: string) => (
                <span key={s} className="inline-flex items-center gap-1.5 px-3 py-1 bg-primary/[0.04] text-primary text-xs font-medium rounded-full border border-primary/10">
                  <Shield className="w-3 h-3" />
                  {s}
                </span>
              ))}
            </div>

            {/* Session Info */}
            <div className="mt-5 pt-5 border-t border-border/40 text-xs text-muted-foreground space-y-1">
              <div className="flex items-center gap-2">
                <Database className="w-3.5 h-3.5" />
                <span>Session: <span className="font-mono text-foreground">{report.sessionId}</span></span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="w-3.5 h-3.5" />
                <span>Generated: <span className="font-mono text-foreground">{new Date(report.generatedAt).toLocaleString()}</span></span>
              </div>
            </div>
          </div>

          {/* Raw Response */}
          <details className="premium-card p-5 group">
            <summary className="text-xs font-medium text-muted-foreground cursor-pointer select-none hover:text-foreground transition-colors flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5" />
              View Raw API Response
              <ChevronRight className="w-3 h-3 ml-auto group-open:rotate-90 transition-transform" />
            </summary>
            <div className="mt-4 bg-secondary/30 rounded-xl p-4 font-mono text-xs text-foreground overflow-x-auto">
              <pre className="whitespace-pre-wrap leading-relaxed">{JSON.stringify(report.raw, null, 2)}</pre>
            </div>
          </details>
        </div>
      )}
    </div>
  )
}
