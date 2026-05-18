import { ComplianceReport } from '../components/ComplianceReport'

export default function CompliancePage() {
  return (
    <div className="pt-16 bg-subtle-grid min-h-screen">
      <div className="max-w-7xl mx-auto px-6 py-10">
        <div className="mb-8">
          <span className="text-xs font-semibold text-primary uppercase tracking-widest">Audit</span>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight mt-2">
            Compliance & <span className="text-gradient">Audit</span>
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Generate reports to meet regulatory and enterprise audit requirements.
          </p>
        </div>
        <div className="max-w-4xl">
          <ComplianceReport />
        </div>
      </div>
    </div>
  )
}
