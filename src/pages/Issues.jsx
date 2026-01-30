import { useState, useEffect } from 'react'
import { Header } from '../components/Header'
import { Select } from '../components/ui/Select'
import { Card } from '../components/ui/Card'
import { Badge } from '../components/ui/Badge'
import { getTodayChecks } from '../lib/supabase'
import { nurseries } from '../data/nurseries'
import { checkTypes } from '../data/checklists'
import { formatDate } from '../lib/utils'

export function Issues() {
  const [checks, setChecks] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')

  useEffect(() => {
    setLoading(true)
    getTodayChecks(filter === 'all' ? null : filter)
      .then(data => {
        setChecks(data.filter(c => c.has_issues))
      })
      .catch(err => console.error('Error loading issues:', err))
      .finally(() => setLoading(false))
  }, [filter])

  // Group by nursery
  const grouped = checks.reduce((acc, check) => {
    const n = check.nursery
    if (!acc[n]) acc[n] = []
    acc[n].push(check)
    return acc
  }, {})

  return (
    <div className="min-h-screen bg-hop-pebble">
      <Header title="Open Issues" subtitle={formatDate()} showBack />

      <div className="px-4 py-4 max-w-xl mx-auto">
        <div className="mb-6">
          <Select
            value={filter}
            onChange={setFilter}
            options={['all', ...nurseries]}
            placeholder="Filter by nursery"
          />
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="w-8 h-8 border-2 border-hop-forest border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-gray-500">Loading issues...</p>
          </div>
        ) : checks.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-4xl mb-4">✅</div>
            <p className="text-gray-500 font-medium">No issues reported today</p>
            <p className="text-gray-400 text-sm mt-1">All checks are passing</p>
          </div>
        ) : (
          <div className="space-y-6">
            {Object.entries(grouped).map(([nurseryName, nurseryChecks]) => (
              <div key={nurseryName}>
                <h3 className="font-display text-lg text-hop-forest font-semibold mb-3">
                  {nurseryName}
                </h3>
                <div className="space-y-3">
                  {nurseryChecks.map(check => {
                    const ct = checkTypes[check.check_type]
                    const time = new Date(check.created_at).toLocaleTimeString('en-GB', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })
                    const failedItems = check.items?.filter(i => i.status === 'fail') || []

                    return (
                      <Card key={check.id}>
                        <div className="flex items-center gap-2 mb-3">
                          <span className="font-medium text-hop-forest">{check.room}</span>
                          <Badge color={ct?.color || 'gray'} size="small">
                            {ct?.shortName || check.check_type}
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-500 mb-3">
                          {time} &bull; {check.completed_by}
                        </p>
                        <ul className="space-y-2">
                          {failedItems.map(item => (
                            <li key={item.id} className="text-sm">
                              <p className="text-hop-marmalade-dark font-medium">{item.text}</p>
                              {item.note && (
                                <p className="text-xs text-gray-600 bg-hop-marmalade/10 px-2 py-1 rounded mt-1">
                                  {item.note}
                                </p>
                              )}
                              {item.photo_url && (
                                <img
                                  src={item.photo_url}
                                  alt="Evidence"
                                  className="mt-1 w-20 h-20 object-cover rounded-lg border"
                                />
                              )}
                            </li>
                          ))}
                        </ul>
                      </Card>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
