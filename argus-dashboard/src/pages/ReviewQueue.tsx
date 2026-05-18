import { useState, useEffect } from 'react'
import {
  Shield, AlertTriangle, CheckCircle2, XCircle, Clock, Search,
  ChevronRight, ArrowUpDown, Filter
} from 'lucide-react'
import { api } from '../lib/api'

interface BackendReviewItem {
  id: string
  manifest: { session_id: string }
  detected_action: { action_type: string; target: string }
  evaluation: { risk_score: number }
  status: string
  priority: string
  explanation_summary: string
  explanation_details: string
  recommended_action: string
  created_at: string
  sla_hours: number
}

interface ReviewItem {
  id: string
  session_id: string
  action_type: string
  target: string
  risk_score: number
  explanation: string
  timestamp: Date
  priority: 'low' | 'medium' | 'high' | 'critical'
  sla_hours: number
}

function mapReviewItem(b: BackendReviewItem): ReviewItem {
  const priorityMap: Record<string, 'low' | 'medium' | 'high' | 'critical'> = {
    low: 'low',
    normal: 'medium',
    medium: 'medium',
    high: 'high',
    urgent: 'critical',
    critical: 'critical',
  }

  return {
    id: b.id,
    session_id: b.manifest?.session_id || '',
    action_type: b.detected_action?.action_type || '',
    target: b.detected_action?.target || '',
    risk_score: b.evaluation?.risk_score ?? 0,
    explanation: b.explanation_summary || b.explanation_details || '',
    timestamp: new Date(b.created_at),
    priority: priorityMap[b.priority] || 'medium',
    sla_hours: b.sla_hours || 24,
  }
}

export default function ReviewQueue() {
  const [items, setItems] = useState<ReviewItem[]>([])
  const [selectedItem, setSelectedItem] = useState<ReviewItem | null>(null)
  const [filterPriority, setFilterPriority] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [submittingItems, setSubmittingItems] = useState<Set<string>>(new Set())

  useEffect(() => {
    fetchReviewQueue()
  }, [])

  const fetchReviewQueue = async () => {
    try {
      setIsLoading(true)
      const data: any = await api.getPendingReviews()
      const raw: BackendReviewItem[] = data.items || []
      setItems(raw.map(mapReviewItem))
    } catch {
      setItems([])
    } finally {
      setIsLoading(false)
    }
  }

  const handleDecision = async (itemId: string, decision: 'APPROVED' | 'DENIED' | 'ESCALATED') => {
    if (submittingItems.has(itemId)) return
    setSubmittingItems(prev => new Set(prev).add(itemId))
    try {
      await api.claimReview(itemId, 'admin')
      await api.submitReviewDecision(itemId, decision)
      setItems(prev => prev.filter(i => i.id !== itemId))
      setSelectedItem(null)
    } catch {
      // Stay in queue on failure — user can retry
    } finally {
      setSubmittingItems(prev => { const next = new Set(prev); next.delete(itemId); return next })
    }
  }

  const priorityConfig = {
    critical: { bg: 'bg-rose-50', text: 'text-rose-700', border: 'border-rose-200', dot: 'bg-rose-500' },
    high: { bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-200', dot: 'bg-orange-500' },
    medium: { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200', dot: 'bg-amber-500' },
    low: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200', dot: 'bg-blue-500' },
  }

  const filteredItems = items.filter(item => {
    const m1 = filterPriority === 'all' || item.priority === filterPriority
    const m2 = item.action_type.toLowerCase().includes(searchQuery.toLowerCase()) ||
               item.target.toLowerCase().includes(searchQuery.toLowerCase())
    return m1 && m2
  })

  return (
    <div className="pt-16 bg-subtle-grid min-h-screen">
      <div className="max-w-7xl mx-auto px-6 py-10">
        <div className="mb-8">
          <span className="text-xs font-semibold text-primary uppercase tracking-widest">Admin</span>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight mt-2">
            Review <span className="text-gradient">Queue</span>
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            {filteredItems.length} quarantined action{filteredItems.length !== 1 ? 's' : ''} pending human review
          </p>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            <div className="premium-card p-4">
              <div className="flex items-center gap-3">
                <div className="flex-1 relative">
                  <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Search actions or targets..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    className="premium-input w-full pl-10"
                  />
                </div>
                <select
                  value={filterPriority}
                  onChange={e => setFilterPriority(e.target.value)}
                  className="premium-input text-sm min-w-[140px]"
                >
                  <option value="all">All Priorities</option>
                  <option value="critical">Critical</option>
                  <option value="high">High</option>
                  <option value="medium">Medium</option>
                  <option value="low">Low</option>
                </select>
              </div>
            </div>

            <div className="space-y-3">
              {isLoading ? (
                <div className="premium-card p-12 text-center">
                  <div className="w-10 h-10 border-2 border-primary/20 border-t-primary rounded-full animate-spin mx-auto mb-3" />
                  <p className="text-sm text-muted-foreground">Loading review queue...</p>
                </div>
              ) : filteredItems.length === 0 ? (
                <div className="premium-card p-12 text-center">
                  <CheckCircle2 className="w-12 h-12 text-success/60 mx-auto mb-3" />
                  <p className="text-sm font-medium text-foreground">All caught up!</p>
                  <p className="text-xs text-muted-foreground mt-1">No actions pending review</p>
                </div>
              ) : (
                filteredItems.map(item => {
                  const pc = priorityConfig[item.priority]
                  return (
                    <div
                      key={item.id}
                      onClick={() => setSelectedItem(item)}
                      className={`premium-card p-5 cursor-pointer transition-all ${
                        selectedItem?.id === item.id ? 'ring-2 ring-primary/20 border-primary/30' : ''
                      }`}
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <div className={`flex items-center gap-2 ${pc.text}`}>
                            <span className={`w-2 h-2 rounded-full ${pc.dot}`} />
                            <span className="text-xs font-medium">{item.priority}</span>
                          </div>
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            SLA: {item.sla_hours}h
                          </span>
                        </div>
                        <div className="text-right">
                          <p className="text-xs text-muted-foreground">Risk Score</p>
                          <p className={`text-sm font-semibold ${
                            item.risk_score > 0.7 ? 'text-destructive' : item.risk_score > 0.4 ? 'text-warning' : 'text-success'
                          }`}>
                            {(item.risk_score * 100).toFixed(0)}%
                          </p>
                        </div>
                      </div>

                      <div className="space-y-1">
                        <p className="text-sm font-semibold text-foreground">{item.action_type}</p>
                        <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                          <ArrowUpDown className="w-3 h-3" />
                          Target: <span className="font-mono">{item.target}</span>
                        </p>
                        <p className="text-xs text-muted-foreground font-mono">Session: {item.session_id}</p>
                      </div>

                          {selectedItem?.id === item.id && (
                        <div className="mt-4 pt-4 border-t border-border/60 flex items-center gap-2 animate-fade-in">
                          <button
                            onClick={e => { e.stopPropagation(); handleDecision(item.id, 'APPROVED') }}
                            disabled={submittingItems.has(item.id)}
                            className="flex-1 px-3 py-2 bg-success/10 text-success rounded-lg text-xs font-medium hover:bg-success/20 transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            {submittingItems.has(item.id) ? '...' : 'Approve'}
                          </button>
                          <button
                            onClick={e => { e.stopPropagation(); handleDecision(item.id, 'DENIED') }}
                            disabled={submittingItems.has(item.id)}
                            className="flex-1 px-3 py-2 bg-destructive/10 text-destructive rounded-lg text-xs font-medium hover:bg-destructive/20 transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5"
                          >
                            <XCircle className="w-3.5 h-3.5" />
                            {submittingItems.has(item.id) ? '...' : 'Deny'}
                          </button>
                          <button
                            onClick={e => { e.stopPropagation(); handleDecision(item.id, 'ESCALATED') }}
                            disabled={submittingItems.has(item.id)}
                            className="flex-1 px-3 py-2 bg-warning/10 text-warning rounded-lg text-xs font-medium hover:bg-warning/20 transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5"
                          >
                            <AlertTriangle className="w-3.5 h-3.5" />
                            {submittingItems.has(item.id) ? '...' : 'Escalate'}
                          </button>
                        </div>
                      )}
                    </div>
                  )
                })
              )}
            </div>
          </div>

          <div className="lg:col-span-1">
            <div className="premium-card p-6 sticky top-24">
              {selectedItem ? (
                <div className="space-y-6">
                  <div className="flex items-center gap-3 pb-4 border-b border-border/60">
                    <div className="w-10 h-10 rounded-xl bg-primary/5 flex items-center justify-center">
                      <Shield className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-foreground text-sm">Action Details</h3>
                      <p className="text-xs text-muted-foreground">Gemini Pro Analysis</p>
                    </div>
                  </div>

                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-2">Explanation</p>
                    <div className="bg-secondary/50 rounded-lg p-3">
                      <p className="text-sm text-foreground leading-relaxed">{selectedItem.explanation}</p>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-border/60">
                    <p className="text-xs font-medium text-muted-foreground mb-3">Metadata</p>
                    <div className="space-y-2.5 text-xs">
                      {[
                        ['Action Type', selectedItem.action_type],
                        ['Target', selectedItem.target],
                        ['Risk Score', `${(selectedItem.risk_score * 100).toFixed(0)}%`],
                        ['Session', selectedItem.session_id],
                      ].map(([label, value]) => (
                        <div key={label as string} className="flex justify-between">
                          <span className="text-muted-foreground">{label as string}</span>
                          <span className="font-medium text-foreground font-mono text-[11px]">{value as string}</span>
                        </div>
                      ))}
                      <div className="flex justify-between items-center">
                        <span className="text-muted-foreground">Priority</span>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium border ${
                          priorityConfig[selectedItem.priority].bg
                        } ${priorityConfig[selectedItem.priority].text} ${priorityConfig[selectedItem.priority].border}`}>
                          {selectedItem.priority}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-border/60">
                    <a href="/compliance" className="text-xs text-primary hover:text-primary/80 font-medium flex items-center gap-1 transition-colors">
                      View Audit Trail <ChevronRight className="w-3 h-3" />
                    </a>
                  </div>
                </div>
              ) : (
                <div className="text-center py-12">
                  <div className="w-12 h-12 rounded-xl bg-secondary flex items-center justify-center mx-auto mb-3">
                    <Filter className="w-6 h-6 text-muted-foreground" />
                  </div>
                  <p className="text-sm text-muted-foreground">Select an item to view details</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
