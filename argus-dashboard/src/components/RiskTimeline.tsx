import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine, ResponsiveContainer
} from 'recharts'

interface RiskPoint {
  time: string
  riskScore: number
  action: string
  decision: string
}

export function RiskTimeline({ data }: { data: RiskPoint[] }) {
  return (
    <div>
      <h3 className="font-semibold text-sm text-foreground mb-4">Risk Score Timeline</h3>
      <ResponsiveContainer width="100%" height={220}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#E5E5E0" vertical={false} />
          <XAxis dataKey="time" stroke="#A3A3A0" tick={{ fontSize: 10, fontFamily: 'JetBrains Mono' }} />
          <YAxis domain={[0, 1]} stroke="#A3A3A0" tick={{ fontSize: 10, fontFamily: 'JetBrains Mono' }} tickFormatter={(v: number) => `${(v * 100).toFixed(0)}%`} />
          <Tooltip
            contentStyle={{
              background: '#FFFFFF',
              border: '1px solid #E5E5E0',
              borderRadius: 8,
              boxShadow: '0 4px 12px rgba(0,0,0,0.04)',
              fontSize: 12,
            }}
            formatter={(value: number) => [`${(value * 100).toFixed(0)}%`, 'Risk Score']}
            labelFormatter={(label: string) => `Time: ${label}`}
          />
          <ReferenceLine y={0.7} stroke="#D97706" strokeDasharray="4 4" label={{ value: 'High Risk', fill: '#D97706', fontSize: 10 }} />
          <ReferenceLine y={0.9} stroke="#DC2626" strokeDasharray="4 4" label={{ value: 'Critical', fill: '#DC2626', fontSize: 10 }} />
          <Line
            type="monotone"
            dataKey="riskScore"
            stroke="#4F46E5"
            strokeWidth={2}
            dot={(props: any) => {
              const isBad = props.payload.decision === 'quarantine' || props.payload.decision === 'deny'
              return (
                <circle
                  key={`dot-${props.index}`}
                  cx={props.cx}
                  cy={props.cy}
                  r={4}
                  fill={isBad ? '#DC2626' : '#059669'}
                  stroke="#FFFFFF"
                  strokeWidth={1.5}
                />
              )
            }}
            activeDot={{ r: 5, fill: '#4F46E5', stroke: '#FFFFFF', strokeWidth: 2 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
