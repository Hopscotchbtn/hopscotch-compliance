import { filterByMonth, currentYearMonth, lastYearYearMonth } from '../../lib/famly/dataHelpers'

function DeltaBadge({ current, previous }) {
  if (previous === 0) return <span className="text-xs text-slate-400">No prior year data</span>
  const d = current - previous
  if (d === 0) return <span className="text-xs text-slate-500">Same as last year</span>
  const pct = Math.round(Math.abs(d / previous) * 100)
  return (
    <span className={`text-xs font-medium ${d > 0 ? 'text-red-600' : 'text-teal-700'}`}>
      {d > 0 ? '▲' : '▼'} {Math.abs(d)} ({pct}%) vs last year
    </span>
  )
}

function SkeletonCard({ large }) {
  return (
    <div className={`bg-white border border-stone-200 rounded-lg p-4 animate-pulse ${large ? 'sm:col-span-2' : ''}`}>
      <div className="h-3 w-24 bg-stone-100 rounded mb-3" />
      <div className={`${large ? 'h-12 w-20' : 'h-8 w-14'} bg-stone-100 rounded mb-2`} />
      <div className="h-3 w-32 bg-stone-100 rounded" />
    </div>
  )
}

export default function MonthlySummaryCards({ incidents, loading }) {
  const ym = currentYearMonth()
  const lym = lastYearYearMonth()
  const thisMonth = filterByMonth(incidents, ym)
  const lastYear = filterByMonth(incidents, lym)

  const thisAccidents = thisMonth.filter(x => x.kind === 'Accident').length
  const thisIncidents = thisMonth.filter(x => x.kind === 'Incident').length
  const lastAccidents = lastYear.filter(x => x.kind === 'Accident').length
  const lastIncidents = lastYear.filter(x => x.kind === 'Incident').length
  const needsReview = thisMonth.filter(x => x.severity === 'high' || x.severity === 'medium').length

  const monthLabel = new Date().toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })

  return (
    <div className="space-y-2">
      <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-400 px-1">{monthLabel}</h2>

      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <SkeletonCard large /><SkeletonCard /><SkeletonCard />
        </div>
      ) : (
        <>
          {needsReview > 0 && (
            <div className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-lg px-4 py-3">
              <span className="text-red-500 text-lg leading-none mt-0.5">⚑</span>
              <div>
                <p className="text-sm font-semibold text-red-800">
                  {needsReview} incident{needsReview !== 1 ? 's' : ''} this month may need formal review
                </p>
                <p className="text-xs text-red-600 mt-0.5">
                  Flagged based on description — scroll to Recent Incidents to review and log in IncidentIQ
                </p>
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {/* Accidents — primary/large */}
            <div className="bg-white border border-stone-200 rounded-lg p-4 col-span-2">
              <p className="text-xs text-slate-500 mb-1">
                Accidents this month
                <span className="ml-1 text-stone-300">· falls, collisions, injuries</span>
              </p>
              <p className="text-5xl font-bold text-amber-700">{thisAccidents}</p>
              <div className="mt-2">
                <DeltaBadge current={thisAccidents} previous={lastAccidents} />
              </div>
            </div>

            {/* Incidents — secondary */}
            <div className="bg-white border border-stone-200 rounded-lg p-4">
              <p className="text-xs text-slate-500 mb-1">
                Incidents
                <span className="block text-stone-300">biting, aggression, near-misses</span>
              </p>
              <p className="text-3xl font-bold text-teal-700">{thisIncidents}</p>
              <div className="mt-1">
                <DeltaBadge current={thisIncidents} previous={lastIncidents} />
              </div>
            </div>

            {/* Total */}
            <div className="bg-white border border-stone-200 rounded-lg p-4">
              <p className="text-xs text-slate-500 mb-1">Total</p>
              <p className="text-3xl font-bold text-slate-700">{thisMonth.length}</p>
              <div className="mt-1">
                <DeltaBadge current={thisMonth.length} previous={lastYear.length} />
              </div>
            </div>
          </div>

          {lastYear.length > 0 && (
            <p className="text-xs text-slate-400 px-1">
              Year-on-year comparison. Increases may reflect higher occupancy or improved reporting rather than increased risk.
            </p>
          )}
        </>
      )}
    </div>
  )
}
