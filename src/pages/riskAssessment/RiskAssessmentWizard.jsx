import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Header } from '../../components/Header'
import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { Select } from '../../components/ui/Select'
import { Textarea } from '../../components/ui/Textarea'
import { Checkbox } from '../../components/ui/Checkbox'
import { StepProgress } from '../../components/ui/StepProgress'
import { assessmentTypes, peopleAtRiskOptions, policyOptions } from '../../data/riskAssessment/assessmentTypes'
import { nurseries } from '../../data/nurseries'
import { brainstormHazards, generateAssessmentDraft } from '../../lib/riskAssessmentAi'
import { saveRiskAssessment, trackAssessmentEvent } from '../../lib/riskAssessmentDb'
import { storage } from '../../lib/storage'
import { Loader2, Sparkles, Plus, X, AlertTriangle } from 'lucide-react'

const STEPS = [
  { name: 'Assessment Details', key: 'details' },
  { name: 'People & Overview', key: 'people' },
  { name: 'Hazard Identification', key: 'hazards' }
]

export function RiskAssessmentWizard() {
  const navigate = useNavigate()
  const [currentStep, setCurrentStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [loadingMessage, setLoadingMessage] = useState('')
  const [error, setError] = useState(null)

  const [formData, setFormData] = useState({
    assessmentType: '',
    activityName: '',
    assessmentDate: new Date().toISOString().split('T')[0],
    assessorName: storage.getUserName() || '',
    nursery: storage.getLastNursery() || '',
    location: '',
    peopleAtRisk: [],
    policiesSelected: [],
    overview: '',
    suggestedHazards: [],
    selectedHazards: [],
    customHazards: []
  })

  const [customHazardInput, setCustomHazardInput] = useState('')

  const updateField = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    setError(null)
  }

  const toggleArrayItem = (field, item) => {
    setFormData(prev => ({
      ...prev,
      [field]: prev[field].includes(item)
        ? prev[field].filter(i => i !== item)
        : [...prev[field], item]
    }))
  }

  const addCustomHazard = () => {
    if (customHazardInput.trim()) {
      setFormData(prev => ({
        ...prev,
        customHazards: [...prev.customHazards, customHazardInput.trim()]
      }))
      setCustomHazardInput('')
    }
  }

  const removeCustomHazard = (index) => {
    setFormData(prev => ({
      ...prev,
      customHazards: prev.customHazards.filter((_, i) => i !== index)
    }))
  }

  const validateStep = () => {
    switch (currentStep) {
      case 1:
        if (!formData.assessmentType) return 'Please select an assessment type'
        if (!formData.activityName) return 'Please enter an activity name'
        if (!formData.assessorName) return 'Please enter your name'
        if (!formData.nursery) return 'Please select a nursery'
        return null
      case 2:
        if (formData.peopleAtRisk.length === 0) return 'Please select at least one group at risk'
        return null
      case 3:
        const totalHazards = formData.selectedHazards.length + formData.customHazards.length
        if (totalHazards === 0) return 'Please select or add at least one hazard'
        return null
      default:
        return null
    }
  }

  const handleNext = async () => {
    const validationError = validateStep()
    if (validationError) {
      setError(validationError)
      return
    }

    // Save assessor name for future use
    if (currentStep === 1 && formData.assessorName) {
      storage.setUserName(formData.assessorName)
    }

    // If moving to step 3, brainstorm hazards
    if (currentStep === 2) {
      setLoading(true)
      setLoadingMessage('AI is identifying potential hazards...')
      try {
        await trackAssessmentEvent('started', formData)
        const hazards = await brainstormHazards({
          assessmentType: formData.assessmentType,
          activityName: formData.activityName,
          location: formData.location || formData.nursery,
          nursery: formData.nursery,
          peopleAtRisk: formData.peopleAtRisk,
          overview: formData.overview,
          policiesSelected: formData.policiesSelected
        })
        updateField('suggestedHazards', hazards)
        updateField('selectedHazards', hazards) // Pre-select all suggested
      } catch (err) {
        console.error('Brainstorm error:', err)
        setError('Failed to generate hazard suggestions. You can still add hazards manually.')
      } finally {
        setLoading(false)
        setLoadingMessage('')
      }
    }

    setCurrentStep(prev => prev + 1)
  }

  const handleBack = () => {
    setCurrentStep(prev => prev - 1)
    setError(null)
  }

  const handleGenerateDraft = async () => {
    const validationError = validateStep()
    if (validationError) {
      setError(validationError)
      return
    }

    setLoading(true)
    setLoadingMessage('AI is drafting your risk assessment...')

    try {
      const allHazards = [...formData.selectedHazards, ...formData.customHazards]

      const draft = await generateAssessmentDraft({
        assessmentType: formData.assessmentType,
        activityName: formData.activityName,
        assessmentDate: formData.assessmentDate,
        assessorName: formData.assessorName,
        location: formData.location || formData.nursery,
        nursery: formData.nursery,
        peopleAtRisk: formData.peopleAtRisk,
        hazards: allHazards,
        policiesSelected: formData.policiesSelected,
        overview: formData.overview
      })

      await trackAssessmentEvent('draft_generated', formData)

      // Navigate to validation screen with the draft
      navigate('/risk-assessment/review', {
        state: {
          draft,
          formData
        }
      })
    } catch (err) {
      console.error('Generate draft error:', err)
      setError('Failed to generate assessment draft. Please try again.')
    } finally {
      setLoading(false)
      setLoadingMessage('')
    }
  }

  const handleSaveDraft = async () => {
    try {
      setLoading(true)
      const allHazards = [...formData.selectedHazards, ...formData.customHazards]
      await saveRiskAssessment({
        ...formData,
        hazards: allHazards.map(h => ({ hazard: h })),
        status: 'draft'
      })
      navigate('/risk-assessment')
    } catch (err) {
      console.error('Save draft error:', err)
      setError('Failed to save draft. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const renderStep1 = () => (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Assessment Type *
        </label>
        <Select
          value={formData.assessmentType}
          onChange={(e) => updateField('assessmentType', e.target.value)}
        >
          <option value="">Select type...</option>
          {assessmentTypes.map(type => (
            <option key={type.id} value={type.name}>{type.name}</option>
          ))}
        </Select>
      </div>

      <Input
        label="Activity / Resource Name *"
        value={formData.activityName}
        onChange={(e) => updateField('activityName', e.target.value)}
        placeholder="e.g., Outdoor Play Equipment, Water Play Activity"
      />

      <Input
        label="Assessment Date"
        type="date"
        value={formData.assessmentDate}
        onChange={(e) => updateField('assessmentDate', e.target.value)}
      />

      <Input
        label="Your Name (Assessor) *"
        value={formData.assessorName}
        onChange={(e) => updateField('assessorName', e.target.value)}
        placeholder="Enter your full name"
      />

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Nursery *
        </label>
        <Select
          value={formData.nursery}
          onChange={(e) => updateField('nursery', e.target.value)}
        >
          <option value="">Select nursery...</option>
          {nurseries.map(n => (
            <option key={n} value={n}>{n}</option>
          ))}
        </Select>
      </div>

      <Input
        label="Specific Location (optional)"
        value={formData.location}
        onChange={(e) => updateField('location', e.target.value)}
        placeholder="e.g., Garden, Baby Room, Kitchen"
      />
    </div>
  )

  const renderStep2 = () => (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-3">
          Who might be at risk? *
        </label>
        <div className="space-y-2">
          {peopleAtRiskOptions.map(option => (
            <label key={option.id} className="flex items-center gap-3 p-3 bg-white rounded-lg border-2 border-gray-200 cursor-pointer hover:border-hop-forest transition-colors">
              <Checkbox
                checked={formData.peopleAtRisk.includes(option.label)}
                onChange={() => toggleArrayItem('peopleAtRisk', option.label)}
              />
              <span>{option.label}</span>
            </label>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-3">
          Which policies should be referenced?
        </label>
        <div className="space-y-2">
          {policyOptions.map(option => (
            <label key={option.id} className="flex items-center gap-3 p-3 bg-white rounded-lg border-2 border-gray-200 cursor-pointer hover:border-hop-forest transition-colors">
              <Checkbox
                checked={formData.policiesSelected.includes(option.id)}
                onChange={() => toggleArrayItem('policiesSelected', option.id)}
              />
              <span>{option.label}</span>
            </label>
          ))}
        </div>
      </div>

      <Textarea
        label="Activity Overview (optional)"
        value={formData.overview}
        onChange={(e) => updateField('overview', e.target.value)}
        placeholder="Describe the activity or context in more detail..."
        rows={4}
      />
    </div>
  )

  const renderStep3 = () => (
    <div className="space-y-4">
      {formData.suggestedHazards.length > 0 && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-hop-marmalade" />
            AI-Suggested Hazards
          </label>
          <div className="space-y-2">
            {formData.suggestedHazards.map((hazard, index) => (
              <label key={index} className="flex items-start gap-3 p-3 bg-white rounded-lg border-2 border-gray-200 cursor-pointer hover:border-hop-forest transition-colors">
                <Checkbox
                  checked={formData.selectedHazards.includes(hazard)}
                  onChange={() => toggleArrayItem('selectedHazards', hazard)}
                  className="mt-0.5"
                />
                <span className="text-sm">{hazard}</span>
              </label>
            ))}
          </div>
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-3">
          Add Custom Hazards
        </label>
        <div className="flex gap-2">
          <Input
            value={customHazardInput}
            onChange={(e) => setCustomHazardInput(e.target.value)}
            placeholder="Describe a hazard..."
            onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addCustomHazard())}
          />
          <Button color="forest" onClick={addCustomHazard} disabled={!customHazardInput.trim()}>
            <Plus className="w-5 h-5" />
          </Button>
        </div>

        {formData.customHazards.length > 0 && (
          <div className="mt-3 space-y-2">
            {formData.customHazards.map((hazard, index) => (
              <div key={index} className="flex items-start gap-2 p-3 bg-hop-freshair/30 rounded-lg">
                <span className="flex-1 text-sm">{hazard}</span>
                <button
                  onClick={() => removeCustomHazard(index)}
                  className="text-gray-400 hover:text-red-500 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <Card padding="small" className="bg-hop-sunshine/20 border-hop-sunshine">
        <div className="flex items-start gap-2">
          <AlertTriangle className="w-5 h-5 text-hop-marmalade flex-shrink-0 mt-0.5" />
          <div className="text-sm">
            <strong>Selected: {formData.selectedHazards.length + formData.customHazards.length} hazards</strong>
            <p className="text-gray-600 mt-1">
              The AI will generate control measures for each hazard. You can edit them in the next step.
            </p>
          </div>
        </div>
      </Card>
    </div>
  )

  return (
    <div className="min-h-screen bg-hop-pebble">
      <Header title="New Risk Assessment" showBack />

      <div className="max-w-lg mx-auto p-4">
        <StepProgress
          currentStep={currentStep}
          totalSteps={STEPS.length}
          stepName={STEPS[currentStep - 1].name}
        />

        {error && (
          <Card padding="small" className="bg-red-50 border-red-200 mb-4">
            <p className="text-red-700 text-sm">{error}</p>
          </Card>
        )}

        {loading ? (
          <Card padding="default" className="text-center py-12">
            <Loader2 className="w-12 h-12 text-hop-forest animate-spin mx-auto mb-4" />
            <p className="text-gray-600">{loadingMessage}</p>
          </Card>
        ) : (
          <Card padding="default">
            {currentStep === 1 && renderStep1()}
            {currentStep === 2 && renderStep2()}
            {currentStep === 3 && renderStep3()}
          </Card>
        )}

        {/* Navigation Buttons */}
        {!loading && (
          <div className="flex gap-3 mt-6">
            {currentStep > 1 && (
              <Button color="freshair" onClick={handleBack} className="flex-1">
                Back
              </Button>
            )}

            {currentStep < STEPS.length ? (
              <Button color="forest" onClick={handleNext} className="flex-1">
                Continue
              </Button>
            ) : (
              <Button color="forest" onClick={handleGenerateDraft} className="flex-1">
                <Sparkles className="w-5 h-5 mr-2" />
                Generate Draft
              </Button>
            )}
          </div>
        )}

        {/* Save Draft Link */}
        {!loading && currentStep > 1 && (
          <button
            onClick={handleSaveDraft}
            className="w-full text-center text-sm text-gray-500 hover:text-hop-forest mt-4 py-2"
          >
            Save as draft and finish later
          </button>
        )}
      </div>
    </div>
  )
}

export default RiskAssessmentWizard
