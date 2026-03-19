import { useState, useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Header } from '../components/Header'
import { Button } from '../components/ui/Button'
import { Select } from '../components/ui/Select'
import { submitCheck, getTodayGlueGunEntries, getGlueGunEntriesForRange } from '../lib/supabase'
import { generateGlueGunExcel } from '../lib/generateRecordsExcel'

const LOCATIONS = ['Holland Road', 'School Road']

const SIGN_IN_STATEMENT = `I confirm that I am trained to use the hot glue gun and will follow all safety procedures, including supervision, safe handling, and proper storage, as outlined in the risk assessment. I accept responsibility for the equipment while it is signed out to me.`

const SIGN_OUT_STATEMENT = `I confirm that I have finished using the hot glue gun and have followed all required safety procedures, including supervision, safe handling, and proper storage, as outlined in the risk assessment. I confirm that the equipment has been returned in good condition.`

function defaultDateRange() {
  const now = new Date()
  const start = new Date(now.getFullYear(), now.getMonth(), 1)
  return {
    start: start.toISOString().slice(0, 10),
    end: now.toISOString().slice(0, 10),
  }
}

export function GlueGunCheck() {
  const location = useLocation()
  const navigate = useNavigate()

  const [nursery, setNursery] = useState('')
  const [expandedPanel, setExpandedPanel] = useState(null) // null | 'signIn' | 'signOut'
  const [signInInitials, setSignInInitials] = useState('')
  const [signOutInitials, setSignOutInitials] = useState('')
  const [submittingIn, setSubmittingIn] = useState(false)
  const [submittingOut, setSubmittingOut] = useState(false)
  const [errorIn, setErrorIn] = useState(null)
  const [errorOut, setErrorOut] = useState(null)
  const [entries, setEntries] = useState([])

  const [dlStart, setDlStart] = useState(() => defaultDateRange().start)
  const [dlEnd, setDlEnd] = useState(() => defaultDateRange().end)
  const [downloadingExcel, setDownloadingExcel] = useState(false)
  const [downloadError, setDownloadError] = useState(null)

  const section = location.state?.section || 'holiday-club'

  const hasSignInToday = entries.some(e => e.check_type === 'glueGunOut')
  const hasSignOutToday = entries.some(e => e.check_type === 'glueGunIn')

  useEffect(() => {
    if (nursery) {
      getTodayGlueGunEntries(nursery).then(setEntries).catch(() => {})
    }
  }, [nursery])

  const refreshEntries = async () => {
    if (nursery) {
      const updated = await getTodayGlueGunEntries(nursery).catch(() => [])
      setEntries(updated)
    }
  }

  const handleTogglePanel = (panel) => {
    setExpandedPanel(prev => prev === panel ? null : panel)
    setErrorIn(null)
    setErrorOut(null)
  }

  const handleSignIn = async () => {
    if (!signInInitials.trim()) return
    setSubmittingIn(true)
    setErrorIn(null)
    try {
      await submitCheck({
        nursery,
        room: 'Holiday Club',
        checkType: 'glueGunOut',
        completedBy: signInInitials.trim().toUpperCase(),
        items: [],
        notes: null,
      })
      setSignInInitials('')
      setExpandedPanel(null)
      await refreshEntries()
    } catch (err) {
      console.error(err)
      setErrorIn('Failed to submit. Please try again.')
    } finally {
      setSubmittingIn(false)
    }
  }

  const handleSignOut = async () => {
    if (!signOutInitials.trim()) return
    setSubmittingOut(true)
    setErrorOut(null)
    try {
      await submitCheck({
        nursery,
        room: 'Holiday Club',
        checkType: 'glueGunIn',
        completedBy: signOutInitials.trim().toUpperCase(),
        items: [],
        notes: null,
      })
      setSignOutInitials('')
      setExpandedPanel(null)
      await refreshEntries()
    } catch (err) {
      console.error(err)
      setErrorOut('Failed to submit. Please try again.')
    } finally {
      setSubmittingOut(false)
    }
  }

  const handleDownloadExcel = async () => {
    if (!dlStart || !dlEnd || !nursery) return
    setDownloadingExcel(true)
    setDownloadError(null)
    try {
      const data = await getGlueGunEntriesForRange(nursery, new Date(dlStart + 'T00:00:00'), new Date(dlEnd + 'T23:59:59'))
      await generateGlueGunExcel(nursery, data, new Date(dlStart + 'T00:00:00'), new Date(dlEnd + 'T23:59:59'))
    } catch (err) {
      console.error('Excel generation error:', err)
      setDownloadError('Failed to generate. Please try again.')
    } finally {
      setDownloadingExcel(false)
    }
  }

  const formatEntryTime = (isoStr) => {
    return new Date(isoStr).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
  }

  return (
    <div className="min-h-screen bg-hop-pebble">
      <Header title="Hot Glue Gun Register" showBack />

      <div className="px-4 py-6 max-w-md mx-auto space-y-4">

        {/* Location picker */}
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200">
          <Select
            label="Location"
            value={nursery}
            onChange={(e) => { setNursery(e.target.value); setExpandedPanel(null) }}
            options={LOCATIONS}
            placeholder="Select location"
          />
        </div>

        {nursery && (
          <>
            {/* Sign In button + expandable panel */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <button
                onClick={() => handleTogglePanel('signIn')}
                className="w-full px-5 py-4 flex items-center justify-between text-left hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  {hasSignInToday ? (
                    <div className="w-8 h-8 rounded-full bg-hop-apple flex items-center justify-center flex-shrink-0">
                      <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-hop-sunshine/30 flex items-center justify-center flex-shrink-0">
                      <span className="text-base">✏️</span>
                    </div>
                  )}
                  <div>
                    <p className="font-semibold text-hop-forest">Sign In — Hot Glue Gun</p>
                    {hasSignInToday && (
                      <p className="text-xs text-hop-apple mt-0.5">Signed in today</p>
                    )}
                  </div>
                </div>
                <svg
                  className={`w-5 h-5 text-gray-400 transition-transform ${expandedPanel === 'signIn' ? 'rotate-180' : ''}`}
                  fill="none" viewBox="0 0 24 24" stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {expandedPanel === 'signIn' && (
                <div className="px-5 pb-5 pt-1 border-t border-gray-100 space-y-4">
                  <p className="text-sm text-gray-700 leading-relaxed">{SIGN_IN_STATEMENT}</p>
                  <div>
                    <label className="block text-sm font-medium text-hop-forest mb-1">
                      Initials <span className="text-hop-marmalade-dark">*</span>
                    </label>
                    <input
                      type="text"
                      value={signInInitials}
                      onChange={(e) => setSignInInitials(e.target.value)}
                      placeholder="e.g. PF"
                      maxLength={5}
                      autoFocus
                      className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg text-hop-forest text-sm font-body focus:outline-none focus:border-hop-forest uppercase"
                    />
                  </div>
                  {errorIn && <p className="text-sm text-red-600">{errorIn}</p>}
                  <div className="flex gap-3">
                    <Button
                      color="sunshine"
                      size="large"
                      fullWidth
                      disabled={!signInInitials.trim() || submittingIn}
                      onClick={handleSignIn}
                    >
                      {submittingIn ? 'Submitting...' : 'Confirm Sign In'}
                    </Button>
                    <Button color="pebble" fullWidth onClick={() => setExpandedPanel(null)}>
                      Cancel
                    </Button>
                  </div>
                </div>
              )}
            </div>

            {/* Sign Out button + expandable panel */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <button
                onClick={() => handleTogglePanel('signOut')}
                className="w-full px-5 py-4 flex items-center justify-between text-left hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  {hasSignOutToday ? (
                    <div className="w-8 h-8 rounded-full bg-hop-apple flex items-center justify-center flex-shrink-0">
                      <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-hop-sunshine/30 flex items-center justify-center flex-shrink-0">
                      <span className="text-base">✏️</span>
                    </div>
                  )}
                  <div>
                    <p className="font-semibold text-hop-forest">Sign Out — Hot Glue Gun</p>
                    {hasSignOutToday && (
                      <p className="text-xs text-hop-apple mt-0.5">Signed out today</p>
                    )}
                  </div>
                </div>
                <svg
                  className={`w-5 h-5 text-gray-400 transition-transform ${expandedPanel === 'signOut' ? 'rotate-180' : ''}`}
                  fill="none" viewBox="0 0 24 24" stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {expandedPanel === 'signOut' && (
                <div className="px-5 pb-5 pt-1 border-t border-gray-100 space-y-4">
                  <p className="text-sm text-gray-700 leading-relaxed">{SIGN_OUT_STATEMENT}</p>
                  <div>
                    <label className="block text-sm font-medium text-hop-forest mb-1">
                      Initials <span className="text-hop-marmalade-dark">*</span>
                    </label>
                    <input
                      type="text"
                      value={signOutInitials}
                      onChange={(e) => setSignOutInitials(e.target.value)}
                      placeholder="e.g. PF"
                      maxLength={5}
                      autoFocus
                      className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg text-hop-forest text-sm font-body focus:outline-none focus:border-hop-forest uppercase"
                    />
                  </div>
                  {errorOut && <p className="text-sm text-red-600">{errorOut}</p>}
                  <div className="flex gap-3">
                    <Button
                      color="sunshine"
                      size="large"
                      fullWidth
                      disabled={!signOutInitials.trim() || submittingOut}
                      onClick={handleSignOut}
                    >
                      {submittingOut ? 'Submitting...' : 'Confirm Sign Out'}
                    </Button>
                    <Button color="pebble" fullWidth onClick={() => setExpandedPanel(null)}>
                      Cancel
                    </Button>
                  </div>
                </div>
              )}
            </div>

            {/* Today's log */}
            {entries.length > 0 && (
              <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200">
                <p className="text-sm font-semibold text-hop-forest mb-3">Today's log</p>
                <div className="space-y-2">
                  {entries.map((e, i) => (
                    <div key={i} className="flex items-center justify-between text-sm">
                      <span className={`font-medium ${e.check_type === 'glueGunOut' ? 'text-hop-marmalade-dark' : 'text-green-700'}`}>
                        {e.check_type === 'glueGunOut' ? 'Signed in' : 'Signed out'}
                      </span>
                      <span className="text-gray-500">
                        {e.completed_by} · {formatEntryTime(e.created_at)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Download Register */}
            <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200">
              <p className="text-sm font-medium text-hop-forest mb-3">📥 Download Register</p>
              <div className="flex gap-2 mb-3">
                <div className="flex-1">
                  <p className="text-xs text-gray-500 mb-1">From</p>
                  <input
                    type="date"
                    value={dlStart}
                    onChange={e => setDlStart(e.target.value)}
                    className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg text-hop-forest text-sm font-body focus:outline-none focus:border-hop-forest"
                  />
                </div>
                <div className="flex-1">
                  <p className="text-xs text-gray-500 mb-1">To</p>
                  <input
                    type="date"
                    value={dlEnd}
                    onChange={e => setDlEnd(e.target.value)}
                    className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg text-hop-forest text-sm font-body focus:outline-none focus:border-hop-forest"
                  />
                </div>
              </div>
              <Button
                color="marmalade"
                size="large"
                fullWidth
                disabled={!dlStart || !dlEnd || !nursery || downloadingExcel}
                onClick={handleDownloadExcel}
              >
                {downloadingExcel ? 'Generating…' : 'Download Excel'}
              </Button>
              {downloadError && <p className="mt-2 text-xs text-red-600">{downloadError}</p>}
            </div>

            {/* GDPR notice */}
            <div className="rounded-xl p-4 bg-gray-50 border border-gray-200">
              <p className="text-xs text-gray-500 leading-relaxed">
                <span className="font-medium text-gray-600">Data notice:</span> Initials are recorded for health and safety accountability purposes under legitimate interest (UK GDPR Article 6(1)(f)). Only the minimum data required is collected. Records are held securely and retained in line with Hopscotch's data retention policy. Access to downloaded records is restricted to authorised staff only.
              </p>
            </div>

            <div className="text-center pt-2">
              <button
                onClick={() => navigate(`/section/${section}`)}
                className="text-sm text-gray-500 hover:text-hop-forest underline underline-offset-2"
              >
                Back to menu
              </button>
            </div>
          </>
        )}

      </div>
    </div>
  )
}
