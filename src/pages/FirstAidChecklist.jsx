import { useState, useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Header } from '../components/Header'
import { Button } from '../components/ui/Button'
import { submitCheck, getLastCheck } from '../lib/supabase'

const ITEMS = [
  'Medium first aid dressing, 12 × 12 cm (sterile)',
  'Large first aid dressing, 18 × 18 cm (sterile)',
  'Disposable triangular bandage, 90 × 90 × 130 cm (non-sterile)',
  'Finger dressing, 3.5 × 3.5 cm (sterile)',
  'Conforming bandage, 7.5 cm × 4.5 m (single)',
  'Safety pins, assorted sizes (6 pack)',
  'No.16 eye pad first aid dressing (sterile)',
  'Washproof plasters, assorted (pack of 10)',
  'Sterile cleansing wipes (pack of 10)',
  'Microporous tape, 2.25 cm × 10 m (single)',
  'Nitrile powder-free gloves (large)',
  'Revive-Aid',
  'Disposable heat-retaining adult foil blanket',
  'Burnshield® dressing, 10 × 10 cm',
  'Tuff Kut scissors (green)',
]

export function FirstAidChecklist() {
  const location = useLocation()
  const navigate = useNavigate()
  const { nursery, completedBy: initialCompletedBy, section } = location.state || {}

  const [lastCheck, setLastCheck] = useState(undefined) // undefined = loading, null = none found
  const [allPresent, setAllPresent] = useState(null) // true | false | null
  const [missingItems, setMissingItems] = useState('')
  const [initials, setInitials] = useState(initialCompletedBy || '')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!nursery) navigate('/')
  }, [nursery, navigate])

  useEffect(() => {
    if (nursery) {
      getLastCheck(nursery, 'firstAidBox').then(setLastCheck)
    }
  }, [nursery])

  const isValid = allPresent !== null
    && (allPresent || missingItems.trim())
    && initials.trim()

  const handleSubmit = async () => {
    setIsSubmitting(true)
    setError(null)
    try {
      const submitItems = ITEMS.map((text, i) => ({
        id: i + 1,
        text,
        status: 'pass',
      }))

      await submitCheck({
        nursery,
        room: 'First Aid Box',
        checkType: 'firstAidBox',
        completedBy: initials.trim(),
        items: submitItems,
        notes: allPresent
          ? 'All items present'
          : `Missing items: ${missingItems.trim()}`,
      })

      navigate(section ? `/section/${section}` : '/')
    } catch (err) {
      console.error('Submit error:', err)
      setError('Failed to submit. Please try again.')
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-hop-pebble">
      <Header title="First Aid Box Checklist" subtitle={nursery} showBack />

      <div className="px-4 py-6 max-w-2xl mx-auto space-y-4">
        {/* Last check date */}
        {lastCheck !== undefined && (
          <div className="bg-white rounded-xl p-4 border border-gray-200">
            {lastCheck ? (
              <p className="text-sm text-gray-500">
                Last checked:{' '}
                <span className="font-medium text-hop-forest">
                  {new Date(lastCheck.created_at).toLocaleDateString('en-GB', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                  })}
                </span>
                {lastCheck.completed_by && (
                  <span className="text-gray-400"> by {lastCheck.completed_by}</span>
                )}
              </p>
            ) : (
              <p className="text-sm text-gray-400">No previous check recorded.</p>
            )}
          </div>
        )}

        {/* Items list */}
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200">
          <p className="text-hop-forest text-lg font-bold mb-4">First Aid Box Contents</p>
          <ul className="space-y-3">
            {ITEMS.map((item, index) => (
              <li key={index} className="flex gap-3 text-hop-forest">
                <span className="text-gray-400 shrink-0">{index + 1}.</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* All items present toggle */}
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200">
          <p className="text-sm font-medium text-hop-forest mb-3">
            Are all items present? <span className="text-hop-marmalade-dark">*</span>
          </p>
          <div className="flex gap-3">
            <button
              onClick={() => setAllPresent(true)}
              className={`flex-1 py-3 rounded-lg font-medium text-sm transition-colors ${
                allPresent === true
                  ? 'bg-hop-apple text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              ✓ Yes
            </button>
            <button
              onClick={() => setAllPresent(false)}
              className={`flex-1 py-3 rounded-lg font-medium text-sm transition-colors ${
                allPresent === false
                  ? 'bg-hop-marmalade text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              ✗ No
            </button>
          </div>
        </div>

        {/* Missing items (shown when not all present) */}
        {allPresent === false && (
          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200">
            <label className="block text-sm font-medium text-hop-forest mb-2">
              Items to order <span className="text-hop-marmalade-dark">*</span>
            </label>
            <textarea
              value={missingItems}
              onChange={(e) => setMissingItems(e.target.value)}
              placeholder="List the missing items..."
              rows={3}
              className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg text-hop-forest text-sm font-body focus:outline-none focus:border-hop-forest resize-none"
            />
          </div>
        )}

        {/* Data notice */}
        <div className="rounded-xl p-3 bg-gray-50 border border-gray-200">
          <p className="text-xs text-gray-500 leading-relaxed">
            <span className="font-medium text-gray-600">Data notice:</span> Your initials are recorded for health, safety, and compliance purposes under legitimate interest (UK GDPR Article 6(1)(f)). Records are held securely and retained in line with Hopscotch's data retention policy.
          </p>
        </div>

        {/* Initials */}
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200">
          <label className="block text-sm font-medium text-hop-forest mb-2">
            Initials <span className="text-hop-marmalade-dark">*</span>
          </label>
          <input
            type="text"
            value={initials}
            onChange={(e) => setInitials(e.target.value)}
            placeholder="e.g. PF"
            className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg text-hop-forest text-sm font-body focus:outline-none focus:border-hop-forest"
          />
        </div>

        {error && (
          <div className="p-3 bg-red-50 text-red-700 rounded-lg text-sm">
            {error}
          </div>
        )}

        <Button
          color="blossom"
          size="large"
          fullWidth
          disabled={isSubmitting || !isValid}
          onClick={() => handleSubmit()}
        >
          {isSubmitting ? 'Submitting...' : 'Submit Check'}
        </Button>
      </div>
    </div>
  )
}
