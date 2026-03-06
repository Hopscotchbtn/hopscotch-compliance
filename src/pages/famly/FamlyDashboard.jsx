import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { getMockIncidents, MOCK_SITES } from '../../lib/famly/mockData'
import { classifyAll } from '../../lib/famly/dataHelpers'
import MonthlySummaryCards from './MonthlySummaryCards'
import MonthlyTrendChart from './MonthlyTrendChart'
import InjuryTypeChart from './InjuryTypeChart'
import LocationFrequency from './LocationFrequency'
import RepeatChildrenPanel from './RepeatChildrenPanel'
import RecentIncidentsList from './RecentIncidentsList'

function formatTime(date) {
  return date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
}

export function FamlyDashboard() {
  const [dataMode, setDataMode] = useState('mock') // 'mock' | 'live'
  const [sites, setSites] = useState(MOCK_SITES)
  const [selectedSiteId, setSelectedSiteId] = useState(MOCK_SITES[0].id)
  const [incidents, setIncidents] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [lastUpdated, setLastUpdated] = useState(null)

  // When switching to live, fetch real site list
  useEffect(() => {
    if (dataMode !== 'live') {
      setSites(MOCK_SITES)
      setSelectedSiteId(MOCK_SITES[0].id)
      return
    }
    fetch('/api/famly-sites')
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data) && data.length > 0) {
          setSites(data)
          setSelectedSiteId(data[0].id)
        }
      })
      .catch(() => {})
  }, [dataMode])

  const loadData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      if (dataMode === 'mock') {
        setIncidents(classifyAll(getMockIncidents(selectedSiteId)))
      } else {
        const from = new Date()
        from.setMonth(from.getMonth() - 13)
        const params = new URLSearchParams({
          siteId: selectedSiteId,
          from: from.toISOString().slice(0, 10),
          to: new Date().toISOString().slice(0, 10),
        })
        const res = await fetch(`/api/famly-incidents?${params}`)
        if (!res.ok) {
          const body = await res.json().catch(() => ({}))
          throw new Error(body.error ?? `API error ${res.status}`)
        }
        setIncidents(classifyAll(await res.json()))
      }
      setLastUpdated(new Date())
    } catch (err) {
      setError(err.message ?? 'Failed to load data')
    } finally {
      setLoading(false)
    }
  }, [dataMode, selectedSiteId])

  useEffect(() => { loadData() }, [loadData])

  const siteName = sites.find(s => s.id === selectedSiteId)?.name ?? 'Unknown site'

  return (
    <div className="min-h-screen bg-stone-50">
      {/* Header */}
      <header className="border-b border-stone-200 bg-white sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 py-3">
          {/* Top row: back + title + mode toggle */}
          <div className="flex items-center gap-3">
            <Link to="/" className="text-slate-400 hover:text-slate-600 text-sm shrink-0">← Back</Link>
            <div className="flex-1 min-w-0">
              <h1 className="text-sm font-semibold text-slate-800 truncate">Accident &amp; Incident Dashboard</h1>
            </div>
            {/* Mock / Live toggle */}
            <button
              onClick={() => setDataMode(m => m === 'mock' ? 'live' : 'mock')}
              className={`inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full border transition-colors shrink-0 ${
                dataMode === 'live'
                  ? 'bg-teal-50 border-teal-200 text-teal-700'
                  : 'bg-stone-100 border-stone-200 text-slate-500'
              }`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${dataMode === 'live' ? 'bg-teal-500 animate-pulse' : 'bg-stone-400'}`} />
              {dataMode === 'live' ? 'Live' : 'Demo data'}
            </button>
          </div>
          {/* Bottom row: site selector (full width on mobile) */}
          <div className="mt-2 flex items-center gap-2">
            <label className="text-xs text-slate-500 shrink-0">Site:</label>
            <select
              value={selectedSiteId}
              onChange={e => setSelectedSiteId(e.target.value)}
              className="flex-1 text-sm border border-stone-200 rounded-md px-2.5 py-1.5 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-amber-500"
            >
              {sites.map(s => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
            {loading && (
              <svg className="w-4 h-4 animate-spin text-slate-400 shrink-0" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
              </svg>
            )}
          </div>
        </div>
      </header>

      {/* Demo mode banner */}
      {dataMode === 'mock' && (
        <div className="bg-amber-50 border-b border-amber-200 px-4 py-2 text-center text-xs text-amber-800">
          You are viewing <strong>demo data</strong> — not real incidents. Toggle to &ldquo;Live&rdquo; in the header to view Famly data.
        </div>
      )}

      <main className="max-w-5xl mx-auto px-4 py-6 space-y-6">
        {/* Page title row */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-800">{siteName}</h2>
            {lastUpdated && !loading && (
              <p className="text-xs text-slate-400 mt-0.5">
                Last updated: {formatTime(lastUpdated)}
              </p>
            )}
            {loading && (
              <p className="text-xs text-slate-400 mt-0.5">Updating…</p>
            )}
          </div>
          <button
            onClick={loadData}
            disabled={loading}
            className="text-xs text-slate-500 hover:text-slate-700 border border-stone-200 rounded px-2.5 py-1.5 bg-white disabled:opacity-50 shrink-0"
          >
            Refresh
          </button>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <MonthlySummaryCards incidents={incidents} loading={loading} />
        <MonthlyTrendChart incidents={incidents} loading={loading} />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <InjuryTypeChart incidents={incidents} loading={loading} />
          <LocationFrequency incidents={incidents} loading={loading} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <RepeatChildrenPanel incidents={incidents} loading={loading} />
          <RecentIncidentsList incidents={incidents} loading={loading} />
        </div>

        <footer className="text-center text-xs text-slate-400 py-4 border-t border-stone-200">
          Hopscotch Children&apos;s Nurseries · Internal use only ·
          All data handled in accordance with GDPR · No personal data stored outside this session
        </footer>
      </main>
    </div>
  )
}
