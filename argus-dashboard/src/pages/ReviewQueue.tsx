import { useState, useEffect, useRef } from 'react'
import {
  Shield, AlertTriangle, CheckCircle2, XCircle, Clock, Search,
  ChevronRight, ArrowUpDown, Filter, Gauge, Activity, Users
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
    action_type: b.detected_action?.action_type || '',
    target: b.detected_action?.target || '',
    risk_score: b.evaluation?.risk_score ?? 0,
    explanation: b.explanation_summary || b.explanation_details || '',
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

const priorityConfig: Record<string, { bg: string; text: string; border: string; dot: string; bar: string }> = {
  critical: { bg: 'bg-rose-50', text: 'text-rose-700', border: 'border-rose-200', dot: 'bg-rose-500', bar: 'bg-rose-500' },
  high: { bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-200', dot: 'bg-orange-500', bar: 'bg-orange-500' },
  medium: { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200', dot: 'bg-amber-500', bar: 'bg-amber-500' },
  low: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200', dot: 'bg-blue-500', bar: 'bg-blue-500' },
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
      setSelectedItem(null)
    } catch {
      // Stay in queue on failure — user can retry
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

  const priorityCounts: Record<string, number> = { critical: 0, high: 0, medium: 0, low: 0 }
  items.forEach(i => { priorityCounts[i.priority] = (priorityCounts[i.priority] || 0) + 1 })
  const avgRisk = items.length ? items.reduce((s, i) => s + i.risk_score, 0) / items.length : 0

  const renderStats = () => (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
      <div className="bg-white rounded-xl border border-border/60 p-4 card-hover">
        <div className="flex items-center gap-2 mb-1.5">
          <Activity className="w-3.5 h-3.5 text-muted-foreground" />
          <span className="text-xs text-muted-foreground">Total Pending</span>
        </div>
        <p className="text-2xl font-bold text-foreground tracking-tight">{items.length}</p>
      </div>
      <div className="bg-white rounded-xl border border-border/60 p-4 card-hover">
        <div className="flex items-center gap-2 mb-1.5">
          <AlertTriangle className="w-3.5 h-3.5 text-rose-500" />
          <span className="text-xs text-muted-foreground">Critical</span>
        </div>
        <p className="text-2xl font-bold text-rose-600 tracking-tight">{priorityCounts.critical}</p>
      </div>
      <div className="bg-white rounded-xl border border-border/60 p-4 card-hover">
        <div className="flex items-center gap-2 mb-1.5">
          <Gauge className="w-3.5 h-3.5 text-muted-foreground" />
          <span className="text-xs text-muted-foreground">Avg Risk</span>
        </div>
        <p className="text-2xl font-bold text-foreground tracking-tight">{(avgRisk * 100).toFixed(0)}%</p>
      </div>
      <div className="bg-white rounded-xl border border-border/60 p-4 card-hover">
        <div className="flex items-center gap-2 mb-1.5">
          <Users className="w-3.5 h-3.5 text-muted-foreground" />
          <span className="text-xs text-muted-foreground">Filtered</span>
        </div>
        <p className="text-2xl font-bold text-foreground tracking-tight">{filteredItems.length}</p>
      </div>
    </div>
  )

  const renderSearchBar = () => (
    <div className="premium-card p-4 mb-4">
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
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
  )

  const renderItemList = () => {
    if (isLoading) {
      return (
        <div className="premium-card p-16 text-center">
          <div className="w-10 h-10 border-2 border-primary/20 border-t-primary rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">Loading review queue...</p>
        </div>
      )
    }
    if (filteredItems.length === 0) {
      return (
        <div className="premium-card p-16 text-center">
          <div className="w-14 h-14 rounded-2xl bg-success/10 flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="w-7 h-7 text-success/70" />
          </div>
          <p className="text-base font-semibold text-foreground">All caught up!</p>
          <p className="text-sm text-muted-foreground mt-1">No actions pending review</p>
        </div>
      )
    }
    return (
      <div className="space-y-3">
        {filteredItems.map(item => {
          const pc = priorityConfig[item.priority]
          const isSelected = selectedItem?.id === item.id
          return (
            <div
              key={item.id}
              onClick={() => setSelectedItem(item)}
              className={`bg-white rounded-xl border cursor-pointer transition-all duration-200 overflow-hidden ${
                isSelected
                  ? 'border-primary/30 shadow-[0_0_0_1px_rgba(79,70,229,0.1),0_4px_16px_rgba(79,70,229,0.06)]'
                  : 'border-border/60 hover:border-primary/20 hover:shadow-[0_4px_12px_rgba(79,70,229,0.04)]'
              }`}
            >
              <div className="flex">
                <div className={`w-1 shrink-0 ${pc.bar}`} />
                <div className="flex-1 p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2.5 flex-1 min-w-0">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${pc.border} ${pc.text} ${pc.bg}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${pc.dot}`} />
                        {item.priority}
                      </span>
                      <span className="text-xs text-muted-foreground flex items-center gap-1 shrink-0">
                        <Clock className="w-3 h-3" />
                        {timeAgo(item.timestamp)}
                      </span>
                    </div>
                    <div className="text-right shrink-0 ml-3">
                      <p className="text-xs text-muted-foreground">Risk</p>
                      <p className={`text-sm font-bold ${
                        item.risk_score > 0.7 ? 'text-destructive' : item.risk_score > 0.4 ? 'text-warning' : 'text-success'
                      }`}>
                        {(item.risk_score * 100).toFixed(0)}%
                      </p>
                    </div>
                  </div>

                  <p className="text-sm font-semibold text-foreground mb-1.5">{item.action_type}</p>

                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-secondary/50 rounded-md font-mono">
                      <ArrowUpDown className="w-3 h-3" />
                      {item.target}
                    </span>
                  </div>

                  {/* Risk bar */}
                  <div className="mt-3 h-1.5 bg-secondary/70 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${
                        item.risk_score > 0.7 ? 'bg-destructive/70' : item.risk_score > 0.4 ? 'bg-warning/70' : 'bg-success/70'
                      }`}
                      style={{ width: `${item.risk_score * 100}%` }}
                    />
                  </div>

                  {isSelected && (
                    <div className="mt-4 pt-4 border-t border-border/50 flex items-center gap-2 animate-fade-in">
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
              </div>
            </div>
          )
        })}
      </div>
    )
  }

  const renderSidebar = () => (
    <div className="premium-card p-6 sticky top-24">
      {selectedItem ? (
        <div className="space-y-5">
          <div className="flex items-center gap-3 pb-4 border-b border-border/50">
            <div className={`w-10 h-10 rounded-xl ${priorityConfig[selectedItem.priority].bg} flex items-center justify-center`}>
              <Shield className={`w-5 h-5 ${priorityConfig[selectedItem.priority].text}`} />
            </div>
            <div>
              <h3 className="font-semibold text-foreground text-sm">Action Details</h3>
              <p className="text-xs text-muted-foreground">{selectedItem.action_type}</p>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-medium text-muted-foreground">Risk Score</p>
              <span className={`text-xs font-bold ${
                selectedItem.risk_score > 0.7 ? 'text-destructive' : selectedItem.risk_score > 0.4 ? 'text-warning' : 'text-success'
              }`}>
                {(selectedItem.risk_score * 100).toFixed(0)}%
              </span>
            </div>
            <div className="h-2 bg-secondary/70 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full ${
                  selectedItem.risk_score > 0.7 ? 'bg-destructive/70' : selectedItem.risk_score > 0.4 ? 'bg-warning/70' : 'bg-success/70'
                }`}
                style={{ width: `${selectedItem.risk_score * 100}%` }}
              />
            </div>
          </div>

          {selectedItem.explanation && (
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-2">Gemini Pro Analysis</p>
              <div className="bg-secondary/50 rounded-lg p-3.5 border border-border/40">
                <p className="text-sm text-foreground leading-relaxed">{selectedItem.explanation}</p>
              </div>
            </div>
          )}

          <div className="pt-3 border-t border-border/50">
            <p className="text-xs font-medium text-muted-foreground mb-3">Metadata</p>
            <div className="space-y-2.5 text-xs">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Action Type</span>
                <span className="font-medium text-foreground font-mono text-[11px]">{selectedItem.action_type}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Target</span>
                <span className="font-medium text-foreground font-mono text-[11px] max-w-[180px] truncate" title={selectedItem.target}>{selectedItem.target}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Risk Score</span>
                <span className={`font-medium font-mono text-[11px] ${
                  selectedItem.risk_score > 0.7 ? 'text-destructive' : selectedItem.risk_score > 0.4 ? 'text-warning' : 'text-success'
                }`}>
                  {(selectedItem.risk_score * 100).toFixed(0)}%
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Session</span>
                <span className="font-medium text-foreground font-mono text-[11px] max-w-[180px] truncate" title={selectedItem.session_id}>{selectedItem.session_id}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Created</span>
                <span className="font-medium text-foreground text-[11px]">{timeAgo(selectedItem.timestamp)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Priority</span>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${priorityConfig[selectedItem.priority].bg} ${priorityConfig[selectedItem.priority].text} ${priorityConfig[selectedItem.priority].border}`}>
                  {selectedItem.priority}
                </span>
              </div>
              {selectedItem.recommended_action && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Recommended</span>
                  <span className={`font-medium font-mono text-[11px] ${
                    selectedItem.recommended_action === 'APPROVE' ? 'text-success' : selectedItem.recommended_action === 'DENY' ? 'text-destructive' : 'text-warning'
                  }`}>
                    {selectedItem.recommended_action}
                  </span>
                </div>
              )}
            </div>
          </div>

          <div className="pt-3 border-t border-border/50">
            <a href="/compliance" className="text-xs text-primary hover:text-primary/80 font-medium flex items-center gap-1 transition-colors group">
              View Audit Trail
              <ChevronRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
            </a>
          </div>
        </div>
      ) : (
        <div className="text-center py-12">
          <div className="w-12 h-12 rounded-xl bg-secondary flex items-center justify-center mx-auto mb-3">
            <Filter className="w-6 h-6 text-muted-foreground" />
          </div>
          <p className="text-sm font-medium text-foreground">No item selected</p>
          <p className="text-xs text-muted-foreground mt-1">Click an item to view its details</p>
        </div>
      )}
    </div>
  )

  return (
    <div className="pt-16 bg-subtle-grid min-h-screen">
      <div className="max-w-7xl mx-auto px-6 py-10">
        <div className="mb-6">
          <span className="text-xs font-semibold text-primary uppercase tracking-widest">Admin</span>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight mt-2">
            Review <span className="text-gradient">Queue</span>
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            {filteredItems.length} quarantined action{filteredItems.length !== 1 ? 's' : ''} pending human review
          </p>
        </div>

        {items.length > 0 && renderStats()}

        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            {renderSearchBar()}
            {renderItemList()}
          </div>

          <div className="lg:col-span-1">
            {renderSidebar()}
          </div>
        </div>
      </div>
    </div>
  )
}
