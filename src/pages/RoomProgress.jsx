import { useState, useEffect } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import { Header } from '../components/Header'
import { Card } from '../components/ui/Card'
import { Select } from '../components/ui/Select'
import { Input } from '../components/ui/Input'
import { Button } from '../components/ui/Button'
import { checkTypes } from '../data/checklists'
import { storage } from '../lib/storage'
import { getTodayChecksByType, getChecksForWeek, getFirstAidChecksForWeek } from '../lib/supabase'
import { formatDate } from '../lib/utils'
import { generateHolidayClubChecksPDF } from '../lib/generateHolidayClubChecksPDF'
import { generateFirstAidPDF } from '../lib/generateFirstAidPDF'
import { getWeekOptions } from '../lib/generateKitchenSafetyPDF'

const locationOptions = {
  nursery: ['Preston Park', 'Hove Station', 'Seven Dials', 'West Hove', 'Peacehaven', 'Seaford', 'Worthing'],
  holidayClub: ['Holland Road', 'School Road'],
}

export function RoomProgress() {
  const { checkTypeId } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const checkType = checkTypes[checkTypeId]
  const isHolidayClub = location.state?.section === 'holiday-club'
  const pageTitle = isHolidayClub ? 'Holiday Club Daily Checks' : checkType?.name

  const [locationType, setLocationType] = useState(isHolidayClub ? 'holidayClub' : '')
  const [nursery, setNursery] = useState(() => {
    const last = storage.getLastNursery()
    if (isHolidayClub && !locationOptions.holidayClub.includes(last)) return ''
    return last
  })
  const [name, setName] = useState(() => storage.getUserName())
  const [completedRooms, setCompletedRooms] = useState({})
  const [roomIssues, setRoomIssues] = useState({})
  const [loading, setLoading] = useState(false)
  const [showSetup, setShowSetup] = useState(true)
  const [holidayMessageAcknowledged, setHolidayMessageAcknowledged] = useState(false)

  const weekOptions = getWeekOptions(5)
  const [selectedWeek, setSelectedWeek] = useState('')
  const [downloading, setDownloading] = useState(false)
  const [downloadError, setDownloadError] = useState(null)

  const handleDownloadPDF = async () => {
    const week = weekOptions.find(w => w.value === selectedWeek)
    if (!week || !nursery) return
    setDownloading(true)
    setDownloadError(null)
    try {
      const weekStart = new Date(week.value + 'T12:00:00')
      const weekEnd = new Date(week.sunday + 'T12:00:00')
      if (checkTypeId === 'firstAidBox') {
        const checks = await getFirstAidChecksForWeek(nursery, weekStart, weekEnd)
        const doc = await generateFirstAidPDF(nursery, checks, weekStart, weekEnd)
        doc.save(`First-Aid-Box-Check-${nursery.replace(/\s+/g, '-')}-${week.value}.pdf`)
      } else {
        const checks = await getChecksForWeek(nursery, weekStart, weekEnd)
        const doc = await generateHolidayClubChecksPDF(nursery, checks, weekStart, weekEnd)
        doc.save(`Holiday-Club-Checks-${nursery.replace(/\s+/g, '-')}-${week.value}.pdf`)
      }
    } catch (err) {
      console.error('PDF download error:', err)
      setDownloadError('Failed to generate PDF. Please try again.')
    } finally {
      setDownloading(false)
    }
  }

  // Redirect if invalid check type
  useEffect(() => {
    if (!checkType) {
      navigate('/')
    }
  }, [checkType, navigate])

  // For autoRoom checks (like Garden), skip straight to swipe cards after setup
  useEffect(() => {
    if (checkType?.autoRoom && !showSetup && nursery && name) {
      if (checkTypeId === 'firstAidBox') {
        navigate('/check/firstAidBox/first-aid', {
          state: { nursery, completedBy: name.trim() },
        })
      } else {
        navigate(`/check/${checkTypeId}/room/${encodeURIComponent(checkType.autoRoom)}`, {
          state: {
            nursery,
            room: checkType.autoRoom,
            completedBy: name.trim(),
            checkType: checkTypeId,
          },
        })
      }
    }
  }, [checkType, showSetup, nursery, name, checkTypeId, navigate])

  useEffect(() => {
    if (nursery && checkType && !checkType.autoRoom) {
      loadTodayProgress()
    }
  }, [nursery, checkTypeId, checkType])

  const loadTodayProgress = async () => {
    setLoading(true)
    try {
      const checks = await getTodayChecksByType(nursery, checkTypeId)
      const completed = {}
      const issues = {}

      checks.forEach(check => {
        completed[check.room] = true
        if (check.has_issues) {
          issues[check.room] = check.items.filter(item => item.status === 'fail')
        }
      })

      setCompletedRooms(completed)
      setRoomIssues(issues)
    } catch (err) {
      console.error('Error loading progress:', err)
    } finally {
      setLoading(false)
    }
  }

  // Return null while redirecting
  if (!checkType) {
    return null
  }

  const handleSetupComplete = () => {
    if (!nursery || !name.trim()) return
    storage.setLastNursery(nursery)
    storage.setUserName(name.trim())
    setShowSetup(false)
  }

  const handleStartRoom = (room) => {
    navigate(`/check/${checkTypeId}/room/${encodeURIComponent(room)}`, {
      state: {
        nursery,
        room,
        completedBy: name.trim(),
        checkType: checkTypeId,
      },
    })
  }

  // Get rooms for this check type
  const checkRooms = checkType.rooms || []
  const completedCount = checkRooms.filter(room => completedRooms[room]).length
  const totalCount = checkRooms.length
  const allComplete = completedCount === totalCount

  // Setup screen
  if (showSetup) {
    return (
      <div className="min-h-screen bg-hop-pebble">
        <Header title={pageTitle} showBack />

        <div className="px-4 py-6 max-w-md mx-auto">
          <div className="text-center mb-6">
            <p className="text-hop-forest font-medium">{formatDate()}</p>
          </div>

          <Card className="space-y-5">
            <p className="text-gray-600 text-sm">
              Select your nursery and enter your initials to begin. These will be remembered for future checks.
            </p>

            {!isHolidayClub && (
              <Select
                label="Type"
                value={locationType}
                onChange={(e) => { setLocationType(e.target.value); setNursery('') }}
                placeholder="Choose a type"
                required
              >
                <option value="" disabled>Choose a type</option>
                <option value="nursery">Nursery</option>
                <option value="holidayClub">Holiday Club</option>
              </Select>
            )}

            <Select
              label="Location"
              value={nursery}
              onChange={(e) => setNursery(e.target.value)}
              options={locationType ? locationOptions[locationType] : []}
              placeholder="Choose a location"
              required
              disabled={!isHolidayClub && !locationType}
            />

            <Input
              label="Your initials"
              value={name}
              onChange={setName}
              placeholder="e.g. PF"
              required
            />

            <div className="pt-2">
              <Button
                color="forest"
                size="large"
                fullWidth
                disabled={!nursery || !name.trim()}
                onClick={handleSetupComplete}
              >
                Continue
              </Button>
            </div>
          </Card>

          {(isHolidayClub || checkTypeId === 'firstAidBox') && (
            <div className="mt-4 p-4 bg-white rounded-xl border-2 border-gray-200">
              <p className="text-sm font-medium text-hop-forest mb-3">Download Weekly PDF</p>
              <select
                value={selectedWeek}
                onChange={(e) => setSelectedWeek(e.target.value)}
                className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg text-hop-forest text-sm font-body focus:outline-none focus:border-hop-forest mb-3"
              >
                <option value="">Select a week…</option>
                {weekOptions.map(w => (
                  <option key={w.value} value={w.value}>{w.label}</option>
                ))}
              </select>
              <Button
                color="marmalade"
                size="large"
                fullWidth
                disabled={!selectedWeek || !nursery || downloading}
                onClick={handleDownloadPDF}
              >
                {downloading ? 'Generating…' : 'Download PDF'}
              </Button>
              {downloadError && (
                <p className="mt-2 text-xs text-red-600">{downloadError}</p>
              )}
            </div>
          )}
        </div>
      </div>
    )
  }

  // Holiday Club message screen
  if (locationType === 'holidayClub' && !holidayMessageAcknowledged) {
    return (
      <div className="min-h-screen bg-hop-pebble">
        <Header title="Holiday Club Daily Checks" showBack />

        <div className="px-4 py-6 max-w-md mx-auto">
          <Card className="space-y-5">
            <div className="bg-hop-smiles border border-hop-smiles rounded-lg p-4">
              <p className="text-hop-forest text-lg leading-relaxed">
                The daily checks must be carried out before the Holiday Club is open and children are on site. The site should be monitored through the day and any defects reported immediately to the duty manager and made safe. (Comments should be added to reference any defects found).
              </p>
            </div>

            <Button
              color="forest"
              size="large"
              fullWidth
              onClick={() => {
                setHolidayMessageAcknowledged(true)
                navigate(`/check/${checkTypeId}/holiday-club`, {
                  state: { nursery, completedBy: name.trim() },
                })
              }}
            >
              Next
            </Button>
          </Card>

        </div>
      </div>
    )
  }

  // For autoRoom checks, show loading while redirecting
  if (checkType.autoRoom) {
    return (
      <div className="min-h-screen bg-hop-pebble flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-hop-forest border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-gray-500">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-hop-pebble">
      <Header
        title={checkType.shortName}
        subtitle={`${nursery} · ${formatDate()}`}
        showBack
      />

      <div className="px-4 py-6 max-w-md mx-auto">
        {/* Overall progress */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-600">Progress</span>
            <span className="text-sm font-medium text-hop-forest">
              {completedCount} of {totalCount} room{totalCount !== 1 ? 's' : ''}
            </span>
          </div>
          <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-hop-apple transition-all duration-500 ease-out rounded-full"
              style={{ width: `${(completedCount / totalCount) * 100}%` }}
            />
          </div>
        </div>

        {/* All complete message */}
        {allComplete && (
          <Card className="mb-6 bg-hop-apple/10 border border-hop-apple">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-hop-apple rounded-full flex items-center justify-center flex-shrink-0">
                <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div>
                <p className="font-medium text-hop-forest">All rooms checked!</p>
                <p className="text-sm text-gray-600">{checkType.shortName} complete for today</p>
              </div>
            </div>
          </Card>
        )}

        {/* Room list */}
        <div className="space-y-3">
          {checkRooms.map((room) => {
            const isComplete = completedRooms[room]
            const hasIssues = roomIssues[room]?.length > 0

            return (
              <button
                key={room}
                onClick={() => handleStartRoom(room)}
                disabled={loading}
                className={`
                  w-full p-4 rounded-xl text-left transition-all duration-200
                  flex items-center gap-4
                  ${isComplete
                    ? 'bg-white border-2 border-hop-apple'
                    : 'bg-white border-2 border-gray-200 hover:border-hop-forest hover:shadow-md'
                  }
                `}
              >
                {/* Status indicator */}
                <div className={`
                  w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0
                  ${isComplete
                    ? hasIssues
                      ? 'bg-hop-marmalade'
                      : 'bg-hop-apple'
                    : 'bg-gray-100'
                  }
                `}>
                  {isComplete ? (
                    hasIssues ? (
                      <span className="text-white text-lg">!</span>
                    ) : (
                      <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                      </svg>
                    )
                  ) : (
                    <div className="w-3 h-3 rounded-full bg-gray-300" />
                  )}
                </div>

                {/* Room info */}
                <div className="flex-1">
                  <p className="font-medium text-hop-forest">
                    {room}
                  </p>
                  {isComplete && (
                    <p className={`text-sm ${hasIssues ? 'text-hop-marmalade-dark' : 'text-hop-apple'}`}>
                      {hasIssues
                        ? `${roomIssues[room].length} issue${roomIssues[room].length !== 1 ? 's' : ''} recorded`
                        : 'Completed'
                      }
                    </p>
                  )}
                </div>

                {/* Arrow */}
                <svg
                  className={`w-5 h-5 ${isComplete ? 'text-gray-400' : 'text-hop-forest'}`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            )
          })}
        </div>

        {/* Change settings link */}
        <div className="mt-8 text-center">
          <button
            onClick={() => setShowSetup(true)}
            className="text-sm text-gray-500 hover:text-hop-forest underline underline-offset-2"
          >
            Change nursery or initials
          </button>
        </div>
      </div>
    </div>
  )
}
