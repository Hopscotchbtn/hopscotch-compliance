import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { Header } from '../components/Header'
import { Card } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Select } from '../components/ui/Select'
import { Input } from '../components/ui/Input'
import { kitchenSafety, isMonday, isFirstOfMonth } from '../data/checklists'
import { nurseries } from '../data/nurseries'
import { storage } from '../lib/storage'
import { formatDate, formatTime } from '../lib/utils'

// Section definitions
const SECTIONS = [
  { id: 'opening', name: 'Opening Check', icon: '☀️', description: 'Morning prep & fridge temps' },
  { id: 'deliveries', name: 'Food Deliveries', icon: '🚚', description: 'Little Tums, supermarket, packed lunches' },
  { id: 'closing', name: 'Closing Check', icon: '🌙', description: 'End of day & fridge temps' },
  { id: 'signoff', name: 'Manager Sign-off', icon: '✓', description: 'Review & approve' },
]

export function KitchenSafety() {
  const navigate = useNavigate()
  const location = useLocation()

  const [nursery, setNursery] = useState(() => storage.getLastNursery())
  const [name, setName] = useState(() => storage.getUserName())
  // Always show setup first for Kitchen Safety to confirm nursery/name
  const [showSetup, setShowSetup] = useState(() => {
    // If returning from a completed section, don't show setup
    return !location.state?.completedSection
  })

  // Section completion state
  const [completedSections, setCompletedSections] = useState({})
  const [sectionData, setSectionData] = useState({})

  // Handle returning from a completed section
  useEffect(() => {
    if (location.state?.completedSection) {
      const { completedSection, sectionData: newData } = location.state
      setCompletedSections(prev => ({ ...prev, [completedSection]: true }))
      setSectionData(prev => ({ ...prev, [completedSection]: newData }))
      // Clear the state so it doesn't re-trigger on refresh
      window.history.replaceState({}, document.title)
    }
  }, [location.state])

  const handleSetupComplete = () => {
    if (!nursery || !name.trim()) return
    storage.setLastNursery(nursery)
    storage.setUserName(name.trim())
    setShowSetup(false)
  }

  const handleStartSection = (sectionId) => {
    navigate(`/kitchen-safety/${sectionId}`, {
      state: {
        nursery,
        completedBy: name.trim(),
        sectionData,
        completedSections,
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
              Select your nursery and enter your name to begin the Kitchen Food Safety Diary.
            </p>

            <Select
              label="Select nursery"
              value={nursery}
              onChange={setNursery}
              options={nurseries}
              placeholder="Choose a nursery"
              required
            />

            <Input
              label="Your name"
              value={name}
              onChange={setName}
              placeholder="Enter your name"
              required
            />

            <div className="pt-2">
              <Button
                color="marmalade"
                size="large"
                fullWidth
                disabled={!nursery || !name.trim()}
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
          {SECTIONS.map((section) => {
            const isComplete = completedSections[section.id]
            const isLocked = isSectionLocked(section.id)

            return (
              <button
                key={section.id}
                onClick={() => !isLocked && handleStartSection(section.id)}
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
                    section.icon
                  )}
                </div>

                {/* Info */}
                <div className="flex-1">
                  <p className="font-medium text-hop-forest">{section.name}</p>
                  <p className="text-sm text-gray-500">{section.description}</p>
                  {isComplete && sectionData[section.id]?.completedAt && (
                    <p className="text-xs text-hop-apple mt-1">
                      Completed at {formatTime(new Date(sectionData[section.id].completedAt))}
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

        {/* Change settings link */}
        <div className="mt-8 text-center">
          <button
            onClick={() => setShowSetup(true)}
            className="text-sm text-gray-500 hover:text-hop-forest underline underline-offset-2"
          >
            Change nursery or name
          </button>
        </div>
      </div>
    </div>
  )
}
