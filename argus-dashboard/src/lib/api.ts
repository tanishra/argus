const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000'

export class ApiError extends Error {
  status: number
  body: unknown
  constructor(status: number, body: unknown) {
    super(`API error ${status}`)
    this.name = 'ApiError'
    this.status = status
    this.body = body
  }
}

async function request<T>(url: string, opts?: RequestInit): Promise<T> {
  const res = await fetch(url, opts)
  if (!res.ok) {
    let body: unknown
    try { body = await res.json() } catch { body = await res.text().catch(() => null) }
    throw new ApiError(res.status, body)
  }
  return res.json()
}

export const api = {
  extractIntent: (userInput: string, sessionId?: string) =>
    request(`${API_BASE}/api/intent/extract`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_input: userInput, session_id: sessionId })
    }),

  simulateAttack: (sessionId: string, attackType: string, target: string) =>
    request(`${API_BASE}/api/action/simulate?session_id=${sessionId}&attack_type=${attackType}&target=${encodeURIComponent(target)}`,
      { method: 'POST' }
    ),

  getPendingReviews: () =>
    request(`${API_BASE}/api/reviews`),

  claimReview: (itemId: string, reviewerId: string) =>
    request(`${API_BASE}/api/reviews/${itemId}/claim?reviewer_id=${encodeURIComponent(reviewerId)}`, {
      method: 'POST'
    }),

  submitReviewDecision: (itemId: string, decision: 'APPROVED' | 'DENIED' | 'ESCALATED', notes?: string) =>
    request(`${API_BASE}/api/reviews/decision`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ item_id: itemId, decision, notes: notes || '' })
    }),

  getDashboardStats: () =>
    request(`${API_BASE}/api/dashboard/stats`),

  exportComplianceReport: (sessionId: string, format: string = "json") =>
    request(`${API_BASE}/api/compliance/export/${sessionId}?format=${format}`)
}

export function subscribeToFeed(onEvent: (event: any) => void): EventSource {
  const es = new EventSource(`${API_BASE}/api/dashboard/feed`)

  es.addEventListener('action', (e: MessageEvent) => {
    try { onEvent({ type: 'action', data: JSON.parse(e.data) }) } catch { /* skip malformed */ }
  })
  es.addEventListener('stats_update', (e: MessageEvent) => {
    try { onEvent({ type: 'stats_update', data: JSON.parse(e.data) }) } catch { /* skip malformed */ }
  })
  es.addEventListener('alert', (e: MessageEvent) => {
    try { onEvent({ type: 'alert', data: JSON.parse(e.data) }) } catch { /* skip malformed */ }
  })
  es.addEventListener('ping', () => {})

  es.onerror = () => {
    console.error('SSE connection error')
  }

  return es
}
