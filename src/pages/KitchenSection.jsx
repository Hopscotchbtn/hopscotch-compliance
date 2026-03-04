import { useState, useEffect, useRef } from 'react'
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
    case 'packedLunch':
      return {
        title: 'Packed Lunches',
        subtitle: 'Visual check',
        items: [],
        isPackedLunchOnly: true,
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

function SignoffSection({ config, responses, setResponses, onBack, onComplete }) {
  const canvasRef = useRef(null)
  const drawing = useRef(false)
  const [hasSig, setHasSig] = useState(false)

  const getPos = (e, canvas) => {
    const rect = canvas.getBoundingClientRect()
    const src = e.touches ? e.touches[0] : e
    return { x: src.clientX - rect.left, y: src.clientY - rect.top }
  }

  const startDraw = (e) => {
    e.preventDefault()
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    const pos = getPos(e, canvas)
    ctx.beginPath()
    ctx.moveTo(pos.x, pos.y)
    drawing.current = true
  }

  const draw = (e) => {
    e.preventDefault()
    if (!drawing.current) return
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    ctx.strokeStyle = '#1a3a2a'
    ctx.lineWidth = 2.5
    ctx.lineCap = 'round'
    const pos = getPos(e, canvas)
    ctx.lineTo(pos.x, pos.y)
    ctx.stroke()
    setHasSig(true)
  }

  const endDraw = () => { drawing.current = false }

  const clearSig = () => {
    const canvas = canvasRef.current
    canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height)
    setHasSig(false)
  }

  const isValid = responses.managerName?.trim() && hasSig

  return (
    <div className="min-h-screen bg-hop-pebble">
      <Header title={config.title} subtitle={config.subtitle} showBack onBack={onBack} />
      <div className="px-4 py-6 max-w-md mx-auto space-y-4">
        <Card className="space-y-5">
          <div>
            <h3 className="font-medium text-hop-forest mb-2">Manager Confirmation</h3>
            <p className="text-sm text-gray-600">
              I confirm the Kitchen Daily Food Safety Diary has been properly completed and any identified problems have been noted/addressed.
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-hop-forest mb-2">Comments</label>
            <textarea
              value={responses.managerComments || ''}
              onChange={(e) => setResponses(prev => ({ ...prev, managerComments: e.target.value }))}
              placeholder="Any notes or issues to record..."
              rows={3}
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg text-hop-forest text-sm font-body focus:outline-none focus:border-hop-forest resize-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-hop-forest mb-2">
              Manager initials <span className="text-hop-marmalade-dark">*</span>
            </label>
            <input
              type="text"
              value={responses.managerName || ''}
              onChange={(e) => setResponses(prev => ({ ...prev, managerName: e.target.value }))}
              placeholder="e.g. PF"
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg text-hop-forest text-base font-body focus:outline-none focus:border-hop-forest"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-hop-forest">
                Signature <span className="text-hop-marmalade-dark">*</span>
              </label>
              {hasSig && (
                <button onClick={clearSig} className="text-xs text-gray-400 hover:text-hop-marmalade-dark underline">
                  Clear
                </button>
              )}
            </div>
            <canvas
              ref={canvasRef}
              width={340}
              height={120}
              onMouseDown={startDraw}
              onMouseMove={draw}
              onMouseUp={endDraw}
              onMouseLeave={endDraw}
              onTouchStart={startDraw}
              onTouchMove={draw}
              onTouchEnd={endDraw}
              className="w-full border-2 border-gray-200 rounded-lg bg-white touch-none"
              style={{ height: '120px' }}
            />
            {!hasSig && (
              <p className="text-xs text-gray-400 mt-1">Sign above with your finger or mouse</p>
            )}
          </div>
        </Card>

        <Button
          color="marmalade"
          size="large"
          fullWidth
          onClick={() => {
            const sig = canvasRef.current.toDataURL('image/png')
            onComplete({ managerSignature: sig })
          }}
          disabled={!isValid}
        >
          Sign Off & Complete
        </Button>
      </div>
    </div>
  )
}

export function KitchenSection() {
  const { sectionId } = useParams()
  const location = useLocation()
  const navigate = useNavigate()

  const { nursery, completedBy, section, sectionData: allSectionData, completedSections } = location.state || {}
  const config = getSectionConfig(sectionId)

  const savedData = allSectionData?.[sectionId] || {}
  const isAlreadyCompleted = !!completedSections?.[sectionId]

  const [phase, setPhase] = useState(() => {
    if (isAlreadyCompleted && config && !config.isPackedLunchOnly && !config.isDeliverySection && !config.isSignoff) {
      return 'summary'
    }
    return 'checks'
  })
  const [currentIndex, setCurrentIndex] = useState(0)
  const [responses, setResponses] = useState(savedData.responses || {})
  const [notes, setNotes] = useState(savedData.notes || {})
  const [temperatures, setTemperatures] = useState(savedData.temperatures || {})
  const [deliveryData, setDeliveryData] = useState(savedData.deliveryData || {})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [signedBy, setSignedBy] = useState(savedData.completedBy || '')

  // Redirect if missing data
  useEffect(() => {
    if (!config || !nursery) {
      navigate(-1)
    }
  }, [config, nursery, navigate])

  if (!config || !nursery) {
    return null
  }

  const isHolidayClub = section === 'holiday-club'

  const goBackToSections = () => navigate('/kitchen-safety', {
    replace: true,
    state: { returnedSection: section, skipSetup: true },
  })

  const handleComplete = (extraData = {}) => {
    navigate('/kitchen-safety', {
      replace: true,
      state: {
        completedSection: sectionId,
        returnedSection: section,
        sectionData: {
          responses,
          notes,
          temperatures,
          deliveryData,
          completedAt: new Date().toISOString(),
          completedBy: signedBy || completedBy,
          ...extraData,
        }
      }
    })
  }

  // Holiday club opening/closing fridge check — three fridges
  if ((sectionId === 'opening' || sectionId === 'closing') && isHolidayClub) {
    const isOpening = sectionId === 'opening'
    const tempLabel = isOpening ? 'Opening temperature' : 'Closing temperature'
    const fridges = [1, 2, 3]
    const fridge1Name = temperatures.fridge1?.name || ''
    const fridge1Temp = temperatures.fridge1?.temp || ''
    const isValid = fridge1Temp !== '' && signedBy.trim()

    return (
      <div className="min-h-screen bg-hop-pebble">
        <Header title={isOpening ? 'Opening Fridge Check' : 'Closing Fridge Check'} showBack onBack={goBackToSections} />
        <div className="px-4 py-6 max-w-md mx-auto space-y-4">
          {fridges.map((n) => {
            const key = `fridge${n}`
            const name = temperatures[key]?.name || ''
            const temp = temperatures[key]?.temp || ''
            const required = n === 1
            return (
              <Card key={key} className="space-y-4">
                <p className="font-medium text-hop-forest">
                  Fridge {n} {required && <span className="text-hop-marmalade-dark text-sm">*</span>}
                  {!required && <span className="text-gray-400 text-sm font-normal"> (optional)</span>}
                </p>
                <div>
                  <label className="block text-sm font-medium text-hop-forest mb-2">Unit number / name</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setTemperatures(prev => ({
                      ...prev,
                      [key]: { ...prev[key], name: e.target.value }
                    }))}
                    placeholder="e.g. Fridge 1"
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg text-hop-forest text-base font-body focus:outline-none focus:border-hop-forest"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-hop-forest mb-2">{tempLabel}</label>
                  <div className="relative">
                    <input
                      type="text"
                      inputMode="decimal"
                      value={temp}
                      onChange={(e) => setTemperatures(prev => ({
                        ...prev,
                        [key]: { ...prev[key], temp: e.target.value }
                      }))}
                      placeholder="0.0"
                      className="w-full px-4 py-3 pr-12 border-2 border-gray-200 rounded-lg text-hop-forest text-lg font-body focus:outline-none focus:border-hop-forest"
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 text-base">°C</span>
                  </div>
                </div>
              </Card>
            )
          })}

          <Card>
            <label className="block text-sm font-medium text-hop-forest mb-2">
              Your initials <span className="text-hop-marmalade-dark">*</span>
            </label>
            <input
              type="text"
              value={signedBy}
              onChange={(e) => setSignedBy(e.target.value)}
              placeholder="e.g. PF"
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg text-hop-forest text-base font-body focus:outline-none focus:border-hop-forest"
            />
          </Card>

          <Button color="marmalade" size="large" fullWidth disabled={!isValid} onClick={() => handleComplete()}>
            Complete
          </Button>
        </div>
      </div>
    )
  }

  const items = config.items || []
  const units = kitchenSafety.defaultUnits
  const currentItem = items[currentIndex]

  // Move to next phase after checks
  const goToNextPhase = () => {
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

  // Handle swipe actions - use response check to prevent double-processing
  const handlePass = () => {
    if (!currentItem || responses[currentItem.id]) return
    setResponses(prev => ({ ...prev, [currentItem.id]: 'pass' }))
    if (currentIndex >= items.length - 1) {
      goToNextPhase()
    } else {
      setCurrentIndex(currentIndex + 1)
    }
  }

  const handleFail = (note) => {
    if (!currentItem || responses[currentItem.id]) return
    setResponses(prev => ({ ...prev, [currentItem.id]: 'fail' }))
    if (note) setNotes(prev => ({ ...prev, [currentItem.id]: note }))
    if (currentIndex >= items.length - 1) {
      goToNextPhase()
    } else {
      setCurrentIndex(currentIndex + 1)
    }
  }

  const handleNA = () => {
    if (!currentItem || responses[currentItem.id]) return
    setResponses(prev => ({ ...prev, [currentItem.id]: 'na' }))
    if (currentIndex >= items.length - 1) {
      goToNextPhase()
    } else {
      setCurrentIndex(currentIndex + 1)
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
                          type="text"
                          inputMode="decimal"
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
                    type="text"
                    inputMode="decimal"
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
                    type="text"
                    inputMode="decimal"
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
          onBack={goBackToSections}
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
              <p className="text-gray-500 text-sm">{formatTime(savedData.completedAt ? new Date(savedData.completedAt) : new Date())}</p>
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

          <Card className="mb-4">
            <label className="block text-sm font-medium text-hop-forest mb-2">
              Your initials <span className="text-hop-marmalade-dark">*</span>
            </label>
            <input
              type="text"
              value={signedBy}
              onChange={(e) => setSignedBy(e.target.value)}
              placeholder="e.g. PF"
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg text-hop-forest text-base font-body focus:outline-none focus:border-hop-forest"
            />
          </Card>

          <Button
            color="marmalade"
            size="large"
            fullWidth
            disabled={!signedBy.trim()}
            onClick={() => handleComplete()}
          >
            Done
          </Button>
        </div>
      </div>
    )
  }

  // Render packed lunch only section (holiday club)
  if (config.isPackedLunchOnly) {
    return (
      <div className="min-h-screen bg-hop-pebble">
        <Header title={config.title} subtitle={config.subtitle} showBack onBack={goBackToSections} />

        <div className="px-4 py-6 max-w-md mx-auto">
          <Card className="mb-4">
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

          <Card className="mb-4">
            <label className="block text-sm font-medium text-hop-forest mb-2">
              Your initials <span className="text-hop-marmalade-dark">*</span>
            </label>
            <input
              type="text"
              value={signedBy}
              onChange={(e) => setSignedBy(e.target.value)}
              placeholder="e.g. PF"
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg text-hop-forest text-base font-body focus:outline-none focus:border-hop-forest"
            />
          </Card>

          <Button color="marmalade" size="large" fullWidth disabled={!signedBy.trim()} onClick={() => handleComplete()}>
            Complete
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
                            type="text"
                            inputMode="decimal"
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
    return <SignoffSection config={config} responses={responses} setResponses={setResponses} onBack={goBackToSections} onComplete={handleComplete} />
  }

  // Render swipe card flow for checks
  return (
    <div className="min-h-screen bg-hop-pebble flex flex-col">
      <Header
        title={config.title}
        subtitle={`${currentIndex + 1} of ${items.length}`}
        showBack
        onBack={currentIndex > 0 ? () => {
          const prevIndex = currentIndex - 1
          // Clear response so user can re-answer
          const prevItem = items[prevIndex]
          if (prevItem) {
            setResponses(prev => {
              const next = { ...prev }
              delete next[prevItem.id]
              return next
            })
          }
          setCurrentIndex(prevIndex)
        } : goBackToSections}
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
