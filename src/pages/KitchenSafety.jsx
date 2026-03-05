import { useState, useEffect, useRef } from 'react'
import { useNavigate, useLocation, Link } from 'react-router-dom'
import { Header } from '../components/Header'
import { Card } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Select } from '../components/ui/Select'
import { Input } from '../components/ui/Input'
import { kitchenSafety, isMonday, isFirstOfMonth } from '../data/checklists'
import { nurseries } from '../data/nurseries'
import { storage } from '../lib/storage'

import { formatDate, formatTime } from '../lib/utils'
import { generateKitchenSafetyPDF, getWeekOptions } from '../lib/generateKitchenSafetyPDF'

const holidayClubLocations = ['Holland Road', 'School Road']

const NURSERY_SECTIONS = [
  { id: 'opening', name: 'Opening Fridge Check', icon: '☀️', description: 'Morning fridge temperatures' },
  { id: 'packedLunch', name: 'Packed Lunches', icon: '🥪', description: 'Visual check of packed lunches' },
  { id: 'closing', name: 'Closing Fridge Check', icon: '🌙', description: 'End of day fridge temperature' },
  { id: 'signoff', name: 'Manager Sign-off', icon: '✓', description: 'Review & approve' },
]

const HOLIDAY_CLUB_SECTIONS = [
  { id: 'opening', name: 'Opening Fridge Check', icon: '☀️', description: 'Morning fridge temperatures' },
  { id: 'packedLunch', name: 'Packed Lunches', icon: '🥪', description: 'Visual check of packed lunches' },
  { id: 'closing', name: 'Closing Fridge Check', icon: '🌙', description: 'End of day fridge temperature' },
  { id: 'signoff', name: 'Manager Sign-off', icon: '✓', description: 'Review & approve' },
]

export function KitchenSafety() {
  const navigate = useNavigate()
  const location = useLocation()

  const section = location.state?.section || location.state?.returnedSection
  const isHolidayClub = section === 'holiday-club'
  const locationOptions = isHolidayClub ? holidayClubLocations : nurseries
  const SECTIONS = isHolidayClub ? HOLIDAY_CLUB_SECTIONS : NURSERY_SECTIONS

  const [nursery, setNursery] = useState(() => {
    const last = storage.getLastNursery()
    if (isHolidayClub && !holidayClubLocations.includes(last)) return ''
    return last
  })
  const [name, setName] = useState(() => storage.getUserName())
  const [showSetup, setShowSetup] = useState(() => {
    // Only skip setup when returning from a completed section or explicit skipSetup flag
    return !location.state?.completedSection && !location.state?.skipSetup
  })

  // Section completion state — load from storage for today
  const [completedSections, setCompletedSections] = useState(() => {
    const last = storage.getLastNursery()
    const saved = last ? storage.getKitchenSafetyState(last) : null
    return saved?.completedSections || {}
  })
  const [sectionData, setSectionData] = useState(() => {
    const last = storage.getLastNursery()
    const saved = last ? storage.getKitchenSafetyState(last) : null
    return saved?.sectionData || {}
  })

  const processedSection = useRef(null)
  const [selectedWeek, setSelectedWeek] = useState('')
  const weekOptions = getWeekOptions(5)

  const [downloading, setDownloading] = useState(false)

  const handleDownloadPDF = async () => {
    const week = weekOptions.find(w => w.value === selectedWeek)
    if (!week) return
    setDownloading(true)
    try {
      const history = storage.getKitchenSafetyHistory(nursery)
      const doc = await generateKitchenSafetyPDF(nursery, history, new Date(week.value + 'T12:00:00'), new Date(week.sunday + 'T12:00:00'))
      doc.save(`Kitchen-Safety-${nursery.replace(/\s+/g, '-')}-${week.value}.pdf`)
    } finally {
      setDownloading(false)
    }
  }

  // Handle returning from a completed section
  useEffect(() => {
    const { completedSection, sectionData: newData } = location.state || {}
    if (completedSection && completedSection !== processedSection.current) {
      processedSection.current = completedSection
      setCompletedSections(prev => {
        const next = { ...prev, [completedSection]: true }
        setSectionData(prevData => {
          const nextData = { ...prevData, [completedSection]: newData }
          storage.setKitchenSafetyState(nursery, next, nextData)
          return nextData
        })
        return next
      })
    }
  }, [location.state])

  const handleSetupComplete = () => {
    if (!nursery) return
    storage.setLastNursery(nursery)
    // Load completion state for the selected location
    const saved = storage.getKitchenSafetyState(nursery)
    setCompletedSections(saved?.completedSections || {})
    setSectionData(saved?.sectionData || {})
    setShowSetup(false)
  }

  const handleStartSection = (sectionId) => {
    navigate(`/kitchen-safety/${sectionId}`, {
      state: {
        nursery,
        completedBy: name.trim(),
        sectionData,
        completedSections,
        section,
      },
    })
  }

  const isSectionLocked = (sectionId) => {
    if (sectionId === 'closing') {
      return !completedSections.opening
    }
    if (sectionId === 'signoff') {
      return !completedSections.opening || !completedSections.closing
    }
    return false
  }

  const getCompletedCount = () => {
    return Object.values(completedSections).filter(Boolean).length
  }

  // Check for weekly/monthly tasks
  const showWeeklyProbeCheck = isMonday()
  const showMonthlyCalibration = isFirstOfMonth()

  // Setup screen
  if (showSetup) {
    return (
      <div className="min-h-screen bg-hop-pebble">
        <Header title={kitchenSafety.name} showBack />

        <div className="px-4 py-6 max-w-md mx-auto">
          <div className="text-center mb-6">
            <p className="text-hop-forest font-medium">{formatDate()}</p>
          </div>

          <Card className="space-y-5">
            <p className="text-gray-600 text-sm">
              Select your location to begin the Daily Kitchen Safety Diary.
            </p>

            <Select
              label="Select location"
              value={nursery}
              onChange={(e) => setNursery(e.target.value)}
              options={locationOptions}
              placeholder="Choose a location"
              required
            />

            <div className="pt-2">
              <Button
                color="marmalade"
                size="large"
                fullWidth
                disabled={!nursery}
                onClick={handleSetupComplete}
              >
                Continue
              </Button>
            </div>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-hop-pebble">
      <Header
        title={kitchenSafety.shortName}
        subtitle={`${nursery} · ${formatDate()}`}
        showBack
      />

      <div className="px-4 py-6 max-w-md mx-auto">
        {/* Overall progress */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-600">Today's Progress</span>
            <span className="text-sm font-medium text-hop-forest">
              {getCompletedCount()} of {SECTIONS.length} sections
            </span>
          </div>
          <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-hop-marmalade transition-all duration-500 ease-out rounded-full"
              style={{ width: `${(getCompletedCount() / SECTIONS.length) * 100}%` }}
            />
          </div>
        </div>

        {/* Weekly/Monthly alerts */}
        {(showWeeklyProbeCheck || showMonthlyCalibration) && (
          <Card className="mb-6 bg-hop-sunshine/20 border border-hop-sunshine">
            <div className="flex items-start gap-3">
              <span className="text-xl">📋</span>
              <div>
                <p className="font-medium text-hop-forest mb-1">Additional checks due</p>
                <ul className="text-sm text-gray-600 space-y-1">
                  {showWeeklyProbeCheck && (
                    <li>• Weekly probe thermometer check (all units)</li>
                  )}
                  {showMonthlyCalibration && (
                    <li>• Monthly probe calibration check</li>
                  )}
                </ul>
              </div>
            </div>
          </Card>
        )}

        {/* Section list */}
        <div className="space-y-3">
          {SECTIONS.map((sectionItem) => {
            const isComplete = completedSections[sectionItem.id]
            const isLocked = isSectionLocked(sectionItem.id)

            return (
              <button
                key={sectionItem.id}
                onClick={() => !isLocked && handleStartSection(sectionItem.id)}
                disabled={isLocked}
                className={`
                  w-full p-4 rounded-xl text-left transition-all duration-200
                  flex items-center gap-4
                  ${isComplete
                    ? 'bg-white border-2 border-hop-apple'
                    : isLocked
                    ? 'bg-gray-100 border-2 border-gray-200 opacity-60'
                    : 'bg-white border-2 border-gray-200 hover:border-hop-marmalade hover:shadow-md'
                  }
                `}
              >
                {/* Icon */}
                <div className={`
                  w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 text-xl
                  ${isComplete
                    ? 'bg-hop-apple'
                    : isLocked
                    ? 'bg-gray-200'
                    : 'bg-hop-marmalade/20'
                  }
                `}>
                  {isComplete ? (
                    <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                    </svg>
                  ) : isLocked ? (
                    <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                  ) : (
                    sectionItem.icon
                  )}
                </div>

                {/* Info */}
                <div className="flex-1">
                  <p className="font-medium text-hop-forest">{sectionItem.name}</p>
                  <p className="text-sm text-gray-500">{sectionItem.description}</p>
                  {isComplete && sectionData[sectionItem.id]?.completedAt && (
                    <p className="text-xs text-hop-apple mt-1">
                      Completed at {formatTime(new Date(sectionData[sectionItem.id].completedAt))}
                    </p>
                  )}
                </div>

                {/* Arrow */}
                {!isLocked && (
                  <svg
                    className={`w-5 h-5 ${isComplete ? 'text-gray-400' : 'text-hop-marmalade'}`}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                )}
              </button>
            )
          })}
        </div>

        {/* Download PDF */}
        <div className="mt-8 p-4 bg-white rounded-xl border-2 border-gray-200">
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
        </div>

        {/* Change settings / clear checks */}
        <div className="mt-4 text-center space-y-2">
          <button
            onClick={() => setShowSetup(true)}
            className="block w-full text-sm text-gray-500 hover:text-hop-forest underline underline-offset-2"
          >
            Change location
          </button>
          <button
            onClick={() => {
              setCompletedSections({})
              setSectionData({})
              if (nursery) storage.setKitchenSafetyState(nursery, {}, {})
            }}
            className="block w-full text-sm text-red-400 hover:text-red-600 underline underline-offset-2"
          >
            Clear today's checks
          </button>
        </div>

      </div>
    </div>
  )
}
