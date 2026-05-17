import { LineChart, Line, XAxis as RechartsXAxis, YAxis as RechartsYAxis, CartesianGrid, Tooltip as RechartsTooltip, ReferenceLine as RechartsReferenceLine, ResponsiveContainer } from 'recharts'

const XAxis = RechartsXAxis as any
const YAxis = RechartsYAxis as any
const Tooltip = RechartsTooltip as any
const ReferenceLine = RechartsReferenceLine as any
const LineComp = Line as any

interface RiskPoint {
  time: string
  riskScore: number
  action: string
  decision: string
}

export function RiskTimeline({ data }: { data: RiskPoint[] }) {
  return (
    <div className="bg-slate-800 rounded-xl border border-slate-700 p-5">
      <h2 className="font-semibold mb-4 text-slate-100">Risk Score Timeline</h2>
      <ResponsiveContainer width="100%" height={200}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
          <XAxis dataKey="time" stroke="#64748b" tick={{ fontSize: 11 }} />
          <YAxis domain={[0, 1]} stroke="#64748b" tick={{ fontSize: 11 }} />
          <Tooltip
            contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 8 }}
            formatter={(value: number) => [`${(value * 100).toFixed(0)}%`, 'Risk Score']}
          />
          <ReferenceLine y={0.7} stroke="#f97316" strokeDasharray="4 4" label={{ value: 'High Risk', fill: '#f97316', fontSize: 11 }} />
          <ReferenceLine y={0.9} stroke="#ef4444" strokeDasharray="4 4" label={{ value: 'Critical', fill: '#ef4444', fontSize: 11 }} />
          <LineComp
            type="monotone"
            dataKey="riskScore"
            stroke="#3b82f6"
            strokeWidth={2}
            dot={(props: any) => {
              const color = props.payload.decision === 'quarantine' || props.payload.decision === 'deny'
                ? '#ef4444' : '#22c55e'
              return <circle key={props.key || props.index} cx={props.cx} cy={props.cy} r={4} fill={color} />
            }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
