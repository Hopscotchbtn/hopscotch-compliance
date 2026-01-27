import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Header } from '../../components/Header'
import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { IncidentOverview } from '../../components/incident/IncidentOverview'
import { getIncidentById, updateIncident, deleteIncident } from '../../lib/incidentDb'
import { StatusBadge } from '../../components/ui/StatusBadge'

export function IncidentDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [incident, setIncident] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadIncident()
  }, [id])

  const loadIncident = async () => {
    setLoading(true)
    try {
      const data = await getIncidentById(id)
      if (!data) {
        navigate('/incidents/list')
        return
      }
      setIncident(data)
    } catch (err) {
      console.error('Error loading incident:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleStatusToggle = async () => {
    const newStatus = incident.status === 'signed-off' ? 'open' : 'signed-off'
    try {
      await updateIncident(incident.id, { status: newStatus })
      setIncident(prev => ({ ...prev, status: newStatus }))
    } catch (err) {
      console.error('Error updating status:', err)
    }
  }

  const handleDelete = async () => {
    if (!confirm('Delete this incident? This cannot be undone.')) return
    try {
      await deleteIncident(incident.id)
      navigate('/incidents/list')
    } catch (err) {
      console.error('Error deleting incident:', err)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-hop-pebble">
        <Header title="Incident" showBack />
        <div className="text-center py-12">
          <div className="w-8 h-8 border-2 border-hop-forest border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-gray-500">Loading incident...</p>
        </div>
      </div>
    )
  }

  if (!incident) return null

  return (
    <div className="min-h-screen bg-hop-pebble">
      <Header title={incident.incident_reference || 'Incident'} subtitle={incident.person_name} showBack />

      <div className="px-4 py-4 max-w-xl mx-auto space-y-4">
        <IncidentOverview incident={incident} onUpdated={(updated) => setIncident(prev => ({ ...prev, ...updated }))} />

        {/* Investigation & root cause (read-only from form) */}
        {incident.investigation_findings && (
          <Card>
            <h4 className="font-medium text-hop-forest text-sm mb-2">Investigation Findings</h4>
            <p className="text-sm text-gray-700 whitespace-pre-wrap">{incident.investigation_findings}</p>
          </Card>
        )}

        {incident.root_cause_analysis && (
          <Card>
            <h4 className="font-medium text-hop-forest text-sm mb-2">Root Cause Analysis</h4>
            <p className="text-sm text-gray-700 whitespace-pre-wrap">{incident.root_cause_analysis}</p>
          </Card>
        )}

        {incident.remedial_measures && (
          <Card>
            <h4 className="font-medium text-hop-forest text-sm mb-2">Remedial Measures</h4>
            <p className="text-sm text-gray-700 whitespace-pre-wrap">{incident.remedial_measures}</p>
            {incident.remedial_responsible && (
              <p className="text-xs text-gray-400 mt-2">Responsible: {incident.remedial_responsible}</p>
            )}
            {incident.remedial_target_date && (
              <p className="text-xs text-gray-400">Target: {new Date(incident.remedial_target_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
            )}
          </Card>
        )}

        {/* Escalation flags */}
        {(incident.ofsted_notifiable || incident.riddor_reportable) && (
          <Card className="border-l-4 border-l-hop-marmalade">
            <p className="text-sm font-medium text-hop-marmalade-dark mb-1">Escalation Required</p>
            <div className="text-sm text-gray-600">
              {incident.ofsted_notifiable && <p>• Ofsted notification required</p>}
              {incident.riddor_reportable && <p>• RIDDOR report required</p>}
            </div>
          </Card>
        )}

        {/* Actions */}
        <div className="space-y-2 pt-2">
          <Button
            color={incident.status === 'signed-off' ? 'marmalade' : 'apple'}
            onClick={handleStatusToggle}
            fullWidth
          >
            {incident.status === 'signed-off' ? 'Re-open Incident' : 'Mark as Signed Off'}
          </Button>
          <Button color="marmalade" variant="secondary" onClick={handleDelete} fullWidth>
            Delete Incident
          </Button>
        </div>
      </div>
    </div>
  )
}
