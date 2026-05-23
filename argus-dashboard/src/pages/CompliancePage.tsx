import { ComplianceReport } from '../components/ComplianceReport'

export default function CompliancePage() {
  return (
    <div className="pt-24 pb-16 px-6 max-w-4xl mx-auto min-h-screen animate-fade-in">
      <header className="mb-12 animate-slide-up">
        <h1 className="text-3xl font-bold tracking-tight text-foreground mb-2">
          Compliance & Audit
        </h1>
        <p className="text-sm text-muted-foreground">
          Generate reports to meet regulatory and enterprise audit requirements.
        </p>
      </header>
      <div className="animate-slide-up" style={{ animationDelay: '100ms', animationFillMode: 'both' }}>
        <ComplianceReport />
      </div>
    </div>
  )
}
