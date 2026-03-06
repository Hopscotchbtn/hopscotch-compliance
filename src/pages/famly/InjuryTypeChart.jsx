import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell, ResponsiveContainer } from 'recharts'
import { categoryCounts, filterByMonth, currentYearMonth } from '../../lib/famly/dataHelpers'

const BAR_COLOURS = ['#b45309', '#d97706', '#f59e0b', '#fbbf24', '#fcd34d']

export default function InjuryTypeChart({ incidents }) {
  const ym = currentYearMonth()
  const thisMonth = incidents.filter(x => x.happenedAt.startsWith(ym))
  const counts = categoryCounts(thisMonth).filter(c => c.count > 0)
  const monthLabel = new Date().toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })

  return (
    <div className="bg-white border border-stone-200 rounded-lg p-4">
      <h2 className="text-sm font-semibold text-slate-700 mb-1">Injury type breakdown</h2>
      <p className="text-xs text-slate-400 mb-4">{monthLabel} · auto-classified from report text</p>
      {counts.length === 0 ? (
        <p className="text-sm text-slate-400 py-8 text-center">No incidents recorded this month</p>
      ) : (
        <ResponsiveContainer width="100%" height={Math.max(counts.length * 32, 120)}>
          <BarChart data={counts} layout="vertical" margin={{ top: 0, right: 24, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f0ed" horizontal={false} />
            <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
            <YAxis type="category" dataKey="category" width={130} tick={{ fontSize: 11, fill: '#475569' }} axisLine={false} tickLine={false} />
            <Tooltip
              contentStyle={{ fontSize: 12, border: '1px solid #e7e5e0', borderRadius: 6 }}
              cursor={{ fill: '#f5f3ef' }}
              formatter={v => [v, 'Count']}
            />
            <Bar dataKey="count" radius={[0, 3, 3, 0]} maxBarSize={22}>
              {counts.map((_, i) => (
                <Cell key={i} fill={BAR_COLOURS[Math.min(i, BAR_COLOURS.length - 1)]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  )
}
