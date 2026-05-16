import { useState, useEffect } from 'react';
import { Shield, AlertTriangle, Activity, Users, FileText, Settings, RefreshCw, CheckCircle, XCircle, Clock } from 'lucide-react';

interface ActionItem {
  id: string;
  action: string;
  target: string;
  decision: 'allow' | 'deny' | 'quarantine';
  riskScore: number;
  timestamp: Date;
}

interface ReviewItem {
  id: string;
  action: string;
  target: string;
  riskScore: number;
  reason: string;
  createdAt: Date;
  status: 'pending' | 'in_review' | 'approved' | 'denied';
}

interface Stats {
  totalActions: number;
  blockedActions: number;
  quarantined: number;
  reviewQueue: number;
  avgResponseTime: number;
  threatLevel: 'low' | 'normal' | 'high' | 'critical';
}

export default function Dashboard() {
  const [actions, setActions] = useState<ActionItem[]>([]);
  const [reviews, setReviews] = useState<ReviewItem[]>([]);
  const [stats, setStats] = useState<Stats>({
    totalActions: 0,
    blockedActions: 0,
    quarantined: 0,
    reviewQueue: 0,
    avgResponseTime: 0,
    threatLevel: 'normal'
  });
  const [isLive, setIsLive] = useState(true);

  // Simulated real-time data
  useEffect(() => {
    const mockActions: ActionItem[] = [
      { id: '1', action: 'read_email', target: 'complaint_123@customer.com', decision: 'allow', riskScore: 0.12, timestamp: new Date() },
      { id: '2', action: 'write_reply', target: 'customer@example.com', decision: 'allow', riskScore: 0.15, timestamp: new Date() },
      { id: '3', action: 'forward_email', target: 'backup@external.com', decision: 'quarantine', riskScore: 0.87, timestamp: new Date() },
      { id: '4', action: 'read_email', target: 'complaint_456@customer.com', decision: 'allow', riskScore: 0.18, timestamp: new Date() },
      { id: '5', action: 'delete_email', target: 'old_emails@customer.com', decision: 'deny', riskScore: 0.94, timestamp: new Date() },
    ];
    setActions(mockActions);

    const mockReviews: ReviewItem[] = [
      { id: 'r1', action: 'forward_email', target: 'backup@external.com', riskScore: 0.87, reason: 'Intent mismatch: external domain not authorized', createdAt: new Date(), status: 'pending' },
      { id: 'r2', action: 'send_email', target: 'external@malicious.com', riskScore: 0.95, reason: 'Exfiltration pattern detected', createdAt: new Date(), status: 'pending' },
      { id: 'r3', action: 'grant_permission', target: 'new_admin@company.com', riskScore: 0.78, reason: 'Permission escalation detected', createdAt: new Date(), status: 'in_review' },
    ];
    setReviews(mockReviews);

    setStats({
      totalActions: 1247,
      blockedActions: 23,
      quarantined: 5,
      reviewQueue: 3,
      avgResponseTime: 87,
      threatLevel: 'normal'
    });
  }, []);

  const getThreatColor = (level: string) => {
    switch (level) {
      case 'low': return 'text-green-500';
      case 'normal': return 'text-blue-500';
      case 'high': return 'text-orange-500';
      case 'critical': return 'text-red-500';
      default: return 'text-gray-500';
    }
  };

  const getDecisionBadge = (decision: string) => {
    switch (decision) {
      case 'allow':
        return <span className="px-2 py-1 bg-green-500/20 text-green-400 rounded text-xs font-medium">ALLOW</span>;
      case 'deny':
        return <span className="px-2 py-1 bg-red-500/20 text-red-400 rounded text-xs font-medium">DENY</span>;
      case 'quarantine':
        return <span className="px-2 py-1 bg-yellow-500/20 text-yellow-400 rounded text-xs font-medium">QUARANTINE</span>;
      default:
        return <span className="px-2 py-1 bg-gray-500/20 text-gray-400 rounded text-xs font-medium">{decision}</span>;
    }
  };

  const getRiskScoreColor = (score: number) => {
    if (score < 0.3) return 'text-green-500';
    if (score < 0.7) return 'text-yellow-500';
    return 'text-red-500';
  };

  return (
    <div className="min-h-screen bg-slate-900 text-white">
      {/* Header */}
      <header className="bg-slate-800 border-b border-slate-700 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
              <Shield className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold">ARGUS</h1>
              <p className="text-xs text-slate-400">AI Agent Pre-Action Authorization Gateway</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-sm text-slate-400">Threat Level:</span>
              <span className={`font-bold ${getThreatColor(stats.threatLevel)}`}>
                {stats.threatLevel.toUpperCase()}
              </span>
            </div>
            <button
              onClick={() => setIsLive(!isLive)}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg ${isLive ? 'bg-green-600' : 'bg-slate-700'}`}
            >
              <Activity className="w-4 h-4" />
              <span className="text-sm font-medium">{isLive ? 'LIVE' : 'PAUSED'}</span>
            </button>
            <button className="p-2 hover:bg-slate-700 rounded-lg">
              <Settings className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      <main className="p-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="bg-slate-800 rounded-xl p-5 border border-slate-700">
            <div className="flex items-center justify-between mb-3">
              <span className="text-slate-400 text-sm">Total Actions</span>
              <Activity className="w-5 h-5 text-blue-500" />
            </div>
            <p className="text-3xl font-bold">{stats.totalActions.toLocaleString()}</p>
            <p className="text-xs text-slate-500 mt-1">Last 24 hours</p>
          </div>

          <div className="bg-slate-800 rounded-xl p-5 border border-slate-700">
            <div className="flex items-center justify-between mb-3">
              <span className="text-slate-400 text-sm">Blocked Actions</span>
              <XCircle className="w-5 h-5 text-red-500" />
            </div>
            <p className="text-3xl font-bold text-red-500">{stats.blockedActions}</p>
            <p className="text-xs text-slate-500 mt-1">Attack attempts stopped</p>
          </div>

          <div className="bg-slate-800 rounded-xl p-5 border border-slate-700">
            <div className="flex items-center justify-between mb-3">
              <span className="text-slate-400 text-sm">Quarantined</span>
              <AlertTriangle className="w-5 h-5 text-yellow-500" />
            </div>
            <p className="text-3xl font-bold text-yellow-500">{stats.quarantined}</p>
            <p className="text-xs text-slate-500 mt-1">Awaiting human review</p>
          </div>

          <div className="bg-slate-800 rounded-xl p-5 border border-slate-700">
            <div className="flex items-center justify-between mb-3">
              <span className="text-slate-400 text-sm">Avg Response</span>
              <Clock className="w-5 h-5 text-green-500" />
            </div>
            <p className="text-3xl font-bold">{stats.avgResponseTime}ms</p>
            <p className="text-xs text-slate-500 mt-1">Intent extraction latency</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Live Action Feed */}
          <div className="lg:col-span-2 bg-slate-800 rounded-xl border border-slate-700">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-700">
              <h2 className="font-semibold flex items-center gap-2">
                <Activity className="w-5 h-5" />
                Live Action Feed
              </h2>
              <button className="p-2 hover:bg-slate-700 rounded-lg">
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>
            <div className="p-4 max-h-96 overflow-y-auto">
              {actions.map((action) => (
                <div key={action.id} className="flex items-center justify-between py-3 border-b border-slate-700/50 last:border-0">
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-sm bg-slate-700 px-2 py-1 rounded">{action.action}</span>
                      <span className="text-slate-400 text-sm">→</span>
                      <span className="text-sm text-slate-300 truncate max-w-[200px]">{action.target}</span>
                    </div>
                    <p className="text-xs text-slate-500 mt-1">
                      {action.timestamp.toLocaleTimeString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className={`text-lg font-bold ${getRiskScoreColor(action.riskScore)}`}>
                        {(action.riskScore * 100).toFixed(0)}%
                      </p>
                      <p className="text-xs text-slate-500">risk</p>
                    </div>
                    {getDecisionBadge(action.decision)}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Human Review Queue */}
          <div className="bg-slate-800 rounded-xl border border-slate-700">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-700">
              <h2 className="font-semibold flex items-center gap-2">
                <Users className="w-5 h-5" />
                Review Queue
              </h2>
              <span className="bg-yellow-500/20 text-yellow-400 px-2 py-1 rounded text-xs font-bold">
                {reviews.length}
              </span>
            </div>
            <div className="p-4 max-h-96 overflow-y-auto">
              {reviews.length === 0 ? (
                <div className="text-center py-8 text-slate-500">
                  <CheckCircle className="w-8 h-8 mx-auto mb-2" />
                  <p>No pending reviews</p>
                </div>
              ) : (
                reviews.map((review) => (
                  <div key={review.id} className="bg-slate-700/50 rounded-lg p-4 mb-3">
                    <div className="flex items-start justify-between mb-2">
                      <span className="font-mono text-sm bg-slate-600 px-2 py-1 rounded">{review.action}</span>
                      <span className={`text-sm font-bold ${getRiskScoreColor(review.riskScore)}`}>
                        {(review.riskScore * 100).toFixed(0)}%
                      </span>
                    </div>
                    <p className="text-sm text-slate-300 mb-2">{review.target}</p>
                    <p className="text-xs text-yellow-400 mb-3">{review.reason}</p>
                    <div className="flex gap-2">
                      <button className="flex-1 bg-green-600 hover:bg-green-700 text-white py-2 rounded text-sm font-medium">
                        Approve
                      </button>
                      <button className="flex-1 bg-red-600 hover:bg-red-700 text-white py-2 rounded text-sm font-medium">
                        Deny
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Intent-Action Alignment Chart */}
        <div className="mt-6 bg-slate-800 rounded-xl border border-slate-700 p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Intent-Action Alignment
            </h2>
            <div className="flex items-center gap-4 text-sm">
              <span className="flex items-center gap-2">
                <span className="w-3 h-3 bg-green-500 rounded"></span>
                Aligned (98.2%)
              </span>
              <span className="flex items-center gap-2">
                <span className="w-3 h-3 bg-yellow-500 rounded"></span>
                Flagged (1.5%)
              </span>
              <span className="flex items-center gap-2">
                <span className="w-3 h-3 bg-red-500 rounded"></span>
                Blocked (0.3%)
              </span>
            </div>
          </div>
          <div className="h-4 bg-slate-700 rounded-full overflow-hidden flex">
            <div className="bg-green-500 h-full" style={{ width: '98.2%' }}></div>
            <div className="bg-yellow-500 h-full" style={{ width: '1.5%' }}></div>
            <div className="bg-red-500 h-full" style={{ width: '0.3%' }}></div>
          </div>
          <div className="flex justify-between mt-2 text-xs text-slate-500">
            <span>0</span>
            <span>500</span>
            <span>1000</span>
            <span>1247 actions</span>
          </div>
        </div>

        {/* Demo Control Panel */}
        <div className="mt-6 bg-slate-800 rounded-xl border border-slate-700 p-5">
          <h2 className="font-semibold mb-4">Demo Controls</h2>
          <div className="flex gap-4">
            <button className="bg-red-600 hover:bg-red-700 px-4 py-2 rounded-lg text-sm font-medium">
              Simulate Attack (Without ARGUS)
            </button>
            <button className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg text-sm font-medium">
              Simulate Attack (With ARGUS)
            </button>
            <button className="bg-slate-700 hover:bg-slate-600 px-4 py-2 rounded-lg text-sm font-medium">
              Reset Demo
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}