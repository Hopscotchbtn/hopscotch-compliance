import { useState, useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { Header } from '../components/Header'
import { Select } from '../components/ui/Select'
import { Card } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { getChecksHistory } from '../lib/supabase'
import { nurseries } from '../data/nurseries'
import { checkTypes } from '../data/checklists'
import { storage } from '../lib/storage'

const holidayClubLocations = ['Holland Road', 'School Road']

const holidayClubCheckTypes = [
  { value: 'roomSafety', label: 'Holiday Club Daily Checks' },
  { value: 'kitchenSafety', label: 'Daily Kitchen Safety' },
  { value: 'firstAidBox', label: 'Weekly First Aid Box Check' },
]

const nurseryCheckTypes = [
  { value: 'roomSafety', label: 'Daily Room Opening Checks' },
  { value: 'gardenOutdoor', label: 'Daily Garden Opening Checks' },
  { value: 'kitchenSafety', label: 'Daily Kitchen Safety' },
  { value: 'firstAidBox', label: 'Weekly First Aid Box Check' },
]

export function History() {
  const routerLocation = useLocation()
  const section = routerLocation.state?.section
  const locationOptions = section === 'holiday-club' ? holidayClubLocations : nurseries
  const availableCheckTypes = section === 'holiday-club' ? holidayClubCheckTypes : nurseryCheckTypes

  const today = new Date()
  const [checks, setChecks] = useState([])
  const [loading, setLoading] = useState(true)
  const [checkTypeFilter, setCheckTypeFilter] = useState('all')
  const [nurseryFilter, setNurseryFilter] = useState(() => {
    const last = storage.getLastNursery()
    if (section === 'holiday-club') {
      return holidayClubLocations.includes(last) ? last : 'all'
    }
    return last || 'all'
  })
  const [selectedDate, setSelectedDate] = useState(null)
  const [viewYear, setViewYear] = useState(today.getFullYear())
  const [viewMonth, setViewMonth] = useState(today.getMonth()) // 0-indexed

  useEffect(() => {
    loadHistory()
  }, [nurseryFilter, viewYear, viewMonth])

  const loadHistory = async () => {
    setLoading(true)
    try {
      // Load enough days to cover the visible month plus a buffer
      const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate()
      const now = new Date()
      const monthStart = new Date(viewYear, viewMonth, 1)
      const daysSinceMonthStart = Math.ceil((now - monthStart) / (1000 * 60 * 60 * 24)) + 1
      const daysToFetch = Math.max(daysInMonth, daysSinceMonthStart)
      const data = await getChecksHistory(nurseryFilter === 'all' ? null : nurseryFilter, daysToFetch + 31)
      setChecks(data)
    } catch (err) {
      console.error('Error loading history:', err)
    } finally {
      setLoading(false)
    }
  }

  const allowedTypes = availableCheckTypes.map(t => t.value)
  const filteredChecks = checks
    .filter(c => nurseryFilter === 'all' ? locationOptions.includes(c.nursery) : true)
    .filter(c => allowedTypes.includes(c.check_type))
    .filter(c => checkTypeFilter === 'all' || c.check_type === checkTypeFilter)

  const checksByDate = filteredChecks.reduce((acc, check) => {
    const date = new Date(check.created_at)
    date.setHours(0, 0, 0, 0)
    const dateKey = date.toISOString().split('T')[0]
    if (!acc[dateKey]) acc[dateKey] = []
    acc[dateKey].push(check)
    return acc
  }, {})

  const getChecksForDate = (date) => {
    const dateKey = date.toISOString().split('T')[0]
    return checksByDate[dateKey] || []
  }

  const getDayStatus = (date) => {
    const dayChecks = getChecksForDate(date)
    if (dayChecks.length === 0) return 'none'
    if (dayChecks.some(c => c.has_issues)) return 'issues'
    return 'complete'
  }

  // Build calendar grid for the viewed month
  const getCalendarDays = () => {
    const firstDay = new Date(viewYear, viewMonth, 1)
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate()

    // Monday = 0, ..., Sunday = 6
    let startOffset = firstDay.getDay() - 1
    if (startOffset < 0) startOffset = 6 // Sunday becomes 6

    const cells = []
    // Empty cells before month starts
    for (let i = 0; i < startOffset; i++) cells.push(null)
    // Days of the month
    for (let d = 1; d <= daysInMonth; d++) {
      cells.push(new Date(viewYear, viewMonth, d))
    }
    return cells
  }

  const prevMonth = () => {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1) }
    else setViewMonth(m => m - 1)
    setSelectedDate(null)
  }

  const nextMonth = () => {
    const now = new Date()
    if (viewYear > now.getFullYear() || (viewYear === now.getFullYear() && viewMonth >= now.getMonth())) return
    if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1) }
    else setViewMonth(m => m + 1)
    setSelectedDate(null)
  }

  const isCurrentMonth = viewYear === today.getFullYear() && viewMonth === today.getMonth()

  const monthLabel = new Date(viewYear, viewMonth, 1).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })

  const formatDateFull = (date) => date.toLocaleDateString('en-GB', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
  })

  const formatTime = (dateString) => new Date(dateString).toLocaleTimeString('en-GB', {
    hour: '2-digit', minute: '2-digit'
  })

  const isToday = (date) => date?.toDateString() === today.toDateString()
  const isFuture = (date) => date > today

  const calendarDays = getCalendarDays()
  const selectedDateChecks = selectedDate ? getChecksForDate(selectedDate) : []


  return (
    <div className="min-h-screen bg-hop-pebble">
      <Header title="Check History" showBack />

      <div className="px-4 py-4 max-w-xl mx-auto">
        {/* Filters */}
        <div className="mb-6 space-y-2">
          <Select
            value={nurseryFilter}
            onChange={(e) => { setNurseryFilter(e.target.value); setSelectedDate(null) }}
            options={['all', ...locationOptions]}
            placeholder="All locations"
          />
          <Select
            value={checkTypeFilter}
            onChange={(e) => { setCheckTypeFilter(e.target.value); setSelectedDate(null) }}
          >
            <option value="all">All check types</option>
            {availableCheckTypes.map(t => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </Select>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="w-8 h-8 border-2 border-hop-forest border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-gray-500">Loading history...</p>
          </div>
        ) : (
          <>
            {/* Calendar */}
            <Card className="mb-6">
              {/* Month navigation */}
              <div className="flex items-center justify-between mb-4">
                <button onClick={prevMonth} className="p-1 rounded hover:bg-hop-pebble text-hop-forest">
                  ←
                </button>
                <span className="font-display font-semibold text-hop-forest">{monthLabel}</span>
                <button
                  onClick={nextMonth}
                  disabled={isCurrentMonth}
                  className="p-1 rounded hover:bg-hop-pebble text-hop-forest disabled:opacity-30"
                >
                  →
                </button>
              </div>

              {/* Day headers */}
              <div className="grid grid-cols-7 gap-1 mb-2">
                {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((day, i) => (
                  <div key={i} className="text-center text-xs font-medium text-gray-400 py-1">{day}</div>
                ))}
              </div>

              {/* Calendar grid */}
              <div className="grid grid-cols-7 gap-1">
                {calendarDays.map((day, i) => {
                  if (!day) return <div key={`empty-${i}`} />
                  const status = getDayStatus(day)
                  const isSelected = selectedDate?.toDateString() === day.toDateString()
                  const future = isFuture(day)

                  return (
                    <button
                      key={day.toISOString()}
                      onClick={() => !future && setSelectedDate(day)}
                      disabled={future}
                      className={`
                        aspect-square rounded-lg flex flex-col items-center justify-center
                        text-sm transition-all
                        ${isSelected ? 'ring-2 ring-hop-forest ring-offset-1' : ''}
                        ${isToday(day) ? 'font-bold' : ''}
                        ${future ? 'opacity-30 cursor-default' : 'hover:bg-hop-pebble'}
                        bg-white
                      `}
                    >
                      <span className={isToday(day) ? 'text-hop-forest' : 'text-gray-700'}>
                        {day.getDate()}
                      </span>
                      <div className={`
                        w-2 h-2 rounded-full mt-0.5
                        ${status !== 'none' ? 'bg-hop-apple' : 'bg-gray-200'}
                      `} />
                    </button>
                  )
                })}
              </div>

              {/* Legend */}
              <div className="flex justify-center gap-4 mt-4 pt-4 border-t border-gray-100 text-xs text-gray-500">
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-hop-apple" /> Checks done</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-gray-200" /> No checks</span>
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
                  <>
                    <div className="space-y-3">
                      {selectedDateChecks.map((check) => (
                        <Card key={check.id} className={check.has_issues ? 'border-l-4 border-l-hop-marmalade' : ''}>
                          <div className="flex items-start justify-between">
                            <div>
                              <p className="font-medium text-hop-forest">
                                {availableCheckTypes.find(t => t.value === check.check_type)?.label
                                  || checkTypes[check.check_type]?.shortName
                                  || check.check_type}
                              </p>
                              <p className="text-sm text-gray-500">
                                {section === 'holiday-club' && <>{check.nursery} · </>}{check.room} · {formatTime(check.created_at)}
                              </p>
                              <p className="text-sm text-gray-400">By {check.completed_by}</p>
                              {check.overall_notes && (
                                <p className="text-xs text-gray-400">{check.overall_notes}</p>
                              )}
                            </div>
                            <div className={`
                              px-2 py-1 rounded text-xs font-medium
                              ${check.has_issues ? 'bg-hop-marmalade/10 text-hop-marmalade-dark' : 'bg-hop-apple/10 text-hop-apple'}
                            `}>
                              {check.has_issues ? 'Issues' : 'OK'}
                            </div>
                          </div>
                          {check.has_issues && check.items && (
                            <div className="mt-3 pt-3 border-t border-gray-100">
                              <p className="text-xs font-medium text-gray-500 mb-2">Issues reported:</p>
                              <ul className="text-sm space-y-1">
                                {check.items.filter(item => item.status === 'fail').map((item, idx) => (
                                  <li key={idx} className="text-hop-marmalade-dark">
                                    • {item.text}
                                    {item.note && (
                                      <span className="block text-gray-500 text-xs ml-3">{item.note}</span>
                                    )}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </Card>
                      ))}
                    </div>
                  </>
                )}
              </div>
            )}

          </>
        )}
      </div>
    </div>
  )
}
