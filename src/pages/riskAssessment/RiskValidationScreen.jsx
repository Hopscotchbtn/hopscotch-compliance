import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { Header } from '../../components/Header'
import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { Textarea } from '../../components/ui/Textarea'
import { Select } from '../../components/ui/Select'
import { generateDocx, formatAssessmentForDocx } from '../../lib/riskAssessmentAi'
import { saveRiskAssessment, trackAssessmentEvent } from '../../lib/riskAssessmentDb'
import { Loader2, Download, Save, ChevronDown, ChevronUp, Edit2, Check } from 'lucide-react'

const RISK_RATINGS = [
  { value: 'H', label: 'High', color: 'bg-red-100 text-red-800 border-red-300' },
  { value: 'M', label: 'Medium', color: 'bg-amber-100 text-amber-800 border-amber-300' },
  { value: 'L', label: 'Low', color: 'bg-green-100 text-green-800 border-green-300' }
]

export function RiskValidationScreen() {
  const navigate = useNavigate()
  const location = useLocation()
  const { draft: initialDraft, formData } = location.state || {}

  const [draft, setDraft] = useState(initialDraft || {})
  const [loading, setLoading] = useState(false)
  const [loadingMessage, setLoadingMessage] = useState('')
  const [error, setError] = useState(null)
  const [expandedHazard, setExpandedHazard] = useState(1)
  const [editingField, setEditingField] = useState(null)

  // Redirect if no draft data
  if (!initialDraft) {
    navigate('/risk-assessment/new')
    return null
  }

  const updateDraftField = (field, value) => {
    setDraft(prev => ({ ...prev, [field]: value }))
  }

  const getHazardCount = () => {
    let count = 0
    for (let i = 1; i <= 10; i++) {
      if (draft[`hazard_${i}`]) count++
    }
    return count
  }

  const getRatingBadge = (rating) => {
    const ratingConfig = RISK_RATINGS.find(r => r.value === rating) || RISK_RATINGS[1]
    return (
      <span className={`px-2 py-1 text-xs font-medium rounded border ${ratingConfig.color}`}>
        {ratingConfig.label}
      </span>
    )
  }

  const handleGenerateDocx = async () => {
    setLoading(true)
    setLoadingMessage('Generating your Word document...')
    setError(null)

    try {
      const docxData = formatAssessmentForDocx(draft, formData)
      const fileName = `Risk Assessment - ${draft.activity_description || formData.activityName} - ${draft.assessment_date}.docx`

      await generateDocx(docxData, fileName)

      // Save to database as completed
      await saveRiskAssessment({
        ...formData,
        ...draft,
        status: 'completed'
      })

      await trackAssessmentEvent('completed', formData)

      // Navigate to confirmation
      navigate('/risk-assessment/confirmation', {
        state: {
          assessmentType: draft.assessment_type,
          activityName: draft.activity_description,
          reference: draft.unique_id
        }
      })
    } catch (err) {
      console.error('Generate DOCX error:', err)
      setError('Failed to generate document. Please try again.')
    } finally {
      setLoading(false)
      setLoadingMessage('')
    }
  }

  const handleSaveDraft = async () => {
    setLoading(true)
    try {
      await saveRiskAssessment({
        ...formData,
        ...draft,
        status: 'draft'
      })
      navigate('/risk-assessment')
    } catch (err) {
      console.error('Save draft error:', err)
      setError('Failed to save draft.')
    } finally {
      setLoading(false)
    }
  }

  const renderHazardCard = (index) => {
    const hazard = draft[`hazard_${index}`]
    if (!hazard) return null

    const isExpanded = expandedHazard === index

    return (
      <Card key={index} padding="none" className="overflow-hidden">
        <button
          className="w-full p-4 flex items-center justify-between text-left hover:bg-gray-50 transition-colors"
          onClick={() => setExpandedHazard(isExpanded ? null : index)}
        >
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-sm font-medium text-gray-500">Hazard {index}</span>
              {getRatingBadge(draft[`pre_rating_${index}`])}
              <span className="text-gray-400">→</span>
              {getRatingBadge(draft[`reassess_rating_${index}`])}
            </div>
            <div className="font-medium text-hop-forest">{hazard}</div>
          </div>
          {isExpanded ? (
            <ChevronUp className="w-5 h-5 text-gray-400" />
          ) : (
            <ChevronDown className="w-5 h-5 text-gray-400" />
          )}
        </button>

        {isExpanded && (
          <div className="p-4 pt-0 space-y-4 border-t">
            {/* Hazard Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Hazard</label>
              <Input
                value={hazard}
                onChange={(e) => updateDraftField(`hazard_${index}`, e.target.value)}
              />
            </div>

            {/* Pre-Control Rating */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Pre-Control Rating</label>
                <Select
                  value={draft[`pre_rating_${index}`] || 'M'}
                  onChange={(e) => updateDraftField(`pre_rating_${index}`, e.target.value)}
                >
                  {RISK_RATINGS.map(r => (
                    <option key={r.value} value={r.value}>{r.label}</option>
                  ))}
                </Select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Post-Control Rating</label>
                <Select
                  value={draft[`post_rating_${index}`] || 'L'}
                  onChange={(e) => updateDraftField(`post_rating_${index}`, e.target.value)}
                >
                  {RISK_RATINGS.map(r => (
                    <option key={r.value} value={r.value}>{r.label}</option>
                  ))}
                </Select>
              </div>
            </div>

            {/* Control Measures */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Control Measures</label>
              <Textarea
                value={draft[`control_measures_${index}`] || ''}
                onChange={(e) => updateDraftField(`control_measures_${index}`, e.target.value)}
                rows={3}
              />
            </div>

            {/* Additional Controls */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Additional Controls (optional)</label>
              <Textarea
                value={draft[`additional_controls_${index}`] || ''}
                onChange={(e) => updateDraftField(`additional_controls_${index}`, e.target.value)}
                rows={2}
                placeholder="Any extra measures needed..."
              />
            </div>

            {/* Reassessed Rating */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Reassessed Rating</label>
              <Select
                value={draft[`reassess_rating_${index}`] || 'L'}
                onChange={(e) => updateDraftField(`reassess_rating_${index}`, e.target.value)}
              >
                {RISK_RATINGS.map(r => (
                  <option key={r.value} value={r.value}>{r.label}</option>
                ))}
              </Select>
            </div>
          </div>
        )}
      </Card>
    )
  }

  return (
    <div className="min-h-screen bg-hop-pebble">
      <Header title="Review Assessment" showBack />

      <div className="max-w-lg mx-auto p-4 space-y-4">
        {error && (
          <Card padding="small" className="bg-red-50 border-red-200">
            <p className="text-red-700 text-sm">{error}</p>
          </Card>
        )}

        {loading ? (
          <Card padding="default" className="text-center py-12">
            <Loader2 className="w-12 h-12 text-hop-forest animate-spin mx-auto mb-4" />
            <p className="text-gray-600">{loadingMessage}</p>
          </Card>
        ) : (
          <>
            {/* Summary Card */}
            <Card padding="default">
              <h2 className="font-semibold text-hop-forest mb-3">Assessment Summary</h2>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <span className="text-gray-500">Type:</span>
                  <p className="font-medium">{draft.assessment_type}</p>
                </div>
                <div>
                  <span className="text-gray-500">Date:</span>
                  <p className="font-medium">{draft.assessment_date}</p>
                </div>
                <div>
                  <span className="text-gray-500">Assessor:</span>
                  <p className="font-medium">{draft.assessor_name}</p>
                </div>
                <div>
                  <span className="text-gray-500">Reference:</span>
                  <p className="font-medium text-xs">{draft.unique_id}</p>
                </div>
                <div className="col-span-2">
                  <span className="text-gray-500">Activity:</span>
                  <p className="font-medium">{draft.activity_description}</p>
                </div>
                <div className="col-span-2">
                  <span className="text-gray-500">Location:</span>
                  <p className="font-medium">{draft.location}</p>
                </div>
              </div>
            </Card>

            {/* Hazards Section */}
            <div>
              <h2 className="font-semibold text-hop-forest mb-3">
                Hazards ({getHazardCount()})
              </h2>
              <div className="space-y-2">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(i => renderHazardCard(i))}
              </div>
            </div>

            {/* Safe System of Work */}
            <Card padding="default">
              <div className="flex items-center justify-between mb-2">
                <h2 className="font-semibold text-hop-forest">Safe System of Work</h2>
                <button
                  onClick={() => setEditingField(editingField === 'ssow' ? null : 'ssow')}
                  className="text-hop-forest hover:text-hop-forest/80"
                >
                  {editingField === 'ssow' ? <Check className="w-5 h-5" /> : <Edit2 className="w-5 h-5" />}
                </button>
              </div>
              {editingField === 'ssow' ? (
                <Textarea
                  value={draft.safe_system_of_work || ''}
                  onChange={(e) => updateDraftField('safe_system_of_work', e.target.value)}
                  rows={5}
                />
              ) : (
                <p className="text-sm text-gray-700 whitespace-pre-wrap">
                  {draft.safe_system_of_work || 'No safe system of work specified.'}
                </p>
              )}
            </Card>

            {/* Action Buttons */}
            <div className="space-y-3 pt-4">
              <Button color="forest" fullWidth size="large" onClick={handleGenerateDocx}>
                <Download className="w-5 h-5 mr-2" />
                Generate & Download Document
              </Button>

              <Button color="freshair" fullWidth onClick={handleSaveDraft}>
                <Save className="w-5 h-5 mr-2" />
                Save Draft
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

export default RiskValidationScreen
