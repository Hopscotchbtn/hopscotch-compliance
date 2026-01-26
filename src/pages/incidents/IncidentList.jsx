import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Header } from '../../components/Header'
import { Card } from '../../components/ui/Card'
import { Select } from '../../components/ui/Select'
import { StatusBadge, SeverityBadge } from '../../components/ui/StatusBadge'
import { getRecentIncidents } from '../../lib/incidentDb'
import { incidentTypes } from '../../data/incident/incidentTypes'
import { nurseries } from '../../data/nurseries'

export function IncidentList() {
  const [incidents, setIncidents] = useState([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('all')
  const [nurseryFilter, setNurseryFilter] = useState('all')

  useEffect(() => {
    loadIncidents()
  }, [])

  const loadIncidents = async () => {
    setLoading(true)
    try {
      const data = await getRecentIncidents(50)
      setIncidents(data)
    } catch (err) {
      console.error('Error loading incidents:', err)
    } finally {
      setLoading(false)
    }
  }

  const filteredIncidents = incidents.filter((inc) => {
    if (statusFilter !== 'all' && inc.status !== statusFilter) return false
    if (nurseryFilter !== 'all' && inc.nursery !== nurseryFilter) return false
    return true
  })

  const formatDate = (dateStr) => {
    return new Date(dateStr).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    })
  }

  return (
    <div className="min-h-screen bg-hop-pebble">
      <Header title="Incidents" subtitle="Recent records" showBack />

      <div className="px-4 py-4 max-w-xl mx-auto">
        {/* Filters */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          <Select
            value={statusFilter}
            onChange={setStatusFilter}
            options={['all', 'draft', 'open', 'pending-review', 'signed-off']}
            placeholder="Status"
          />
          <Select
            value={nurseryFilter}
            onChange={setNurseryFilter}
            options={['all', ...nurseries]}
            placeholder="Nursery"
          />
        </div>

        {/* List */}
        {loading ? (
          <div className="text-center py-12">
            <div className="w-8 h-8 border-2 border-hop-forest border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-gray-500">Loading incidents...</p>
          </div>
        ) : filteredIncidents.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500">No incidents found</p>
            <Link to="/incidents/new" className="text-hop-forest hover:underline mt-2 inline-block">
              Report a new incident →
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredIncidents.map((incident) => (
              <Card key={incident.id} className="hover:shadow-md transition-shadow">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <p className="font-mono text-sm text-gray-500">{incident.incident_reference}</p>
                    <p className="font-semibold text-hop-forest">{incident.person_name}</p>
                  </div>
                  <StatusBadge status={incident.status} />
                </div>

                <div className="flex gap-2 flex-wrap text-sm">
                  <span className="px-2 py-0.5 bg-hop-pebble rounded text-gray-600">
                    {incidentTypes[incident.incident_type]?.shortName || incident.incident_type}
                  </span>
                  <span className="text-gray-400">•</span>
                  <span className="text-gray-600">{incident.nursery}</span>
                  <span className="text-gray-400">•</span>
                  <span className="text-gray-600">{formatDate(incident.incident_date)}</span>
                </div>

                {incident.injury_severity && (
                  <div className="mt-2">
                    <SeverityBadge severity={incident.injury_severity} />
                  </div>
                )}
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
