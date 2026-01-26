import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Logo } from '../../components/Logo'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { PromptBox } from '../../components/ui/Alert'
import { getIncidentStats, getDraftIncidents } from '../../lib/incidentDb'
import { footerReminder } from '../../data/incident/prompts'

export function IncidentDashboard() {
  const [stats, setStats] = useState({ open: 0, pendingReview: 0, completedThisMonth: 0 })
  const [drafts, setDrafts] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      const [statsData, draftsData] = await Promise.all([
        getIncidentStats(),
        getDraftIncidents(),
      ])
      setStats(statsData)
      setDrafts(draftsData)
    } catch (err) {
      console.error('Error loading dashboard data:', err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-hop-pebble px-4 py-8">
      <div className="max-w-lg mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <Logo size="default" />
          <h1 className="font-display text-3xl text-hop-forest font-semibold mt-4">
            IncidentIQ
          </h1>
          <p className="text-gray-500 italic">Supporting thoughtful incident response</p>
        </div>

        {/* Main actions */}
        <div className="space-y-3 mb-8">
          <Link to="/incidents/new">
            <Button color="forest" size="large" fullWidth>
              Report New Incident
            </Button>
          </Link>

          {drafts.length > 0 && (
            <Link to="/incidents/drafts">
              <Button color="marmalade" variant="secondary" size="large" fullWidth>
                Continue Draft ({drafts.length})
              </Button>
            </Link>
          )}

          <Link to="/incidents/list">
            <Button color="forest" variant="secondary" size="large" fullWidth>
              View Recent Incidents
            </Button>
          </Link>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3 mb-8">
          <Card className="text-center">
            <p className="text-2xl font-bold text-hop-forest">{stats.open}</p>
            <p className="text-xs text-gray-500">Open</p>
          </Card>
          <Card className="text-center">
            <p className="text-2xl font-bold text-hop-marmalade">{stats.pendingReview}</p>
            <p className="text-xs text-gray-500">Awaiting Review</p>
          </Card>
          <Card className="text-center">
            <p className="text-2xl font-bold text-hop-apple">{stats.completedThisMonth}</p>
            <p className="text-xs text-gray-500">This Month</p>
          </Card>
        </div>

        {/* Back to compliance checks */}
        <div className="text-center mb-6">
          <Link to="/" className="text-hop-forest hover:underline text-sm">
            ← Back to Daily Checks
          </Link>
        </div>

        {/* Footer reminder */}
        <PromptBox color="freshair">
          <p className="text-center text-sm">{footerReminder}</p>
        </PromptBox>
      </div>
    </div>
  )
}
