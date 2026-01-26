import { useState } from 'react'
import { Card } from './Card'
import { Button } from './Button'
import {
  generateCOONotification,
  generateOfstedDraft,
  generateRIDDORDraft
} from '../../lib/notificationDrafts'

/**
 * Generic Draft Modal - displays pre-drafted notification text
 */
export function DraftModal({ title, draftData, onClose, showMailto = true }) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    await navigator.clipboard.writeText(draftData.body)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl max-w-2xl w-full max-h-[80vh] overflow-hidden flex flex-col">
        <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
          <h3 className="font-semibold text-hop-forest">{title}</h3>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full hover:bg-gray-100 flex items-center justify-center"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>
        </div>

        {draftData.subject && (
          <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
            <p className="text-sm text-gray-500">Subject:</p>
            <p className="text-hop-forest font-medium">{draftData.subject}</p>
          </div>
        )}

        {draftData.recipient && (
          <div className="px-4 py-2 bg-gray-50 border-b border-gray-200">
            <p className="text-sm text-gray-500">
              To: <span className="text-hop-forest">{draftData.recipient}</span>
              {draftData.recipientEmail && (
                <span className="text-gray-400 ml-2">({draftData.recipientEmail})</span>
              )}
            </p>
          </div>
        )}

        <div className="flex-1 overflow-auto p-4">
          <pre className="text-sm text-gray-700 whitespace-pre-wrap font-body">{draftData.body}</pre>
        </div>

        <div className="px-4 py-3 border-t border-gray-200 flex gap-3">
          <Button color="forest" variant="secondary" onClick={handleCopy} className="flex-1">
            {copied ? 'Copied!' : 'Copy to clipboard'}
          </Button>
          {showMailto && draftData.mailto && (
            <a href={draftData.mailto} className="flex-1">
              <Button color="forest" fullWidth>
                Open in email app
              </Button>
            </a>
          )}
          {draftData.recipientUrl && (
            <a href={draftData.recipientUrl} target="_blank" rel="noopener noreferrer" className="flex-1">
              <Button color="forest" fullWidth>
                Open submission site
              </Button>
            </a>
          )}
        </div>
      </div>
    </div>
  )
}

/**
 * COO Notification Card - for alerting head office of serious incidents
 */
export function COONotificationCard({ incidentData, incidentType, analysis }) {
  const [showModal, setShowModal] = useState(false)
  const [draftData, setDraftData] = useState(null)

  const handleGenerateDraft = () => {
    const draft = generateCOONotification(incidentData, incidentType, analysis)
    setDraftData(draft)
    setShowModal(true)
  }

  // Show for serious/critical incidents or when escalation is needed
  const shouldShow =
    incidentData.severity === 'serious' ||
    incidentData.severity === 'critical' ||
    incidentData.hospitalAttendance === 'yes' ||
    incidentData.escalateToHeadOffice === 'yes' ||
    incidentData.ofstedNotifiable === 'yes' ||
    incidentData.riddorReportable === 'yes' ||
    analysis?.ofstedRecommendation === 'yes' ||
    analysis?.riddorRecommendation === 'yes'

  if (!shouldShow) return null

  return (
    <>
      <Card className="border-2 border-hop-marmalade/30 bg-hop-marmalade/5">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 bg-hop-marmalade rounded-full flex items-center justify-center flex-shrink-0">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-white" viewBox="0 0 20 20" fill="currentColor">
              <path d="M10 2a6 6 0 00-6 6v3.586l-.707.707A1 1 0 004 14h12a1 1 0 00.707-1.707L16 11.586V8a6 6 0 00-6-6zM10 18a3 3 0 01-3-3h6a3 3 0 01-3 3z" />
            </svg>
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-hop-forest">Notify COO</h3>
            <p className="text-sm text-gray-600 mb-3">
              This incident may require head office attention. Generate a summary notification for the COO.
            </p>
            <Button
              color="marmalade"
              variant="secondary"
              onClick={handleGenerateDraft}
              fullWidth
            >
              Generate COO Notification
            </Button>
          </div>
        </div>
      </Card>

      {showModal && draftData && (
        <DraftModal
          title="COO Notification Draft"
          draftData={draftData}
          onClose={() => setShowModal(false)}
        />
      )}
    </>
  )
}

/**
 * Ofsted Draft Card - for generating Ofsted notification letters
 */
export function OfstedDraftCard({ incidentData, incidentType, analysis, visible }) {
  const [showModal, setShowModal] = useState(false)
  const [draftData, setDraftData] = useState(null)

  const handleGenerateDraft = () => {
    const draft = generateOfstedDraft(incidentData, incidentType, analysis)
    setDraftData(draft)
    setShowModal(true)
  }

  if (!visible) return null

  return (
    <>
      <Card className="border-2 border-hop-sunshine/50 bg-hop-sunshine/10">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 bg-hop-sunshine rounded-full flex items-center justify-center flex-shrink-0">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-hop-forest" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-hop-forest">Ofsted Notification</h3>
            <p className="text-sm text-gray-600 mb-3">
              Generate a draft Ofsted notification letter with all required information per EYFS 2024.
            </p>
            <Button
              color="sunshine"
              variant="secondary"
              onClick={handleGenerateDraft}
              fullWidth
            >
              Generate Ofsted Draft
            </Button>
          </div>
        </div>
      </Card>

      {showModal && draftData && (
        <DraftModal
          title="Ofsted Notification Draft"
          draftData={draftData}
          onClose={() => setShowModal(false)}
          showMailto={false}
        />
      )}
    </>
  )
}

/**
 * RIDDOR Draft Card - for generating F2508-style reports
 */
export function RIDDORDraftCard({ incidentData, incidentType, analysis, visible }) {
  const [showModal, setShowModal] = useState(false)
  const [draftData, setDraftData] = useState(null)

  const handleGenerateDraft = () => {
    const draft = generateRIDDORDraft(incidentData, incidentType, analysis)
    setDraftData(draft)
    setShowModal(true)
  }

  if (!visible) return null

  return (
    <>
      <Card className="border-2 border-hop-freshair/50 bg-hop-freshair/10">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 bg-hop-freshair rounded-full flex items-center justify-center flex-shrink-0">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-hop-forest" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M6 2a2 2 0 00-2 2v12a2 2 0 002 2h8a2 2 0 002-2V7.414A2 2 0 0015.414 6L12 2.586A2 2 0 0010.586 2H6zm2 10a1 1 0 10-2 0v3a1 1 0 102 0v-3zm2-3a1 1 0 011 1v5a1 1 0 11-2 0v-5a1 1 0 011-1zm4-1a1 1 0 10-2 0v7a1 1 0 102 0V8z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-hop-forest">RIDDOR Report</h3>
            <p className="text-sm text-gray-600 mb-3">
              Generate a draft F2508-style report for submission to HSE under RIDDOR 2013.
            </p>
            <Button
              color="freshair"
              variant="secondary"
              onClick={handleGenerateDraft}
              fullWidth
            >
              Generate RIDDOR Draft
            </Button>
          </div>
        </div>
      </Card>

      {showModal && draftData && (
        <DraftModal
          title="RIDDOR Report Draft (F2508)"
          draftData={draftData}
          onClose={() => setShowModal(false)}
          showMailto={false}
        />
      )}
    </>
  )
}
