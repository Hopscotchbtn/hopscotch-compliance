import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Header } from '../../components/Header'
import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { Select } from '../../components/ui/Select'
import { Textarea } from '../../components/ui/Textarea'
import { CheckboxGroup, RadioGroup } from '../../components/ui/Checkbox'
import { Alert, PromptBox } from '../../components/ui/Alert'
import { Accordion, AccordionGroup } from '../../components/ui/Accordion'
import { StepProgress } from '../../components/ui/StepProgress'
import { AIAnalysisPanel, EmailDraftModal } from '../../components/ui/AIAnalysis'
import { COONotificationCard, OfstedDraftCard, RIDDORDraftCard } from '../../components/ui/NotificationDrafts'
import { FileUpload } from '../../components/ui/FileUpload'
import { EvidenceReviewPanel } from '../../components/ui/EvidenceReviewPanel'
import { incidentTypes, generateReference } from '../../data/incident/incidentTypes'
import { injuryTypes, injuryCauses, bodyAreas, severityLevels, childAges, genderOptions } from '../../data/incident/injuryData'
import { incidentLocations } from '../../data/incident/locations'
import { rootCauseCategories } from '../../data/incident/rootCauses'
import { contextPrompts, ofstedGuidance, riddorGuidance, footerReminder } from '../../data/incident/prompts'
import { nurseries } from '../../data/nurseries'
import { rooms } from '../../data/rooms'
import { storage } from '../../lib/storage'
import { saveIncident } from '../../lib/incidentDb'
import { analyzeIncident, generateArmadilloEmail, analyzeWitnessStatement, reviewEvidence } from '../../lib/aiAnalysis'

const TOTAL_STEPS = 7

export function IncidentForm() {
  const { typeId } = useParams()
  const navigate = useNavigate()
  const incidentType = incidentTypes[typeId]

  const [step, setStep] = useState(1)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  // AI Analysis state
  const [aiAnalysis, setAiAnalysis] = useState(null)
  const [aiLoading, setAiLoading] = useState(false)
  const [aiError, setAiError] = useState(false)
  const [showEmailModal, setShowEmailModal] = useState(false)
  const [emailData, setEmailData] = useState(null)

  // Witness statement analysis state
  const [witnessAnalyzing, setWitnessAnalyzing] = useState(false)

  // Evidence review state (middle ground AI review)
  const [showEvidenceReview, setShowEvidenceReview] = useState(false)
  const [evidenceReviewSuggestions, setEvidenceReviewSuggestions] = useState([])
  const [evidenceReviewLoading, setEvidenceReviewLoading] = useState(false)
  const [evidenceReviewError, setEvidenceReviewError] = useState(false)
  const [acceptedReviewNotes, setAcceptedReviewNotes] = useState([])

  // Form state
  const [formData, setFormData] = useState({
    // Basic details
    nursery: '',
    incidentDate: new Date().toISOString().split('T')[0],
    incidentTime: '',
    reportedBy: storage.getUserName(),
    // Person involved
    personName: '',
    personAge: '',
    personDob: '',
    personGender: '',
    personRoom: '',
    personRole: '',
    // What happened
    location: '',
    locationDetail: '',
    description: '',
    injuryTypes: [],
    injuryCauses: [],
    bodyAreas: [],
    severity: '',
    // Allergy specific
    allergenInvolved: '',
    reactionOccurred: '',
    reactionDetails: '',
    // Immediate response
    firstAidGiven: '',
    firstAidDetails: '',
    medicalAttentionRequired: '',
    medicalAttentionDetails: '',
    hospitalAttendance: '',
    parentsNotified: '',
    parentsNotifiedBy: '',
    parentsNotifiedTime: '',
    parentResponse: '',
    // Witnesses & Evidence
    hasWitnesses: '',
    witnesses: [],
    witnessStatementsTaken: '',
    witnessStatements: [], // Uploaded witness statement files with analysis
    photosTaken: '',
    incidentPhotos: [], // Photos of scene, injury, body map
    cctvChecked: '',
    cctvAvailable: '',
    cctvNotes: '',
    // Supervision (child incidents)
    supervisorName: '',
    staffPresent: '',
    ratiosCompliant: '',
    ratiosNotes: '',
    // Supporting documents
    supportingDocuments: [], // Medical reports, risk assessments, etc.
    // Investigation
    investigationFindings: '',
    rootCauseAnalysis: {},
    // Actions
    remedialMeasures: '',
    remedialResponsible: '',
    remedialTargetDate: '',
    // Regulatory
    ofstedNotifiable: '',
    ofstedNotifiedDate: '',
    riddorReportable: '',
    riddorReportedDate: '',
    escalateToHeadOffice: '',
    headOfficeNotes: '',
  })

  const updateField = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const stepNames = [
    'Basic Details',
    'What Happened',
    'Evidence',
    'Immediate Response',
    'Investigation',
    'Actions',
    'AI Review',
  ]

  // Trigger AI analysis when entering step 7
  useEffect(() => {
    if (step === 7 && !aiAnalysis && !aiLoading) {
      runAiAnalysis()
    }
  }, [step])

  const runAiAnalysis = async () => {
    setAiLoading(true)
    setAiError(false)
    try {
      const analysis = await analyzeIncident(formData, typeId)
      setAiAnalysis(analysis)
    } catch (err) {
      console.error('AI analysis failed:', err)
      setAiError(true)
    } finally {
      setAiLoading(false)
    }
  }

  const handleGenerateEmail = () => {
    const email = generateArmadilloEmail(formData, typeId, aiAnalysis)
    setEmailData(email)
    setShowEmailModal(true)
  }

  const handleWitnessFilesChange = (files) => {
    updateField('witnessStatements', files)
  }

  const handleIncidentPhotosChange = (files) => {
    updateField('incidentPhotos', files)
  }

  const handleSupportingDocsChange = (files) => {
    updateField('supportingDocuments', files)
  }

  const handleAnalyzeWitnessStatement = async (file) => {
    setWitnessAnalyzing(true)
    try {
      const analysis = await analyzeWitnessStatement(file, formData.description)
      // Update the file with its analysis
      const updatedStatements = formData.witnessStatements.map(f =>
        f.id === file.id ? { ...f, analysis } : f
      )
      updateField('witnessStatements', updatedStatements)
    } catch (err) {
      console.error('Failed to analyze witness statement:', err)
    } finally {
      setWitnessAnalyzing(false)
    }
  }

  // Run evidence review when leaving Step 3
  const runEvidenceReview = async () => {
    // Only run if there's evidence to review
    const hasEvidence = formData.witnessStatements.length > 0 ||
                        formData.incidentPhotos.length > 0 ||
                        formData.supportingDocuments.length > 0

    if (!hasEvidence) {
      // No evidence to review, proceed directly
      setStep(4)
      window.scrollTo(0, 0)
      return
    }

    setShowEvidenceReview(true)
    setEvidenceReviewLoading(true)
    setEvidenceReviewError(false)

    try {
      const suggestions = await reviewEvidence(
        formData.description,
        formData.witnessStatements,
        formData.incidentPhotos,
        formData.supportingDocuments
      )
      setEvidenceReviewSuggestions(suggestions)
    } catch (err) {
      console.error('Evidence review failed:', err)
      setEvidenceReviewError(true)
    } finally {
      setEvidenceReviewLoading(false)
    }
  }

  const handleEvidenceReviewAccept = (suggestion) => {
    setAcceptedReviewNotes(prev => [...prev, suggestion])
  }

  const handleEvidenceReviewDismiss = (id) => {
    // Just tracking dismissals if needed later
  }

  const handleEvidenceReviewSkip = () => {
    setShowEvidenceReview(false)
    setStep(4)
    window.scrollTo(0, 0)
  }

  const handleEvidenceReviewContinue = () => {
    // Add accepted notes to investigation findings
    if (acceptedReviewNotes.length > 0) {
      const notesText = acceptedReviewNotes
        .map(n => `- ${n.message} (${n.source})`)
        .join('\n')
      const currentFindings = formData.investigationFindings || ''
      const separator = currentFindings ? '\n\nAI Review Notes:\n' : 'AI Review Notes:\n'
      updateField('investigationFindings', currentFindings + separator + notesText)
    }
    setShowEvidenceReview(false)
    setStep(4)
    window.scrollTo(0, 0)
  }

  const isChildIncident = incidentType?.personType === 'child' || typeId === 'allergyBreach'
  const isAccidentType = typeId === 'childAccident' || typeId === 'staffAccident'
  const isAllergyBreach = typeId === 'allergyBreach'
  const showRiddor = typeId === 'staffAccident' || (formData.severity === 'serious' || formData.severity === 'critical')

  const canProceed = () => {
    switch (step) {
      case 1:
        return formData.nursery && formData.incidentDate && formData.incidentTime && formData.reportedBy && formData.personName
      case 2:
        return formData.location && formData.description.length >= 50
      case 3: // Witnesses
        return true
      case 4: // Immediate Response
        return true
      case 5: // Investigation
        return true
      case 6: // Actions
        return formData.remedialMeasures
      case 7: // AI Review
        return true
      default:
        return true
    }
  }

  const handleNext = () => {
    if (step < TOTAL_STEPS) {
      // Trigger evidence review when leaving Step 3
      if (step === 3) {
        runEvidenceReview()
        return
      }
      setStep(step + 1)
      window.scrollTo(0, 0)
    }
  }

  const handleBack = () => {
    if (step > 1) {
      setStep(step - 1)
      window.scrollTo(0, 0)
    } else {
      navigate('/incidents/new')
    }
  }

  const handleSaveDraft = async () => {
    setSaving(true)
    try {
      await saveIncident({ ...formData, incidentType: typeId, status: 'draft' })
      navigate('/incidents')
    } catch (err) {
      setError('Failed to save draft')
    } finally {
      setSaving(false)
    }
  }

  const handleSubmit = async () => {
    setSaving(true)
    setError(null)
    try {
      storage.setUserName(formData.reportedBy)
      const reference = generateReference(formData.nursery, formData.incidentDate)
      await saveIncident({
        ...formData,
        incidentType: typeId,
        incidentReference: reference,
        status: 'open',
      })
      navigate('/incidents/confirmation', {
        state: { reference, incidentType: incidentType.name, personName: formData.personName },
      })
    } catch (err) {
      setError('Failed to submit incident. Please try again.')
      setSaving(false)
    }
  }

  if (!incidentType) {
    navigate('/incidents/new')
    return null
  }

  return (
    <div className="min-h-screen bg-hop-pebble pb-32">
      <Header
        title={incidentType.name}
        showBack
        onBack={handleBack}
      />

      <div className="px-4 py-4 max-w-lg mx-auto">
        <StepProgress currentStep={step} totalSteps={TOTAL_STEPS} stepName={stepNames[step - 1]} />

        {error && (
          <Alert type="error" className="mb-4">{error}</Alert>
        )}

        {/* Step 1: Basic Details */}
        {step === 1 && (
          <Card className="space-y-4">
            <h2 className="font-semibold text-hop-forest text-lg">Basic Details</h2>

            <Select
              label="Nursery"
              value={formData.nursery}
              onChange={(v) => updateField('nursery', v)}
              options={nurseries}
              required
            />

            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Date of incident"
                type="date"
                value={formData.incidentDate}
                onChange={(v) => updateField('incidentDate', v)}
                required
              />
              <Input
                label="Time of incident"
                type="time"
                value={formData.incidentTime}
                onChange={(v) => updateField('incidentTime', v)}
                required
              />
            </div>

            <Input
              label="Your name"
              value={formData.reportedBy}
              onChange={(v) => updateField('reportedBy', v)}
              placeholder="Who is reporting this incident"
              required
            />

            <hr className="my-4" />

            <h3 className="font-medium text-hop-forest">Person Involved</h3>

            <Input
              label={isChildIncident ? "Child's name" : "Staff member's name"}
              value={formData.personName}
              onChange={(v) => updateField('personName', v)}
              required
            />

            {isChildIncident ? (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <Select
                    label="Age"
                    value={formData.personAge}
                    onChange={(v) => updateField('personAge', v)}
                    options={childAges}
                  />
                  <Select
                    label="Gender"
                    value={formData.personGender}
                    onChange={(v) => updateField('personGender', v)}
                    options={genderOptions}
                  />
                </div>
                <Select
                  label="Room"
                  value={formData.personRoom}
                  onChange={(v) => updateField('personRoom', v)}
                  options={rooms.filter(r => r !== 'Kitchen' && r !== 'Main Building')}
                />
              </>
            ) : (
              <Input
                label="Job role"
                value={formData.personRole}
                onChange={(v) => updateField('personRole', v)}
                placeholder="e.g., Room Leader, Practitioner"
              />
            )}
          </Card>
        )}

        {/* Step 2: What Happened */}
        {step === 2 && (
          <Card className="space-y-4">
            <h2 className="font-semibold text-hop-forest text-lg">What Happened</h2>

            <Select
              label="Location"
              value={formData.location}
              onChange={(v) => updateField('location', v)}
              options={incidentLocations}
              required
            />

            <Input
              label="Location detail"
              value={formData.locationDetail}
              onChange={(v) => updateField('locationDetail', v)}
              placeholder="e.g., near the climbing frame, by the back door"
            />

            <Textarea
              label="Description"
              value={formData.description}
              onChange={(v) => updateField('description', v)}
              placeholder="Describe what happened in your own words. Include what led up to the incident, what happened, and the immediate aftermath."
              rows={5}
              minLength={50}
              required
              hint="Stick to facts you know or observed. It's okay to say what's uncertain."
            />

            {isAccidentType && (
              <>
                <CheckboxGroup
                  label="Type of injury"
                  options={injuryTypes}
                  selected={formData.injuryTypes}
                  onChange={(v) => updateField('injuryTypes', v)}
                />

                <CheckboxGroup
                  label="Cause of injury"
                  options={injuryCauses}
                  selected={formData.injuryCauses}
                  onChange={(v) => updateField('injuryCauses', v)}
                />

                <CheckboxGroup
                  label="Body area affected"
                  options={bodyAreas}
                  selected={formData.bodyAreas}
                  onChange={(v) => updateField('bodyAreas', v)}
                />

                <RadioGroup
                  label="Severity"
                  options={severityLevels}
                  value={formData.severity}
                  onChange={(v) => updateField('severity', v)}
                  required
                />
              </>
            )}

            {isAllergyBreach && (
              <>
                <Input
                  label="Allergen involved"
                  value={formData.allergenInvolved}
                  onChange={(v) => updateField('allergenInvolved', v)}
                  placeholder="e.g., milk, eggs, nuts"
                  required
                />

                <RadioGroup
                  label="Did a reaction occur?"
                  options={[{ id: 'yes', label: 'Yes' }, { id: 'no', label: 'No' }]}
                  value={formData.reactionOccurred}
                  onChange={(v) => updateField('reactionOccurred', v)}
                />

                {formData.reactionOccurred === 'yes' && (
                  <Textarea
                    label="Reaction details"
                    value={formData.reactionDetails}
                    onChange={(v) => updateField('reactionDetails', v)}
                    placeholder="Describe the reaction and any treatment given"
                  />
                )}
              </>
            )}
          </Card>
        )}

        {/* Step 3: Evidence & Documentation */}
        {step === 3 && (
          <div className="space-y-4">
            {/* Supervision Context - Child incidents only */}
            {isChildIncident && (
              <Card className="space-y-4">
                <h2 className="font-semibold text-hop-forest text-lg">Supervision Context</h2>

                <Input
                  label="Who was supervising at the time?"
                  value={formData.supervisorName}
                  onChange={(v) => updateField('supervisorName', v)}
                  placeholder="Name of staff member directly supervising"
                />

                <Input
                  label="Other staff present in the area"
                  value={formData.staffPresent}
                  onChange={(v) => updateField('staffPresent', v)}
                  placeholder="Names of other staff who were nearby"
                />

                <RadioGroup
                  label="Were adult:child ratios compliant at the time?"
                  options={[
                    { id: 'yes', label: 'Yes' },
                    { id: 'no', label: 'No' },
                    { id: 'unknown', label: 'To be confirmed' },
                  ]}
                  value={formData.ratiosCompliant}
                  onChange={(v) => updateField('ratiosCompliant', v)}
                />

                {formData.ratiosCompliant === 'no' && (
                  <Textarea
                    label="Explain the ratio situation"
                    value={formData.ratiosNotes}
                    onChange={(v) => updateField('ratiosNotes', v)}
                    placeholder="What were the actual ratios? Why were they non-compliant?"
                    rows={2}
                  />
                )}
              </Card>
            )}

            {/* Photos & Visual Evidence */}
            <Card className="space-y-4">
              <h2 className="font-semibold text-hop-forest text-lg">Photos & Visual Evidence</h2>

              <RadioGroup
                label="Have photos been taken?"
                options={[
                  { id: 'yes', label: 'Yes' },
                  { id: 'no', label: 'No' },
                  { id: 'not-yet', label: 'Not yet - will take now' },
                ]}
                value={formData.photosTaken}
                onChange={(v) => updateField('photosTaken', v)}
              />

              {formData.photosTaken === 'no' && (
                <PromptBox title="Consider taking photos" color="sunshine">
                  <p>Photos help document the scene and any injuries. Consider photographing:</p>
                  <ul className="list-disc list-inside mt-1 text-sm">
                    <li>The location where the incident occurred</li>
                    <li>Any equipment or hazards involved</li>
                    {isAccidentType && <li>The injury (with parent consent for children)</li>}
                    {isAccidentType && <li>A body map showing injury location</li>}
                  </ul>
                </PromptBox>
              )}

              {(formData.photosTaken === 'yes' || formData.photosTaken === 'not-yet') && (
                <FileUpload
                  label="Upload photos"
                  hint="Upload photos of the scene, injury, body map, or any relevant equipment. These become part of the incident record."
                  files={formData.incidentPhotos}
                  onFilesChange={handleIncidentPhotosChange}
                  maxFiles={10}
                />
              )}
            </Card>

            {/* CCTV */}
            <Card className="space-y-4">
              <h2 className="font-semibold text-hop-forest text-lg">CCTV</h2>

              <RadioGroup
                label="Has CCTV been checked?"
                options={[
                  { id: 'yes', label: 'Yes' },
                  { id: 'no', label: 'No' },
                  { id: 'not-available', label: 'No CCTV in this area' },
                ]}
                value={formData.cctvChecked}
                onChange={(v) => updateField('cctvChecked', v)}
              />

              {formData.cctvChecked === 'no' && (
                <PromptBox title="Check CCTV promptly" color="marmalade">
                  <p>CCTV footage is often overwritten within days. Check and preserve any relevant footage as soon as possible.</p>
                </PromptBox>
              )}

              {formData.cctvChecked === 'yes' && (
                <>
                  <RadioGroup
                    label="Does CCTV footage show the incident?"
                    options={[
                      { id: 'yes', label: 'Yes - footage available' },
                      { id: 'partial', label: 'Partial - some angles only' },
                      { id: 'no', label: 'No - not captured' },
                    ]}
                    value={formData.cctvAvailable}
                    onChange={(v) => updateField('cctvAvailable', v)}
                  />

                  {(formData.cctvAvailable === 'yes' || formData.cctvAvailable === 'partial') && (
                    <Textarea
                      label="CCTV notes"
                      value={formData.cctvNotes}
                      onChange={(v) => updateField('cctvNotes', v)}
                      placeholder="Where is the footage saved? What does it show? Any discrepancies with witness accounts?"
                      rows={2}
                    />
                  )}
                </>
              )}
            </Card>

            {/* Witnesses */}
            <Card className="space-y-4">
              <h2 className="font-semibold text-hop-forest text-lg">Witness Statements</h2>

              <RadioGroup
                label="Were there witnesses to this incident?"
                options={[{ id: 'yes', label: 'Yes' }, { id: 'no', label: 'No' }]}
                value={formData.hasWitnesses}
                onChange={(v) => updateField('hasWitnesses', v)}
              />

              {formData.hasWitnesses === 'yes' && (
                <>
                  <RadioGroup
                    label="Have witness statements been collected?"
                    options={[
                      { id: 'yes', label: 'Yes' },
                      { id: 'no', label: 'No' },
                      { id: 'in-progress', label: 'In progress' },
                    ]}
                    value={formData.witnessStatementsTaken}
                    onChange={(v) => updateField('witnessStatementsTaken', v)}
                  />

                  {formData.witnessStatementsTaken === 'no' && (
                    <PromptBox title="Collect statements soon" color="sunshine">
                      <p>Witness statements are most accurate when collected promptly. Try to gather written statements from witnesses within 24 hours while memories are fresh.</p>
                      <p className="mt-2 text-sm">You can continue with this report now and upload statements later.</p>
                    </PromptBox>
                  )}

                  {(formData.witnessStatementsTaken === 'yes' || formData.witnessStatementsTaken === 'in-progress') && (
                    <FileUpload
                      label="Upload witness statements"
                      hint="Upload photos of handwritten statements, scanned documents, or typed statements. AI will analyse each statement to extract key facts."
                      files={formData.witnessStatements}
                      onFilesChange={handleWitnessFilesChange}
                      onAnalyze={handleAnalyzeWitnessStatement}
                      analyzing={witnessAnalyzing}
                      maxFiles={10}
                    />
                  )}
                </>
              )}
            </Card>

            {/* Supporting Documents */}
            <Card className="space-y-4">
              <h2 className="font-semibold text-hop-forest text-lg">Other Documents</h2>

              <p className="text-sm text-gray-600">
                Upload any other relevant documents such as risk assessments, medical reports, or existing policies.
              </p>

              <FileUpload
                label="Supporting documents (optional)"
                hint="Medical reports, hospital discharge notes, relevant risk assessments, policy documents, etc."
                files={formData.supportingDocuments}
                onFilesChange={handleSupportingDocsChange}
                maxFiles={10}
              />
            </Card>
          </div>
        )}

        {/* Step 4: Immediate Response */}
        {step === 4 && (
          <Card className="space-y-4">
            <h2 className="font-semibold text-hop-forest text-lg">Immediate Response</h2>

            <RadioGroup
              label="Was first aid given?"
              options={[{ id: 'yes', label: 'Yes' }, { id: 'no', label: 'No' }]}
              value={formData.firstAidGiven}
              onChange={(v) => updateField('firstAidGiven', v)}
            />

            {formData.firstAidGiven === 'yes' && (
              <Textarea
                label="First aid details"
                value={formData.firstAidDetails}
                onChange={(v) => updateField('firstAidDetails', v)}
                placeholder="What first aid was provided and by whom?"
              />
            )}

            <RadioGroup
              label="Was medical attention required?"
              options={[
                { id: 'yes', label: 'Yes' },
                { id: 'no', label: 'No' },
                { id: 'unknown', label: 'Not yet known' },
              ]}
              value={formData.medicalAttentionRequired}
              onChange={(v) => updateField('medicalAttentionRequired', v)}
            />

            {formData.medicalAttentionRequired === 'yes' && (
              <>
                <Textarea
                  label="Medical attention details"
                  value={formData.medicalAttentionDetails}
                  onChange={(v) => updateField('medicalAttentionDetails', v)}
                  placeholder="Where did they receive treatment? What was the outcome?"
                />

                <RadioGroup
                  label="Hospital attendance?"
                  options={[{ id: 'yes', label: 'Yes' }, { id: 'no', label: 'No' }]}
                  value={formData.hospitalAttendance}
                  onChange={(v) => updateField('hospitalAttendance', v)}
                />

                {formData.hospitalAttendance === 'yes' && isAccidentType && formData.severity !== 'serious' && formData.severity !== 'critical' && (
                  <PromptBox title="Review severity" color="marmalade">
                    <p>Hospital attendance often indicates a more serious injury. You may want to go back to Step 2 and update the severity level.</p>
                    <p className="mt-1 text-sm">Current severity: <strong>{formData.severity || 'Not set'}</strong></p>
                  </PromptBox>
                )}
              </>
            )}

            {isChildIncident && (
              <>
                <RadioGroup
                  label="Were parents notified?"
                  options={[{ id: 'yes', label: 'Yes' }, { id: 'no', label: 'No' }]}
                  value={formData.parentsNotified}
                  onChange={(v) => updateField('parentsNotified', v)}
                />

                {formData.parentsNotified === 'yes' && (
                  <>
                    <div className="grid grid-cols-2 gap-4">
                      <Input
                        label="Notified by"
                        value={formData.parentsNotifiedBy}
                        onChange={(v) => updateField('parentsNotifiedBy', v)}
                      />
                      <Input
                        label="Time notified"
                        type="time"
                        value={formData.parentsNotifiedTime}
                        onChange={(v) => updateField('parentsNotifiedTime', v)}
                      />
                    </div>
                    <Textarea
                      label="Parent response"
                      value={formData.parentResponse}
                      onChange={(v) => updateField('parentResponse', v)}
                      placeholder="Note any concerns or questions raised"
                      rows={2}
                    />
                  </>
                )}
              </>
            )}
          </Card>
        )}

        {/* Step 5: Investigation */}
        {step === 5 && (
          <Card className="space-y-4">
            <h2 className="font-semibold text-hop-forest text-lg">Investigation</h2>

            {/* Evidence checklist */}
            <div className="bg-hop-freshair/20 rounded-lg p-4 border border-hop-freshair">
              <h3 className="font-medium text-hop-forest mb-2">Before investigating, confirm you have:</h3>
              <ul className="space-y-1 text-sm">
                <li className="flex items-center gap-2">
                  {formData.incidentPhotos?.length > 0 || formData.photosTaken === 'no' ? (
                    <span className="text-hop-apple">✓</span>
                  ) : (
                    <span className="text-hop-marmalade">○</span>
                  )}
                  <span>Photos of scene/injury</span>
                </li>
                <li className="flex items-center gap-2">
                  {formData.cctvChecked === 'yes' || formData.cctvChecked === 'not-available' ? (
                    <span className="text-hop-apple">✓</span>
                  ) : (
                    <span className="text-hop-marmalade">○</span>
                  )}
                  <span>CCTV checked</span>
                </li>
                <li className="flex items-center gap-2">
                  {formData.hasWitnesses === 'no' || formData.witnessStatementsTaken === 'yes' ? (
                    <span className="text-hop-apple">✓</span>
                  ) : (
                    <span className="text-hop-marmalade">○</span>
                  )}
                  <span>Witness statements collected</span>
                </li>
                {isChildIncident && (
                  <li className="flex items-center gap-2">
                    {formData.supervisorName ? (
                      <span className="text-hop-apple">✓</span>
                    ) : (
                      <span className="text-hop-marmalade">○</span>
                    )}
                    <span>Supervision details recorded</span>
                  </li>
                )}
              </ul>
              <p className="text-xs text-gray-500 mt-2 italic">
                You can proceed with incomplete evidence, but the investigation will be stronger with all documentation.
              </p>
            </div>

            <PromptBox color="pebble">
              <p>This section helps you think through what happened and why. Take your time. The goal is understanding, not blame.</p>
            </PromptBox>

            <Textarea
              label="Investigation findings"
              value={formData.investigationFindings}
              onChange={(v) => updateField('investigationFindings', v)}
              placeholder="Describe what you learned from reviewing the area, speaking with staff, checking equipment, etc."
              rows={4}
            />

            <div>
              <label className="block text-sm font-medium text-hop-forest mb-3">
                Root Cause Analysis
              </label>
              <p className="text-sm text-gray-500 mb-3">
                What underlying factors may have contributed? Select any that apply.
              </p>

              <AccordionGroup>
                {rootCauseCategories.map((category) => (
                  <Accordion key={category.id} title={category.title}>
                    <CheckboxGroup
                      options={category.options}
                      selected={formData.rootCauseAnalysis[category.id] || []}
                      onChange={(v) =>
                        updateField('rootCauseAnalysis', {
                          ...formData.rootCauseAnalysis,
                          [category.id]: v,
                        })
                      }
                    />
                  </Accordion>
                ))}
              </AccordionGroup>
            </div>

            <p className="text-xs text-gray-500 italic">
              Root cause analysis is about understanding and preventing, not assigning blame.
            </p>
          </Card>
        )}

        {/* Step 6: Actions */}
        {step === 6 && (
          <div className="space-y-4">
            <Card className="space-y-4">
              <h2 className="font-semibold text-hop-forest text-lg">Remedial Actions</h2>

              <Textarea
                label="What steps will be taken to prevent recurrence?"
                value={formData.remedialMeasures}
                onChange={(v) => updateField('remedialMeasures', v)}
                placeholder="Describe specific actions - changes to environment, equipment, procedures, training, etc."
                rows={4}
                required
              />

              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="Person responsible"
                  value={formData.remedialResponsible}
                  onChange={(v) => updateField('remedialResponsible', v)}
                />
                <Input
                  label="Target date"
                  type="date"
                  value={formData.remedialTargetDate}
                  onChange={(v) => updateField('remedialTargetDate', v)}
                />
              </div>
            </Card>

            <Card className="space-y-4">
              <h2 className="font-semibold text-hop-forest text-lg">Escalation</h2>

              <RadioGroup
                label="Does this need to be escalated to head office?"
                options={[{ id: 'yes', label: 'Yes' }, { id: 'no', label: 'No' }]}
                value={formData.escalateToHeadOffice}
                onChange={(v) => updateField('escalateToHeadOffice', v)}
              />

              {formData.escalateToHeadOffice === 'yes' && (
                <Textarea
                  label="Notes for head office"
                  value={formData.headOfficeNotes}
                  onChange={(v) => updateField('headOfficeNotes', v)}
                  rows={3}
                />
              )}
            </Card>
          </div>
        )}

        {/* Step 7: AI Review */}
        {step === 7 && (
          <div className="space-y-4">
            <AIAnalysisPanel
              analysis={aiAnalysis}
              loading={aiLoading}
              error={aiError}
              onRetry={runAiAnalysis}
            />

            {aiAnalysis && (
              <>
                {/* Regulatory decisions informed by AI */}
                <Card className="space-y-4">
                  <h2 className="font-semibold text-hop-forest text-lg">Regulatory Notifications</h2>

                  <p className="text-sm text-gray-600">
                    Based on the AI analysis, please confirm your decisions below. These are recommendations to assist your professional judgement.
                  </p>

                  <RadioGroup
                    label="Does this require Ofsted notification?"
                    options={[
                      { id: 'yes', label: 'Yes' },
                      { id: 'no', label: 'No' },
                      { id: 'unsure', label: 'Unsure - discuss with head office' },
                    ]}
                    value={formData.ofstedNotifiable}
                    onChange={(v) => updateField('ofstedNotifiable', v)}
                  />

                  <RadioGroup
                    label="Does this require RIDDOR reporting?"
                    options={[
                      { id: 'yes', label: 'Yes' },
                      { id: 'no', label: 'No' },
                      { id: 'unsure', label: 'Unsure - check with Armadillo' },
                    ]}
                    value={formData.riddorReportable}
                    onChange={(v) => updateField('riddorReportable', v)}
                  />
                </Card>

                {/* Notification Draft Cards */}
                <COONotificationCard
                  incidentData={formData}
                  incidentType={typeId}
                  analysis={aiAnalysis}
                />

                <OfstedDraftCard
                  incidentData={formData}
                  incidentType={typeId}
                  analysis={aiAnalysis}
                  visible={formData.ofstedNotifiable === 'yes'}
                />

                <RIDDORDraftCard
                  incidentData={formData}
                  incidentType={typeId}
                  analysis={aiAnalysis}
                  visible={formData.riddorReportable === 'yes'}
                />

                {/* Armadillo email option */}
                <Card>
                  <h2 className="font-semibold text-hop-forest text-lg mb-3">Armadillo H&S Consultation</h2>
                  <p className="text-sm text-gray-600 mb-4">
                    Generate a summary email to send to Armadillo for their review and guidance.
                  </p>
                  <Button
                    color="marmalade"
                    variant="secondary"
                    onClick={handleGenerateEmail}
                    fullWidth
                  >
                    Generate Email Draft
                  </Button>
                </Card>
              </>
            )}

            {!aiAnalysis && !aiLoading && (
              <Card className="space-y-4">
                <h2 className="font-semibold text-hop-forest text-lg">Regulatory Notifications</h2>

                <RadioGroup
                  label="Does this require Ofsted notification?"
                  options={[
                    { id: 'yes', label: 'Yes' },
                    { id: 'no', label: 'No' },
                    { id: 'unsure', label: 'Unsure - discuss with head office' },
                  ]}
                  value={formData.ofstedNotifiable}
                  onChange={(v) => updateField('ofstedNotifiable', v)}
                />

                <RadioGroup
                  label="Does this require RIDDOR reporting?"
                  options={[
                    { id: 'yes', label: 'Yes' },
                    { id: 'no', label: 'No' },
                    { id: 'unsure', label: 'Unsure - check with Armadillo' },
                  ]}
                  value={formData.riddorReportable}
                  onChange={(v) => updateField('riddorReportable', v)}
                />
              </Card>
            )}
          </div>
        )}

        {/* Email Draft Modal */}
        {showEmailModal && emailData && (
          <EmailDraftModal
            emailData={emailData}
            onClose={() => setShowEmailModal(false)}
          />
        )}

        {/* Evidence Review Modal */}
        {showEvidenceReview && (
          <EvidenceReviewPanel
            suggestions={evidenceReviewSuggestions}
            loading={evidenceReviewLoading}
            error={evidenceReviewError}
            onAccept={handleEvidenceReviewAccept}
            onDismiss={handleEvidenceReviewDismiss}
            onSkip={handleEvidenceReviewSkip}
            onRetry={runEvidenceReview}
            onContinue={handleEvidenceReviewContinue}
            acceptedNotes={acceptedReviewNotes}
          />
        )}

        {/* Footer reminder */}
        <p className="text-center text-xs text-gray-400 mt-6">{footerReminder}</p>
      </div>

      {/* Sticky footer */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-4 py-4 shadow-lg">
        <div className="max-w-lg mx-auto flex gap-3">
          {step > 1 && (
            <Button color="forest" variant="secondary" onClick={handleBack} className="flex-1">
              Back
            </Button>
          )}

          <Button color="forest" variant="secondary" onClick={handleSaveDraft} disabled={saving}>
            Save Draft
          </Button>

          {step < TOTAL_STEPS ? (
            <Button color="forest" onClick={handleNext} disabled={!canProceed()} className="flex-1">
              Continue
            </Button>
          ) : (
            <Button color="forest" onClick={handleSubmit} disabled={!canProceed() || saving} className="flex-1">
              {saving ? 'Submitting...' : 'Submit Incident'}
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
