import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'

const STORAGE_KEY = 'hopscotch_authenticated'
function handleLogout() {
  localStorage.removeItem(STORAGE_KEY)
  window.location.href = '/'
}
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
        {/* Issues banner */}
        {issueCount > 0 && (
          <Link to="/issues" className="block mb-6">
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

        {/* Logo */}
        <div className="flex justify-center mb-4">
          <LogoWithText size="large" />
        </div>

        {/* Prototype warning */}
        <div className="bg-red-100 border-2 border-red-500 rounded-xl p-4 mb-8">
          <p className="text-center text-red-700">
            <strong className="text-lg">PROTOTYPE ONLY</strong><br />
            <span className="text-sm font-medium">Do not enter any sensitive or personal data into these tools.</span>
          </p>
        </div>

        {/* Title section */}
        <div className="text-center mb-8">
          <h2 className="font-display text-3xl text-hop-forest font-semibold mb-2">
            Daily Checks
          </h2>
          <p className="text-gray-500 italic">Time to Care</p>
          <p className="text-hop-forest mt-4 font-medium">{formatDate()}</p>
        </div>

        {/* Section buttons */}
        <div className="flex flex-col gap-5 mb-8">
          <Link to="/section/nursery">
            <Button color="freshair" size="large" fullWidth className="border border-black">
              <span className="text-lg">🏫 Nursery</span>
            </Button>
          </Link>

          <Link to="/section/holiday-club">
            <Button color="blossom" size="large" fullWidth className="border border-black">
              <span className="text-lg">🌞 Holiday Club</span>
            </Button>
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
        <div className="text-center mt-4">
          <button
            onClick={handleLogout}
            className="text-sm text-gray-400 hover:text-hop-forest underline underline-offset-2 transition-colors"
          >
            Log out
          </button>
        </div>
      </div>
    </div>
  )
}
