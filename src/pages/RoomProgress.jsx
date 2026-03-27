import { useState, useEffect } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import { Header } from '../components/Header'
import { Card } from '../components/ui/Card'
import { Select } from '../components/ui/Select'
import { Input } from '../components/ui/Input'
import { Button } from '../components/ui/Button'
import { checkTypes } from '../data/checklists'
import { nurseries } from '../data/nurseries'
import { storage } from '../lib/storage'
import { getTodayChecksByType, getChecksForDateRange, getCustomRooms, saveCustomRooms, getLastCheck } from '../lib/supabase'
import { formatDate } from '../lib/utils'
import { generateDailyChecksExcel, generateFirstAidExcel, generateNurseryRoomChecksExcel } from '../lib/generateRecordsExcel'

const locationOptions = {
  nursery: nurseries,
  holidayClub: ['Holland Road', 'School Road'],
}

export function RoomProgress() {
  const { checkTypeId } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const checkType = checkTypes[checkTypeId]
  const isHolidayClub = location.state?.section === 'holiday-club'
  const isNursery = location.state?.section === 'nursery'
  const pageTitle = isHolidayClub ? 'Holiday Club Daily Checks' : checkType?.name

  const [locationType, setLocationType] = useState(
    isHolidayClub ? 'holidayClub' : isNursery ? 'nursery' : ''
  )
  const [nursery, setNursery] = useState(() => {
    const last = storage.getLastNursery()
    if (isHolidayClub && !locationOptions.holidayClub.includes(last)) return ''
    if (isNursery && !locationOptions.nursery.includes(last)) return ''
    return last
  })
  const [name, setName] = useState(location.state?.completedBy || '')
  const [completedRooms, setCompletedRooms] = useState({})
  const [roomIssues, setRoomIssues] = useState({})
  const [loading, setLoading] = useState(false)
  const [showSetup, setShowSetup] = useState(!location.state?.skipSetup)
  const [holidayMessageAcknowledged, setHolidayMessageAcknowledged] = useState(false)
  const [showOtherInput, setShowOtherInput] = useState(false)
  const [otherRoomName, setOtherRoomName] = useState('')
  const [customRooms, setCustomRooms] = useState([])

  const prevMonth = (() => {
    const now = new Date()
    return {
      start: new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().slice(0, 10),
      end: new Date(now.getFullYear(), now.getMonth(), 0).toISOString().slice(0, 10),
    }
  })()
  const [dlStart, setDlStart] = useState(prevMonth.start)
  const [dlEnd, setDlEnd] = useState(prevMonth.end)
  const [downloading, setDownloading] = useState(false)
  const [downloadError, setDownloadError] = useState(null)
  const [lastFirstAidCheck, setLastFirstAidCheck] = useState(undefined)

  useEffect(() => {
    if (checkTypeId === 'firstAidBox' && nursery) {
      getLastCheck(nursery, 'firstAidBox').then(setLastFirstAidCheck).catch(() => setLastFirstAidCheck(null))
    } else {
      setLastFirstAidCheck(undefined)
    }
  }, [nursery, checkTypeId])

  const handleDownloadExcel = async () => {
    if (!nursery || !dlStart || !dlEnd) return
    setDownloading(true)
    setDownloadError(null)
    try {
      if (checkTypeId === 'firstAidBox') {
        const checks = await getChecksForDateRange(nursery, dlStart, dlEnd, { checkType: 'firstAidBox' })
        await generateFirstAidExcel(nursery, checks, dlStart, dlEnd, { isHolidayClub, logoPath: isHolidayClub ? '/hopscotch-holiday-club-logo.png' : '/hopscotch-logo.png' })
      } else if (checkTypeId === 'gardenOutdoor') {
        const checks = await getChecksForDateRange(nursery, dlStart, dlEnd, { room: 'Garden/Outdoor Area' })
        await generateDailyChecksExcel(nursery, checks, dlStart, dlEnd, { isHolidayClub: false, logoPath: '/hopscotch-logo.png' })
      } else if (isNursery && checkTypeId === 'roomSafety') {
        const allChecks = await getChecksForDateRange(nursery, dlStart, dlEnd, { checkType: 'roomSafety' })
        const base = checkType.rooms || []
        const standard = nursery === 'Preston Park'
          ? (() => { const idx = base.indexOf('Softplay'); return [...base.slice(0, idx), 'Preschool', ...base.slice(idx)] })()
          : base
        const custom = await getCustomRooms(nursery, 'roomSafety').catch(() => [])
        await generateNurseryRoomChecksExcel(nursery, [...standard, ...custom], allChecks, dlStart, dlEnd)
      } else {
        const checks = await getChecksForDateRange(nursery, dlStart, dlEnd, { room: 'Holiday Club' })
        await generateDailyChecksExcel(nursery, checks, dlStart, dlEnd, { isHolidayClub, logoPath: '/hopscotch-holiday-club-logo.png' })
      }
    } catch (err) {
      console.error('Excel download error:', err)
      setDownloadError('Failed to download. Please try again.')
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
          state: { nursery, completedBy: name.trim(), section: location.state?.section },
        })
      } else if (checkTypeId === 'gardenOutdoor') {
        navigate('/check/gardenOutdoor/nursery', {
          state: { nursery, completedBy: name.trim(), section: location.state?.section },
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
    if (!showSetup && nursery) {
      getCustomRooms(nursery, checkTypeId).then(setCustomRooms).catch(() => {})
    }
  }, [])

  useEffect(() => {
    if (nursery && checkType && !checkType.autoRoom) {
      loadTodayProgress()
      const onVisible = () => { if (document.visibilityState === 'visible') loadTodayProgress() }
      document.addEventListener('visibilitychange', onVisible)
      return () => document.removeEventListener('visibilitychange', onVisible)
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

  const isNurseryRoomSafety = isNursery && checkTypeId === 'roomSafety'

  const handleSetupComplete = async () => {
    if (!nursery || (!isNurseryRoomSafety && !name.trim())) return
    storage.setLastNursery(nursery)
    const rooms = await getCustomRooms(nursery, checkTypeId).catch(() => [])
    setCustomRooms(rooms)
    setShowSetup(false)
  }

  const handleAddCustomRoom = (roomName) => {
    const updated = [...customRooms, roomName]
    setCustomRooms(updated)
    saveCustomRooms(nursery, checkTypeId, updated).catch(console.error)
    handleStartRoom(roomName)
    setShowOtherInput(false)
    setOtherRoomName('')
  }

  const handleDeleteCustomRoom = (roomName) => {
    const updated = customRooms.filter(r => r !== roomName)
    setCustomRooms(updated)
    saveCustomRooms(nursery, checkTypeId, updated).catch(console.error)
  }

  const handleStartRoom = (room) => {
    navigate(`/check/${checkTypeId}/room/${encodeURIComponent(room)}`, {
      state: {
        nursery,
        room,
        completedBy: name.trim(),
        checkType: checkTypeId,
        section: location.state?.section,
      },
      replace: true,
    })
  }

  // Get rooms for this check type (dynamically add Preschool for Preston Park)
  const checkRooms = (() => {
    const base = checkType.rooms || []
    if (checkTypeId === 'roomSafety' && nursery === 'Preston Park') {
      const idx = base.indexOf('Softplay')
      return [...base.slice(0, idx), 'Preschool', ...base.slice(idx)]
    }
    return base
  })()
  const showOtherOption = checkTypeId === 'roomSafety' && isNursery
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
              {isNurseryRoomSafety
                ? 'Select your nursery to begin. You\'ll enter your initials on each room check.'
                : 'Select your nursery and enter your initials to begin. These will be remembered for future checks.'}
            </p>

            {!isHolidayClub && !isNursery && (
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
              disabled={!isHolidayClub && !isNursery && !locationType}
            />

            {!isNurseryRoomSafety && (
              <Input
                label="Your initials"
                value={name}
                onChange={setName}
                placeholder="e.g. PF"
                required
              />
            )}

            <div className="pt-2">
              <Button
                color="forest"
                size="large"
                fullWidth
                disabled={!nursery || (!isNurseryRoomSafety && !name.trim())}
                onClick={handleSetupComplete}
              >
                Continue
              </Button>
            </div>
          </Card>

          {checkTypeId === 'firstAidBox' && nursery && lastFirstAidCheck !== undefined && (
            <div className="mt-4 p-4 bg-white rounded-xl border-2 border-gray-200">
              <p className="text-sm font-medium text-hop-forest mb-2">Last First Aid Box Check</p>
              {lastFirstAidCheck ? (
                <p className="text-sm text-gray-600">
                  {new Date(lastFirstAidCheck.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
                  {lastFirstAidCheck.completed_by && (
                    <span className="text-gray-400"> · {lastFirstAidCheck.completed_by}</span>
                  )}
                </p>
              ) : (
                <p className="text-sm text-gray-400">No previous check recorded</p>
              )}
            </div>
          )}

          {(isHolidayClub || checkTypeId === 'firstAidBox' || checkTypeId === 'gardenOutdoor' || (isNursery && checkTypeId === 'roomSafety')) && (
            <div className="mt-4 p-4 bg-white rounded-xl border-2 border-gray-200">
              <p className="text-sm font-medium text-hop-forest mb-3">📥 Download Records</p>
              <div className="flex gap-2 mb-3">
                <div className="flex-1">
                  <p className="text-xs text-gray-500 mb-1">From</p>
                  <input type="date" value={dlStart} onChange={e => setDlStart(e.target.value)}
                    className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg text-hop-forest text-sm font-body focus:outline-none focus:border-hop-forest" />
                </div>
                <div className="flex-1">
                  <p className="text-xs text-gray-500 mb-1">To</p>
                  <input type="date" value={dlEnd} onChange={e => setDlEnd(e.target.value)}
                    className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg text-hop-forest text-sm font-body focus:outline-none focus:border-hop-forest" />
                </div>
              </div>
              <Button
                color="marmalade"
                size="large"
                fullWidth
                disabled={!nursery || !dlStart || !dlEnd || downloading}
                onClick={handleDownloadExcel}
              >
                {downloading ? 'Generating…' : 'Download Excel'}
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
                  state: { nursery, completedBy: name.trim(), section: location.state?.section },
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

        {/* Custom rooms (saved via Other) */}
        {showOtherOption && customRooms.map((room) => {
          const isComplete = completedRooms[room]
          const hasIssues = roomIssues[room]?.length > 0
          return (
            <div key={room} className="relative mt-3">
              <button
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
                <div className={`
                  w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0
                  ${isComplete ? (hasIssues ? 'bg-hop-marmalade' : 'bg-hop-apple') : 'bg-gray-100'}
                `}>
                  {isComplete ? (
                    hasIssues
                      ? <span className="text-white text-lg">!</span>
                      : <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
                  ) : (
                    <div className="w-3 h-3 rounded-full bg-gray-300" />
                  )}
                </div>
                <div className="flex-1">
                  <p className="font-medium text-hop-forest">{room}</p>
                  {isComplete && (
                    <p className={`text-sm ${hasIssues ? 'text-hop-marmalade-dark' : 'text-hop-apple'}`}>
                      {hasIssues ? `${roomIssues[room].length} issue${roomIssues[room].length !== 1 ? 's' : ''} recorded` : 'Completed'}
                    </p>
                  )}
                </div>
                <svg className={`w-5 h-5 ${isComplete ? 'text-gray-400' : 'text-hop-forest'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
              <button
                onClick={() => handleDeleteCustomRoom(room)}
                className="absolute top-2 right-10 text-gray-400 hover:text-red-400 text-2xl leading-none p-1"
                title="Remove room"
              >
                ×
              </button>
            </div>
          )
        })}

        {/* Other room option */}
        {showOtherOption && (
          <div className="mt-3">
            {showOtherInput ? (
              <div className="bg-white border-2 border-gray-200 rounded-xl p-4 space-y-3">
                <p className="text-sm font-medium text-hop-forest">Specify room name</p>
                <input
                  type="text"
                  value={otherRoomName}
                  onChange={(e) => setOtherRoomName(e.target.value)}
                  placeholder="e.g. Art Room"
                  autoFocus
                  className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg text-hop-forest text-sm font-body focus:outline-none focus:border-hop-forest"
                />
                <div className="flex gap-2">
                  <button
                    onClick={() => { setShowOtherInput(false); setOtherRoomName('') }}
                    className="flex-1 py-2 rounded-lg text-sm text-gray-500 bg-gray-100 hover:bg-gray-200"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => otherRoomName.trim() && handleAddCustomRoom(otherRoomName.trim())}
                    disabled={!otherRoomName.trim()}
                    className="flex-1 py-2 rounded-lg text-sm font-medium bg-hop-forest text-white disabled:opacity-40"
                  >
                    Start Check
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setShowOtherInput(true)}
                className="w-full p-4 rounded-xl text-left bg-white border-2 border-dashed border-gray-300 hover:border-hop-forest flex items-center gap-4 transition-all"
              >
                <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
                  <span className="text-gray-400 text-xl">+</span>
                </div>
                <p className="font-medium text-gray-500">Other</p>
              </button>
            )}
          </div>
        )}

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
