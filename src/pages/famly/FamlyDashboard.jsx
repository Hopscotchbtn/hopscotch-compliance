import { useState, useEffect, useMemo } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'

// ─── period helpers ──

function ymKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
}

function previousMonthKey() {
  const now = new Date()
  const prev = new Date(now.getFullYear(), now.getMonth() - 1, 1)
  return ymKey(prev)
}

function monthLabel(yearMonth) {
  const [y, m] = yearMonth.split('-').map(Number)
  return new Date(y, m - 1, 1).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })
}

function getMonthOptions() {
  const opts = []
  const now = new Date()
  for (let i = 1; i <= 12; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    opts.push({ key: ymKey(d), label: monthLabel(ymKey(d)) })
  }
  return opts
}

function buildPeriod(type, monthKey) {
  const now = new Date()
  if (type === 'month') {
    const [y, m] = monthKey.split('-').map(Number)
    const from = new Date(y, m - 1, 1)
    const to = new Date(y, m, 0, 23, 59, 59, 999)
    return { type: 'month', from, to, label: monthLabel(monthKey), monthKey }
  }
  if (type === 'ytd') {
    const from = new Date(now.getFullYear(), 0, 1)
    const to = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999)
    const firstLabel = from.toLocaleDateString('en-GB', { month: 'short' })
    const lastLabel = to.toLocaleDateString('en-GB', { month: 'short', year: 'numeric' })
    return { type: 'ytd', from, to, label: `${firstLabel} – ${lastLabel}` }
  }
  // 12month — last 12 completed months
  const to = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999)
  const from = new Date(to.getFullYear(), to.getMonth() - 11, 1)
  const fromLabel = from.toLocaleDateString('en-GB', { month: 'short', year: 'numeric' })
  const toLabel = to.toLocaleDateString('en-GB', { month: 'short', year: 'numeric' })
  return { type: '12month', from, to, label: `${fromLabel} – ${toLabel}` }
}

// ─── UI ──

const REPORT_TYPES = [
  { id: 'month', label: 'Single month' },
  { id: '12month', label: '12-month' },
  { id: 'ytd', label: 'Year-to-date' },
]

const ALL_NURSERIES_ID = '__all__'

export function FamlyDashboard() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [sites, setSites] = useState([])
  const [selectedSiteId, setSelectedSiteId] = useState(() => searchParams.get('site') ?? '')
  const [reportType, setReportType] = useState(() => searchParams.get('type') ?? 'month')
  const [selectedMonth, setSelectedMonth] = useState(() => searchParams.get('month') ?? previousMonthKey())
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const monthOptions = useMemo(() => getMonthOptions(), [])
  const currentPeriod = useMemo(() => buildPeriod(reportType, selectedMonth), [reportType, selectedMonth])

  useEffect(() => {
    fetch('/api/famly-sites')
      .then(res => {
        if (!res.ok) throw new Error('Failed to load sites')
        return res.json()
      })
      .then(data => {
        if (Array.isArray(data) && data.length > 0) {
          setSites(data)
          setSelectedSiteId(prev => prev || data[0].id)
        }
        setLoading(false)
      })
      .catch(err => {
        setError(err.message)
        setLoading(false)
      })
  }, [])

  const isAllNurseries = selectedSiteId === ALL_NURSERIES_ID
  const availableReportTypes = REPORT_TYPES

  const handleViewReport = () => {
    if (!selectedSiteId) return
    let params
    if (isAllNurseries) {
      const ids = sites.map(s => s.id).join(',')
      params = new URLSearchParams({ siteIds: ids, type: reportType, month: selectedMonth })
    } else {
      params = new URLSearchParams({ site: selectedSiteId, type: reportType, month: selectedMonth })
    }
    navigate(`/famly-dashboard/report?${params.toString()}`)
  }

  const buttonLabel = reportType === 'month'
    ? `View ${monthLabel(selectedMonth)} report`
    : reportType === '12month'
      ? 'View 12-month report'
      : 'View year-to-date report'

  return (
    <div className="min-h-screen bg-stone-50">
      <header className="border-b border-stone-200 bg-white">
        <div className="max-w-md mx-auto px-4 py-4">
          <Link to="/" className="text-slate-400 hover:text-slate-600 text-sm">← Back</Link>
          <h1 className="text-lg font-semibold text-slate-800 mt-2">Accident Review</h1>
          <p className="text-sm text-slate-500 mt-1">
            View accident reports from Famly for any site and time window
          </p>
        </div>
      </header>

      <main className="max-w-md mx-auto px-4 py-8">
        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block w-6 h-6 border-2 border-amber-600 border-t-transparent rounded-full animate-spin" />
            <p className="text-sm text-slate-500 mt-3">Loading sites...</p>
          </div>
        ) : error && sites.length === 0 ? (
          <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-6 text-center">
            <p className="text-sm text-red-700 font-medium">Unable to connect to Famly</p>
            <p className="text-xs text-red-600 mt-1">{error}</p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Site selector */}
            <div className="bg-white border border-stone-200 rounded-lg p-4">
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Site</label>
              <select
                value={selectedSiteId}
                onChange={e => setSelectedSiteId(e.target.value)}
                className="w-full text-sm border border-stone-200 rounded-md px-3 py-2.5 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-amber-500"
              >
                <option value={ALL_NURSERIES_ID}>All nurseries</option>
                {sites.map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
              {isAllNurseries && (
                <p className="text-xs text-slate-400 mt-2">Statistical data only — no children's names or personal information.</p>
              )}
            </div>

            {/* Report type */}
            <div className="bg-white border border-stone-200 rounded-lg p-4">
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Report type</label>
              <div className="grid grid-cols-3 gap-1 bg-stone-100 rounded-md p-1">
                {availableReportTypes.map(t => {
                  const active = reportType === t.id
                  return (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setReportType(t.id)}
                      className={`text-xs font-medium px-2 py-2 rounded transition-colors ${
                        active ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                      }`}
                    >
                      {t.label}
                    </button>
                  )
                })}
              </div>

              {reportType === 'month' && (
                <div className="mt-4">
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Month</label>
                  <select
                    value={selectedMonth}
                    onChange={e => setSelectedMonth(e.target.value)}
                    className="w-full text-sm border border-stone-200 rounded-md px-3 py-2.5 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  >
                    {monthOptions.map(o => (
                      <option key={o.key} value={o.key}>{o.label}</option>
                    ))}
                  </select>
                </div>
              )}

              <p className="mt-3 text-xs text-slate-400">
                Period: <span className="font-medium text-slate-500">{currentPeriod.label}</span>
              </p>
            </div>

            {/* View report button */}
            <button
              onClick={handleViewReport}
              disabled={!selectedSiteId}
              className="w-full text-base font-semibold bg-amber-600 text-white rounded-lg px-4 py-4 hover:bg-amber-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              {buttonLabel}
            </button>
            <p className="text-center text-xs text-slate-400 -mt-1">
              Opens the report in your browser. Print or download as PDF from there.
            </p>

            {error && sites.length > 0 && (
              <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            )}

            {/* Info */}
            <div className="bg-stone-100 rounded-lg p-4 text-xs text-slate-500 leading-relaxed">
              <p className="font-medium text-slate-600 mb-1">What's in the report?</p>
              <ul className="list-disc list-inside space-y-0.5">
                <li>Headline counts: total reports, arrived-with-injury, acknowledgement rate, formal-review count</li>
                <li>RIDDOR / Ofsted / LADO flags (shown only when present)</li>
                <li>High and medium priority reports for manager review</li>
                <li>Top 8 repeat children ranked, with most recent incident</li>
                <li>Location breakdown — with "Home" highlighted as a data-quality check</li>
                <li>Day-of-week distribution</li>
                <li>Reviewed-by signature line for your own sign-off</li>
              </ul>
            </div>
          </div>
        )}
      </main>

      <footer className="max-w-md mx-auto px-4 py-6 text-center text-xs text-slate-400">
        Internal use only · Data from Famly
      </footer>
    </div>
  )
}
