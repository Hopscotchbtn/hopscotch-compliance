import { useState, useEffect, useCallback, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { classifyAll } from '../../lib/famly/dataHelpers'
import { generateMonthlyReportPDF } from '../../lib/famly/generateMonthlyReportPDF'

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
    const to = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999)
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

function fetchRangeForPeriod(period) {
  // For month reports we want the prior year same month too, so fetch ~13 months ending at period.to
  if (period.type === 'month') {
    const from = new Date(period.from.getFullYear() - 1, period.from.getMonth(), 1)
    return { from, to: period.to }
  }
  return { from: period.from, to: period.to }
}

// ─── UI ──

const REPORT_TYPES = [
  { id: 'month', label: 'Single month' },
  { id: '12month', label: '12-month' },
  { id: 'ytd', label: 'Year-to-date' },
]

export function FamlyDashboard() {
  const [sites, setSites] = useState([])
  const [selectedSiteId, setSelectedSiteId] = useState('')
  const [reportType, setReportType] = useState('month')
  const [selectedMonth, setSelectedMonth] = useState(() => previousMonthKey())
  const [loading, setLoading] = useState(true)
  const [downloading, setDownloading] = useState(false)
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
          setSelectedSiteId(data[0].id)
        }
        setLoading(false)
      })
      .catch(err => {
        setError(err.message)
        setLoading(false)
      })
  }, [])

  const handleDownload = useCallback(async () => {
    if (!selectedSiteId) return
    setDownloading(true)
    setError(null)
    try {
      const period = buildPeriod(reportType, selectedMonth)
      const range = fetchRangeForPeriod(period)
      const fromStr = range.from.toISOString().slice(0, 10)
      const toStr = range.to.toISOString().slice(0, 10)

      const res = await fetch(`/api/famly-incidents?siteId=${selectedSiteId}&from=${fromStr}&to=${toStr}`)
      if (!res.ok) throw new Error('Failed to load incidents')
      const incidents = await res.json()

      const classified = classifyAll(incidents)
      const siteName = sites.find(s => s.id === selectedSiteId)?.name ?? 'Site'
      generateMonthlyReportPDF(classified, siteName, period)
    } catch (err) {
      setError(err.message ?? 'Failed to generate report')
    } finally {
      setDownloading(false)
    }
  }, [selectedSiteId, reportType, selectedMonth, sites])

  const buttonLabel = reportType === 'month'
    ? `Download ${monthLabel(selectedMonth)} report`
    : reportType === '12month'
      ? 'Download 12-month report'
      : 'Download year-to-date report'

  return (
    <div className="min-h-screen bg-stone-50">
      <header className="border-b border-stone-200 bg-white">
        <div className="max-w-md mx-auto px-4 py-4">
          <Link to="/" className="text-slate-400 hover:text-slate-600 text-sm">← Back</Link>
          <h1 className="text-lg font-semibold text-slate-800 mt-2">Accident Review</h1>
          <p className="text-sm text-slate-500 mt-1">
            Download accident reports from Famly for any site and time window
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
                {sites.map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>

            {/* Report type */}
            <div className="bg-white border border-stone-200 rounded-lg p-4">
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Report type</label>
              <div className="grid grid-cols-3 gap-1 bg-stone-100 rounded-md p-1">
                {REPORT_TYPES.map(t => {
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

            {/* Download button */}
            <button
              onClick={handleDownload}
              disabled={downloading || !selectedSiteId}
              className="w-full text-base font-semibold bg-amber-600 text-white rounded-lg px-4 py-4 hover:bg-amber-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
            >
              {downloading ? (
                <>
                  <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  {buttonLabel}
                </>
              )}
            </button>

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
