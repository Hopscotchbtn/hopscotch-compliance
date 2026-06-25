import { useState, useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Header } from '../components/Header'
import { Button } from '../components/ui/Button'
import { submitCheck } from '../lib/supabase'

const NOTICE = 'The daily checks must be carried out before the nursery is open and children are on site. The garden/outside areas should be monitored through the day and any defects reported immediately to the duty manager and made safe (comments should be added below to reference defects found.) All relevant staff should be informed of any hazards or issues in the outdoor play areas/public areas.'

const ITEMS = [
  { id: 1, text: 'Gates locked and lock mechanisms in good working order.' },
  { id: 2, text: 'All play equipment in good working order, no damage or loose fittings.' },
  { id: 3, text: 'Checking whole outside for any possible dangerous debris which could have come from neighbouring gardens / fallen from trees.' },
  { id: 4, text: 'Check for animal excrement.' },
  { id: 5, text: 'Slip, trip, fall hazards, such as leaves, frost, ice, drains and covers.' },
  { id: 6, text: 'Eye level hazards such as children\'s coat hooks, buggy park hooks and outside taps.' },
  { id: 7, text: 'Loose roof tiles, guttering or other overhead hazards.' },
  { id: 8, text: 'Boundary fencing and walls secure and safe, (no nails protruding, overhanging trees/branches.)' },
]

export function GardenChecklist() {
  const location = useLocation()
  const navigate = useNavigate()
  const { nursery, completedBy } = location.state || {}

  const [showNotice, setShowNotice] = useState(true)
  const [comment, setComment] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!nursery) navigate('/')
  }, [nursery, navigate])

  const handleSubmit = async () => {
    setIsSubmitting(true)
    setError(null)
    try {
      const submitItems = ITEMS.map(item => ({
        id: item.id,
        text: item.text,
        status: 'pass',
        note: comment.trim(),
        photo_url: null,
      }))

      await submitCheck({
        nursery,
        room: 'Garden/Outdoor Area',
        checkType: 'gardenOutdoor',
        completedBy,
        items: submitItems,
        notes: comment.trim(),
      })

      navigate('/section/nursery')
    } catch (err) {
      console.error('Submit error:', err)
      setError('Failed to submit check. Please try again.')
      setIsSubmitting(false)
    }
  }

  if (showNotice) {
    return (
      <div className="min-h-screen bg-hop-pebble">
        <Header title="Daily Garden Opening Checks" subtitle={nursery} showBack />

        <div className="px-4 py-6 max-w-2xl mx-auto space-y-4">
          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200">
            <div className="bg-hop-smiles border border-hop-smiles rounded-lg p-4">
              <p className="text-hop-forest text-lg leading-relaxed">{NOTICE}</p>
            </div>
          </div>

          <Button color="forest" size="large" fullWidth onClick={() => setShowNotice(false)}>
            Continue
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-hop-pebble">
      <Header title="Daily Garden Opening Checks" subtitle={nursery} showBack />

      <div className="px-4 py-6 max-w-2xl mx-auto space-y-4">
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200">
          <p className="text-hop-forest text-lg font-bold mb-4">The checks carried out will consist of the following:</p>
          <ul className="space-y-3">
            {ITEMS.map((item, index) => (
              <li key={item.id} className="flex gap-3 text-hop-forest">
                <span className="text-gray-400 shrink-0">{index + 1}.</span>
                <span>{item.text}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200">
          <label className="block text-sm font-medium text-hop-forest mb-2">
            Comments
            <span className="text-gray-400 font-normal ml-1">(optional — note any defects found)</span>
          </label>
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Note any defects found"
            rows={4}
            className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg text-hop-forest text-sm font-body focus:outline-none focus:border-hop-forest resize-none"
          />
        </div>

        {error && (
          <div className="p-3 bg-red-50 text-red-700 rounded-lg text-sm">
            {error}
          </div>
        )}

        <Button
          color="forest"
          size="large"
          fullWidth
          disabled={isSubmitting}
          onClick={handleSubmit}
        >
          {isSubmitting ? 'Submitting...' : 'Submit Check'}
        </Button>
      </div>
    </div>
  )
}
