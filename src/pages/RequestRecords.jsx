import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Header } from '../components/Header'
import { Card } from '../components/ui/Card'
import { Input } from '../components/ui/Input'
import { TextArea } from '../components/ui/Input'
import { Select } from '../components/ui/Select'
import { Button } from '../components/ui/Button'
import { nurseries } from '../data/nurseries'
import { rooms } from '../data/rooms'
import { storage } from '../lib/storage'
import { submitRecordRequest } from '../lib/supabase'

export function RequestRecords() {
  const navigate = useNavigate()
  const [nursery, setNursery] = useState(() => storage.getLastNursery() || '')
  const [room, setRoom] = useState('all')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [reason, setReason] = useState('')
  const [email, setEmail] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [error, setError] = useState(null)

  const isValid = nursery && startDate && endDate && email

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!isValid) return

    setIsSubmitting(true)
    setError(null)

    try {
      await submitRecordRequest({
        nursery,
        room: room === 'all' ? null : room,
        startDate,
        endDate,
        reason,
        email,
        requestedBy: storage.getUserName() || 'Unknown',
      })
      setIsSubmitted(true)
    } catch (err) {
      console.error('Error submitting request:', err)
      setError('Failed to submit request. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isSubmitted) {
    return (
      <div className="min-h-screen bg-hop-pebble">
        <Header title="Request Sent" showBack />

        <div className="px-4 py-8 max-w-md mx-auto">
          <Card className="text-center py-8">
            <div className="w-16 h-16 bg-hop-apple rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="font-display text-xl text-hop-forest font-semibold mb-2">
              Request Submitted
            </h2>
            <p className="text-gray-600 mb-6">
              Your request has been sent to the admin team. You'll receive the records at <strong>{email}</strong> within 2-3 working days.
            </p>
            <Button color="forest" onClick={() => navigate('/history')}>
              Back to History
            </Button>
          </Card>
        </div>
      </div>
    )
  }

  // Calculate max date (30 days ago)
  const maxDate = new Date()
  maxDate.setDate(maxDate.getDate() - 30)
  const maxDateStr = maxDate.toISOString().split('T')[0]

  return (
    <div className="min-h-screen bg-hop-pebble">
      <Header title="Request Records" subtitle="Older than 30 days" showBack />

      <div className="px-4 py-6 max-w-md mx-auto">
        <Card>
          <form onSubmit={handleSubmit} className="space-y-5">
            <p className="text-gray-600 text-sm">
              Request compliance check records older than 30 days. Records will be sent to your email within 2-3 working days.
            </p>

            <Select
              label="Nursery"
              value={nursery}
              onChange={setNursery}
              options={nurseries}
              placeholder="Select nursery"
              required
            />

            <Select
              label="Room (optional)"
              value={room}
              onChange={setRoom}
              options={['all', ...rooms]}
              placeholder="All rooms"
            />

            <div className="grid grid-cols-2 gap-3">
              <Input
                label="From date"
                type="date"
                value={startDate}
                onChange={setStartDate}
                max={maxDateStr}
                required
              />
              <Input
                label="To date"
                type="date"
                value={endDate}
                onChange={setEndDate}
                max={maxDateStr}
                required
              />
            </div>

            <Input
              label="Your email"
              type="email"
              value={email}
              onChange={setEmail}
              placeholder="email@example.com"
              required
            />

            <TextArea
              label="Reason for request (optional)"
              value={reason}
              onChange={setReason}
              placeholder="e.g., Ofsted inspection, internal audit..."
              rows={2}
            />

            {error && (
              <div className="p-3 bg-red-50 text-red-700 rounded-lg text-sm">
                {error}
              </div>
            )}

            <Button
              type="submit"
              color="forest"
              size="large"
              fullWidth
              disabled={!isValid || isSubmitting}
            >
              {isSubmitting ? 'Submitting...' : 'Submit Request'}
            </Button>
          </form>
        </Card>
      </div>
    </div>
  )
}
