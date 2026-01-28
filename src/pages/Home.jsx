import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { LogoWithText } from '../components/Logo'
import { Button } from '../components/ui/Button'
import { formatDate } from '../lib/utils'
import { getTodayChecks } from '../lib/supabase'

export function Home() {
  const [issueCount, setIssueCount] = useState(0)

  useEffect(() => {
    getTodayChecks().then(checks => {
      const count = checks.filter(c => c.has_issues).length
      setIssueCount(count)
    }).catch(() => {})
  }, [])

  return (
    <div className="min-h-screen bg-hop-pebble px-4 py-8">
      <div className="max-w-md mx-auto">
        {/* Prototype warning */}
        <div className="bg-hop-marmalade/20 border-2 border-hop-marmalade rounded-xl p-4 mb-6">
          <p className="text-center text-hop-forest">
            <strong>PROTOTYPE ONLY</strong><br />
            <span className="text-sm">Do not enter any sensitive or personal data into these tools.</span>
          </p>
        </div>

        {/* Issues banner */}
        {issueCount > 0 && (
          <Link to="/summary" className="block mb-6">
            <div className="bg-hop-marmalade/15 border border-hop-marmalade rounded-xl p-4 flex items-center gap-3">
              <span className="text-2xl">⚠️</span>
              <div className="flex-1">
                <p className="font-medium text-hop-forest">
                  {issueCount} check{issueCount !== 1 ? 's' : ''} with issues today
                </p>
                <p className="text-sm text-gray-600">Tap to view details</p>
              </div>
              <span className="text-gray-400">→</span>
            </div>
          </Link>
        )}

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
              <span className="text-lg">🌅 Room Opening Check</span>
            </Button>
          </Link>

          <Link to="/check/roomSafety">
            <Button color="sunshine" size="large" fullWidth>
              <span className="text-lg">🛡️ Room Safety Check</span>
            </Button>
          </Link>

          <Link to="/check/gardenOutdoor">
            <Button color="apple" size="large" fullWidth>
              <span className="text-lg">🌿 Garden & Outdoor Check</span>
            </Button>
          </Link>

          <Link to="/kitchen-safety">
            <Button color="marmalade" size="large" fullWidth>
              <span className="text-lg">🍳 Kitchen Food Safety</span>
            </Button>
          </Link>

          <Link to="/check/firstAidBox">
            <Button color="blossom" size="large" fullWidth>
              <span className="text-lg">🩹 First Aid Box Weekly Check</span>
            </Button>
          </Link>
        </div>

        {/* View checks links */}
        <div className="text-center mb-8 space-y-2">
          <Link
            to="/summary"
            className="block text-hop-forest hover:text-hop-forest-dark underline underline-offset-2 transition-colors"
          >
            📋 View today's checks →
          </Link>
          <Link
            to="/history"
            className="block text-gray-500 hover:text-hop-forest underline underline-offset-2 transition-colors text-sm"
          >
            📅 View check history (30 days)
          </Link>
        </div>

        {/* More Tools Section */}
        <div className="border-t border-gray-200 pt-6 mb-8">
          <h3 className="text-center text-gray-500 text-sm font-medium mb-4">More Tools</h3>
          <div className="space-y-3">
            <Link to="/risk-assessment">
              <Button color="forest" size="large" fullWidth>
                <span className="text-lg">📋 Risk Assessments</span>
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
