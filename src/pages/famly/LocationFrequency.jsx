import { useState } from 'react'
import { locationCounts, filterByMonth, rollingWindow, currentYearMonth } from '../../lib/famly/dataHelpers'

export default function LocationFrequency({ incidents }) {
  const [view, setView] = useState('month')

  const ym = currentYearMonth()
  const data = view === 'month'
    ? locationCounts(filterByMonth(incidents, ym))
    : locationCounts(rollingWindow(incidents, 3))

  const max = data[0]?.count ?? 1
  const label = view === 'month'
    ? new Date().toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })
    : 'Last 3 months'

  return (
    <div className="bg-white border border-stone-200 rounded-lg p-4">
      <div className="flex items-center justify-between mb-1">
        <h2 className="text-sm font-semibold text-slate-700">Incidents by location</h2>
        <div className="flex rounded-md overflow-hidden border border-stone-200 text-xs">
          <button
            onClick={() => setView('month')}
            className={`px-2.5 py-1 ${view === 'month' ? 'bg-amber-50 text-amber-700 font-medium' : 'text-slate-500 hover:bg-stone-50'}`}
          >
            This month
          </button>
          <button
            onClick={() => setView('3months')}
            className={`px-2.5 py-1 border-l border-stone-200 ${view === '3months' ? 'bg-amber-50 text-amber-700 font-medium' : 'text-slate-500 hover:bg-stone-50'}`}
          >
            3 months
          </button>
        </div>
      </div>
      <p className="text-xs text-slate-400 mb-4">{label}</p>
      {data.length === 0 ? (
        <p className="text-sm text-slate-400 py-6 text-center">No incidents in this period</p>
      ) : (
        <div className="space-y-2">
          {data.map(({ location, count }) => (
            <div key={location} className="flex items-center gap-2">
              <span className="text-xs text-slate-600 w-28 shrink-0 truncate">{location}</span>
              <div className="flex-1 h-5 bg-stone-100 rounded overflow-hidden">
                <div className="h-full bg-teal-600 rounded" style={{ width: `${(count / max) * 100}%` }} />
              </div>
              <span className="text-xs font-medium text-slate-700 w-5 text-right shrink-0">{count}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
