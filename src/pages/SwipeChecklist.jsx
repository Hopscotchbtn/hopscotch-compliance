import { useState, useEffect } from 'react'
import { useParams, useLocation, useNavigate } from 'react-router-dom'
import { Header } from '../components/Header'
import { SwipeCard } from '../components/SwipeCard'
import { Button } from '../components/ui/Button'
import { checkTypes, getChecklistItems, isMonday } from '../data/checklists'
import { submitCheck } from '../lib/supabase'

export function SwipeChecklist() {
  const { roomName } = useParams()
  const location = useLocation()
  const navigate = useNavigate()

  const { nursery, room, completedBy, checkType: checkTypeId = 'roomOpening' } = location.state || {}
  const actualRoom = roomName ? decodeURIComponent(roomName) : room
  const checkType = checkTypes[checkTypeId]

  const [currentIndex, setCurrentIndex] = useState(0)
  const [items, setItems] = useState([])
  const [responses, setResponses] = useState({})
  const [notes, setNotes] = useState({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState(null)
  const [showSummary, setShowSummary] = useState(false)

  // Redirect if missing required data
  useEffect(() => {
    if (!checkType || !nursery) {
      navigate('/')
    }
  }, [checkType, nursery, navigate])

  useEffect(() => {
    if (checkType) {
      const checklistItems = getChecklistItems(checkTypeId)
      setItems(checklistItems)
    }
  }, [checkTypeId, checkType])

  // Show loading state while checking/redirecting
  if (!checkType || !nursery) {
    return null
  }

  const currentItem = items[currentIndex]
  const isComplete = currentIndex >= items.length
  const failedItems = items.filter(item => responses[item.id] === 'fail')
  const hasIssues = failedItems.length > 0

  const handlePass = () => {
    setResponses(prev => ({ ...prev, [currentItem.id]: 'pass' }))
    if (currentIndex < items.length - 1) {
      setCurrentIndex(prev => prev + 1)
    } else {
      setShowSummary(true)
    }
  }

  const handleFail = (note) => {
    setResponses(prev => ({ ...prev, [currentItem.id]: 'fail' }))
    if (note) {
      setNotes(prev => ({ ...prev, [currentItem.id]: note }))
    }
    if (currentIndex < items.length - 1) {
      setCurrentIndex(prev => prev + 1)
    } else {
      setShowSummary(true)
    }
  }

  const handleNA = () => {
    setResponses(prev => ({ ...prev, [currentItem.id]: 'na' }))
    if (currentIndex < items.length - 1) {
      setCurrentIndex(prev => prev + 1)
    } else {
      setShowSummary(true)
    }
  }

  const handleNoteChange = (note) => {
    setNotes(prev => ({ ...prev, [currentItem.id]: note }))
  }

  const handleSubmit = async () => {
    setIsSubmitting(true)
    setError(null)

    try {
      const submitItems = items.map(item => ({
        id: item.id,
        text: item.text,
        status: responses[item.id] || 'na',
        note: notes[item.id] || null,
      }))

      await submitCheck({
        nursery,
        room: actualRoom,
        checkType: checkTypeId,
        completedBy,
        items: submitItems,
      })

      // Navigate back to room progress
      navigate(`/check/${checkTypeId}`, {
        state: { justCompleted: actualRoom },
      })
    } catch (err) {
      console.error('Submit error:', err)
      setError('Failed to submit check. Please try again.')
      setIsSubmitting(false)
    }
  }

  const handleGoBack = () => {
    if (currentIndex > 0) {
      setCurrentIndex(prev => prev - 1)
      setShowSummary(false)
    }
  }

  // Summary view after all items
  if (showSummary) {
    return (
      <div className="min-h-screen bg-hop-pebble">
        <Header
          title="Review"
          subtitle={`${nursery} › ${actualRoom}`}
          showBack
          onBack={() => setShowSummary(false)}
        />

        <div className="px-4 py-6 max-w-md mx-auto">
          {/* Summary stats */}
          <div className="bg-white rounded-xl p-6 mb-6 shadow-sm">
            <h2 className="font-display text-xl text-hop-forest font-semibold mb-4 text-center">
              Check Summary
            </h2>

            <div className="grid grid-cols-3 gap-4 mb-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-hop-apple">
                  {items.filter(i => responses[i.id] === 'pass').length}
                </div>
                <div className="text-sm text-gray-500">Passed</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-hop-marmalade-dark">
                  {items.filter(i => responses[i.id] === 'fail').length}
                </div>
                <div className="text-sm text-gray-500">Failed</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-400">
                  {items.filter(i => responses[i.id] === 'na').length}
                </div>
                <div className="text-sm text-gray-500">N/A</div>
              </div>
            </div>
          </div>

          {/* Issues list */}
          {hasIssues && (
            <div className="bg-hop-marmalade/10 border border-hop-marmalade rounded-xl p-4 mb-6">
              <div className="flex items-start gap-3">
                <span className="text-xl">!</span>
                <div className="flex-1">
                  <p className="font-medium text-hop-forest mb-2">
                    {failedItems.length} issue{failedItems.length !== 1 ? 's' : ''} to report
                  </p>
                  <ul className="text-sm space-y-2">
                    {failedItems.map((item) => (
                      <li key={item.id} className="text-hop-marmalade-dark">
                        <span className="font-medium">{item.id}.</span> {item.text}
                        {notes[item.id] && (
                          <span className="block text-gray-600 text-xs ml-4 mt-0.5">
                            Note: {notes[item.id]}
                          </span>
                        )}
                      </li>
                    ))}
                  </ul>
                  <p className="text-sm text-gray-600 mt-3">
                    Please inform the duty manager
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Error message */}
          {error && (
            <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-lg text-sm">
              {error}
            </div>
          )}

          {/* Action buttons */}
          <div className="space-y-3">
            <Button
              color="forest"
              size="large"
              fullWidth
              disabled={isSubmitting}
              onClick={handleSubmit}
            >
              {isSubmitting ? 'Submitting...' : 'Submit Check'}
            </Button>

            <Button
              color="forest"
              variant="secondary"
              size="large"
              fullWidth
              onClick={() => setShowSummary(false)}
            >
              Review Answers
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-hop-pebble flex flex-col">
      <Header
        title={actualRoom}
        subtitle={checkType.shortName}
        showBack
        onBack={currentIndex > 0 ? handleGoBack : undefined}
      />

      {/* Monday indicator for weekly items */}
      {isMonday() && checkType.weeklyItems?.length > 0 && (
        <div className="bg-hop-sunshine/30 px-4 py-2 text-center">
          <p className="text-sm text-hop-forest">
            Monday: includes weekly checks
          </p>
        </div>
      )}

      {/* Swipe card area */}
      <div className="flex-1 flex items-center justify-center">
        {currentItem && (
          <SwipeCard
            item={currentItem}
            currentIndex={currentIndex}
            totalCount={items.length}
            onPass={handlePass}
            onFail={handleFail}
            onNA={handleNA}
            onNoteChange={handleNoteChange}
            note={notes[currentItem.id] || ''}
            color={checkType.color}
          />
        )}
      </div>

      {/* Back button hint */}
      {currentIndex > 0 && (
        <div className="px-4 pb-6 text-center">
          <button
            onClick={handleGoBack}
            className="text-sm text-gray-500 hover:text-hop-forest"
          >
            ← Go back to previous item
          </button>
        </div>
      )}
    </div>
  )
}
