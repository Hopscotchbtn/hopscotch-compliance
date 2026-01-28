import { useLocation, useNavigate } from 'react-router-dom'
import { Header } from '../../components/Header'
import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { CheckCircle, FileText, Plus, Home } from 'lucide-react'

export function RiskConfirmation() {
  const navigate = useNavigate()
  const location = useLocation()
  const { assessmentType, activityName, reference } = location.state || {}

  return (
    <div className="min-h-screen bg-hop-pebble">
      <Header title="Assessment Complete" />

      <div className="max-w-lg mx-auto p-4">
        <Card padding="default" className="text-center">
          <div className="py-6">
            <div className="w-20 h-20 bg-hop-apple/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-12 h-12 text-hop-apple" />
            </div>

            <h1 className="text-2xl font-bold text-hop-forest mb-2">
              Risk Assessment Complete!
            </h1>

            <p className="text-gray-600 mb-6">
              Your risk assessment document has been generated and downloaded.
            </p>

            <div className="bg-hop-pebble rounded-lg p-4 mb-6 text-left">
              <div className="flex items-start gap-3">
                <FileText className="w-6 h-6 text-hop-forest flex-shrink-0 mt-0.5" />
                <div>
                  <div className="font-medium text-hop-forest">{assessmentType || 'Risk Assessment'}</div>
                  <div className="text-sm text-gray-600">{activityName || 'Assessment'}</div>
                  {reference && (
                    <div className="text-xs text-gray-400 mt-1">Ref: {reference}</div>
                  )}
                </div>
              </div>
            </div>

            <p className="text-sm text-gray-500 mb-6">
              The document should be in your Downloads folder. Remember to review it and keep it on file for compliance purposes.
            </p>
          </div>
        </Card>

        <div className="space-y-3 mt-6">
          <Button
            color="forest"
            fullWidth
            size="large"
            onClick={() => navigate('/risk-assessment/new')}
          >
            <Plus className="w-5 h-5 mr-2" />
            Create Another Assessment
          </Button>

          <Button
            color="freshair"
            fullWidth
            onClick={() => navigate('/risk-assessment')}
          >
            <FileText className="w-5 h-5 mr-2" />
            View All Assessments
          </Button>

          <Button
            variant="secondary"
            fullWidth
            onClick={() => navigate('/')}
          >
            <Home className="w-5 h-5 mr-2" />
            Back to Dashboard
          </Button>
        </div>
      </div>
    </div>
  )
}

export default RiskConfirmation
