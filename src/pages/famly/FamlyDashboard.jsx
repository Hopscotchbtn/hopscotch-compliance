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

const ALL_SITES_OPTION = { id: 'all', name: 'All sites' }

function formatTime(date) {
  return date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
}

export function FamlyDashboard() {
  const [dataMode, setDataMode] = useState('mock')
  const [sites, setSites] = useState(MOCK_SITES)
  const [selectedSiteId, setSelectedSiteId] = useState('all')
  const [incidents, setIncidents] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [lastUpdated, setLastUpdated] = useState(null)
  const [showTrend, setShowTrend] = useState(false)

  // When switching to live, fetch real site list
  useEffect(() => {
    if (dataMode !== 'live') {
      setSites(MOCK_SITES)
      setSelectedSiteId('all')
      return
    }
    fetch('/api/famly-sites')
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data) && data.length > 0) {
          setSites(data)
          setSelectedSiteId('all')
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
        // Determine which site IDs to fetch
        const siteIdsToFetch = selectedSiteId === 'all'
          ? sites.filter(s => s.id !== 'all').map(s => s.id)
          : [selectedSiteId]

        const from = new Date()
        from.setMonth(from.getMonth() - 13)
        const fromStr = from.toISOString().slice(0, 10)
        const toStr = new Date().toISOString().slice(0, 10)

        // Fetch all sites in parallel
        const results = await Promise.all(
          siteIdsToFetch.map(async siteId => {
            const params = new URLSearchParams({ siteId, from: fromStr, to: toStr })
            const res = await fetch(`/api/famly-incidents?${params}`)
            if (!res.ok) {
              const body = await res.json().catch(() => ({}))
              throw new Error(body.error ?? `API error ${res.status} for site ${siteId}`)
            }
            return res.json()
          })
        )

        setIncidents(classifyAll(results.flat()))
      }
      setLastUpdated(new Date())
    } catch (err) {
      setError(err.message ?? 'Failed to load data')
    } finally {
      setLoading(false)
    }
  }, [dataMode, selectedSiteId, sites])

  useEffect(() => { loadData() }, [loadData])

  const siteOptions = [ALL_SITES_OPTION, ...sites]
  const siteName = siteOptions.find(s => s.id === selectedSiteId)?.name ?? 'Unknown site'

  return (
    <div className="min-h-screen bg-stone-50">
      {/* Header */}
      <header className="border-b border-stone-200 bg-white sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 py-3">
          <div className="flex items-center gap-3">
            <Link to="/" className="text-slate-400 hover:text-slate-600 text-sm shrink-0">← Back</Link>
            <div className="flex-1 min-w-0">
              <h1 className="text-sm font-semibold text-slate-800 truncate">Accident &amp; Incident Dashboard</h1>
            </div>
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
          <div className="mt-2 flex items-center gap-2">
            <label className="text-xs text-slate-500 shrink-0">Site:</label>
            <select
              value={selectedSiteId}
              onChange={e => setSelectedSiteId(e.target.value)}
              className="flex-1 text-sm border border-stone-200 rounded-md px-2.5 py-1.5 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-amber-500"
            >
              {siteOptions.map(s => (
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
              <p className="text-xs text-slate-400 mt-0.5">Last updated: {formatTime(lastUpdated)}</p>
            )}
            {loading && <p className="text-xs text-slate-400 mt-0.5">Updating…</p>}
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

        {/* Summary cards */}
        <MonthlySummaryCards incidents={incidents} loading={loading} />

        {/* Main grid: Repeat children (primary) + Location frequency */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <RepeatChildrenPanel incidents={incidents} loading={loading} />
          <LocationFrequency incidents={incidents} loading={loading} />
        </div>

        {/* Injury type breakdown */}
        <InjuryTypeChart incidents={incidents} loading={loading} />

        {/* Recent incidents */}
        <RecentIncidentsList incidents={incidents} loading={loading} />

        {/* 12-month trend — collapsible */}
        <div className="bg-white border border-stone-200 rounded-lg overflow-hidden">
          <button
            onClick={() => setShowTrend(v => !v)}
            className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium text-slate-700 hover:bg-stone-50 transition-colors"
          >
            <span>12-month trend</span>
            <span className="text-slate-400 text-xs">{showTrend ? '▲ Hide' : '▼ Show'}</span>
          </button>
          {showTrend && (
            <div className="px-4 pb-4 border-t border-stone-100">
              <MonthlyTrendChart incidents={incidents} loading={loading} />
            </div>
          )}
        </div>

        <footer className="text-center text-xs text-slate-400 py-4 border-t border-stone-200">
          Hopscotch Children&apos;s Nurseries · Internal use only ·
          All data handled in accordance with GDPR · No personal data stored outside this session
        </footer>
      </main>
    </div>
  )
}
