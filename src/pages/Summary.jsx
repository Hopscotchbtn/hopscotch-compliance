import { useState, useEffect } from 'react'
import { Header } from '../components/Header'
import { Select } from '../components/ui/Select'
import { SummaryEntry } from '../components/SummaryEntry'
import { getTodayChecks } from '../lib/supabase'
import { nurseries } from '../data/nurseries'
import { formatDate } from '../lib/utils'

export function Summary() {
  const [checks, setChecks] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')

  useEffect(() => {
    loadChecks()
  }, [filter])

  const loadChecks = async () => {
    setLoading(true)
    try {
      const data = await getTodayChecks(filter === 'all' ? null : filter)
      setChecks(data)
    } catch (err) {
      console.error('Error loading checks:', err)
    } finally {
      setLoading(false)
    }
  }

  // Group checks by nursery
  const groupedChecks = checks.reduce((acc, check) => {
    const nursery = check.nursery
    if (!acc[nursery]) {
      acc[nursery] = []
    }
    acc[nursery].push(check)
    return acc
  }, {})

  return (
    <div className="min-h-screen bg-hop-pebble">
      <Header title="Today's Checks" subtitle={formatDate()} showBack />

      <div className="px-4 py-4 max-w-xl mx-auto">
        {/* Filter */}
        <div className="mb-6">
          <Select
            value={filter}
            onChange={setFilter}
            options={['all', ...nurseries]}
            placeholder="Filter by nursery"
          />
        </div>

        {/* Content */}
        {loading ? (
          <div className="text-center py-12">
            <div className="w-8 h-8 border-2 border-hop-forest border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-gray-500">Loading checks...</p>
          </div>
        ) : checks.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-8 w-8 text-gray-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                />
              </svg>
            </div>
            <p className="text-gray-500 font-medium">No checks completed yet today</p>
            <p className="text-gray-400 text-sm mt-1">
              Checks will appear here once submitted
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {Object.entries(groupedChecks).map(([nurseryName, nurseryChecks]) => (
              <div key={nurseryName}>
                <h3 className="font-display text-lg text-hop-forest font-semibold mb-3">
                  {nurseryName}
                </h3>
                <div className="space-y-3">
                  {nurseryChecks.map((check) => (
                    <SummaryEntry key={check.id} check={check} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
