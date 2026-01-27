import { useState } from 'react'
import { Card } from '../ui/Card'
import { StatusBadge, SeverityBadge } from '../ui/StatusBadge'
import { Button } from '../ui/Button'
import { updateIncident } from '../../lib/incidentDb'
import { incidentTypes } from '../../data/incident/incidentTypes'

export function IncidentOverview({ incident, onUpdated }) {
  const [editing, setEditing] = useState(false)
  const [description, setDescription] = useState(incident.description || '')
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    setSaving(true)
    try {
      await updateIncident(incident.id, { description })
      setEditing(false)
      if (onUpdated) onUpdated({ ...incident, description })
    } catch (err) {
      console.error('Error updating incident:', err)
    } finally {
      setSaving(false)
    }
  }

  const formatDate = (dateStr) => {
    if (!dateStr) return '—'
    return new Date(dateStr).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
  }

  const fields = [
    { label: 'Reference', value: incident.incident_reference, mono: true },
    { label: 'Type', value: incidentTypes[incident.incident_type]?.name || incident.incident_type },
    { label: 'Nursery', value: incident.nursery },
    { label: 'Date', value: formatDate(incident.incident_date) },
    { label: 'Time', value: incident.incident_time || '—' },
    { label: 'Reported by', value: incident.reported_by || '—' },
    { label: 'Person involved', value: incident.person_name || '—' },
    { label: 'Age', value: incident.person_age || '—' },
    { label: 'Room', value: incident.person_room || '—' },
    { label: 'Location', value: incident.location || '—' },
    { label: 'Severity', value: incident.injury_severity, badge: true },
  ]

  return (
    <div className="space-y-4">
      <Card>
        <div className="flex justify-between items-start mb-4">
          <div>
            <h3 className="font-display text-lg font-semibold text-hop-forest">Incident Details</h3>
          </div>
          <StatusBadge status={incident.status} />
        </div>

        <div className="grid grid-cols-2 gap-3">
          {fields.map((f) => (
            <div key={f.label}>
              <p className="text-xs text-gray-400 uppercase tracking-wide">{f.label}</p>
              {f.badge && f.value ? (
                <SeverityBadge severity={f.value} />
              ) : (
                <p className={`text-sm text-hop-forest ${f.mono ? 'font-mono' : ''}`}>{f.value}</p>
              )}
            </div>
          ))}
        </div>
      </Card>

      <Card>
        <div className="flex justify-between items-center mb-2">
          <h4 className="font-medium text-hop-forest text-sm">Description</h4>
          {!editing && (
            <button onClick={() => setEditing(true)} className="text-xs text-hop-forest hover:underline">Edit</button>
          )}
        </div>
        {editing ? (
          <div>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg text-sm focus:outline-none focus:border-hop-forest resize-none"
            />
            <div className="flex gap-2 mt-2">
              <Button size="small" color="forest" onClick={handleSave} disabled={saving}>
                {saving ? 'Saving...' : 'Save'}
              </Button>
              <Button size="small" color="forest" variant="secondary" onClick={() => { setEditing(false); setDescription(incident.description || '') }}>
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <p className="text-sm text-gray-700 whitespace-pre-wrap">{incident.description || 'No description provided.'}</p>
        )}
      </Card>

      {(incident.first_aid_given || incident.medical_attention_required) && (
        <Card>
          <h4 className="font-medium text-hop-forest text-sm mb-2">Response</h4>
          <div className="space-y-2 text-sm">
            {incident.first_aid_given && (
              <div>
                <span className="text-gray-400">First aid:</span>{' '}
                <span className="text-gray-700">{incident.first_aid_details || 'Yes'}</span>
              </div>
            )}
            {incident.medical_attention_required && (
              <div>
                <span className="text-gray-400">Medical attention:</span>{' '}
                <span className="text-gray-700">{incident.medical_attention_details || incident.medical_attention_required}</span>
              </div>
            )}
            {incident.parents_notified && (
              <div>
                <span className="text-gray-400">Parents notified:</span>{' '}
                <span className="text-gray-700">{incident.parents_notified_by || 'Yes'}</span>
              </div>
            )}
          </div>
        </Card>
      )}
    </div>
  )
}
