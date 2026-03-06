import { filterByMonth, currentYearMonth, lastYearYearMonth } from '../../lib/famly/dataHelpers'

function DeltaBadge({ current, previous }) {
  if (previous === 0) return <span className="text-xs text-slate-400">No prior year data</span>
  const d = current - previous
  if (d === 0) return <span className="text-xs text-slate-500">Same as last year</span>
  return (
    <span className={`text-xs font-medium ${d > 0 ? 'text-red-600' : 'text-teal-700'}`}>
      {d > 0 ? '▲' : '▼'} {Math.abs(d)} vs last year
    </span>
  )
}

export default function MonthlySummaryCards({ incidents }) {
  const ym = currentYearMonth()
  const lym = lastYearYearMonth()
  const thisMonth = filterByMonth(incidents, ym)
  const lastYear = filterByMonth(incidents, lym)

  const thisAccidents = thisMonth.filter(x => x.kind === 'Accident').length
  const thisIncidents = thisMonth.filter(x => x.kind === 'Incident').length
  const lastAccidents = lastYear.filter(x => x.kind === 'Accident').length
  const lastIncidents = lastYear.filter(x => x.kind === 'Incident').length

  const monthLabel = new Date().toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })

  return (
    <div className="space-y-1">
      <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-400 px-1">{monthLabel}</h2>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-white border border-stone-200 rounded-lg p-4">
          <p className="text-xs text-slate-500 mb-1">Total this month</p>
          <p className="text-3xl font-bold text-slate-800">{thisMonth.length}</p>
          <div className="mt-1"><DeltaBadge current={thisMonth.length} previous={lastYear.length} /></div>
        </div>
        <div className="bg-white border border-stone-200 rounded-lg p-4">
          <p className="text-xs text-slate-500 mb-1">Accidents</p>
          <p className="text-3xl font-bold text-amber-700">{thisAccidents}</p>
          <div className="mt-1"><DeltaBadge current={thisAccidents} previous={lastAccidents} /></div>
        </div>
        <div className="bg-white border border-stone-200 rounded-lg p-4">
          <p className="text-xs text-slate-500 mb-1">Incidents</p>
          <p className="text-3xl font-bold text-teal-700">{thisIncidents}</p>
          <div className="mt-1"><DeltaBadge current={thisIncidents} previous={lastIncidents} /></div>
        </div>
      </div>
    </div>
  )
}
