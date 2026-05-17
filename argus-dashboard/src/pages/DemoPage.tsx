import { useState } from 'react'
import { api } from '../lib/api'
import { ShieldAlert, Send } from 'lucide-react'

export default function DemoPage() {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)

  const simulateAttack = async (type: string, target: string) => {
    setLoading(true)
    try {
      const res = await api.simulateAttack("demo_session_001", type, target)
      setResult(res)
    } catch (error) {
      console.error(error)
    }
    setLoading(false)
  }

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-100 mb-2">Live Attack Simulation</h1>
        <p className="text-slate-400">Trigger simulated agent actions to see ARGUS evaluate them in real-time.</p>
      </div>

      <div className="grid md:grid-cols-2 gap-6 max-w-4xl">
        <div className="bg-slate-800 rounded-xl border border-slate-700 p-6">
          <h2 className="text-xl font-bold text-slate-100 mb-4 flex items-center gap-2">
            <ShieldAlert className="text-red-500 h-6 w-6" />
            Prompt Injection Attack
          </h2>
          <p className="text-sm text-slate-400 mb-6">
            Simulates an agent being hijacked by malicious text embedded in a customer email, attempting to forward sensitive data.
          </p>
          <button 
            disabled={loading}
            onClick={() => simulateAttack('indirect_injection', 'attacker@evil.com')}
            className="w-full bg-red-600 hover:bg-red-700 text-white py-3 rounded-lg font-medium transition-colors flex items-center justify-center gap-2">
            <Send className="h-4 w-4" />
            Trigger Injection
          </button>
        </div>

        <div className="bg-slate-800 rounded-xl border border-slate-700 p-6">
          <h2 className="text-xl font-bold text-slate-100 mb-4 flex items-center gap-2">
            <ShieldAlert className="text-orange-500 h-6 w-6" />
            Data Exfiltration
          </h2>
          <p className="text-sm text-slate-400 mb-6">
            Simulates an agent attempting to export the entire customer database instead of just the requested single record.
          </p>
          <button 
            disabled={loading}
            onClick={() => simulateAttack('exfiltration', 'bulk_export_api')}
            className="w-full bg-orange-600 hover:bg-orange-700 text-white py-3 rounded-lg font-medium transition-colors flex items-center justify-center gap-2">
            <Send className="h-4 w-4" />
            Trigger Exfiltration
          </button>
        </div>
      </div>

      {result && (
        <div className="mt-8 max-w-4xl bg-slate-900 rounded-xl p-6 border border-slate-700">
          <h3 className="text-lg font-semibold mb-4 text-slate-200">Simulation Result</h3>
          <div className="flex items-center gap-4 mb-4">
            <div className={`px-3 py-1 rounded text-sm font-bold ${result.blocked ? 'bg-red-500/20 text-red-500' : 'bg-green-500/20 text-green-500'}`}>
              {result.blocked ? 'BLOCKED' : 'ALLOWED'}
            </div>
            <div className="text-slate-400 text-sm">Risk Score: {(result.risk_score * 100).toFixed(0)}%</div>
          </div>
          <pre className="text-xs text-slate-400 overflow-x-auto bg-black/50 p-4 rounded">
            {JSON.stringify(result.action, null, 2)}
          </pre>
        </div>
      )}
    </div>
  )
}
