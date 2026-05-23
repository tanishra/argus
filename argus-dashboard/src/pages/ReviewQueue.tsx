import { useState, useEffect, useRef } from 'react'
import {
  ShieldAlert, Clock, Search, CheckCircle2, AlertTriangle, ArrowRight, XCircle, FileText
} from 'lucide-react'
import { api } from '../lib/api'
import { cn } from '../lib/utils'

interface BackendReviewItem {
  id: string
  manifest: { session_id: string; declared_intent: string }
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
  declared_intent: string
  action_type: string
  target: string
  risk_score: number
  explanation: string
  timestamp: Date
  priority: 'low' | 'medium' | 'high' | 'critical'
  sla_hours: number
  recommended_action: string
}

function mapReviewItem(b: BackendReviewItem): ReviewItem {
  const priorityMap: Record<string, 'low' | 'medium' | 'high' | 'critical'> = {
    low: 'low', normal: 'medium', medium: 'medium',
    high: 'high', urgent: 'critical', critical: 'critical',
  }
  return {
    id: b.id,
    session_id: b.manifest?.session_id || '',
    declared_intent: b.manifest?.declared_intent || 'Unknown intent',
    action_type: b.detected_action?.action_type || '',
    target: b.detected_action?.target || '',
    risk_score: b.evaluation?.risk_score ?? 0,
    explanation: b.explanation_details || b.explanation_summary || '',
    timestamp: new Date(b.created_at),
    priority: priorityMap[b.priority] || 'medium',
    sla_hours: b.sla_hours || 24,
    recommended_action: b.recommended_action || '',
  }
}

function timeAgo(date: Date): string {
  const diff = Date.now() - date.getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  return `${days}d ago`
}

export default function ReviewQueue() {
  const [items, setItems] = useState<ReviewItem[]>([])
  const [selectedItem, setSelectedItem] = useState<ReviewItem | null>(null)
  const [filterPriority, setFilterPriority] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [submittingItems, setSubmittingItems] = useState<Set<string>>(new Set())
  const mountedRef = useRef(true)

  useEffect(() => {
    mountedRef.current = true
    fetchReviewQueue()
    return () => { mountedRef.current = false }
  }, [])

  const fetchReviewQueue = async () => {
    try {
      setIsLoading(true)
      const data = await api.getPendingReviews() as { items: BackendReviewItem[] }
      if (!mountedRef.current) return
      setItems(data.items.map(mapReviewItem))
    } catch {
      if (!mountedRef.current) return
      setItems([])
    } finally {
      if (!mountedRef.current) return
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
      if (selectedItem?.id === itemId) setSelectedItem(null)
    } catch {
      // Stay in queue on failure
    } finally {
      setSubmittingItems(prev => { const next = new Set(prev); next.delete(itemId); return next })
    }
  }

  const filteredItems = items.filter(item => {
    const m1 = filterPriority === 'all' || item.priority === filterPriority
    const m2 = item.action_type.toLowerCase().includes(searchQuery.toLowerCase()) ||
               item.target.toLowerCase().includes(searchQuery.toLowerCase())
    return m1 && m2
  })

  return (
    <div className="pt-24 pb-16 px-6 max-w-7xl mx-auto h-screen flex flex-col animate-fade-in">
      <header className="mb-8 shrink-0 animate-slide-up">
        <h1 className="text-3xl font-bold tracking-tight text-foreground mb-2">Review Queue</h1>
        <p className="text-sm text-muted-foreground">Quarantined agent actions pending human approval.</p>
      </header>

      <div className="flex gap-6 flex-1 min-h-0 animate-slide-up" style={{ animationDelay: '100ms', animationFillMode: 'both' }}>
        
        {/* LEFT PANE: List */}
        <div className="w-1/3 flex flex-col premium-card overflow-hidden">
          <div className="p-4 border-b border-border shrink-0 bg-background/50">
            <div className="relative mb-3">
              <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full bg-background border border-border rounded-lg py-2.5 pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all duration-200"
              />
            </div>
            <select
              value={filterPriority}
              onChange={e => setFilterPriority(e.target.value)}
              className="w-full bg-background border border-border rounded-lg py-2.5 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all duration-200"
            >
              <option value="all">All Priorities</option>
              <option value="critical">Critical</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </div>

          <div className="flex-1 overflow-y-auto bg-background/20">
            {isLoading ? (
              <div className="p-8 text-center text-muted-foreground text-sm">Loading queue...</div>
            ) : filteredItems.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground text-sm flex flex-col items-center">
                <CheckCircle2 className="w-8 h-8 text-muted-foreground/30 mb-3" />
                No pending reviews
              </div>
            ) : (
              <div className="divide-y divide-border/50">
                {filteredItems.map(item => (
                  <div
                    key={item.id}
                    onClick={() => setSelectedItem(item)}
                    className={cn(
                      "p-4 cursor-pointer hover:bg-muted/30 transition-all duration-200 relative overflow-hidden",
                      selectedItem?.id === item.id ? "bg-muted/50 border-l-2 border-l-primary" : "border-l-2 border-l-transparent"
                    )}
                  >
                    <div className="flex justify-between items-start mb-1">
                      <span className="text-sm font-semibold text-foreground truncate pr-2">{item.action_type}</span>
                      <span className={cn(
                         "text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded-sm",
                        item.priority === 'critical' || item.priority === 'high' ? "bg-destructive/10 text-destructive" : "bg-warning/10 text-warning"
                      )}>
                        {item.priority}
                      </span>
                    </div>
                    <div className="text-xs text-muted-foreground truncate mb-2 font-mono bg-background/50 inline-block px-1.5 py-0.5 rounded">
                      {item.target}
                    </div>
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {timeAgo(item.timestamp)}</span>
                      <span className="font-medium">Risk: {(item.risk_score * 100).toFixed(0)}%</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* RIGHT PANE: Details */}
        <div className="flex-1 premium-card overflow-hidden flex flex-col relative">
          {selectedItem ? (
            <div className="flex-1 flex flex-col animate-fade-in absolute inset-0">
              <div className="p-8 border-b border-border flex-1 overflow-y-auto">
                <div className="flex items-center gap-4 mb-8">
                  <div className="w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center shrink-0">
                    <ShieldAlert className="w-6 h-6 text-destructive" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold tracking-tight text-foreground">Action Blocked</h2>
                    <p className="text-sm text-muted-foreground font-mono">{selectedItem.id}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-6 mb-10">
                  <div className="bg-background/80 border border-border/80 rounded-xl p-5 shadow-[0_1px_3px_rgba(0,0,0,0.02)]">
                    <div className="text-xs text-muted-foreground uppercase tracking-widest font-semibold mb-3 flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-success" />
                      Declared Intent
                    </div>
                    <div className="text-sm text-foreground font-medium">{selectedItem.declared_intent}</div>
                  </div>
                  <div className="bg-destructive/5 border border-destructive/20 rounded-xl p-5 shadow-[0_1px_3px_rgba(0,0,0,0.02)]">
                    <div className="text-xs text-destructive uppercase tracking-widest font-semibold mb-3 flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4" />
                      Detected Action
                    </div>
                    <div className="text-sm text-foreground font-mono bg-background/80 px-2 py-1 rounded inline-block mb-2 border border-border/50">
                      {selectedItem.action_type}
                    </div>
                    <div className="text-sm text-foreground break-all">{selectedItem.target}</div>
                  </div>
                </div>

                <div className="mb-8">
                  <h3 className="text-sm font-bold tracking-tight text-foreground mb-4 flex items-center gap-2 uppercase tracking-widest">
                    <FileText className="w-4 h-4 text-muted-foreground" />
                    Semantic Explanation
                  </h3>
                  <div className="bg-background/80 border border-border/80 rounded-xl p-6 text-sm text-foreground leading-relaxed whitespace-pre-wrap shadow-[0_1px_3px_rgba(0,0,0,0.02)] font-medium">
                    {selectedItem.explanation || "No detailed explanation provided by the engine."}
                  </div>
                </div>

              </div>
              <div className="p-6 border-t border-border bg-background/50 flex items-center justify-end gap-4 shrink-0">
                <button
                  disabled={submittingItems.has(selectedItem.id)}
                  onClick={() => handleDecision(selectedItem.id, 'APPROVED')}
                  className="px-6 py-2.5 text-sm font-medium border border-border rounded-lg bg-background text-foreground hover:bg-muted transition-colors disabled:opacity-50 shadow-sm"
                >
                  Approve & Release
                </button>
                <button
                  disabled={submittingItems.has(selectedItem.id)}
                  onClick={() => handleDecision(selectedItem.id, 'DENIED')}
                  className="px-6 py-2.5 text-sm font-medium border border-transparent rounded-lg bg-destructive text-destructive-foreground hover:bg-destructive/90 transition-colors disabled:opacity-50 shadow-sm shadow-destructive/20"
                >
                  {submittingItems.has(selectedItem.id) ? 'Processing...' : 'Deny & Terminate'}
                </button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground absolute inset-0">
              <ShieldAlert className="w-16 h-16 mb-6 opacity-10" />
              <p className="text-sm font-medium tracking-wide">Select an item from the queue to view details</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
