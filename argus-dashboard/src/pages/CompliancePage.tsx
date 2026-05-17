import { ComplianceReport } from '../components/ComplianceReport'

export default function CompliancePage() {
  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-100 mb-2">Compliance & Audit</h1>
        <p className="text-slate-400">Generate reports to meet regulatory and enterprise audit requirements.</p>
      </div>
      <div className="max-w-4xl">
        <ComplianceReport />
      </div>
    </div>
  )
}
