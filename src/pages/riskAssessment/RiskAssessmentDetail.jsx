import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Header } from '../../components/Header'
import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { getRiskAssessmentById, deleteRiskAssessment } from '../../lib/riskAssessmentDb'
import { generateDocx } from '../../lib/riskAssessmentAi'
import { Loader2, Download, FileText, Calendar, User, MapPin, Trash2 } from 'lucide-react'

const RISK_RATINGS = {
  H: { label: 'High', color: 'bg-red-100 text-red-800' },
  M: { label: 'Medium', color: 'bg-amber-100 text-amber-800' },
  L: { label: 'Low', color: 'bg-green-100 text-green-800' }
}

export function RiskAssessmentDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [assessment, setAssessment] = useState(null)
  const [loading, setLoading] = useState(true)
  const [downloading, setDownloading] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    loadAssessment()
  }, [id])

  async function loadAssessment() {
    try {
      const data = await getRiskAssessmentById(id)
      if (!data) {
        setError('Assessment not found')
      } else {
        setAssessment(data)
      }
    } catch (err) {
      console.error('Error loading assessment:', err)
      setError('Failed to load assessment')
    } finally {
      setLoading(false)
    }
  }

  const handleDownload = async () => {
    if (!assessment) return

    setDownloading(true)
    setError(null)

    try {
      // Rebuild the document data from stored hazards
      const docxData = {
        assessment_type: assessment.assessment_type,
        assessment_date: assessment.assessment_date,
        assessor_name: assessment.assessor_name,
        unique_id: assessment.reference,
        activity_description: assessment.activity_description,
        location: assessment.location,
        people_at_risk: Array.isArray(assessment.people_at_risk)
          ? assessment.people_at_risk.join(', ')
          : assessment.people_at_risk,
        review_date: assessment.review_date,
        safe_system_of_work: assessment.safe_system_of_work || ''
      }

      // Add hazard fields from stored array
      if (assessment.hazards && Array.isArray(assessment.hazards)) {
        assessment.hazards.forEach((h, index) => {
          const i = index + 1
          docxData[`hazard_${i}`] = h.hazard || ''
          docxData[`pre_rating_${i}`] = h.pre_rating || ''
          docxData[`control_measures_${i}`] = h.control_measures || ''
          docxData[`post_rating_${i}`] = h.post_rating || ''
          docxData[`additional_controls_${i}`] = h.additional_controls || ''
          docxData[`reassess_rating_${i}`] = h.reassess_rating || ''
        })
      }

      // Fill remaining hazard slots with empty strings
      for (let i = (assessment.hazards?.length || 0) + 1; i <= 10; i++) {
        docxData[`hazard_${i}`] = ''
        docxData[`pre_rating_${i}`] = ''
        docxData[`control_measures_${i}`] = ''
        docxData[`post_rating_${i}`] = ''
        docxData[`additional_controls_${i}`] = ''
        docxData[`reassess_rating_${i}`] = ''
      }

      const fileName = `Risk Assessment - ${assessment.activity_description} - ${assessment.assessment_date}.docx`
      await generateDocx(docxData, fileName)
    } catch (err) {
      console.error('Download error:', err)
      setError('Failed to generate document. Please try again.')
    } finally {
      setDownloading(false)
    }
  }

  const formatDate = (dateStr) => {
    if (!dateStr) return 'N/A'
    return new Date(dateStr).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    })
  }

  const handleDelete = async () => {
    setDeleting(true)
    setError(null)

    try {
      await deleteRiskAssessment(id)
      navigate('/risk-assessment')
    } catch (err) {
      console.error('Delete error:', err)
      setError('Failed to delete assessment. Please try again.')
      setDeleting(false)
      setShowDeleteConfirm(false)
    }
  }

  const getRatingBadge = (rating) => {
    const config = RISK_RATINGS[rating] || RISK_RATINGS.M
    return (
      <span className={`px-2 py-0.5 text-xs font-medium rounded ${config.color}`}>
        {config.label}
      </span>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-hop-pebble">
        <Header title="Risk Assessment" showBack />
        <div className="max-w-lg mx-auto p-4">
          <Card padding="default" className="text-center py-12">
            <Loader2 className="w-12 h-12 text-hop-forest animate-spin mx-auto mb-4" />
            <p className="text-gray-600">Loading assessment...</p>
          </Card>
        </div>
      </div>
    )
  }

  if (error && !assessment) {
    return (
      <div className="min-h-screen bg-hop-pebble">
        <Header title="Risk Assessment" showBack />
        <div className="max-w-lg mx-auto p-4">
          <Card padding="default" className="text-center py-12">
            <p className="text-red-600 mb-4">{error}</p>
            <Button color="forest" onClick={() => navigate('/risk-assessment')}>
              Back to Assessments
            </Button>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-hop-pebble">
      <Header title="Risk Assessment" showBack />

      <div className="max-w-lg mx-auto p-4 space-y-4">
        {error && (
          <Card padding="small" className="bg-red-50 border-red-200">
            <p className="text-red-700 text-sm">{error}</p>
          </Card>
        )}

        {/* Header Card */}
        <Card padding="default">
          <div className="flex items-start gap-3 mb-4">
            <div className="w-10 h-10 bg-hop-forest/10 rounded-lg flex items-center justify-center">
              <FileText className="w-5 h-5 text-hop-forest" />
            </div>
            <div className="flex-1">
              <h1 className="font-semibold text-hop-forest text-lg">
                {assessment.assessment_type}
              </h1>
              <p className="text-gray-600">{assessment.activity_description}</p>
            </div>
            {assessment.status === 'completed' && (
              <span className="px-2 py-1 text-xs font-medium bg-hop-apple/20 text-hop-apple rounded">
                Completed
              </span>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-gray-400" />
              <span>{formatDate(assessment.assessment_date)}</span>
            </div>
            <div className="flex items-center gap-2">
              <User className="w-4 h-4 text-gray-400" />
              <span>{assessment.assessor_name}</span>
            </div>
            <div className="flex items-center gap-2 col-span-2">
              <MapPin className="w-4 h-4 text-gray-400" />
              <span>{assessment.location || assessment.nursery}</span>
            </div>
          </div>

          <div className="mt-3 pt-3 border-t text-xs text-gray-400">
            Ref: {assessment.reference}
          </div>
        </Card>

        {/* Hazards Summary */}
        {assessment.hazards && assessment.hazards.length > 0 && (
          <Card padding="default">
            <h2 className="font-semibold text-hop-forest mb-3">
              Hazards ({assessment.hazards.length})
            </h2>
            <div className="space-y-3">
              {assessment.hazards.map((h, index) => (
                <div key={index} className="p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <span className="font-medium text-sm">{h.hazard}</span>
                    <div className="flex gap-1">
                      {getRatingBadge(h.pre_rating)}
                      <span className="text-gray-400">→</span>
                      {getRatingBadge(h.reassess_rating)}
                    </div>
                  </div>
                  {h.control_measures && (
                    <p className="text-xs text-gray-600 line-clamp-2">
                      {h.control_measures}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* Safe System of Work */}
        {assessment.safe_system_of_work && (
          <Card padding="default">
            <h2 className="font-semibold text-hop-forest mb-2">Safe System of Work</h2>
            <p className="text-sm text-gray-700">{assessment.safe_system_of_work}</p>
          </Card>
        )}

        {/* Download Button */}
        <Button
          color="forest"
          fullWidth
          size="large"
          onClick={handleDownload}
          disabled={downloading}
        >
          {downloading ? (
            <>
              <Loader2 className="w-5 h-5 mr-2 animate-spin" />
              Generating...
            </>
          ) : (
            <>
              <Download className="w-5 h-5 mr-2" />
              Download Document
            </>
          )}
        </Button>

        {/* Delete Button */}
        {!showDeleteConfirm ? (
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="w-full text-center text-sm text-gray-400 hover:text-red-500 mt-4 py-2 transition-colors"
          >
            <Trash2 className="w-4 h-4 inline mr-1" />
            Delete this assessment
          </button>
        ) : (
          <Card padding="small" className="bg-red-50 border-red-200 mt-4">
            <p className="text-sm text-red-700 mb-3 text-center">
              Are you sure? This cannot be undone.
            </p>
            <div className="flex gap-2">
              <Button
                color="freshair"
                fullWidth
                onClick={() => setShowDeleteConfirm(false)}
                disabled={deleting}
              >
                Cancel
              </Button>
              <Button
                color="marmalade"
                fullWidth
                onClick={handleDelete}
                disabled={deleting}
              >
                {deleting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  'Delete'
                )}
              </Button>
            </div>
          </Card>
        )}
      </div>
    </div>
  )
}

export default RiskAssessmentDetail
