import { useState } from 'react'
import { Card } from './Card'
import { Button } from './Button'
import { Alert } from './Alert'

export function AIAnalysisPanel({ analysis, loading, error, onRetry }) {
  const [expandedSections, setExpandedSections] = useState({
    ofsted: true,
    riddor: true,
  })

  if (loading) {
    return (
      <Card className="text-center py-8">
        <div className="w-10 h-10 border-3 border-hop-forest border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-hop-forest font-medium">Analysing incident...</p>
        <p className="text-sm text-gray-500 mt-1">
          AI is reviewing the incident details to provide recommendations
        </p>
      </Card>
    )
  }

  if (error) {
    return (
      <Alert type="error" title="Analysis unavailable">
        <p className="mb-3">Unable to complete AI analysis. You can still proceed with the form.</p>
        <Button color="forest" variant="secondary" size="small" onClick={onRetry}>
          Try again
        </Button>
      </Alert>
    )
  }

  if (!analysis) {
    return null
  }

  const getRecommendationColor = (rec) => {
    switch (rec) {
      case 'yes':
        return 'bg-hop-marmalade/20 border-hop-marmalade text-hop-marmalade-dark'
      case 'no':
        return 'bg-hop-apple/20 border-hop-apple text-hop-forest'
      default:
        return 'bg-hop-sunshine/30 border-hop-sunshine text-hop-forest'
    }
  }

  const getRecommendationLabel = (rec) => {
    switch (rec) {
      case 'yes':
        return 'Likely Required'
      case 'no':
        return 'Likely Not Required'
      default:
        return 'Needs Review'
    }
  }

  return (
    <div className="space-y-4">
      <Card className="bg-hop-freshair/20 border border-hop-freshair">
        <div className="flex items-start gap-3 mb-3">
          <div className="w-8 h-8 bg-hop-forest rounded-full flex items-center justify-center flex-shrink-0">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="white"
              className="w-5 h-5"
            >
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z" />
            </svg>
          </div>
          <div>
            <h3 className="font-semibold text-hop-forest">AI Analysis</h3>
            <p className="text-xs text-gray-500">
              This analysis assists your professional judgement - always verify recommendations
            </p>
          </div>
        </div>

        <p className="text-sm text-hop-forest">{analysis.summary}</p>
      </Card>

      {/* Ofsted Recommendation */}
      <Card className="space-y-3">
        <button
          className="w-full flex items-center justify-between"
          onClick={() =>
            setExpandedSections((s) => ({ ...s, ofsted: !s.ofsted }))
          }
        >
          <div className="flex items-center gap-3">
            <span className="font-semibold text-hop-forest">Ofsted Notification</span>
            <span
              className={`px-2 py-0.5 text-xs font-medium rounded-full border ${getRecommendationColor(
                analysis.ofstedRecommendation
              )}`}
            >
              {getRecommendationLabel(analysis.ofstedRecommendation)}
            </span>
          </div>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className={`w-5 h-5 text-gray-400 transition-transform ${
              expandedSections.ofsted ? 'rotate-180' : ''
            }`}
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path
              fillRule="evenodd"
              d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
              clipRule="evenodd"
            />
          </svg>
        </button>

        {expandedSections.ofsted && (
          <p className="text-sm text-gray-600 pl-0">{analysis.ofstedReasoning}</p>
        )}
      </Card>

      {/* RIDDOR Recommendation */}
      <Card className="space-y-3">
        <button
          className="w-full flex items-center justify-between"
          onClick={() =>
            setExpandedSections((s) => ({ ...s, riddor: !s.riddor }))
          }
        >
          <div className="flex items-center gap-3">
            <span className="font-semibold text-hop-forest">RIDDOR Reporting</span>
            <span
              className={`px-2 py-0.5 text-xs font-medium rounded-full border ${getRecommendationColor(
                analysis.riddorRecommendation
              )}`}
            >
              {getRecommendationLabel(analysis.riddorRecommendation)}
            </span>
          </div>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className={`w-5 h-5 text-gray-400 transition-transform ${
              expandedSections.riddor ? 'rotate-180' : ''
            }`}
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path
              fillRule="evenodd"
              d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
              clipRule="evenodd"
            />
          </svg>
        </button>

        {expandedSections.riddor && (
          <p className="text-sm text-gray-600 pl-0">{analysis.riddorReasoning}</p>
        )}
      </Card>

      {/* Immediate Actions */}
      {analysis.immediateActions?.length > 0 && (
        <Card>
          <h4 className="font-semibold text-hop-forest mb-2">Suggested Immediate Actions</h4>
          <ul className="space-y-1.5">
            {analysis.immediateActions.map((action, i) => (
              <li key={i} className="flex gap-2 text-sm text-gray-600">
                <span className="text-hop-marmalade">•</span>
                {action}
              </li>
            ))}
          </ul>
        </Card>
      )}

      {/* Preventive Measures */}
      {analysis.preventiveMeasures?.length > 0 && (
        <Card>
          <h4 className="font-semibold text-hop-forest mb-2">Recommended Preventive Measures</h4>
          <ul className="space-y-1.5">
            {analysis.preventiveMeasures.map((measure, i) => (
              <li key={i} className="flex gap-2 text-sm text-gray-600">
                <span className="text-hop-apple">•</span>
                {measure}
              </li>
            ))}
          </ul>
        </Card>
      )}

      {/* Additional Concerns */}
      {analysis.additionalConcerns && analysis.additionalConcerns !== 'None identified' && (
        <Alert type="info" title="Additional Considerations">
          {analysis.additionalConcerns}
        </Alert>
      )}
    </div>
  )
}

export function EmailDraftModal({ emailData, onClose }) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    await navigator.clipboard.writeText(emailData.body)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl max-w-2xl w-full max-h-[80vh] overflow-hidden flex flex-col">
        <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
          <h3 className="font-semibold text-hop-forest">Email Draft for Armadillo</h3>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full hover:bg-gray-100 flex items-center justify-center"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>
        </div>

        <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
          <p className="text-sm text-gray-500">Subject:</p>
          <p className="text-hop-forest font-medium">{emailData.subject}</p>
        </div>

        <div className="flex-1 overflow-auto p-4">
          <pre className="text-sm text-gray-700 whitespace-pre-wrap font-body">{emailData.body}</pre>
        </div>

        <div className="px-4 py-3 border-t border-gray-200 flex gap-3">
          <Button color="forest" variant="secondary" onClick={handleCopy} className="flex-1">
            {copied ? 'Copied!' : 'Copy to clipboard'}
          </Button>
          <a href={emailData.mailto} className="flex-1">
            <Button color="forest" fullWidth>
              Open in email app
            </Button>
          </a>
        </div>
      </div>
    </div>
  )
}
