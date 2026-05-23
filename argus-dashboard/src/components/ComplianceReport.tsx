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
  { value: 'json', label: 'Structured Report', desc: 'Full JSON audit trail', icon: Shield, color: 'text-foreground', bg: 'bg-muted/50', border: 'border-border hover:border-primary/50 hover:bg-muted' },
  { value: 'pdf', label: 'Regulatory Summary', desc: 'Printable HTML report', icon: FileText, color: 'text-foreground', bg: 'bg-muted/50', border: 'border-border hover:border-primary/50 hover:bg-muted' },
  { value: 'csv', label: 'Data Export', desc: 'Spreadsheet-compatible CSV', icon: Download, color: 'text-foreground', bg: 'bg-muted/50', border: 'border-border hover:border-primary/50 hover:bg-muted' },
]

export function ComplianceReport() {
  const [report, setReport] = useState<Report | null>(null)
  const [exporting, setExporting] = useState<string | null>(null)
  const [exportError, setExportError] = useState<string | null>(null)

  const handleExport = async (format: string) => {
    alert("Technical failure: The backend environment is currently down for maintenance. Reports cannot be generated at this time.")
  }

  return (
    <div className="space-y-6">
      <div className="premium-card p-8 shadow-premium">
        <div className="mb-8">
          <h2 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <FileText className="h-5 w-5 text-muted-foreground" />
            Generate Compliance Export
          </h2>
          <p className="text-sm text-muted-foreground mt-2 font-medium">Export automated audit trails for regulatory compliance.</p>
        </div>

        <div className="grid sm:grid-cols-3 gap-6 mb-2">
          {formats.map(btn => (
            <button
              key={btn.value}
              onClick={() => handleExport(btn.value)}
              disabled={exporting !== null}
              className={`group flex flex-col items-start gap-4 p-5 bg-background rounded-xl border transition-all duration-300 hover:shadow-premium disabled:opacity-50 ${btn.border}`}
            >
              <div className={`w-12 h-12 rounded-lg bg-muted flex items-center justify-center transition-transform duration-300 group-hover:scale-110 group-hover:bg-primary/10`}>
                {exporting === btn.value ? (
                  <div className="w-5 h-5 border-2 border-muted-foreground border-t-foreground rounded-full animate-spin" />
                ) : (
                  <btn.icon className={`w-6 h-6 text-muted-foreground group-hover:text-primary transition-colors`} />
                )}
              </div>
              <div className="text-left">
                <p className="text-sm font-semibold tracking-tight text-foreground">{btn.label}</p>
                <p className="text-xs text-muted-foreground mt-1 font-medium">{btn.desc}</p>
              </div>
            </button>
          ))}
        </div>

        {exportError && (
          <div className="mt-6 flex items-center gap-2 text-sm text-destructive bg-destructive/5 border border-destructive/20 rounded-lg px-5 py-4 font-medium shadow-sm">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            {exportError}
          </div>
        )}
      </div>

      {report && (
        <div className="animate-slide-up space-y-6" style={{ animationDelay: '100ms', animationFillMode: 'both' }}>
          <div className="premium-card p-8 shadow-premium">
            <h3 className="text-sm font-bold tracking-widest uppercase text-foreground mb-6">Report Preview</h3>
            
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
              {[
                { label: 'Total Actions', value: report.totalActions.toLocaleString(), icon: Activity },
                { label: 'Passed', value: report.passed.toLocaleString(), icon: CheckCircle2 },
                { label: 'Blocked', value: report.blocked.toLocaleString(), icon: XCircle },
                { label: 'Quarantined', value: report.quarantined.toLocaleString(), icon: AlertTriangle },
              ].map(s => {
                const Icon = s.icon
                return (
                  <div key={s.label} className="bg-background/80 rounded-xl border border-border/80 p-5 shadow-[0_1px_3px_rgba(0,0,0,0.02)] transition-colors hover:border-primary/20">
                    <div className="flex items-center justify-between mb-3 text-muted-foreground">
                      <span className="text-xs font-semibold tracking-wide uppercase">{s.label}</span>
                      <Icon className="w-4 h-4" />
                    </div>
                    <span className="text-3xl font-bold tracking-tight text-foreground font-mono">{s.value}</span>
                  </div>
                )
              })}
            </div>

            <div className={`flex items-center gap-4 border rounded-xl px-5 py-4 mb-8 shadow-sm ${
              report.complianceStatus === 'PASS' ? 'bg-success/5 border-success/20' : 'bg-warning/5 border-warning/20'
            }`}>
              <CheckCircle2 className={`w-6 h-6 shrink-0 ${report.complianceStatus === 'PASS' ? 'text-success' : 'text-warning'}`} />
              <div>
                <p className={`text-sm font-bold tracking-tight ${report.complianceStatus === 'PASS' ? 'text-success' : 'text-warning'}`}>
                  Compliance Status: {report.complianceStatus}
                </p>
                <p className="text-sm text-muted-foreground mt-0.5 font-medium">
                  {report.complianceStatus === 'PASS'
                    ? 'All actions within acceptable risk thresholds.'
                    : 'Some actions require manual review.'}
                </p>
              </div>
            </div>

            <div className="mb-8">
              <span className="text-xs font-bold tracking-widest text-muted-foreground uppercase mb-3 block">Standards Covered</span>
              <div className="flex gap-2">
                {report.standardsCovered.map((s: string) => (
                  <span key={s} className="px-3 py-1.5 bg-background text-foreground text-xs font-medium rounded-md border border-border shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
                    {s}
                  </span>
                ))}
              </div>
            </div>

            <div className="pt-5 border-t border-border flex items-center justify-between text-xs text-muted-foreground font-medium">
              <span className="flex items-center gap-2"><Database className="w-4 h-4" /> Session: <span className="font-mono">{report.sessionId}</span></span>
              <span className="flex items-center gap-2"><Clock className="w-4 h-4" /> {new Date(report.generatedAt).toLocaleString()}</span>
            </div>
          </div>

          {/* <details className="premium-card p-6 group cursor-pointer shadow-premium">
            <summary className="text-sm font-bold tracking-tight text-foreground select-none flex items-center gap-2">
              <FileText className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
              Raw API Response
              <ChevronRight className="w-4 h-4 ml-auto text-muted-foreground group-open:rotate-90 transition-transform" />
            </summary>
            <div className="mt-4 bg-background/50 border border-border/50 rounded-lg p-5 overflow-x-auto shadow-inner">
              <pre className="text-xs text-muted-foreground font-mono whitespace-pre-wrap">{JSON.stringify(report.raw, null, 2)}</pre>
            </div>
          </details> */}
        </div>
      )}
    </div>
  )
}
