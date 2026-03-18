import { useState, useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Header } from '../components/Header'
import { Button } from '../components/ui/Button'
import { Select } from '../components/ui/Select'
import { submitCheck } from '../lib/supabase'
import { getTodayGlueGunEntries } from '../lib/supabase'
import { formatTime } from '../lib/utils'

const LOCATIONS = ['Holland Road', 'School Road']

const SIGN_OUT_STATEMENT = `I confirm that I am trained to use the hot glue gun and will follow all safety procedures, including supervision, safe handling, and proper storage, as outlined in the risk assessment. I accept responsibility for the equipment while it is signed out to me.`

const SIGN_IN_STATEMENT = `I confirm that I have finished using the hot glue gun and have followed all required safety procedures, including supervision, safe handling, and proper storage, as outlined in the risk assessment. I confirm that the equipment has been returned in good condition.`

export function GlueGunCheck() {
  const location = useLocation()
  const navigate = useNavigate()

  const [nursery, setNursery] = useState('')
  const [view, setView] = useState('main') // 'main' | 'signOut' | 'signIn'
  const [initials, setInitials] = useState('')
  const [entries, setEntries] = useState([])
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)

  const section = location.state?.section || 'holiday-club'

  useEffect(() => {
    if (nursery) {
      getTodayGlueGunEntries(nursery).then(setEntries).catch(() => {})
    }
  }, [nursery])

  const handleConfirm = async (type) => {
    if (!initials.trim()) return
    setSubmitting(true)
    setError(null)
    try {
      await submitCheck({
        nursery,
        room: 'Holiday Club',
        checkType: type === 'out' ? 'glueGunOut' : 'glueGunIn',
        completedBy: initials.trim().toUpperCase(),
        items: [],
        notes: null,
      })
      const updated = await getTodayGlueGunEntries(nursery)
      setEntries(updated)
      setInitials('')
      setView('main')
    } catch (err) {
      console.error(err)
      setError('Failed to submit. Please try again.')
    } finally {
      setSubmitting(false)
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
        {view === 'main' && (
          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200">
            <Select
              label="Location"
              value={nursery}
              onChange={(e) => { setNursery(e.target.value); setView('main') }}
              options={LOCATIONS}
              placeholder="Select location"
            />
          </div>
        )}

        {/* Main view */}
        {view === 'main' && nursery && (
          <>
            <div className="flex flex-col gap-3">
              <Button
                color="marmalade"
                size="large"
                fullWidth
                onClick={() => { setView('signOut'); setInitials('') }}
              >
                🔴 Sign Out Hot Glue Gun
              </Button>
              <Button
                color="apple"
                size="large"
                fullWidth
                onClick={() => { setView('signIn'); setInitials('') }}
              >
                ✅ Sign In Hot Glue Gun
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
                        {e.check_type === 'glueGunOut' ? '🔴 Signed out' : '✅ Signed in'}
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

        {/* Sign Out confirmation */}
        {view === 'signOut' && (
          <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-200 space-y-4">
            <p className="text-sm font-semibold text-hop-forest">Sign Out — Hot Glue Gun</p>
            <p className="text-sm text-gray-700 leading-relaxed">{SIGN_OUT_STATEMENT}</p>

            <div>
              <label className="block text-sm font-medium text-hop-forest mb-1">
                Initials <span className="text-hop-marmalade-dark">*</span>
              </label>
              <input
                type="text"
                value={initials}
                onChange={(e) => setInitials(e.target.value)}
                placeholder="e.g. PF"
                maxLength={5}
                className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg text-hop-forest text-sm font-body focus:outline-none focus:border-hop-forest uppercase"
              />
            </div>

            {error && <p className="text-sm text-red-600">{error}</p>}

            <div className="flex gap-3 pt-1">
              <Button color="forest" fullWidth disabled={!initials.trim() || submitting} onClick={() => handleConfirm('out')}>
                {submitting ? 'Submitting...' : 'Confirm Sign Out'}
              </Button>
              <Button color="pebble" fullWidth onClick={() => { setView('main'); setError(null) }}>
                Cancel
              </Button>
            </div>
          </div>
        )}

        {/* Sign In confirmation */}
        {view === 'signIn' && (
          <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-200 space-y-4">
            <p className="text-sm font-semibold text-hop-forest">Sign In — Hot Glue Gun</p>
            <p className="text-sm text-gray-700 leading-relaxed">{SIGN_IN_STATEMENT}</p>

            <div>
              <label className="block text-sm font-medium text-hop-forest mb-1">
                Initials <span className="text-hop-marmalade-dark">*</span>
              </label>
              <input
                type="text"
                value={initials}
                onChange={(e) => setInitials(e.target.value)}
                placeholder="e.g. PF"
                maxLength={5}
                className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg text-hop-forest text-sm font-body focus:outline-none focus:border-hop-forest uppercase"
              />
            </div>

            {error && <p className="text-sm text-red-600">{error}</p>}

            <div className="flex gap-3 pt-1">
              <Button color="apple" fullWidth disabled={!initials.trim() || submitting} onClick={() => handleConfirm('in')}>
                {submitting ? 'Submitting...' : 'Confirm Sign In'}
              </Button>
              <Button color="pebble" fullWidth onClick={() => { setView('main'); setError(null) }}>
                Cancel
              </Button>
            </div>
          </div>
        )}

      </div>
    </div>
  )
}
