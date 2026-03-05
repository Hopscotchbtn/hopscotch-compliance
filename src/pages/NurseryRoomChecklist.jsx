import { useState, useEffect } from 'react'
import { useParams, useLocation, useNavigate } from 'react-router-dom'
import { Header } from '../components/Header'
import { Button } from '../components/ui/Button'
import { SignatureCanvas } from '../components/SignatureCanvas'
import { checkTypes } from '../data/checklists'
import { submitCheck, uploadSignature } from '../lib/supabase'

export function NurseryRoomChecklist() {
  const { roomName } = useParams()
  const location = useLocation()
  const navigate = useNavigate()

  const { nursery, completedBy, section } = location.state || {}
  const room = roomName ? decodeURIComponent(roomName) : ''
  const checkType = checkTypes.roomSafety
  const items = checkType?.standardItems || []

  const [phase, setPhase] = useState('notice') // 'notice' | 'checklist'
  const [comment, setComment] = useState('')
  const [signature, setSignature] = useState(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!nursery) navigate('/')
  }, [nursery, navigate])

  const isValid = signature

  const handleSubmit = async () => {
    setIsSubmitting(true)
    setError(null)
    try {
      const signatureUrl = signature ? await uploadSignature(signature) : null
      const submitItems = items.map(item => ({
        id: item.id,
        text: item.text,
        status: 'pass',
      }))

      await submitCheck({
        nursery,
        room,
        checkType: 'roomSafety',
        completedBy,
        items: submitItems,
        notes: comment.trim() || null,
        signatureUrl,
      })

      navigate(`/check/roomSafety`, {
        state: { section, skipSetup: true },
      })
    } catch (err) {
      console.error('Submit error:', err)
      setError('Failed to submit. Please try again.')
      setIsSubmitting(false)
    }
  }

  if (phase === 'notice') {
    return (
      <div className="min-h-screen bg-hop-pebble">
        <Header title={room} subtitle={nursery} showBack />

        <div className="px-4 py-6 max-w-2xl mx-auto">
          <div className="bg-hop-smiles border border-hop-smiles rounded-xl p-4 mb-6">
            <p className="text-hop-forest text-lg leading-relaxed">
              The daily checks must be carried out before the nursery is open and children are on site. The rooms should be monitored through the day and any defects reported immediately to the duty manager and made safe.
            </p>
          </div>

          <Button color="forest" size="large" fullWidth onClick={() => setPhase('checklist')}>
            Continue
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-hop-pebble">
      <Header title={room} subtitle={nursery} showBack />

      <div className="px-4 py-6 max-w-2xl mx-auto space-y-4">
        {/* Items list */}
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200">
          <p className="text-hop-forest text-lg font-bold mb-4">The checks carried out will consist of the following:</p>
          <ul className="space-y-3">
            {items.map((item, index) => (
              <li key={item.id} className="flex gap-3 text-hop-forest">
                <span className="text-gray-400 shrink-0">{index + 1}.</span>
                <span>{item.text}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Comments */}
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200">
          <label className="block text-sm font-medium text-hop-forest mb-1">
            Comments
          </label>
          <p className="text-xs text-gray-500 mb-2">Record any defects and report to duty manager</p>
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Any defects or notes (optional)"
            rows={4}
            className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg text-hop-forest text-sm font-body focus:outline-none focus:border-hop-forest resize-none"
          />
        </div>

        {/* Signature */}
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <SignatureCanvas onSignature={setSignature} />
        </div>

        {error && (
          <div className="p-3 bg-red-50 text-red-700 rounded-lg text-sm">
            {error}
          </div>
        )}

        <Button
          color="freshair"
          size="large"
          fullWidth
          disabled={isSubmitting || !isValid}
          onClick={handleSubmit}
        >
          {isSubmitting ? 'Submitting...' : !signature ? 'Sign to Submit' : 'Submit Check'}
        </Button>
      </div>
    </div>
  )
}
