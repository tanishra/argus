import { FileText, Download } from 'lucide-react'
import { api } from '../lib/api'
import { useState } from 'react'

export function ComplianceReport() {
  const [report, setReport] = useState<any>(null)
  
  const handleExport = async (format: string) => {
    // Hardcode demo session id
    const res = await api.exportComplianceReport("demo_session_001")
    setReport(res)
  }

  return (
    <div className="bg-slate-800 rounded-xl border border-slate-700 p-6 shadow-sm">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
            <FileText className="h-6 w-6 text-blue-500" />
            Compliance Export
          </h2>
          <p className="text-sm text-slate-400 mt-1">Generate automated audit trails for regulatory compliance.</p>
        </div>
      </div>
      
      <div className="flex gap-4 mb-8">
        <button 
          onClick={() => handleExport('json')}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors">
          <Download className="h-4 w-4" />
          Export SOC2 Log (JSON)
        </button>
        <button 
          onClick={() => handleExport('pdf')}
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg font-medium transition-colors">
          <Download className="h-4 w-4" />
          Export HIPAA Report (PDF)
        </button>
      </div>

      {report && (
        <div className="mt-6 border-t border-slate-700 pt-6">
          <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wider mb-4">Report Preview</h3>
          <div className="bg-slate-900 rounded-lg p-4 font-mono text-xs text-slate-300 overflow-x-auto">
            <pre>{JSON.stringify(report, null, 2)}</pre>
          </div>
        </div>
      )}
    </div>
  )
}
