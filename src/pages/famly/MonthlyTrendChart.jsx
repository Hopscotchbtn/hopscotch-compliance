import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { buildTrend } from '../../lib/famly/dataHelpers'

export default function MonthlyTrendChart({ incidents }) {
  const data = buildTrend(incidents)
  return (
    <div className="bg-white border border-stone-200 rounded-lg p-4">
      <h2 className="text-sm font-semibold text-slate-700 mb-4">12-month trend</h2>
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={data} margin={{ top: 0, right: 8, left: -16, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f0ed" vertical={false} />
          <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
          <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
          <Tooltip
            contentStyle={{ fontSize: 12, border: '1px solid #e7e5e0', borderRadius: 6 }}
            cursor={{ fill: '#f5f3ef' }}
          />
          <Legend wrapperStyle={{ fontSize: 12, paddingTop: 8 }} iconType="square" iconSize={10} />
          <Bar dataKey="accidents" name="Accidents" stackId="a" fill="#b45309" />
          <Bar dataKey="incidents" name="Incidents" stackId="a" fill="#0f766e" radius={[3, 3, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
