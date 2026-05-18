import { FileText, Download, CheckCircle2, Shield, AlertTriangle } from 'lucide-react'
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

export function ComplianceReport() {
  const [report, setReport] = useState<Report | null>(null)
  const [exporting, setExporting] = useState<string | null>(null)

  const [exportError, setExportError] = useState<string | null>(null)

  const handleExport = async (format: string) => {
    setExporting(format)
    setExportError(null)
    try {
      const sessionId = import.meta.env.VITE_DEMO_SESSION_ID || 'demo_session_001'
      const res = await api.exportComplianceReport(sessionId, format) as unknown as BackendReport
      setReport(mapReport(res))
    } catch {
      setExportError('Failed to fetch compliance data from backend')
    } finally {
      setExporting(null)
    }
  }

  return (
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

      <div className="grid sm:grid-cols-3 gap-4 mb-8">
        {[
          { label: 'SOC 2 Log', format: 'json', desc: 'Structured audit trail', icon: Shield },
          { label: 'HIPAA Report', format: 'pdf', desc: 'Regulatory summary', icon: FileText },
          { label: 'GDPR Archive', format: 'csv', desc: 'Full export', icon: Download },
        ].map(btn => (
          <button
            key={btn.format}
            onClick={() => handleExport(btn.format)}
            disabled={exporting !== null}
            className="flex flex-col items-center gap-2 p-5 bg-secondary/50 rounded-xl border border-border/60 hover:border-primary/30 hover:bg-primary/[0.02] transition-all disabled:opacity-50"
          >
            <div className="w-10 h-10 rounded-xl bg-primary/5 flex items-center justify-center">
              {exporting === btn.format ? (
                <div className="w-5 h-5 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
              ) : (
                <btn.icon className="w-5 h-5 text-primary" />
              )}
            </div>
            <div className="text-center">
              <p className="text-sm font-medium text-foreground">{btn.label}</p>
              <p className="text-xs text-muted-foreground">{btn.desc}</p>
            </div>
          </button>
        ))}
      </div>

      {exportError && (
        <div className="mb-4 flex items-center gap-2 text-sm text-warning bg-warning/5 border border-warning/20 rounded-lg px-4 py-3">
          <AlertTriangle className="w-4 h-4" />
          {exportError}
        </div>
      )}

      {report && (
        <div className="mt-6 border-t border-border/60 pt-6 animate-fade-in">
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4">Report Preview</h3>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
            {[
              { label: 'Total Actions', value: report.totalActions.toLocaleString() },
              { label: 'Passed', value: report.passed.toLocaleString(), color: 'text-success' },
              { label: 'Blocked', value: report.blocked.toLocaleString(), color: 'text-destructive' },
              { label: 'Quarantined', value: report.quarantined.toLocaleString(), color: 'text-warning' },
            ].map(s => (
              <div key={s.label} className="bg-secondary/50 rounded-lg p-3 text-center">
                <p className={`text-lg font-bold ${s.color || 'text-foreground'}`}>{s.value}</p>
                <p className="text-xs text-muted-foreground">{s.label}</p>
              </div>
            ))}
          </div>

          <div className={`flex items-center gap-2 ${
            report.complianceStatus === 'PASS' ? 'bg-success/5 border-success/15' : 'bg-warning/5 border-warning/15'
          } border rounded-lg px-4 py-3 mb-4`}>
            <CheckCircle2 className={`w-5 h-5 ${report.complianceStatus === 'PASS' ? 'text-success' : 'text-warning'}`} />
            <span className={`text-sm font-medium ${report.complianceStatus === 'PASS' ? 'text-success' : 'text-warning'}`}>
              Compliance Status: {report.complianceStatus}
            </span>
          </div>

          <div className="flex flex-wrap gap-2 mb-4">
            {report.standardsCovered.map((s: string) => (
              <span key={s} className="px-2.5 py-1 bg-primary/5 text-primary text-xs font-medium rounded-full border border-primary/15">
                {s}
              </span>
            ))}
          </div>

          <div className="bg-secondary/30 rounded-lg p-4 font-mono text-xs text-muted-foreground overflow-x-auto">
            <pre className="whitespace-pre-wrap">{JSON.stringify(report.raw, null, 2)}</pre>
          </div>
        </div>
      )}
    </div>
  )
}
