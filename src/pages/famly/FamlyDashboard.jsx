import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { getMockIncidents, MOCK_SITES } from '../../lib/famly/mockData'
import { classifyAll } from '../../lib/famly/dataHelpers'
import { fetchSites, fetchIncidents, getStoredToken, storeToken, clearToken } from '../../lib/famly/famlyClient'
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
  const existingToken = getStoredToken()
  const [dataMode, setDataMode] = useState(existingToken ? 'live' : 'mock')
  const [token, setToken] = useState(existingToken)
  const [tokenInput, setTokenInput] = useState('')
  const [sites, setSites] = useState(existingToken ? [] : MOCK_SITES)
  const [selectedSiteId, setSelectedSiteId] = useState(existingToken ? '' : 'all')
  const [sitesReady, setSitesReady] = useState(!existingToken) // false if we need to fetch live sites
  const [incidents, setIncidents] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [lastUpdated, setLastUpdated] = useState(null)
  const [showTrend, setShowTrend] = useState(false)

  // When switching to live and token is present, fetch real site list
  useEffect(() => {
    if (dataMode !== 'live' || !token) {
      if (dataMode !== 'live') {
        setSites(MOCK_SITES)
        setSelectedSiteId('all')
        setSitesReady(true)
      }
      return
    }
    // Clear mock sites and wait for real ones
    setSites([])
    setSelectedSiteId('')
    setSitesReady(false)
    fetchSites(token)
      .then(data => {
        if (Array.isArray(data) && data.length > 0) {
          setSites(data)
          setSelectedSiteId(data[0].id) // default to first site, not all
        }
        setSitesReady(true)
      })
      .catch(err => {
        console.error('[FamlyDashboard] fetchSites error:', err)
        setSitesReady(true)
      })
  }, [dataMode, token])

  const loadData = useCallback(async () => {
    if (!sitesReady) return // wait for live sites to load
    if (dataMode === 'live' && !selectedSiteId) return // no site selected yet
    setLoading(true)
    setError(null)
    try {
      if (dataMode === 'mock') {
        setIncidents(classifyAll(getMockIncidents(selectedSiteId)))
      } else {
        const siteIdsToFetch = selectedSiteId === 'all'
          ? sites.filter(s => s.id !== 'all').map(s => s.id)
          : [selectedSiteId]

        const from = new Date()
        from.setMonth(from.getMonth() - 13)
        const fromStr = from.toISOString().slice(0, 10)
        const toStr = new Date().toISOString().slice(0, 10)

        // All requests go directly browser → Famly. Nothing passes through Vercel.
        const results = await Promise.all(
          siteIdsToFetch.map(siteId => fetchIncidents(token, siteId, fromStr, toStr))
        )
        setIncidents(classifyAll(results.flat()))
      }
      setLastUpdated(new Date())
    } catch (err) {
      setError(err.message ?? 'Failed to load data')
    } finally {
      setLoading(false)
    }
  }, [dataMode, selectedSiteId, sites, token, sitesReady])

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
              onClick={() => {
                if (dataMode === 'live') {
                  setDataMode('mock')
                } else if (token) {
                  setDataMode('live')
                } else {
                  setDataMode('live') // show token gate
                }
              }}
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

      {/* Prototype warning — always visible */}
      <div className="bg-amber-50 border-b border-amber-200 px-4 py-2.5">
        <p className="text-xs text-amber-900 text-center">
          <strong>Prototype — internal use only.</strong>{' '}
          {dataMode === 'mock'
            ? 'Showing demo data. No real incident records are displayed.'
            : 'Showing live Famly data. Do not share this screen or URL with anyone outside the management team.'
          }{' '}
          Not a formal safeguarding record.
        </p>
      </div>

      {/* Token gate — shown in live mode when no session token is stored */}
      {dataMode === 'live' && !token && (
        <div className="max-w-5xl mx-auto px-4 pt-8">
          <div className="bg-white border border-stone-200 rounded-lg p-6 max-w-md mx-auto">
            <h2 className="text-sm font-semibold text-slate-800 mb-1">Enter your Famly access token</h2>
            <p className="text-xs text-slate-500 mb-4 leading-relaxed">
              Your token is used only in this browser tab to call the Famly API directly.
              It is not sent to or stored by Hopscotch servers.
              It will be cleared when you close this tab.
            </p>
            <form
              onSubmit={e => {
                e.preventDefault()
                const t = tokenInput.trim()
                if (!t) return
                storeToken(t)
                setToken(t)
                setTokenInput('')
              }}
              className="space-y-3"
            >
              <input
                type="password"
                value={tokenInput}
                onChange={e => setTokenInput(e.target.value)}
                placeholder="Paste token here"
                className="w-full text-sm border border-stone-200 rounded-md px-3 py-2 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-amber-500"
                autoFocus
              />
              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={!tokenInput.trim()}
                  className="flex-1 text-sm font-medium bg-amber-600 text-white rounded-md px-4 py-2 hover:bg-amber-700 disabled:opacity-40 transition-colors"
                >
                  Connect
                </button>
                <button
                  type="button"
                  onClick={() => setDataMode('mock')}
                  className="text-sm text-slate-500 border border-stone-200 rounded-md px-4 py-2 hover:bg-stone-50 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
            <p className="text-xs text-slate-400 mt-3">
              Find your token in Famly → Settings → Integrations, or ask your Famly administrator.
            </p>
          </div>
        </div>
      )}

      {/* Sign-out button when live and token is active */}
      {dataMode === 'live' && token && (
        <div className="bg-teal-50 border-b border-teal-100 px-4 py-1.5 flex items-center justify-between max-w-5xl mx-auto">
          <p className="text-xs text-teal-700">Connected to Famly — data processed in this browser only</p>
          <button
            onClick={() => { clearToken(); setToken(''); setDataMode('mock') }}
            className="text-xs text-teal-600 underline underline-offset-2 ml-4"
          >
            Disconnect
          </button>
        </div>
      )}

      {(dataMode === 'mock' || token) && <main className="max-w-5xl mx-auto px-4 py-6 space-y-6">
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
      </main>}
    </div>
  )
}
