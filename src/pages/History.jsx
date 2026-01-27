import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Header } from '../components/Header'
import { Select } from '../components/ui/Select'
import { Card } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { getChecksHistory } from '../lib/supabase'
import { nurseries } from '../data/nurseries'
import { rooms } from '../data/rooms'
import { checkTypes } from '../data/checklists'
import { storage } from '../lib/storage'

export function History() {
  const [checks, setChecks] = useState([])
  const [loading, setLoading] = useState(true)
  const [nurseryFilter, setNurseryFilter] = useState(() => storage.getLastNursery() || 'all')
  const [roomFilter, setRoomFilter] = useState('all')
  const [selectedDate, setSelectedDate] = useState(null)
  const [showRequestForm, setShowRequestForm] = useState(false)

  useEffect(() => {
    loadHistory()
  }, [nurseryFilter])

  const loadHistory = async () => {
    setLoading(true)
    try {
      const data = await getChecksHistory(nurseryFilter === 'all' ? null : nurseryFilter, 30)
      setChecks(data)
    } catch (err) {
      console.error('Error loading history:', err)
    } finally {
      setLoading(false)
    }
  }

  // Generate last 30 days
  const getLast30Days = () => {
    const days = []
    for (let i = 0; i < 30; i++) {
      const date = new Date()
      date.setDate(date.getDate() - i)
      date.setHours(0, 0, 0, 0)
      days.push(date)
    }
    return days
  }

  const days = getLast30Days()

  // Group checks by date
  const checksByDate = checks.reduce((acc, check) => {
    const date = new Date(check.created_at)
    date.setHours(0, 0, 0, 0)
    const dateKey = date.toISOString().split('T')[0]
    if (!acc[dateKey]) {
      acc[dateKey] = []
    }
    acc[dateKey].push(check)
    return acc
  }, {})

  // Filter checks for selected date
  const getChecksForDate = (date) => {
    const dateKey = date.toISOString().split('T')[0]
    let dayChecks = checksByDate[dateKey] || []

    if (roomFilter !== 'all') {
      dayChecks = dayChecks.filter(c => c.room === roomFilter)
    }

    return dayChecks
  }

  // Get status for a day (for calendar display)
  const getDayStatus = (date) => {
    const dayChecks = getChecksForDate(date)
    if (dayChecks.length === 0) return 'none'
    if (dayChecks.some(c => c.has_issues)) return 'issues'
    return 'complete'
  }

  const formatDateShort = (date) => {
    return date.toLocaleDateString('en-GB', { day: 'numeric' })
  }

  const formatDateFull = (date) => {
    return date.toLocaleDateString('en-GB', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    })
  }

  const formatTime = (dateString) => {
    return new Date(dateString).toLocaleTimeString('en-GB', {
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const isToday = (date) => {
    const today = new Date()
    return date.toDateString() === today.toDateString()
  }

  const isWeekend = (date) => {
    const day = date.getDay()
    return day === 0 || day === 6
  }

  // Group days by week for calendar display
  const getWeeks = () => {
    const weeks = []
    let currentWeek = []

    // Start from today and go back
    days.forEach((day, index) => {
      currentWeek.unshift(day) // Add to beginning to maintain chronological order
      if (day.getDay() === 1 || index === days.length - 1) { // Monday or last day
        if (currentWeek.length > 0) {
          weeks.unshift([...currentWeek])
          currentWeek = []
        }
      }
    })

    return weeks
  }

  const selectedDateChecks = selectedDate ? getChecksForDate(selectedDate) : []

  return (
    <div className="min-h-screen bg-hop-pebble">
      <Header title="Check History" subtitle="Last 30 days" showBack />

      <div className="px-4 py-4 max-w-xl mx-auto">
        {/* Filters */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          <Select
            value={nurseryFilter}
            onChange={setNurseryFilter}
            options={['all', ...nurseries]}
            placeholder="All nurseries"
          />
          <Select
            value={roomFilter}
            onChange={(val) => {
              setRoomFilter(val)
              setSelectedDate(null)
            }}
            options={['all', ...rooms]}
            placeholder="All rooms"
          />
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="w-8 h-8 border-2 border-hop-forest border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-gray-500">Loading history...</p>
          </div>
        ) : (
          <>
            {/* Calendar grid */}
            <Card className="mb-6">
              {/* Day headers */}
              <div className="grid grid-cols-7 gap-1 mb-2">
                {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((day, i) => (
                  <div key={i} className="text-center text-xs font-medium text-gray-400 py-1">
                    {day}
                  </div>
                ))}
              </div>

              {/* Calendar days - simple linear grid */}
              <div className="grid grid-cols-7 gap-1">
                {days.slice().reverse().map((day) => {
                  const status = getDayStatus(day)
                  const isSelected = selectedDate?.toDateString() === day.toDateString()

                  return (
                    <button
                      key={day.toISOString()}
                      onClick={() => setSelectedDate(day)}
                      className={`
                        aspect-square rounded-lg flex flex-col items-center justify-center
                        text-sm transition-all relative
                        ${isSelected ? 'ring-2 ring-hop-forest ring-offset-2' : ''}
                        ${isToday(day) ? 'font-bold' : ''}
                        ${isWeekend(day) ? 'bg-gray-50' : 'bg-white'}
                        hover:bg-hop-pebble
                      `}
                    >
                      <span className={isToday(day) ? 'text-hop-forest' : 'text-gray-700'}>
                        {formatDateShort(day)}
                      </span>
                      {/* Status dot */}
                      <div className={`
                        w-2 h-2 rounded-full mt-0.5
                        ${status === 'complete' ? 'bg-hop-apple' : ''}
                        ${status === 'issues' ? 'bg-hop-marmalade' : ''}
                        ${status === 'none' ? 'bg-gray-200' : ''}
                      `} />
                    </button>
                  )
                })}
              </div>

              {/* Legend */}
              <div className="flex justify-center gap-4 mt-4 pt-4 border-t border-gray-100 text-xs text-gray-500">
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-hop-apple" /> Complete
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-hop-marmalade" /> Issues
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-gray-200" /> No checks
                </span>
              </div>
            </Card>

            {/* Selected date details */}
            {selectedDate && (
              <div className="mb-6">
                <h3 className="font-display text-lg text-hop-forest font-semibold mb-3">
                  {formatDateFull(selectedDate)}
                </h3>

                {selectedDateChecks.length === 0 ? (
                  <Card className="text-center py-6">
                    <p className="text-gray-500">No checks recorded</p>
                  </Card>
                ) : (
                  <div className="space-y-3">
                    {selectedDateChecks.map((check) => (
                      <Card key={check.id} className={check.has_issues ? 'border-l-4 border-l-hop-marmalade' : ''}>
                        <div className="flex items-start justify-between">
                          <div>
                            <p className="font-medium text-hop-forest">
                              {checkTypes[check.check_type]?.shortName || check.check_type}
                            </p>
                            <p className="text-sm text-gray-500">
                              {check.room} · {formatTime(check.created_at)}
                            </p>
                            <p className="text-sm text-gray-400">
                              By {check.completed_by}
                            </p>
                          </div>
                          <div className={`
                            px-2 py-1 rounded text-xs font-medium
                            ${check.has_issues
                              ? 'bg-hop-marmalade/10 text-hop-marmalade-dark'
                              : 'bg-hop-apple/10 text-hop-apple'
                            }
                          `}>
                            {check.has_issues ? 'Issues' : 'OK'}
                          </div>
                        </div>

                        {/* Show issues if any */}
                        {check.has_issues && check.items && (
                          <div className="mt-3 pt-3 border-t border-gray-100">
                            <p className="text-xs font-medium text-gray-500 mb-2">Issues reported:</p>
                            <ul className="text-sm space-y-1">
                              {check.items
                                .filter(item => item.status === 'fail')
                                .map((item, idx) => (
                                  <li key={idx} className="text-hop-marmalade-dark">
                                    • {item.text}
                                    {item.note && (
                                      <span className="block text-gray-500 text-xs ml-3">
                                        {item.note}
                                      </span>
                                    )}
                                  </li>
                                ))
                              }
                            </ul>
                          </div>
                        )}
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Download records */}
            <div className="text-center pt-4 border-t border-gray-200">
              <p className="text-sm text-gray-500 mb-3">
                Need to export or download records?
              </p>
              <Link to="/history/request">
                <Button color="forest" variant="secondary" size="small">
                  📥 Download records
                </Button>
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
