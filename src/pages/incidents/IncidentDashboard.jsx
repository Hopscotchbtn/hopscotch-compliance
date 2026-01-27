import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Logo } from '../../components/Logo'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { PromptBox } from '../../components/ui/Alert'
import { StatusBadge } from '../../components/ui/StatusBadge'
import { getIncidentStats, getDraftIncidents, getRecentIncidents } from '../../lib/incidentDb'
import { incidentTypes } from '../../data/incident/incidentTypes'
import { footerReminder } from '../../data/incident/prompts'

export function IncidentDashboard() {
  const [stats, setStats] = useState({ open: 0, pendingReview: 0, completedThisMonth: 0 })
  const [drafts, setDrafts] = useState([])
  const [recent, setRecent] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      const [statsData, draftsData, recentData] = await Promise.all([
        getIncidentStats(),
        getDraftIncidents(),
        getRecentIncidents(5),
      ])
      setStats(statsData)
      setDrafts(draftsData)
      setRecent(recentData)
    } catch (err) {
      console.error('Error loading dashboard data:', err)
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (dateStr) => {
    if (!dateStr) return ''
    return new Date(dateStr).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
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

          <Link to="/incidents/list">
            <Button color="forest" variant="secondary" size="large" fullWidth>
              View Recent Incidents
            </Button>
          </Link>
        </div>

        {/* Drafts alert */}
        {drafts.length > 0 && (
          <Card className="mb-4 border-l-4 border-l-hop-marmalade">
            <p className="font-medium text-hop-marmalade-dark text-sm mb-2">
              {drafts.length} incomplete incident{drafts.length > 1 ? 's' : ''}
            </p>
            <div className="space-y-2">
              {drafts.slice(0, 3).map((draft) => (
                <Link key={draft.id} to={`/incidents/${draft.id}`} className="flex justify-between items-center text-sm hover:bg-hop-pebble rounded p-1 -mx-1 transition-colors">
                  <div>
                    <span className="font-mono text-xs text-gray-500">{draft.incident_reference}</span>
                    <span className="ml-2 text-gray-700">{draft.person_name || 'Unnamed'}</span>
                  </div>
                  <span className="text-hop-forest text-xs">Continue →</span>
                </Link>
              ))}
            </div>
          </Card>
        )}

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3 mb-6">
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

        {/* Recent incidents */}
        {recent.length > 0 && (
          <div className="mb-6">
            <h3 className="font-medium text-hop-forest text-sm mb-2">Recent Incidents</h3>
            <div className="space-y-2">
              {recent.map((inc) => (
                <Link key={inc.id} to={`/incidents/${inc.id}`}>
                  <Card className="hover:shadow-md transition-shadow" padding="small">
                    <div className="flex justify-between items-start">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs text-gray-400">{inc.incident_reference}</span>
                          <StatusBadge status={inc.status} />
                        </div>
                        <p className="text-sm font-medium text-hop-forest mt-1 truncate">{inc.person_name || '—'}</p>
                        <p className="text-xs text-gray-500">
                          {incidentTypes[inc.incident_type]?.shortName || inc.incident_type} · {inc.nursery} · {formatDate(inc.incident_date)}
                        </p>
                      </div>
                      <span className="text-xs text-gray-400 ml-2">→</span>
                    </div>
                  </Card>
                </Link>
              ))}
            </div>
          </div>
        )}

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
