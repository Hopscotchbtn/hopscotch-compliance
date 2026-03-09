import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { classifyAll } from '../../lib/famly/dataHelpers'
import { fetchSites, fetchIncidents, getStoredToken, storeToken, clearToken } from '../../lib/famly/famlyClient'
import { generateMonthlyReportPDF } from '../../lib/famly/generateMonthlyReportPDF'

function previousMonthLabel() {
  const now = new Date()
  const prev = new Date(now.getFullYear(), now.getMonth() - 1, 1)
  return prev.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })
}

export function FamlyDashboard() {
  const existingToken = getStoredToken()
  const [token, setToken] = useState(existingToken)
  const [tokenInput, setTokenInput] = useState('')
  const [sites, setSites] = useState([])
  const [selectedSiteId, setSelectedSiteId] = useState('')
  const [loading, setLoading] = useState(false)
  const [downloading, setDownloading] = useState(false)
  const [error, setError] = useState(null)

  // Fetch sites when token is available
  useEffect(() => {
    if (!token) return
    setLoading(true)
    fetchSites(token)
      .then(data => {
        if (Array.isArray(data) && data.length > 0) {
          setSites(data)
          setSelectedSiteId(data[0].id)
        }
      })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false))
  }, [token])

  const handleDownload = useCallback(async () => {
    if (!selectedSiteId || !token) return
    setDownloading(true)
    setError(null)
    try {
      const from = new Date()
      from.setMonth(from.getMonth() - 13)
      const fromStr = from.toISOString().slice(0, 10)
      const toStr = new Date().toISOString().slice(0, 10)

      const incidents = await fetchIncidents(token, selectedSiteId, fromStr, toStr)
      const classified = classifyAll(incidents)
      const siteName = sites.find(s => s.id === selectedSiteId)?.name ?? 'Site'
      generateMonthlyReportPDF(classified, siteName)
    } catch (err) {
      setError(err.message ?? 'Failed to generate report')
    } finally {
      setDownloading(false)
    }
  }, [selectedSiteId, token, sites])

  const siteName = sites.find(s => s.id === selectedSiteId)?.name ?? ''

  return (
    <div className="min-h-screen bg-stone-50">
      {/* Header */}
      <header className="border-b border-stone-200 bg-white">
        <div className="max-w-md mx-auto px-4 py-4">
          <Link to="/" className="text-slate-400 hover:text-slate-600 text-sm">← Back</Link>
          <h1 className="text-lg font-semibold text-slate-800 mt-2">Monthly Accident Review</h1>
          <p className="text-sm text-slate-500 mt-1">
            Download last month's accident report for your site
          </p>
        </div>
      </header>

      <main className="max-w-md mx-auto px-4 py-8">
        {/* Token gate */}
        {!token ? (
          <div className="bg-white border border-stone-200 rounded-lg p-6">
            <h2 className="text-sm font-semibold text-slate-800 mb-1">Connect to Famly</h2>
            <p className="text-xs text-slate-500 mb-4 leading-relaxed">
              Enter your Famly access token to pull incident data. Your token stays in this browser only.
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
              <button
                type="submit"
                disabled={!tokenInput.trim()}
                className="w-full text-sm font-medium bg-amber-600 text-white rounded-md px-4 py-2.5 hover:bg-amber-700 disabled:opacity-40 transition-colors"
              >
                Connect
              </button>
            </form>
            <p className="text-xs text-slate-400 mt-3">
              Find your token in Famly → Settings → Integrations
            </p>
          </div>
        ) : loading ? (
          <div className="text-center py-12">
            <div className="inline-block w-6 h-6 border-2 border-amber-600 border-t-transparent rounded-full animate-spin" />
            <p className="text-sm text-slate-500 mt-3">Loading sites...</p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Site selector */}
            <div className="bg-white border border-stone-200 rounded-lg p-4">
              <label className="block text-sm font-medium text-slate-700 mb-2">Site</label>
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
                  Download {previousMonthLabel()} Report
                </>
              )}
            </button>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            )}

            {/* Info */}
            <div className="bg-stone-100 rounded-lg p-4 text-xs text-slate-500 leading-relaxed">
              <p className="font-medium text-slate-600 mb-1">What's in the report?</p>
              <ul className="list-disc list-inside space-y-0.5">
                <li>Total accidents and incidents for {previousMonthLabel()}</li>
                <li>Comparison with same month last year</li>
                <li>Incidents flagged for formal review</li>
                <li>Children with repeat incidents</li>
                <li>Location breakdown</li>
                <li>Full incident list</li>
              </ul>
            </div>

            {/* Disconnect */}
            <button
              onClick={() => { clearToken(); setToken(''); setSites([]); setSelectedSiteId('') }}
              className="w-full text-sm text-slate-400 hover:text-slate-600 py-2"
            >
              Disconnect from Famly
            </button>
          </div>
        )}
      </main>

      <footer className="max-w-md mx-auto px-4 py-6 text-center text-xs text-slate-400">
        Internal use only · Data processed in browser only
      </footer>
    </div>
  )
}
