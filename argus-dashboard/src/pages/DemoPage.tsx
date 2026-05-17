import { useState } from 'react'
import { api } from '../lib/api'
import { ShieldAlert, Send, ShieldX, ShieldCheck, FileJson, AlertCircle } from 'lucide-react'
import { toast } from 'sonner'

export default function DemoPage() {
  const [loading, setLoading] = useState(false)
  const [unprotectedLog, setUnprotectedLog] = useState<any[]>([])
  const [protectedLog, setProtectedLog] = useState<any[]>([])
  const [manifest, setManifest] = useState<any>(null)

  const handleInitArgus = async () => {
    setLoading(true)
    try {
      const res = await api.extractIntent("Handle today's customer complaint emails", "demo_session_001")
      setManifest(res.manifest)
      toast.success("ARGUS Intent Manifest Generated")
    } catch (error) {
      console.error(error)
    }
    setLoading(false)
  }

  const simulateAttack = async (type: string, target: string, isProtected: boolean) => {
    setLoading(true)
    try {
      if (isProtected) {
        // If they haven't inited, use default demo manifest which simulate_attack provides if missing
        const res = await api.simulateAttack("demo_session_001", type, target)
        setProtectedLog(prev => [res, ...prev])
      } else {
        // Simulate an attack succeeding without ARGUS
        const mockSuccess = {
          attack_type: type,
          action: { action_type: type === 'indirect_injection' ? 'forward_email' : 'send_email', target },
          decision: 'allow',
          risk_score: 0.0,
          blocked: false,
          timestamp: new Date().toISOString()
        }
        setUnprotectedLog(prev => [mockSuccess, ...prev])
        toast.error("Attack Succeeded!")
      }
    } catch (error) {
      console.error(error)
    }
    setLoading(false)
  }

  return (
    <div className="p-8 h-[calc(100vh-2rem)] overflow-y-auto">
      <div className="mb-8 flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-bold text-slate-100 mb-2">Live Demo: ARGUS Defense</h1>
          <p className="text-slate-400">See what happens when an AI agent faces a zero-day prompt injection.</p>
        </div>
        <button 
          onClick={handleInitArgus}
          disabled={loading}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium shadow-lg transition-colors">
          Initialize ARGUS Agent
        </button>
      </div>

      <div className="grid lg:grid-cols-2 gap-6 h-[70vh]">
        {/* Unprotected Panel */}
        <div className="bg-slate-900 border border-slate-700 rounded-xl flex flex-col overflow-hidden">
          <div className="bg-red-900/40 border-b border-red-900/50 p-4 flex items-center justify-between">
            <div className="flex items-center gap-2 text-red-400">
              <ShieldX className="h-5 w-5" />
              <h2 className="font-bold">Unprotected Agent</h2>
            </div>
            <span className="text-xs text-slate-400">Standard API Integration</span>
          </div>
          
          <div className="p-6 flex flex-col gap-4 bg-slate-800/30">
            <button 
              onClick={() => simulateAttack('indirect_injection', 'attacker@evil.com', false)}
              className="w-full bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white py-3 rounded-lg flex items-center justify-center gap-2">
              <Send className="h-4 w-4" /> Inject Malicious Payload
            </button>
          </div>

          <div className="flex-1 p-6 overflow-y-auto border-t border-slate-800">
            <h3 className="text-sm font-semibold text-slate-400 mb-4 uppercase">Activity Log</h3>
            <div className="space-y-4">
              {unprotectedLog.length === 0 && <p className="text-slate-500 text-sm">Awaiting activity...</p>}
              {unprotectedLog.map((log, i) => (
                <div key={i} className="bg-red-500/10 border border-red-500/20 p-4 rounded-lg animate-in fade-in slide-in-from-top-2">
                  <div className="flex items-center gap-2 text-red-500 mb-2 font-bold text-sm">
                    <AlertCircle className="h-4 w-4" />
                    DATA EXFILTRATED
                  </div>
                  <div className="font-mono text-xs text-slate-300">
                    <span className="text-slate-500">Action:</span> {log.action.action_type}<br/>
                    <span className="text-slate-500">Target:</span> {log.action.target}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Protected Panel */}
        <div className="bg-slate-900 border border-slate-700 rounded-xl flex flex-col overflow-hidden relative">
          <div className="bg-blue-900/40 border-b border-blue-900/50 p-4 flex items-center justify-between">
            <div className="flex items-center gap-2 text-blue-400">
              <ShieldCheck className="h-5 w-5" />
              <h2 className="font-bold">ARGUS-Protected Agent</h2>
            </div>
            <span className="text-xs text-slate-400">Lobster Trap + Intent Engine</span>
          </div>

          <div className="p-6 flex flex-col gap-4 bg-slate-800/30">
            <button 
              onClick={() => simulateAttack('indirect_injection', 'attacker@evil.com', true)}
              className="w-full bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white py-3 rounded-lg flex items-center justify-center gap-2">
              <Send className="h-4 w-4" /> Inject Malicious Payload
            </button>
          </div>

          <div className="flex-1 p-6 overflow-y-auto border-t border-slate-800">
            <div className="grid grid-cols-2 gap-4 mb-4">
              <h3 className="text-sm font-semibold text-slate-400 uppercase">Activity Log</h3>
              {manifest && <h3 className="text-sm font-semibold text-slate-400 uppercase">Active Intent Manifest</h3>}
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-4">
                {protectedLog.length === 0 && <p className="text-slate-500 text-sm">Awaiting activity...</p>}
                {protectedLog.map((log, i) => (
                  <div key={i} className="bg-slate-800 border border-slate-700 p-4 rounded-lg animate-in fade-in slide-in-from-top-2">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2 text-yellow-500 font-bold text-sm">
                        <ShieldAlert className="h-4 w-4" />
                        {log.decision.toUpperCase()}
                      </div>
                      <span className="text-xs text-red-400 font-mono">Risk: {(log.risk_score * 100).toFixed(0)}%</span>
                    </div>
                    <div className="font-mono text-xs text-slate-300">
                      <span className="text-slate-500">Action:</span> {log.action.action_type}<br/>
                      <span className="text-slate-500">Target:</span> {log.action.target}
                    </div>
                  </div>
                ))}
              </div>
              
              {manifest && (
                <div className="bg-slate-950 p-4 rounded-lg border border-slate-800 h-fit">
                  <div className="flex items-center gap-2 text-blue-400 mb-3 text-sm font-bold">
                    <FileJson className="h-4 w-4" />
                    Boundary Config
                  </div>
                  <pre className="text-[10px] text-green-400 font-mono overflow-x-auto whitespace-pre-wrap break-all">
                    {JSON.stringify({
                      intent: manifest.declared_intent,
                      allowed: manifest.allowed_actions,
                      forbidden: manifest.forbidden_actions,
                      risk: manifest.risk_ceiling
                    }, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
