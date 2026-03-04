import { useState, useEffect } from 'react'
import { useLocation, useNavigate, Link } from 'react-router-dom'
import { Header } from '../components/Header'
import { Button } from '../components/ui/Button'
import { SignatureCanvas } from '../components/SignatureCanvas'
import { submitCheck, uploadSignature } from '../lib/supabase'

const ITEMS = [
  { id: 1, text: 'All electrical equipment present must be in good condition, with wires out of reach of children or made safe. (Defective or surplus equipment must be removed from rooms, never left stored in the room)' },
  { id: 2, text: 'Play equipment in good condition, with no sharp edges or damage.' },
  { id: 3, text: 'Fixtures and fittings should be secure and in good condition, including tables, chairs and benches.' },
  { id: 4, text: 'Fire and electrical hazards e.g. firefighting equipment easily accessible and fire exits free of obstacles, signage in place.' },
  { id: 5, text: 'Phone lines, intercoms and security cameras are working (if applicable)' },
  { id: 6, text: 'Hot water is working' },
  { id: 7, text: 'Pests' },
  { id: 8, text: 'Gates are locked and lock mechanism in good working order' },
  { id: 9, text: 'Checking whole outside for any possible dangerous debris which could have come from neighbouring gardens / fallen from trees.' },
  { id: 10, text: 'Check for animal excrement.' },
  { id: 11, text: 'Slip, trip, fall hazards, such as leaves, frost, ice, drains and covers.' },
]

export function HolidayClubChecklist() {
  const location = useLocation()
  const navigate = useNavigate()
  const { nursery, completedBy } = location.state || {}

  const [comment, setComment] = useState('')
  const [signature, setSignature] = useState(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!nursery) navigate('/')
  }, [nursery, navigate])

  const isValid = comment.trim() && signature

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

      const signatureUrl = signature ? await uploadSignature(signature) : null

      await submitCheck({
        nursery,
        room: 'Holiday Club',
        checkType: 'roomSafety',
        completedBy,
        items: submitItems,
        notes: comment.trim(),
        signatureUrl,
      })

      navigate('/section/holiday-club')
    } catch (err) {
      console.error('Submit error:', err)
      setError('Failed to submit check. Please try again.')
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-hop-pebble">
      <Header title="Holiday Club Daily Checks" subtitle={nursery} showBack />

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
            Comments <span className="text-hop-marmalade-dark">*</span>
            <span className="text-gray-400 font-normal ml-1">(enter N/A if no defects found)</span>
          </label>
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="N/A if no defects found"
            rows={4}
            className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg text-hop-forest text-sm font-body focus:outline-none focus:border-hop-forest resize-none"
          />
        </div>

        <div className="bg-white rounded-xl p-4 shadow-sm">
          <SignatureCanvas onSignature={setSignature} />
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
          disabled={isSubmitting || !isValid}
          onClick={handleSubmit}
        >
          {isSubmitting ? 'Submitting...' : !comment.trim() ? 'Add a comment to submit' : !signature ? 'Sign to Submit' : 'Submit Check'}
        </Button>

        <div className="text-center space-y-2 pb-4">
          <Link
            to="/summary"
            state={{ section: 'holiday-club' }}
            className="block text-hop-forest hover:text-hop-forest-dark underline underline-offset-2 transition-colors text-sm"
          >
            📋 View today's checks →
          </Link>
          <Link
            to="/history"
            state={{ section: 'holiday-club' }}
            className="block text-gray-500 hover:text-hop-forest underline underline-offset-2 transition-colors text-sm"
          >
            📅 View check history (30 days)
          </Link>
        </div>
      </div>
    </div>
  )
}
