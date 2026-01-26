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
import { incidentTypes, generateReference } from '../../data/incident/incidentTypes'
import { injuryTypes, injuryCauses, bodyAreas, severityLevels, childAges, genderOptions } from '../../data/incident/injuryData'
import { incidentLocations } from '../../data/incident/locations'
import { rootCauseCategories } from '../../data/incident/rootCauses'
import { contextPrompts, ofstedGuidance, riddorGuidance, footerReminder } from '../../data/incident/prompts'
import { nurseries } from '../../data/nurseries'
import { rooms } from '../../data/rooms'
import { storage } from '../../lib/storage'
import { saveIncident } from '../../lib/incidentDb'
import { analyzeIncident, generateArmadilloEmail } from '../../lib/aiAnalysis'

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
    // Witnesses
    hasWitnesses: '',
    witnesses: [],
    witnessStatementsTaken: '',
    photosTaken: '',
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
    'Witnesses',
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

        {/* Step 3: Witnesses (moved earlier) */}
        {step === 3 && (
          <Card className="space-y-4">
            <h2 className="font-semibold text-hop-forest text-lg">Witnesses</h2>

            <PromptBox title="Think about the context..." color="freshair">
              <ul className="list-disc list-inside space-y-1">
                {contextPrompts.thinking.map((prompt, i) => (
                  <li key={i}>{prompt}</li>
                ))}
              </ul>
              <p className="mt-2 italic text-xs">
                You don't need to record all this here - it's to help you reflect before the investigation.
              </p>
            </PromptBox>

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
              </>
            )}

            <RadioGroup
              label="Have photos been taken?"
              options={[{ id: 'yes', label: 'Yes' }, { id: 'no', label: 'No' }]}
              value={formData.photosTaken}
              onChange={(v) => updateField('photosTaken', v)}
            />
          </Card>
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
