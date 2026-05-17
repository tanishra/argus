import { useState, useEffect } from 'react'
import { api } from '../lib/api'
import { AlertTriangle, Clock } from 'lucide-react'

export default function ReviewQueue() {
  const [reviews, setReviews] = useState<any[]>([])

  useEffect(() => {
    api.getPendingReviews().then(data => setReviews(data.items))
  }, [])

  const handleDecision = async (itemId: string, decision: 'APPROVED' | 'DENIED') => {
    await api.submitReviewDecision(itemId, decision)
    const data = await api.getPendingReviews()
    setReviews(data.items)
  }

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-100 mb-2">Review Queue</h1>
        <p className="text-slate-400">Manage quarantined actions requiring human oversight.</p>
      </div>

      <div className="grid gap-6">
        {reviews.length === 0 ? (
          <div className="bg-slate-800/50 rounded-xl border border-slate-700/50 p-8 text-center text-slate-400">
            No items currently in the review queue.
          </div>
        ) : (
          reviews.map((review) => (
            <div key={review.id} className="bg-slate-800 rounded-xl border border-slate-700 p-6 flex flex-col md:flex-row gap-6">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <AlertTriangle className="h-5 w-5 text-yellow-500" />
                  <h3 className="font-semibold text-lg text-slate-200">Quarantined Action: {review.action}</h3>
                </div>
                <div className="bg-slate-900 rounded p-4 mb-4 font-mono text-sm">
                  <div className="text-slate-400 mb-1">Target: <span className="text-blue-400">{review.target}</span></div>
                  <div className="text-slate-400">Risk Score: <span className="text-red-400">{review.riskScore}</span></div>
                </div>
                <div className="bg-yellow-900/20 border border-yellow-700/30 rounded p-4">
                  <h4 className="text-sm font-semibold text-yellow-500 mb-2">AI Reason</h4>
                  <p className="text-sm text-yellow-200/80">{review.reason}</p>
                </div>
              </div>
              
              <div className="w-full md:w-64 flex flex-col gap-3 justify-center">
                <div className="flex items-center gap-2 text-slate-400 text-sm mb-2 justify-center">
                  <Clock className="h-4 w-4" />
                  <span>Waiting for review</span>
                </div>
                <button 
                  onClick={() => handleDecision(review.id, 'APPROVED')}
                  className="bg-green-600 hover:bg-green-700 text-white py-3 rounded-lg font-medium transition-colors w-full">
                  Approve Action
                </button>
                <button 
                  onClick={() => handleDecision(review.id, 'DENIED')}
                  className="bg-red-600 hover:bg-red-700 text-white py-3 rounded-lg font-medium transition-colors w-full">
                  Deny Action
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
