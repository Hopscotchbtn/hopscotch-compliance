import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell, ResponsiveContainer } from 'recharts'
import { categoryCounts, currentYearMonth } from '../../lib/famly/dataHelpers'

const BAR_COLOURS = ['#b45309', '#d97706', '#f59e0b', '#fbbf24', '#fcd34d']

// On small screens, cap at 6 categories to keep the chart readable
const MOBILE_MAX = 6

function Skeleton() {
  return (
    <div className="animate-pulse space-y-2 pt-2">
      {[90, 70, 55, 40, 25].map((w, i) => (
        <div key={i} className="flex items-center gap-2">
          <div className="h-3 w-28 bg-stone-100 rounded" />
          <div className="h-5 bg-stone-100 rounded" style={{ width: `${w}%` }} />
        </div>
      ))}
    </div>
  )
}

export default function InjuryTypeChart({ incidents, loading }) {
  const ym = currentYearMonth()
  const thisMonth = incidents.filter(x => x.happenedAt.startsWith(ym))
  const allCounts = categoryCounts(thisMonth).filter(c => c.count > 0)
  const monthLabel = new Date().toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })

  // Use window width to decide whether to cap categories
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768
  const counts = isMobile ? allCounts.slice(0, MOBILE_MAX) : allCounts
  const hiddenCount = allCounts.length - counts.length

  return (
    <div className="bg-white border border-stone-200 rounded-lg p-4">
      <h2 className="text-sm font-semibold text-slate-700 mb-0.5">Injury type breakdown</h2>
      <p className="text-xs text-slate-500 mb-1">{monthLabel}</p>

      {/* Classification caveat */}
      <div className="flex items-start gap-1.5 bg-stone-50 border border-stone-100 rounded px-2.5 py-2 mb-4">
        <span className="text-stone-400 text-sm leading-none mt-0.5">ⓘ</span>
        <p className="text-xs text-slate-500 leading-relaxed">
          Categories are <strong>automatically detected</strong> from the incident description text and may not always be accurate.
          Check the full incident detail before relying on these figures for reports or audits.
        </p>
      </div>

      {loading ? (
        <Skeleton />
      ) : counts.length === 0 ? (
        <p className="text-sm text-slate-400 py-8 text-center">No incidents recorded this month</p>
      ) : (
        <>
          <ResponsiveContainer width="100%" height={Math.max(counts.length * 34, 120)}>
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
          {hiddenCount > 0 && (
            <p className="text-xs text-slate-400 text-center mt-1">
              + {hiddenCount} more categor{hiddenCount === 1 ? 'y' : 'ies'} — view on a larger screen
            </p>
          )}
        </>
      )}
    </div>
  )
}
