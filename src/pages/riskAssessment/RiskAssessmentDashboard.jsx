import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { Header } from '../../components/Header'
import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { getRecentAssessments, getRiskAssessmentStats, getDraftAssessments } from '../../lib/riskAssessmentDb'
import { FileText, Plus, Clock, CheckCircle, AlertCircle } from 'lucide-react'

export function RiskAssessmentDashboard() {
  const navigate = useNavigate()
  const [stats, setStats] = useState({ drafts: 0, completed: 0, thisMonth: 0 })
  const [recentAssessments, setRecentAssessments] = useState([])
  const [drafts, setDrafts] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    try {
      const [statsData, recent, draftData] = await Promise.all([
        getRiskAssessmentStats(),
        getRecentAssessments(5),
        getDraftAssessments()
      ])
      setStats(statsData)
      setRecentAssessments(recent)
      setDrafts(draftData)
    } catch (err) {
      console.error('Error loading data:', err)
    } finally {
      setLoading(false)
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

  return (
    <div className="min-h-screen bg-hop-pebble">
      <Header title="Risk Assessments" showBack />

      <div className="max-w-lg mx-auto p-4 space-y-6">
        {/* New Assessment Button */}
        <Button
          color="forest"
          fullWidth
          size="large"
          onClick={() => navigate('/risk-assessment/new')}
        >
          <Plus className="w-5 h-5 mr-2" />
          New Risk Assessment
        </Button>

        {/* Stats Cards */}
        <div className="grid grid-cols-3 gap-3">
          <Card padding="small" className="text-center">
            <div className="text-2xl font-bold text-hop-forest">{stats.drafts}</div>
            <div className="text-xs text-gray-500">Drafts</div>
          </Card>
          <Card padding="small" className="text-center">
            <div className="text-2xl font-bold text-hop-apple">{stats.completed}</div>
            <div className="text-xs text-gray-500">Completed</div>
          </Card>
          <Card padding="small" className="text-center">
            <div className="text-2xl font-bold text-hop-marmalade">{stats.thisMonth}</div>
            <div className="text-xs text-gray-500">This Month</div>
          </Card>
        </div>

        {/* Draft Assessments */}
        {drafts.length > 0 && (
          <section>
            <h2 className="text-lg font-semibold text-hop-forest mb-3 flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-hop-marmalade" />
              Drafts in Progress
            </h2>
            <div className="space-y-2">
              {drafts.map((draft) => (
                <Card key={draft.id} padding="small">
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="font-medium text-hop-forest">
                        {draft.assessment_type}
                      </div>
                      <div className="text-sm text-gray-500">
                        {draft.activity_description || 'Untitled'}
                      </div>
                      <div className="text-xs text-gray-400 mt-1">
                        {draft.nursery} • {formatDate(draft.created_at)}
                      </div>
                    </div>
                    <Clock className="w-5 h-5 text-hop-marmalade flex-shrink-0" />
                  </div>
                </Card>
              ))}
            </div>
            <p className="text-xs text-gray-400 mt-2 text-center">
              Draft editing coming soon
            </p>
          </section>
        )}

        {/* Recent Assessments */}
        <section>
          <h2 className="text-lg font-semibold text-hop-forest mb-3 flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Recent Assessments
          </h2>
          {loading ? (
            <Card padding="default">
              <div className="text-center text-gray-500 py-4">Loading...</div>
            </Card>
          ) : recentAssessments.length === 0 ? (
            <Card padding="default">
              <div className="text-center text-gray-500 py-4">
                No assessments yet. Create your first one above!
              </div>
            </Card>
          ) : (
            <div className="space-y-2">
              {recentAssessments.map((assessment) => (
                <Link key={assessment.id} to={`/risk-assessment/${assessment.id}`}>
                  <Card padding="small" className="cursor-pointer hover:shadow-md transition-shadow">
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="font-medium text-hop-forest">
                          {assessment.assessment_type}
                        </div>
                        <div className="text-sm text-gray-500">
                          {assessment.activity_description}
                        </div>
                        <div className="text-xs text-gray-400 mt-1">
                          {assessment.nursery} • {formatDate(assessment.assessment_date)}
                        </div>
                      </div>
                      {assessment.status === 'completed' ? (
                        <CheckCircle className="w-5 h-5 text-hop-apple flex-shrink-0" />
                      ) : (
                        <Clock className="w-5 h-5 text-hop-marmalade flex-shrink-0" />
                      )}
                    </div>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  )
}

export default RiskAssessmentDashboard
