import { useState, useEffect } from 'react'
import { useParams, useLocation, useNavigate } from 'react-router-dom'
import { Header } from '../components/Header'
import { SwipeCard } from '../components/SwipeCard'
import { Card } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { kitchenSafety, isMonday, isFirstOfMonth } from '../data/checklists'
import { formatTime } from '../lib/utils'

// Get section config
const getSectionConfig = (sectionId) => {
  switch (sectionId) {
    case 'opening':
      return {
        title: 'Opening Check',
        subtitle: 'Morning preparation',
        items: kitchenSafety.openingChecks,
        includeTemps: true,
        tempType: 'opening',
        includeWeeklyProbe: isMonday(),
      }
    case 'deliveries':
      return {
        title: 'Food Deliveries',
        subtitle: 'Temperature checks',
        items: [], // Custom flow for deliveries
        isDeliverySection: true,
      }
    case 'closing':
      return {
        title: 'Closing Check',
        subtitle: 'End of day',
        items: kitchenSafety.closingChecks,
        includeTemps: true,
        tempType: 'closing',
        includeMonthlyCalibration: isFirstOfMonth(),
      }
    case 'signoff':
      return {
        title: 'Manager Sign-off',
        subtitle: 'Review & approve',
        items: [],
        isSignoff: true,
      }
    default:
      return null
  }
}

export function KitchenSection() {
  const { sectionId } = useParams()
  const location = useLocation()
  const navigate = useNavigate()

  const { nursery, completedBy } = location.state || {}
  const config = getSectionConfig(sectionId)

  const [phase, setPhase] = useState('checks') // 'checks', 'temps', 'weekly', 'monthly', 'summary'
  const [currentIndex, setCurrentIndex] = useState(0)
  const [responses, setResponses] = useState({})
  const [notes, setNotes] = useState({})
  const [temperatures, setTemperatures] = useState({})
  const [deliveryData, setDeliveryData] = useState({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)

  // Redirect if missing data
  useEffect(() => {
    if (!config || !nursery) {
      navigate('/kitchen-safety')
    }
  }, [config, nursery, navigate])

  const items = config?.items || []
  const units = kitchenSafety.defaultUnits

  // Safety check: if index goes out of bounds, advance to next phase
  useEffect(() => {
    if (phase === 'checks' && currentIndex >= items.length && items.length > 0) {
      if (config?.includeTemps) {
        setPhase('temps')
      } else if (config?.includeWeeklyProbe) {
        setPhase('weekly')
      } else if (config?.includeMonthlyCalibration) {
        setPhase('monthly')
      } else {
        setPhase('summary')
      }
    }
    setIsProcessing(false)
  }, [currentIndex, items.length, phase, config])

  if (!config || !nursery) {
    return null
  }

  const currentItem = items[currentIndex]

  // Handle swipe actions with guard against double-processing
  const handlePass = () => {
    if (isProcessing || !currentItem) return
    setIsProcessing(true)
    setResponses(prev => ({ ...prev, [currentItem.id]: 'pass' }))
    advanceToNext()
  }

  const handleFail = (note) => {
    if (isProcessing || !currentItem) return
    setIsProcessing(true)
    setResponses(prev => ({ ...prev, [currentItem.id]: 'fail' }))
    if (note) setNotes(prev => ({ ...prev, [currentItem.id]: note }))
    advanceToNext()
  }

  const handleNA = () => {
    if (isProcessing || !currentItem) return
    setIsProcessing(true)
    setResponses(prev => ({ ...prev, [currentItem.id]: 'na' }))
    advanceToNext()
  }

  const advanceToNext = () => {
    if (currentIndex < items.length - 1) {
      setCurrentIndex(prev => Math.min(prev + 1, items.length - 1))
    } else {
      // Move to next phase
      if (config.includeTemps) {
        setPhase('temps')
      } else if (config.includeWeeklyProbe) {
        setPhase('weekly')
      } else if (config.includeMonthlyCalibration) {
        setPhase('monthly')
      } else {
        setPhase('summary')
      }
    }
  }

  const handleTempChange = (unitId, value) => {
    setTemperatures(prev => ({
      ...prev,
      [unitId]: { ...prev[unitId], [config.tempType]: value }
    }))
  }

  const handleTempSubmit = () => {
    if (config.includeWeeklyProbe && phase === 'temps') {
      setPhase('weekly')
    } else if (config.includeMonthlyCalibration && phase !== 'monthly') {
      setPhase('monthly')
    } else {
      setPhase('summary')
    }
  }

  const handleComplete = () => {
    // Navigate back to main kitchen safety page
    navigate('/kitchen-safety', {
      state: {
        completedSection: sectionId,
        sectionData: {
          responses,
          notes,
          temperatures,
          deliveryData,
          completedAt: new Date().toISOString(),
          completedBy,
        }
      }
    })
  }

  const validateTemp = (temp, unitType) => {
    const t = parseFloat(temp)
    if (isNaN(t)) return null
    if (unitType === 'fridge') {
      return t <= kitchenSafety.tempThresholds.fridgeMax ? 'pass' : 'fail'
    }
    if (unitType === 'freezer') {
      return t <= kitchenSafety.tempThresholds.freezerMax ? 'pass' : 'fail'
    }
    return null
  }

  // Render temperature entry phase
  if (phase === 'temps') {
    return (
      <div className="min-h-screen bg-hop-pebble">
        <Header
          title={`${config.tempType === 'opening' ? 'Opening' : 'Closing'} Temps`}
          subtitle="Fridge & Freezer"
          showBack
          onBack={() => setPhase('checks')}
        />

        <div className="px-4 py-6 max-w-md mx-auto">
          <Card className="mb-4">
            <p className="text-sm text-gray-600 mb-4">
              Record the temperature of each unit. Fridges must be ≤5°C, Freezers ≤-18°C.
            </p>

            <div className="space-y-4">
              {units.map((unit) => {
                const temp = temperatures[unit.id]?.[config.tempType] || ''
                const validation = validateTemp(temp, unit.type)

                return (
                  <div key={unit.id} className="flex items-center gap-3">
                    <div className="flex-1">
                      <label className="block text-sm font-medium text-hop-forest mb-1">
                        {unit.name}
                        <span className="text-gray-400 font-normal ml-1">
                          ({unit.type === 'fridge' ? '≤5°C' : '≤-18°C'})
                        </span>
                      </label>
                      <div className="relative">
                        <input
                          type="number"
                          step="0.1"
                          value={temp}
                          onChange={(e) => handleTempChange(unit.id, e.target.value)}
                          placeholder="0.0"
                          className={`
                            w-full px-4 py-3 pr-12 rounded-lg border-2 text-lg font-medium
                            ${validation === 'fail'
                              ? 'border-hop-marmalade-dark bg-hop-marmalade/10'
                              : validation === 'pass'
                              ? 'border-hop-apple bg-hop-apple/10'
                              : 'border-gray-200'
                            }
                          `}
                        />
                        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500">
                          °C
                        </span>
                      </div>
                    </div>
                    {validation && (
                      <div className={`
                        w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0
                        ${validation === 'pass' ? 'bg-hop-apple' : 'bg-hop-marmalade-dark'}
                      `}>
                        {validation === 'pass' ? (
                          <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                          </svg>
                        ) : (
                          <span className="text-white font-bold">!</span>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </Card>

          <Button
            color="marmalade"
            size="large"
            fullWidth
            onClick={handleTempSubmit}
            disabled={units.some(u => !temperatures[u.id]?.[config.tempType])}
          >
            Continue
          </Button>
        </div>
      </div>
    )
  }

  // Render weekly probe check
  if (phase === 'weekly') {
    return (
      <div className="min-h-screen bg-hop-pebble">
        <Header
          title="Weekly Probe Check"
          subtitle="Use probe thermometer on all units"
          showBack
          onBack={() => setPhase('temps')}
        />

        <div className="px-4 py-6 max-w-md mx-auto">
          <Card className="mb-4">
            <p className="text-sm text-gray-600 mb-4">
              Use a clean disinfected probe thermometer between packs or inserted into food. Mark with 'P' when done.
            </p>

            <div className="space-y-3">
              {units.map((unit) => {
                const checked = temperatures[unit.id]?.probeChecked

                return (
                  <button
                    key={unit.id}
                    onClick={() => setTemperatures(prev => ({
                      ...prev,
                      [unit.id]: { ...prev[unit.id], probeChecked: !checked }
                    }))}
                    className={`
                      w-full p-4 rounded-lg border-2 flex items-center justify-between
                      ${checked ? 'border-hop-apple bg-hop-apple/10' : 'border-gray-200 bg-white'}
                    `}
                  >
                    <span className="font-medium text-hop-forest">{unit.name}</span>
                    <span className={`
                      w-8 h-8 rounded-full flex items-center justify-center font-bold
                      ${checked ? 'bg-hop-apple text-white' : 'bg-gray-100 text-gray-400'}
                    `}>
                      P
                    </span>
                  </button>
                )
              })}
            </div>
          </Card>

          <Button
            color="marmalade"
            size="large"
            fullWidth
            onClick={() => config.includeMonthlyCalibration ? setPhase('monthly') : setPhase('summary')}
            disabled={!units.every(u => temperatures[u.id]?.probeChecked)}
          >
            Continue
          </Button>
        </div>
      </div>
    )
  }

  // Render monthly calibration check
  if (phase === 'monthly') {
    const boilingTemp = temperatures.calibration?.boiling || ''
    const icedTemp = temperatures.calibration?.iced || ''
    const boilingValid = boilingTemp && parseFloat(boilingTemp) >= 99 && parseFloat(boilingTemp) <= 101
    const icedValid = icedTemp && parseFloat(icedTemp) >= -1 && parseFloat(icedTemp) <= 1

    return (
      <div className="min-h-screen bg-hop-pebble">
        <Header
          title="Monthly Calibration"
          subtitle="Probe thermometer check"
          showBack
          onBack={() => setPhase('weekly')}
        />

        <div className="px-4 py-6 max-w-md mx-auto">
          <Card className="mb-4">
            <p className="text-sm text-gray-600 mb-4">
              Check probe in boiling water (99-101°C) and iced water (-1 to +1°C).
            </p>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-hop-forest mb-1">
                  Boiling water test
                  <span className="text-gray-400 font-normal ml-1">(99-101°C)</span>
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.1"
                    value={boilingTemp}
                    onChange={(e) => setTemperatures(prev => ({
                      ...prev,
                      calibration: { ...prev.calibration, boiling: e.target.value }
                    }))}
                    placeholder="100.0"
                    className={`
                      w-full px-4 py-3 pr-12 rounded-lg border-2 text-lg font-medium
                      ${boilingTemp && (boilingValid ? 'border-hop-apple bg-hop-apple/10' : 'border-hop-marmalade-dark bg-hop-marmalade/10')}
                      ${!boilingTemp && 'border-gray-200'}
                    `}
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500">°C</span>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-hop-forest mb-1">
                  Iced water test
                  <span className="text-gray-400 font-normal ml-1">(-1 to +1°C)</span>
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.1"
                    value={icedTemp}
                    onChange={(e) => setTemperatures(prev => ({
                      ...prev,
                      calibration: { ...prev.calibration, iced: e.target.value }
                    }))}
                    placeholder="0.0"
                    className={`
                      w-full px-4 py-3 pr-12 rounded-lg border-2 text-lg font-medium
                      ${icedTemp && (icedValid ? 'border-hop-apple bg-hop-apple/10' : 'border-hop-marmalade-dark bg-hop-marmalade/10')}
                      ${!icedTemp && 'border-gray-200'}
                    `}
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500">°C</span>
                </div>
              </div>
            </div>
          </Card>

          <Button
            color="marmalade"
            size="large"
            fullWidth
            onClick={() => setPhase('summary')}
            disabled={!boilingTemp || !icedTemp}
          >
            Continue
          </Button>
        </div>
      </div>
    )
  }

  // Render summary
  if (phase === 'summary') {
    const passCount = Object.values(responses).filter(r => r === 'pass').length
    const failCount = Object.values(responses).filter(r => r === 'fail').length
    const failedItems = items.filter(item => responses[item.id] === 'fail')

    return (
      <div className="min-h-screen bg-hop-pebble">
        <Header
          title="Section Complete"
          subtitle={config.title}
          showBack
          onBack={() => setPhase('checks')}
        />

        <div className="px-4 py-6 max-w-md mx-auto">
          <Card className="mb-6">
            <div className="text-center mb-4">
              <div className="w-16 h-16 bg-hop-apple rounded-full flex items-center justify-center mx-auto mb-3">
                <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h2 className="font-display text-xl text-hop-forest font-semibold">
                {config.title} Complete
              </h2>
              <p className="text-gray-500 text-sm">{formatTime()}</p>
            </div>

            {items.length > 0 && (
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="text-center p-3 bg-hop-apple/10 rounded-lg">
                  <div className="text-2xl font-bold text-hop-apple">{passCount}</div>
                  <div className="text-sm text-gray-500">Passed</div>
                </div>
                <div className="text-center p-3 bg-hop-marmalade/10 rounded-lg">
                  <div className="text-2xl font-bold text-hop-marmalade-dark">{failCount}</div>
                  <div className="text-sm text-gray-500">Issues</div>
                </div>
              </div>
            )}

            {failedItems.length > 0 && (
              <div className="border-t pt-4">
                <p className="text-sm font-medium text-hop-marmalade-dark mb-2">Issues to address:</p>
                <ul className="text-sm space-y-1">
                  {failedItems.map(item => (
                    <li key={item.id} className="text-gray-600">
                      • {item.text}
                      {notes[item.id] && <span className="block text-xs text-gray-400 ml-3">{notes[item.id]}</span>}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </Card>

          <Button
            color="marmalade"
            size="large"
            fullWidth
            onClick={handleComplete}
          >
            Done
          </Button>
        </div>
      </div>
    )
  }

  // Render delivery section (special flow)
  if (config.isDeliverySection) {
    return (
      <div className="min-h-screen bg-hop-pebble">
        <Header
          title={config.title}
          subtitle={config.subtitle}
          showBack
        />

        <div className="px-4 py-6 max-w-md mx-auto">
          <div className="space-y-4">
            {/* Packed Lunches */}
            <Card>
              <h3 className="font-medium text-hop-forest mb-3">Packed Lunch Visual Checks</h3>
              <div className="space-y-2">
                {kitchenSafety.packedLunchChecks.map((check) => {
                  const value = deliveryData.packedLunch?.[check.id]
                  return (
                    <div key={check.id} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                      <span className="text-sm text-gray-700">{check.text}</span>
                      <div className="flex gap-2">
                        <button
                          onClick={() => setDeliveryData(prev => ({
                            ...prev,
                            packedLunch: { ...prev.packedLunch, [check.id]: 'yes' }
                          }))}
                          className={`px-3 py-1 rounded text-sm font-medium ${
                            value === 'yes' ? 'bg-hop-apple text-white' : 'bg-white border text-gray-600'
                          }`}
                        >
                          Yes
                        </button>
                        <button
                          onClick={() => setDeliveryData(prev => ({
                            ...prev,
                            packedLunch: { ...prev.packedLunch, [check.id]: 'no' }
                          }))}
                          className={`px-3 py-1 rounded text-sm font-medium ${
                            value === 'no' ? 'bg-hop-marmalade-dark text-white' : 'bg-white border text-gray-600'
                          }`}
                        >
                          No
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            </Card>

            {/* Little Tums */}
            <Card>
              <h3 className="font-medium text-hop-forest mb-3">Little Tums Food Temps</h3>
              <p className="text-xs text-gray-500 mb-3">Hot ≥63°C, Cold ≤8°C</p>
              <div className="space-y-3">
                {kitchenSafety.littleTumsItems.map((item) => {
                  const temp = deliveryData.littleTums?.[item.id]?.temp || ''
                  const threshold = item.type === 'hot' ? 63 : 8
                  const isValid = item.type === 'hot'
                    ? parseFloat(temp) >= threshold
                    : parseFloat(temp) <= threshold

                  return (
                    <div key={item.id}>
                      <label className="block text-sm text-gray-700 mb-1">{item.label}</label>
                      <div className="flex gap-2">
                        <div className="relative flex-1">
                          <input
                            type="number"
                            step="0.1"
                            value={temp}
                            onChange={(e) => setDeliveryData(prev => ({
                              ...prev,
                              littleTums: {
                                ...prev.littleTums,
                                [item.id]: { temp: e.target.value, time: new Date().toISOString() }
                              }
                            }))}
                            placeholder={item.type === 'hot' ? '≥63' : '≤8'}
                            className={`
                              w-full px-3 py-2 pr-10 rounded-lg border-2 text-sm
                              ${temp && (isValid ? 'border-hop-apple' : 'border-hop-marmalade-dark')}
                              ${!temp && 'border-gray-200'}
                            `}
                          />
                          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">°C</span>
                        </div>
                        <button
                          onClick={() => setDeliveryData(prev => ({
                            ...prev,
                            littleTums: {
                              ...prev.littleTums,
                              [item.id]: { ...prev.littleTums?.[item.id], skipped: true }
                            }
                          }))}
                          className="px-3 py-2 border-2 border-gray-200 rounded-lg text-sm text-gray-500"
                        >
                          N/A
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            </Card>

            <Button
              color="marmalade"
              size="large"
              fullWidth
              onClick={() => setPhase('summary')}
            >
              Complete Deliveries
            </Button>
          </div>
        </div>
      </div>
    )
  }

  // Render sign-off section
  if (config.isSignoff) {
    return (
      <div className="min-h-screen bg-hop-pebble">
        <Header
          title={config.title}
          subtitle={config.subtitle}
          showBack
        />

        <div className="px-4 py-6 max-w-md mx-auto">
          <Card className="mb-6">
            <h3 className="font-medium text-hop-forest mb-4">Manager Confirmation</h3>
            <p className="text-sm text-gray-600 mb-4">
              I confirm the Kitchen Daily Food Safety Diary has been properly completed and any identified problems have been noted/addressed.
            </p>

            <Input
              label="Manager name"
              value={responses.managerName || ''}
              onChange={(val) => setResponses(prev => ({ ...prev, managerName: val }))}
              placeholder="Enter manager name"
            />
          </Card>

          <Button
            color="marmalade"
            size="large"
            fullWidth
            onClick={handleComplete}
            disabled={!responses.managerName?.trim()}
          >
            Sign Off & Complete
          </Button>
        </div>
      </div>
    )
  }

  // Render swipe card flow for checks
  // Guard against rendering with invalid index
  if (!currentItem && items.length > 0) {
    return (
      <div className="min-h-screen bg-hop-pebble flex items-center justify-center">
        <p className="text-gray-500">Loading...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-hop-pebble flex flex-col">
      <Header
        title={config.title}
        subtitle={`${Math.min(currentIndex + 1, items.length)} of ${items.length}`}
        showBack
        onBack={currentIndex > 0 ? () => { setIsProcessing(false); setCurrentIndex(prev => prev - 1) } : undefined}
      />

      <div className="flex-1 flex items-center justify-center">
        {currentItem && (
          <SwipeCard
            item={currentItem}
            currentIndex={currentIndex}
            totalCount={items.length}
            onPass={handlePass}
            onFail={handleFail}
            onNA={handleNA}
            onNoteChange={(note) => setNotes(prev => ({ ...prev, [currentItem.id]: note }))}
            note={notes[currentItem.id] || ''}
            color="hop-marmalade"
          />
        )}
      </div>
    </div>
  )
}
