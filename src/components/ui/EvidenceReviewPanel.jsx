import { useState } from 'react'
import { Card } from './Card'
import { Button } from './Button'

export function EvidenceReviewPanel({
  suggestions = [],
  loading,
  error,
  onAccept,
  onDismiss,
  onSkip,
  onRetry,
  onContinue,
  acceptedNotes = []
}) {
  const [dismissed, setDismissed] = useState(new Set())

  const visibleSuggestions = suggestions.filter(s => !dismissed.has(s.id))
  const allReviewed = visibleSuggestions.length === 0 && suggestions.length > 0

  const handleDismiss = (id) => {
    setDismissed(prev => new Set([...prev, id]))
    onDismiss?.(id)
  }

  const handleAccept = (suggestion) => {
    setDismissed(prev => new Set([...prev, suggestion.id]))
    onAccept?.(suggestion)
  }

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
        <Card className="max-w-md w-full text-center py-8">
          <div className="w-12 h-12 border-3 border-hop-forest border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <h3 className="font-semibold text-hop-forest text-lg mb-2">Reviewing Evidence</h3>
          <p className="text-sm text-gray-600">
            AI is comparing your description against the uploaded evidence...
          </p>
        </Card>
      </div>
    )
  }

  if (error) {
    return (
      <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <div className="text-center py-4">
            <div className="w-12 h-12 bg-hop-marmalade/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6 text-hop-marmalade" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h3 className="font-semibold text-hop-forest text-lg mb-2">Review Unavailable</h3>
            <p className="text-sm text-gray-600 mb-4">
              Unable to complete the evidence review. You can continue without it.
            </p>
            <div className="flex gap-3 justify-center">
              <Button color="forest" variant="secondary" onClick={onRetry}>
                Try Again
              </Button>
              <Button color="forest" onClick={onSkip}>
                Skip & Continue
              </Button>
            </div>
          </div>
        </Card>
      </div>
    )
  }

  // No suggestions - everything looks good
  if (suggestions.length === 0) {
    return (
      <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <div className="text-center py-4">
            <div className="w-12 h-12 bg-hop-apple/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6 text-hop-apple" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h3 className="font-semibold text-hop-forest text-lg mb-2">Evidence Review Complete</h3>
            <p className="text-sm text-gray-600 mb-4">
              Your description appears consistent with the uploaded evidence. No issues found.
            </p>
            <Button color="forest" onClick={onContinue}>
              Continue
            </Button>
          </div>
        </Card>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl max-w-lg w-full max-h-[85vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-4 py-3 border-b border-gray-200 bg-hop-freshair/20">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-hop-forest rounded-full flex items-center justify-center flex-shrink-0">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="white" className="w-5 h-5">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z" />
              </svg>
            </div>
            <div>
              <h3 className="font-semibold text-hop-forest">AI Evidence Review</h3>
              <p className="text-xs text-gray-500">
                Review these suggestions before continuing
              </p>
            </div>
          </div>
        </div>

        {/* Suggestions list */}
        <div className="flex-1 overflow-auto p-4 space-y-3">
          {allReviewed ? (
            <div className="text-center py-6">
              <div className="w-12 h-12 bg-hop-apple/20 rounded-full flex items-center justify-center mx-auto mb-3">
                <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6 text-hop-apple" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <p className="text-hop-forest font-medium">All suggestions reviewed</p>
              {acceptedNotes.length > 0 && (
                <p className="text-sm text-gray-500 mt-1">
                  {acceptedNotes.length} note{acceptedNotes.length !== 1 ? 's' : ''} added to investigation
                </p>
              )}
            </div>
          ) : (
            visibleSuggestions.map((suggestion) => (
              <SuggestionCard
                key={suggestion.id}
                suggestion={suggestion}
                onAccept={() => handleAccept(suggestion)}
                onDismiss={() => handleDismiss(suggestion.id)}
              />
            ))
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-3 border-t border-gray-200 flex gap-3">
          {!allReviewed && (
            <Button color="forest" variant="secondary" onClick={onSkip} className="flex-1">
              Skip Review
            </Button>
          )}
          <Button
            color="forest"
            onClick={onContinue}
            className="flex-1"
          >
            Continue
          </Button>
        </div>
      </div>
    </div>
  )
}

function SuggestionCard({ suggestion, onAccept, onDismiss }) {
  const { type, source, message, suggestion: suggestionText, severity } = suggestion

  const getIcon = () => {
    switch (type) {
      case 'gap':
        return (
          <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        )
      case 'inconsistency':
        return (
          <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        )
      default:
        return (
          <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        )
    }
  }

  const getTypeLabel = () => {
    switch (type) {
      case 'gap':
        return 'Missing Information'
      case 'inconsistency':
        return 'Possible Inconsistency'
      default:
        return 'Clarification Needed'
    }
  }

  const getBorderColor = () => {
    if (severity === 'warning') {
      return 'border-l-hop-marmalade'
    }
    return 'border-l-hop-freshair'
  }

  const getIconColor = () => {
    if (severity === 'warning') {
      return 'text-hop-marmalade'
    }
    return 'text-hop-freshair'
  }

  return (
    <div className={`bg-white border border-gray-200 border-l-4 ${getBorderColor()} rounded-lg p-3`}>
      <div className="flex items-start gap-3">
        <div className={`flex-shrink-0 ${getIconColor()}`}>
          {getIcon()}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">
              {getTypeLabel()}
            </span>
            <span className="text-xs text-gray-400">from {source}</span>
          </div>
          <p className="text-sm text-hop-forest font-medium mb-1">{message}</p>
          {suggestionText && (
            <p className="text-sm text-gray-600 italic">{suggestionText}</p>
          )}
        </div>
      </div>
      <div className="flex gap-2 mt-3 ml-8">
        <button
          onClick={onDismiss}
          className="text-xs text-gray-500 hover:text-gray-700 px-2 py-1 rounded hover:bg-gray-100"
        >
          Dismiss
        </button>
        <button
          onClick={onAccept}
          className="text-xs text-hop-forest font-medium hover:text-hop-forest/80 px-2 py-1 rounded bg-hop-freshair/30 hover:bg-hop-freshair/50"
        >
          Add to notes
        </button>
      </div>
    </div>
  )
}
