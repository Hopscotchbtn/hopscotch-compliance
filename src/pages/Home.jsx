import { Link } from 'react-router-dom'
import { LogoWithText } from '../components/Logo'
import { Button } from '../components/ui/Button'
import { formatDate } from '../lib/utils'

export function Home() {
  return (
    <div className="min-h-screen bg-hop-pebble px-4 py-8">
      <div className="max-w-md mx-auto">
        {/* Logo and title */}
        <div className="text-center mb-8">
          <LogoWithText size="large" />
        </div>

        {/* Title section */}
        <div className="text-center mb-8">
          <h2 className="font-display text-3xl text-hop-forest font-semibold mb-2">
            Daily Checks
          </h2>
          <p className="text-gray-500 italic">Time to Care</p>
          <p className="text-hop-forest mt-4 font-medium">{formatDate()}</p>
        </div>

        {/* Check type buttons */}
        <div className="space-y-4 mb-8">
          <Link to="/check/roomOpening">
            <Button color="freshair" size="large" fullWidth>
              <span className="text-lg">Room Opening Check</span>
            </Button>
          </Link>

          <Link to="/check/roomSafety">
            <Button color="sunshine" size="large" fullWidth>
              <span className="text-lg">Room Safety Check</span>
            </Button>
          </Link>

          <Link to="/check/gardenOutdoor">
            <Button color="apple" size="large" fullWidth>
              <span className="text-lg">Garden & Outdoor Check</span>
            </Button>
          </Link>
        </div>

        {/* View today's checks link */}
        <div className="text-center mb-8">
          <Link
            to="/summary"
            className="text-hop-forest hover:text-hop-forest-dark underline underline-offset-2 transition-colors"
          >
            View today's checks →
          </Link>
        </div>

        {/* IncidentIQ link */}
        <div className="border-t border-gray-200 pt-6">
          <Link to="/incidents">
            <Button color="marmalade" variant="secondary" fullWidth>
              <span>IncidentIQ - Report Incident</span>
            </Button>
          </Link>
        </div>
      </div>
    </div>
  )
}
