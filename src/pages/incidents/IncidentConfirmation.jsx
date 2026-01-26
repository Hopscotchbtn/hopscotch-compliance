import { Link, useLocation, useNavigate } from 'react-router-dom'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'

export function IncidentConfirmation() {
  const location = useLocation()
  const navigate = useNavigate()
  const { reference, incidentType, personName } = location.state || {}

  if (!reference) {
    navigate('/incidents')
    return null
  }

  return (
    <div className="min-h-screen bg-hop-pebble px-4 py-8">
      <div className="max-w-md mx-auto">
        {/* Success icon */}
        <div className="text-center mb-6">
          <div className="w-20 h-20 bg-hop-apple rounded-full flex items-center justify-center mx-auto mb-4 animate-scale-in">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-10 w-10 text-white"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="font-display text-2xl text-hop-forest font-semibold">
            Incident Recorded
          </h1>
        </div>

        {/* Summary */}
        <Card className="mb-6">
          <div className="space-y-3">
            <div className="text-center pb-3 border-b border-gray-100">
              <p className="text-sm text-gray-500">Reference Number</p>
              <p className="text-xl font-bold text-hop-forest">{reference}</p>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Type</span>
              <span className="font-medium text-hop-forest">{incidentType}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Person Involved</span>
              <span className="font-medium text-hop-forest">{personName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Status</span>
              <span className="font-medium text-hop-marmalade">Open - Investigation</span>
            </div>
          </div>
        </Card>

        {/* Reminder */}
        <Card className="mb-6 bg-hop-freshair/20 border border-hop-freshair">
          <p className="text-sm text-hop-forest">
            <strong>Remember:</strong> Keep a copy of this record. Investigation records should be retained according to your retention policy.
          </p>
        </Card>

        {/* Actions */}
        <div className="space-y-3">
          <Link to="/incidents">
            <Button color="forest" fullWidth>
              Return to Dashboard
            </Button>
          </Link>
          <Link to="/incidents/new">
            <Button color="forest" variant="secondary" fullWidth>
              Report Another Incident
            </Button>
          </Link>
        </div>
      </div>
    </div>
  )
}
