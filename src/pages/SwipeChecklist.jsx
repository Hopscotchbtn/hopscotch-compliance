import { useState, useEffect } from 'react'
import { useParams, useLocation, useNavigate } from 'react-router-dom'
import { Header } from '../components/Header'
import { SwipeCard } from '../components/SwipeCard'
import { SignatureCanvas } from '../components/SignatureCanvas'
import { Button } from '../components/ui/Button'
import { checkTypes, getChecklistItems, isMonday } from '../data/checklists'
import { submitCheck, uploadCheckPhoto, uploadSignature } from '../lib/supabase'

export function SwipeChecklist() {
  const { checkTypeId, roomName } = useParams()
  const location = useLocation()
  const navigate = useNavigate()

  const { nursery, completedBy } = location.state || {}
  const actualRoom = roomName ? decodeURIComponent(roomName) : null
  const checkType = checkTypes[checkTypeId]

  const [currentIndex, setCurrentIndex] = useState(0)
  const [items, setItems] = useState([])
  const [responses, setResponses] = useState({})
  const [notes, setNotes] = useState({})
  const [photos, setPhotos] = useState({})
  const [signature, setSignature] = useState(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState(null)
  const [showSummary, setShowSummary] = useState(false)
  const [postSubmit, setPostSubmit] = useState(false)
  const [copied, setCopied] = useState(false)

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

  const handlePhotoChange = (dataUrl) => {
    setPhotos(prev => {
      const next = { ...prev }
      if (dataUrl) {
        next[currentItem.id] = dataUrl
      } else {
        delete next[currentItem.id]
      }
      return next
    })
  }

  const handleSubmit = async () => {
    setIsSubmitting(true)
    setError(null)

    try {
      // Upload photos
      const photoUrls = {}
      for (const [itemId, dataUrl] of Object.entries(photos)) {
        const url = await uploadCheckPhoto(dataUrl, checkTypeId, itemId)
        if (url) photoUrls[itemId] = url
      }

      // Upload signature
      let signatureUrl = null
      if (signature) {
        signatureUrl = await uploadSignature(signature)
      }

      const submitItems = items.map(item => ({
        id: item.id,
        text: item.text,
        status: responses[item.id] || 'na',
        note: notes[item.id] || null,
        photo_url: photoUrls[item.id] || null,
      }))

      await submitCheck({
        nursery,
        room: actualRoom,
        checkType: checkTypeId,
        completedBy,
        items: submitItems,
        signatureUrl,
      })

      if (hasIssues) {
        setPostSubmit(true)
      } else {
        navigate(`/check/${checkTypeId}`, {
          state: { justCompleted: actualRoom },
        })
      }
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

  // Post-submit escalation screen
  if (postSubmit) {
    const reportText =
      `Compliance Issue — ${nursery} — ${new Date().toLocaleDateString('en-GB')}\n\n` +
      `The following issues were reported during ${checkType.shortName} (${actualRoom}):\n\n` +
      failedItems.map(item =>
        `• ${item.text}${notes[item.id] ? ` — ${notes[item.id]}` : ''}`
      ).join('\n') +
      `\n\nCompleted by: ${completedBy}\nDate: ${new Date().toLocaleDateString('en-GB')}`

    const handleCopy = async () => {
      try {
        await navigator.clipboard.writeText(reportText)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
      } catch {
        // Fallback for older browsers
        const ta = document.createElement('textarea')
        ta.value = reportText
        document.body.appendChild(ta)
        ta.select()
        document.execCommand('copy')
        document.body.removeChild(ta)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
      }
    }

    return (
      <div className="min-h-screen bg-hop-pebble">
        <Header title="Check Submitted" subtitle={`${nursery} › ${actualRoom}`} />
        <div className="px-4 py-6 max-w-md mx-auto text-center">
          <div className="bg-white rounded-xl p-6 mb-6 shadow-sm">
            <div className="text-4xl mb-3">⚠️</div>
            <h2 className="font-display text-xl text-hop-forest font-semibold mb-2">
              {failedItems.length} issue{failedItems.length !== 1 ? 's' : ''} reported
            </h2>
            <p className="text-gray-600 text-sm mb-4">
              Please notify the nursery about these issues.
            </p>
            <ul className="text-left text-sm space-y-1 mb-6">
              {failedItems.map(item => (
                <li key={item.id} className="text-hop-marmalade-dark">
                  • {item.text}
                  {notes[item.id] && (
                    <span className="block text-gray-500 text-xs ml-3">{notes[item.id]}</span>
                  )}
                </li>
              ))}
            </ul>
            <button
              onClick={handleCopy}
              className="w-full py-3 px-4 rounded-xl font-medium text-white bg-hop-marmalade-dark hover:brightness-95 transition-all text-center"
            >
              {copied ? 'Copied!' : 'Copy Issue Report'}
            </button>
          </div>
          <Button
            color="forest"
            variant="secondary"
            size="large"
            fullWidth
            onClick={() => navigate(`/check/${checkTypeId}`, { state: { justCompleted: actualRoom } })}
          >
            Done
          </Button>
        </div>
      </div>
    )
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
                        {photos[item.id] && (
                          <img
                            src={photos[item.id]}
                            alt="Evidence"
                            className="mt-1 ml-4 w-16 h-16 object-cover rounded-lg border"
                          />
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

          {/* Signature */}
          <div className="bg-white rounded-xl p-4 mb-6 shadow-sm">
            <SignatureCanvas onSignature={setSignature} />
          </div>

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
              disabled={isSubmitting || !signature}
              onClick={handleSubmit}
            >
              {isSubmitting ? 'Submitting...' : !signature ? 'Sign to Submit' : 'Submit Check'}
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
            onPhotoChange={handlePhotoChange}
            note={notes[currentItem.id] || ''}
            photo={photos[currentItem.id] || null}
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
