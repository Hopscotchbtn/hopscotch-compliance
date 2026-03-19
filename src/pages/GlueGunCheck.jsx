import { useState, useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Header } from '../components/Header'
import { Button } from '../components/ui/Button'
import { Select } from '../components/ui/Select'
import { submitCheck, getTodayGlueGunEntries, getGlueGunEntriesForRange } from '../lib/supabase'
import { generateGlueGunExcel } from '../lib/generateRecordsExcel'
import { getWeekOptions } from '../lib/generateKitchenSafetyPDF'

const LOCATIONS = ['Holland Road', 'School Road']

const SIGN_IN_STATEMENT = `I confirm that I am trained to use the hot glue gun and will follow all safety procedures, including supervision, safe handling, and proper storage, as outlined in the risk assessment. I accept responsibility for the equipment while it is signed out to me.`

const SIGN_OUT_STATEMENT = `I confirm that I have finished using the hot glue gun and have followed all required safety procedures, including supervision, safe handling, and proper storage, as outlined in the risk assessment. I confirm that the equipment has been returned in good condition.`

export function GlueGunCheck() {
  const location = useLocation()
  const navigate = useNavigate()

  const [nursery, setNursery] = useState('')
  const [signInInitials, setSignInInitials] = useState('')
  const [signOutInitials, setSignOutInitials] = useState('')
  const [submittingIn, setSubmittingIn] = useState(false)
  const [submittingOut, setSubmittingOut] = useState(false)
  const [errorIn, setErrorIn] = useState(null)
  const [errorOut, setErrorOut] = useState(null)
  const [entries, setEntries] = useState([])

  const [selectedWeek, setSelectedWeek] = useState('')
  const [downloadingExcel, setDownloadingExcel] = useState(false)
  const weekOptions = getWeekOptions(5)

  const section = location.state?.section || 'holiday-club'

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
      await refreshEntries()
    } catch (err) {
      console.error(err)
      setErrorOut('Failed to submit. Please try again.')
    } finally {
      setSubmittingOut(false)
    }
  }

  const handleDownloadExcel = async () => {
    const week = weekOptions.find(w => w.value === selectedWeek)
    if (!week || !nursery) return
    setDownloadingExcel(true)
    try {
      const entries = await getGlueGunEntriesForRange(
        nursery,
        new Date(week.value + 'T12:00:00'),
        new Date(week.sunday + 'T12:00:00')
      )
      await generateGlueGunExcel(
        nursery,
        entries,
        new Date(week.value + 'T12:00:00'),
        new Date(week.sunday + 'T12:00:00')
      )
    } catch (err) {
      console.error('Excel generation error:', err)
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
            onChange={(e) => setNursery(e.target.value)}
            options={LOCATIONS}
            placeholder="Select location"
          />
        </div>

        {nursery && (
          <>
            {/* Download Excel */}
            <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200">
              <p className="text-sm font-medium text-hop-forest mb-3">Download Register</p>
              <select
                value={selectedWeek}
                onChange={(e) => setSelectedWeek(e.target.value)}
                className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg text-hop-forest text-sm font-body focus:outline-none focus:border-hop-forest mb-3"
              >
                <option value="">Select a week…</option>
                {weekOptions.map(w => (
                  <option key={w.value} value={w.value}>{w.label}</option>
                ))}
              </select>
              <Button
                color="marmalade"
                size="large"
                fullWidth
                disabled={!selectedWeek || downloadingExcel}
                onClick={handleDownloadExcel}
              >
                {downloadingExcel ? 'Generating…' : 'Download Excel'}
              </Button>
            </div>

            {/* Sign In */}
            <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-200 space-y-4">
              <p className="text-sm font-semibold text-hop-forest">Sign In — Hot Glue Gun</p>
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
                  className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg text-hop-forest text-sm font-body focus:outline-none focus:border-hop-forest uppercase"
                />
              </div>
              {errorIn && <p className="text-sm text-red-600">{errorIn}</p>}
              <Button
                color="sunshine"
                size="large"
                fullWidth
                disabled={!signInInitials.trim() || submittingIn}
                onClick={handleSignIn}
              >
                {submittingIn ? 'Submitting...' : 'Confirm Sign In'}
              </Button>
            </div>

            {/* Sign Out */}
            <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-200 space-y-4">
              <p className="text-sm font-semibold text-hop-forest">Sign Out — Hot Glue Gun</p>
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
                  className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg text-hop-forest text-sm font-body focus:outline-none focus:border-hop-forest uppercase"
                />
              </div>
              {errorOut && <p className="text-sm text-red-600">{errorOut}</p>}
              <Button
                color="sunshine"
                size="large"
                fullWidth
                disabled={!signOutInitials.trim() || submittingOut}
                onClick={handleSignOut}
              >
                {submittingOut ? 'Submitting...' : 'Confirm Sign Out'}
              </Button>
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
