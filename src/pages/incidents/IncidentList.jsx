import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Header } from '../../components/Header'
import { Card } from '../../components/ui/Card'
import { Select } from '../../components/ui/Select'
import { StatusBadge, SeverityBadge } from '../../components/ui/StatusBadge'
import { getRecentIncidents, deleteIncident } from '../../lib/incidentDb'
import { incidentTypes } from '../../data/incident/incidentTypes'
import { nurseries } from '../../data/nurseries'

const STATUSES = ['all', 'draft', 'open', 'investigating', 'awaiting_approval', 'pending-review', 'approved', 'signed-off', 'closed']

export function IncidentList() {
  const navigate = useNavigate()
  const [incidents, setIncidents] = useState([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('all')
  const [nurseryFilter, setNurseryFilter] = useState('all')
  const [search, setSearch] = useState('')

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
    if (search) {
      const q = search.toLowerCase()
      const match = (inc.person_name || '').toLowerCase().includes(q) ||
        (inc.incident_reference || '').toLowerCase().includes(q) ||
        (inc.description || '').toLowerCase().includes(q)
      if (!match) return false
    }
    return true
  })

  const handleDelete = async (e, id) => {
    e.stopPropagation()
    if (!confirm('Delete this incident? This cannot be undone.')) return
    try {
      await deleteIncident(id)
      setIncidents(prev => prev.filter(i => i.id !== id))
    } catch (err) {
      console.error('Error deleting incident:', err)
    }
  }

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
        {/* Search */}
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search name, reference, description..."
          className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg text-sm mb-3 focus:outline-none focus:border-hop-forest min-h-[44px]"
        />

        {/* Filters */}
        <div className="grid grid-cols-2 gap-3 mb-3">
          <Select
            value={statusFilter}
            onChange={setStatusFilter}
            options={STATUSES}
            placeholder="Status"
          />
          <Select
            value={nurseryFilter}
            onChange={setNurseryFilter}
            options={['all', ...nurseries]}
            placeholder="Nursery"
          />
        </div>

        {(statusFilter !== 'all' || nurseryFilter !== 'all' || search) && (
          <button
            onClick={() => { setStatusFilter('all'); setNurseryFilter('all'); setSearch('') }}
            className="text-xs text-hop-marmalade-dark hover:underline mb-4 inline-block"
          >
            Clear all filters
          </button>
        )}

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
              <Link key={incident.id} to={`/incidents/${incident.id}`}>
                <Card className="hover:shadow-md transition-shadow cursor-pointer">
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

                  <div className="flex justify-between items-center mt-2">
                    <div>
                      {incident.injury_severity && <SeverityBadge severity={incident.injury_severity} />}
                    </div>
                    <button
                      onClick={(e) => handleDelete(e, incident.id)}
                      className="text-xs text-gray-400 hover:text-hop-marmalade-dark transition-colors"
                    >
                      Delete
                    </button>
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
