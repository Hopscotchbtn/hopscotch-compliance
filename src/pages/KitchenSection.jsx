import { useState, useEffect, useRef } from 'react'
import { useParams, useLocation, useNavigate } from 'react-router-dom'
import { Header } from '../components/Header'
import { SwipeCard } from '../components/SwipeCard'
import { Card } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { kitchenSafety, isMonday, isFirstOfMonth } from '../data/checklists'

const getPackedLunchChecks = (isHolidayClub) =>
  isHolidayClub ? kitchenSafety.packedLunchChecks : kitchenSafety.nurseryPackedLunchChecks
import { formatTime } from '../lib/utils'
import { storage } from '../lib/storage'
import { saveLittleTumsData, getTodayLittleTumsData } from '../lib/supabase'

const OPENING_CHECKS = [
  { id: 1, text: 'Hot water in place' },
  { id: 2, text: 'Handwash facilities in place' },
  { id: 3, text: 'Clean cloths in place' },
  { id: 4, text: 'Sanitiser in place' },
  { id: 5, text: 'No food left out' },
  { id: 6, text: 'All foods in date' },
  { id: 7, text: 'Equipment OK' },
  { id: 8, text: 'Probe thermometer available and working' },
  { id: 9, text: 'Staff fit, well and in uniform' },
]

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
    case 'littleTums':
      return {
        title: 'Little Tums',
        subtitle: 'Nursery meals & tea',
        items: [],
        isLittleTums: true,
      }
    case 'sterilisation':
      return {
        title: 'Sterilisation Equipment & Feeding Bottle Checks',
        subtitle: 'Morning & afternoon checks',
        items: [],
        isSterilisation: true,
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
    case 'reheatTemp':
      return { title: 'Reheated Food Temperature Check', subtitle: 'Daily check', items: [], isReheatTemp: true }
    case 'probeCheck':
      return { title: 'Probe Thermometer Check', subtitle: 'Weekly check', items: [] }
    case 'supermarketTemp':
      return { title: 'Supermarket Food Temperatures', subtitle: 'Weekly check', items: [] }
    case 'probeCalibration':
      return { title: 'Probe Calibration Check', subtitle: 'Monthly check', items: [] }
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

  const { nursery, room, completedBy, section, sectionData: allSectionData, completedSections } = location.state || {}
  const config = getSectionConfig(sectionId)

  const isHolidayClub = section === 'holiday-club'

  const savedData = allSectionData?.[sectionId] || {}
  const isAlreadyCompleted = !!completedSections?.[sectionId]

  const [phase, setPhase] = useState(() => {
    if (isAlreadyCompleted && config && !config.isPackedLunchOnly && !config.isDeliverySection && !config.isSignoff && !config.isLittleTums && !config.isReheatTemp && !config.isSterilisation) {
      return 'summary'
    }
    if (config?.isLittleTums) return 'ltMenu'
    if (config?.isSterilisation) return 'sterilMenu'
    if (isHolidayClub && (sectionId === 'opening' || sectionId === 'closing')) return 'temps'
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

  // Load Little Tums data from Supabase for cross-device sync
  useEffect(() => {
    if (!config?.isLittleTums || !nursery) return
    getTodayLittleTumsData(nursery, room).then(remoteData => {
      if (remoteData) {
        setDeliveryData(prev => ({ ...remoteData, ...prev }))
      }
    }).catch(() => {})
  }, [])

  if (!config || !nursery) {
    return null
  }

  // Holiday club does not have weekly/monthly probe checks
  if (isHolidayClub) {
    config.includeWeeklyProbe = false
    config.includeMonthlyCalibration = false
  }

  if (!isHolidayClub && sectionId === 'signoff') {
    config.title = 'Manager/Room Lead Sign-off'
  }

  const goBackToSections = () => navigate('/kitchen-safety', {
    replace: true,
    state: { returnedSection: section, skipSetup: true, room },
  })

  const handleComplete = (extraData = {}) => {
    navigate('/kitchen-safety', {
      replace: true,
      state: {
        completedSection: sectionId,
        returnedSection: section,
        room,
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

  // Opening section — checklist first, then fridge temps
  if (sectionId === 'opening') {
    if (phase === 'checks') {
      return (
        <div className="min-h-screen bg-hop-pebble">
          <Header title="Opening Checks" subtitle="Confirm all items are in place" showBack onBack={goBackToSections} />
          <div className="px-4 py-6 max-w-md mx-auto space-y-4">
            <Card className="space-y-2">
              <p className="font-medium text-hop-forest pb-1">Confirm all items are in place</p>
              {OPENING_CHECKS.map(item => (
                <div key={item.id} className="flex items-center gap-3 p-3">
                  <span className="text-hop-marmalade font-bold text-sm flex-shrink-0">•</span>
                  <span className="text-sm text-hop-forest">{item.text}</span>
                </div>
              ))}
            </Card>

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

            <Button
              color="marmalade"
              size="large"
              fullWidth
              disabled={!signedBy.trim()}
              onClick={() => {
                const key = room ? `${nursery}::${room}` : nursery
                const existing = storage.getKitchenSafetyState(key)
                storage.setKitchenSafetyState(key, existing?.completedSections || {}, {
                  ...(existing?.sectionData || {}),
                  opening: { responses, notes, temperatures, signedBy },
                })
                setPhase('temps')
              }}
            >
              Continue to Fridge Temperatures
            </Button>
          </div>
        </div>
      )
    }

    // phase === 'temps' (or 'summary' if returning) — fridge temp entry
    const fridge1Temp = temperatures.fridge1?.temp || ''
    const isValid = fridge1Temp !== '' && signedBy.trim()
    return (
      <div className="min-h-screen bg-hop-pebble">
        <Header title={isHolidayClub ? 'Opening Fridge Checks' : 'Opening Kitchen Checks'} showBack onBack={() => isHolidayClub ? goBackToSections() : setPhase('checks')} />
        <div className="px-4 py-6 max-w-md mx-auto space-y-4">
          {[1, 2, 3].map((n) => {
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
                    onChange={(e) => setTemperatures(prev => ({ ...prev, [key]: { ...prev[key], name: e.target.value } }))}
                    placeholder="e.g. Fridge 1"
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg text-hop-forest text-base font-body focus:outline-none focus:border-hop-forest"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-hop-forest mb-2">Opening temperature</label>
                  <div className="relative">
                    <input
                      type="text"
                      inputMode="decimal"
                      value={temp}
                      onChange={(e) => setTemperatures(prev => ({ ...prev, [key]: { ...prev[key], temp: e.target.value } }))}
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

  // Closing section — checklist then fridge temps
  if (sectionId === 'closing') {
    if (phase === 'checks') {
      return (
        <div className="min-h-screen bg-hop-pebble">
          <Header title="Closing Checks" subtitle="Confirm all items are complete" showBack onBack={goBackToSections} />
          <div className="px-4 py-6 max-w-md mx-auto space-y-4">
            <Card className="space-y-2">
              <p className="font-medium text-hop-forest pb-1">Confirm all items are in place</p>
              {kitchenSafety.closingChecks.map(item => (
                <div key={item.id} className="flex items-center gap-3 p-3">
                  <span className="text-hop-marmalade font-bold text-sm flex-shrink-0">•</span>
                  <span className="text-sm text-hop-forest">{item.text}</span>
                </div>
              ))}
            </Card>

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

            <Button
              color="marmalade"
              size="large"
              fullWidth
              disabled={!signedBy.trim()}
              onClick={() => {
                const key = room ? `${nursery}::${room}` : nursery
                const existing = storage.getKitchenSafetyState(key)
                storage.setKitchenSafetyState(key, existing?.completedSections || {}, {
                  ...(existing?.sectionData || {}),
                  closing: { responses, notes, temperatures, signedBy },
                })
                setPhase('temps')
              }}
            >
              Continue to Fridge Temperatures
            </Button>
          </div>
        </div>
      )
    }

    // Fridge temp entry
    const fridge1Temp = temperatures.fridge1?.temp || ''
    const isValid = fridge1Temp !== '' && signedBy.trim()
    return (
      <div className="min-h-screen bg-hop-pebble">
        <Header title={isHolidayClub ? 'Closing Fridge Checks' : 'Closing Kitchen Check'} showBack onBack={() => isHolidayClub ? goBackToSections() : setPhase('checks')} />
        <div className="px-4 py-6 max-w-md mx-auto space-y-4">
          {[1, 2, 3].map((n) => {
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
                    onChange={(e) => setTemperatures(prev => ({ ...prev, [key]: { ...prev[key], name: e.target.value } }))}
                    placeholder="e.g. Fridge 1"
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg text-hop-forest text-base font-body focus:outline-none focus:border-hop-forest"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-hop-forest mb-2">Closing temperature</label>
                  <div className="relative">
                    <input
                      type="text"
                      inputMode="decimal"
                      value={temp}
                      onChange={(e) => setTemperatures(prev => ({ ...prev, [key]: { ...prev[key], temp: e.target.value } }))}
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

  // ── Reheated Food Temperature Check ───────────────────────────────────────
  if (sectionId === 'reheatTemp') {
    const entries = deliveryData.reheatEntries || [{ foodName: '', childInitials: '', temp: '', checkerInitials: '' }]

    const updateEntry = (index, field, value) => {
      const updated = entries.map((e, i) => i === index ? { ...e, [field]: value } : e)
      setDeliveryData(prev => ({ ...prev, reheatEntries: updated }))
    }

    const addEntry = () => {
      if (entries.length >= 10) return
      setDeliveryData(prev => ({
        ...prev,
        reheatEntries: [...entries, { foodName: '', childInitials: '', temp: '', checkerInitials: '' }],
      }))
    }

    const isValid = entries.some(e => e.foodName.trim() && e.temp !== '' && e.checkerInitials.trim())

    return (
      <div className="min-h-screen bg-hop-pebble">
        <Header title="Reheated Food Temperature Check" subtitle="Daily check" showBack onBack={goBackToSections} />
        <div className="px-4 py-6 max-w-md mx-auto space-y-4">
          <div className="bg-hop-freshair/30 border border-hop-freshair rounded-xl px-4 py-3">
            <p className="text-sm text-hop-forest">
              Check the core temperature of all reheated food brought in for children. All food must reach a core temperature of <span className="font-semibold">75°C or above</span> before serving.
            </p>
          </div>

          {entries.map((entry, index) => (
            <Card key={index} className="space-y-4">
              <p className="font-medium text-hop-forest">Food {index + 1}</p>
              <div>
                <label className="block text-sm font-medium text-hop-forest mb-2">Name of food <span className="text-hop-marmalade-dark">*</span></label>
                <input
                  type="text"
                  value={entry.foodName}
                  onChange={(e) => updateEntry(index, 'foodName', e.target.value)}
                  placeholder="e.g. Chicken pasta"
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg text-hop-forest text-base font-body focus:outline-none focus:border-hop-forest"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-hop-forest mb-2">Child's initials</label>
                <input
                  type="text"
                  value={entry.childInitials}
                  onChange={(e) => updateEntry(index, 'childInitials', e.target.value)}
                  placeholder="e.g. JD"
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg text-hop-forest text-base font-body focus:outline-none focus:border-hop-forest"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-hop-forest mb-2">Core temperature <span className="text-hop-marmalade-dark">*</span></label>
                <div className="relative">
                  <input
                    type="text"
                    inputMode="decimal"
                    value={entry.temp}
                    onChange={(e) => updateEntry(index, 'temp', e.target.value)}
                    placeholder="0.0"
                    className={`w-full px-4 py-3 pr-12 border-2 rounded-lg text-hop-forest text-lg font-body focus:outline-none focus:border-hop-forest ${
                      entry.temp !== '' && parseFloat(entry.temp) < 75
                        ? 'border-hop-marmalade-dark bg-hop-marmalade/10'
                        : entry.temp !== '' && parseFloat(entry.temp) >= 75
                        ? 'border-hop-apple bg-hop-apple/10'
                        : 'border-gray-200'
                    }`}
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 text-base">°C</span>
                </div>
                {entry.temp !== '' && parseFloat(entry.temp) < 75 && (
                  <p className="text-xs text-hop-marmalade-dark mt-1">Below 75°C — food has not reached a safe temperature</p>
                )}
                {entry.temp !== '' && parseFloat(entry.temp) >= 75 && (
                  <p className="text-xs text-hop-apple mt-1">✓ Safe temperature reached</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-hop-forest mb-2">Checker's initials <span className="text-hop-marmalade-dark">*</span></label>
                <input
                  type="text"
                  value={entry.checkerInitials}
                  onChange={(e) => updateEntry(index, 'checkerInitials', e.target.value)}
                  placeholder="e.g. PF"
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg text-hop-forest text-base font-body focus:outline-none focus:border-hop-forest"
                />
              </div>
            </Card>
          ))}

          {entries.length < 10 && (
            <button
              onClick={addEntry}
              className="w-full py-3 rounded-xl border-2 border-dashed border-gray-300 text-gray-500 hover:border-hop-forest hover:text-hop-forest text-sm font-medium transition-colors"
            >
              + Add another food
            </button>
          )}

          <Button color="marmalade" size="large" fullWidth disabled={!isValid} onClick={() => handleComplete()}>
            Complete
          </Button>
        </div>
      </div>
    )
  }

  // ── Probe Thermometer Check ────────────────────────────────────────────────
  if (sectionId === 'probeCheck') {
    const openingInitials = responses.openingInitials || ''
    const closingInitials = responses.closingInitials || ''
    const openingTemp = temperatures.probeOpening || ''
    const closingTemp = temperatures.probeClosing || ''

    const saveOpening = () => {
      const key = room ? `${nursery}::${room}` : nursery
      const existing = storage.getKitchenSafetyState(key)
      storage.setKitchenSafetyState(key, existing?.completedSections || {}, {
        ...(existing?.sectionData || {}),
        probeCheck: { responses, temperatures },
      })
      setPhase('closing')
    }

    if (phase === 'checks') {
      return (
        <div className="min-h-screen bg-hop-pebble">
          <Header title="Probe Thermometer Check" subtitle="Opening check" showBack onBack={goBackToSections} />
          <div className="px-4 py-6 max-w-md mx-auto space-y-4">
            <div className="bg-hop-freshair/30 border border-hop-freshair rounded-xl px-4 py-3">
              <p className="text-sm text-hop-forest">
                Once a week check all units using a clean disinfected probe thermometer — use between the packs or inserted into food item.
              </p>
            </div>
            <Card className="space-y-4">
              <p className="font-medium text-hop-forest">Opening Check</p>
              <div>
                <label className="block text-sm font-medium text-hop-forest mb-2">Temperature <span className="text-hop-marmalade-dark">*</span></label>
                <div className="relative">
                  <input
                    type="text"
                    inputMode="decimal"
                    value={openingTemp}
                    onChange={(e) => setTemperatures(prev => ({ ...prev, probeOpening: e.target.value }))}
                    placeholder="0.0"
                    className="w-full px-4 py-3 pr-12 border-2 border-gray-200 rounded-lg text-hop-forest text-lg font-body focus:outline-none focus:border-hop-forest"
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 text-base">°C</span>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-hop-forest mb-2">Initials <span className="text-hop-marmalade-dark">*</span></label>
                <input
                  type="text"
                  value={openingInitials}
                  onChange={(e) => setResponses(prev => ({ ...prev, openingInitials: e.target.value }))}
                  placeholder="e.g. PF"
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg text-hop-forest text-base font-body focus:outline-none focus:border-hop-forest"
                />
              </div>
            </Card>
            <Button
              color="marmalade"
              size="large"
              fullWidth
              disabled={!openingTemp.trim() || !openingInitials.trim()}
              onClick={saveOpening}
            >
              Continue to Closing Check
            </Button>
          </div>
        </div>
      )
    }

    // phase === 'closing'
    return (
      <div className="min-h-screen bg-hop-pebble">
        <Header title="Probe Thermometer Check" subtitle="Closing check" showBack onBack={() => setPhase('checks')} />
        <div className="px-4 py-6 max-w-md mx-auto space-y-4">
          <Card className="space-y-4">
            <p className="font-medium text-hop-forest">Closing Check</p>
            <div>
              <label className="block text-sm font-medium text-hop-forest mb-2">Temperature <span className="text-hop-marmalade-dark">*</span></label>
              <div className="relative">
                <input
                  type="text"
                  inputMode="decimal"
                  value={closingTemp}
                  onChange={(e) => setTemperatures(prev => ({ ...prev, probeClosing: e.target.value }))}
                  placeholder="0.0"
                  className="w-full px-4 py-3 pr-12 border-2 border-gray-200 rounded-lg text-hop-forest text-lg font-body focus:outline-none focus:border-hop-forest"
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 text-base">°C</span>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-hop-forest mb-2">Initials <span className="text-hop-marmalade-dark">*</span></label>
              <input
                type="text"
                value={closingInitials}
                onChange={(e) => setResponses(prev => ({ ...prev, closingInitials: e.target.value }))}
                placeholder="e.g. PF"
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg text-hop-forest text-base font-body focus:outline-none focus:border-hop-forest"
              />
            </div>
          </Card>
          <Button
            color="marmalade"
            size="large"
            fullWidth
            disabled={!closingTemp.trim() || !closingInitials.trim()}
            onClick={() => handleComplete()}
          >
            Complete
          </Button>
        </div>
      </div>
    )
  }

  // ── Supermarket Food Temperature Checks ───────────────────────────────────
  if (sectionId === 'supermarketTemp') {
    const entries = deliveryData.supermarketEntries || [
      { food: '', time: '', temp: '', initials: '' },
      { food: '', time: '', temp: '', initials: '' },
    ]

    const updateEntry = (index, field, value) => {
      const updated = entries.map((e, i) => i === index ? { ...e, [field]: value } : e)
      setDeliveryData(prev => ({ ...prev, supermarketEntries: updated }))
    }

    const isValid = entries.some(e => e.food.trim() && e.initials.trim() && e.temp !== '')

    return (
      <div className="min-h-screen bg-hop-pebble">
        <Header title="Supermarket Food Temperatures" subtitle="Weekly check" showBack onBack={goBackToSections} />
        <div className="px-4 py-6 max-w-md mx-auto space-y-4">
          <div className="bg-hop-freshair/30 border border-hop-freshair rounded-xl px-4 py-3">
            <p className="text-base text-hop-forest">
              Check the temperatures of cold high risk foods bought in from the supermarket. Use a clean disinfected thermometer to ensure cold foods are 8°C or below.
            </p>
          </div>

          {entries.map((entry, index) => (
            <Card key={index} className="space-y-4">
              <p className="font-medium text-hop-forest">Check {index + 1}</p>
              <div>
                <label className="block text-sm font-medium text-hop-forest mb-2">Name / details of food</label>
                <input
                  type="text"
                  value={entry.food}
                  onChange={(e) => updateEntry(index, 'food', e.target.value)}
                  placeholder="e.g. Cooked chicken slices"
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg text-hop-forest text-base font-body focus:outline-none focus:border-hop-forest"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-hop-forest mb-2">Time of check</label>
                <input
                  type="time"
                  value={entry.time}
                  onChange={(e) => updateEntry(index, 'time', e.target.value)}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg text-hop-forest text-base font-body focus:outline-none focus:border-hop-forest"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-hop-forest mb-2">Temperature of food</label>
                <div className="relative">
                  <input
                    type="text"
                    inputMode="decimal"
                    value={entry.temp}
                    onChange={(e) => updateEntry(index, 'temp', e.target.value)}
                    placeholder="0.0"
                    className={`w-full px-4 py-3 pr-12 border-2 rounded-lg text-hop-forest text-lg font-body focus:outline-none focus:border-hop-forest ${
                      entry.temp !== '' && parseFloat(entry.temp) > 8
                        ? 'border-hop-marmalade-dark bg-hop-marmalade/10'
                        : entry.temp !== '' && parseFloat(entry.temp) <= 8
                        ? 'border-hop-apple bg-hop-apple/10'
                        : 'border-gray-200'
                    }`}
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 text-base">°C</span>
                </div>
                {entry.temp !== '' && parseFloat(entry.temp) > 8 && (
                  <p className="text-xs text-hop-marmalade-dark mt-1">Above 8°C — food may not be safe</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-hop-forest mb-2">Initials of checker</label>
                <input
                  type="text"
                  value={entry.initials}
                  onChange={(e) => updateEntry(index, 'initials', e.target.value)}
                  placeholder="e.g. PF"
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg text-hop-forest text-base font-body focus:outline-none focus:border-hop-forest"
                />
              </div>
            </Card>
          ))}

          <Button color="marmalade" size="large" fullWidth disabled={!isValid} onClick={() => handleComplete()}>
            Complete
          </Button>
        </div>
      </div>
    )
  }

  // ── Probe Calibration Check ───────────────────────────────────────────────
  if (sectionId === 'probeCalibration') {
    const probes = [1, 2]

    const updateProbe = (n, field, value) => {
      setDeliveryData(prev => ({
        ...prev,
        [`probe${n}`]: { ...(prev[`probe${n}`] || {}), [field]: value },
      }))
    }

    const getProbeResult = (n) => {
      const p = deliveryData[`probe${n}`] || {}
      const boiling = parseFloat(p.boilingTemp)
      const iced = parseFloat(p.icedTemp)
      if (isNaN(boiling) || isNaN(iced)) return null
      const boilingPass = boiling >= 99 && boiling <= 101
      const icedPass = iced >= -1 && iced <= 1
      return boilingPass && icedPass ? 'pass' : 'fail'
    }

    const isValid = probes.some(n => {
      const p = deliveryData[`probe${n}`] || {}
      return p.identity?.trim() && p.boilingTemp !== '' && p.icedTemp !== '' && p.initials?.trim()
    })

    return (
      <div className="min-h-screen bg-hop-pebble">
        <Header title="Probe Calibration Check" subtitle="Monthly check" showBack onBack={goBackToSections} />
        <div className="px-4 py-6 max-w-md mx-auto space-y-4">
          <div className="bg-hop-blossom/20 border border-hop-blossom rounded-xl px-4 py-3">
            <p className="text-base text-hop-forest">
              Probe thermometers must be checked in boiling water and iced water once a month to ensure they are working properly. Boiling water test results must be between 99°C and 101°C. Iced water results between -1°C and +1°C.
            </p>
          </div>

          {probes.map((n) => {
            const p = deliveryData[`probe${n}`] || {}
            const result = getProbeResult(n)
            return (
              <Card key={n} className="space-y-4">
                <p className="font-medium text-hop-forest">Probe {n}</p>
                <div>
                  <label className="block text-sm font-medium text-hop-forest mb-2">Identity of probe</label>
                  <input
                    type="text"
                    value={p.identity || ''}
                    onChange={(e) => updateProbe(n, 'identity', e.target.value)}
                    placeholder="e.g. Probe A"
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg text-hop-forest text-base font-body focus:outline-none focus:border-hop-forest"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-hop-forest mb-2">Boiling water test result</label>
                  <div className="relative">
                    <input
                      type="text"
                      inputMode="decimal"
                      value={p.boilingTemp || ''}
                      onChange={(e) => updateProbe(n, 'boilingTemp', e.target.value)}
                      placeholder="99–101°C"
                      className={`w-full px-4 py-3 pr-12 border-2 rounded-lg text-hop-forest text-lg font-body focus:outline-none focus:border-hop-forest ${
                        p.boilingTemp !== '' && p.boilingTemp !== undefined
                          ? (parseFloat(p.boilingTemp) >= 99 && parseFloat(p.boilingTemp) <= 101 ? 'border-hop-apple bg-hop-apple/10' : 'border-hop-marmalade-dark bg-hop-marmalade/10')
                          : 'border-gray-200'
                      }`}
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 text-base">°C</span>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-hop-forest mb-2">Iced water test result</label>
                  <div className="relative">
                    <input
                      type="text"
                      inputMode="decimal"
                      value={p.icedTemp || ''}
                      onChange={(e) => updateProbe(n, 'icedTemp', e.target.value)}
                      placeholder="-1 to +1°C"
                      className={`w-full px-4 py-3 pr-12 border-2 rounded-lg text-hop-forest text-lg font-body focus:outline-none focus:border-hop-forest ${
                        p.icedTemp !== '' && p.icedTemp !== undefined
                          ? (parseFloat(p.icedTemp) >= -1 && parseFloat(p.icedTemp) <= 1 ? 'border-hop-apple bg-hop-apple/10' : 'border-hop-marmalade-dark bg-hop-marmalade/10')
                          : 'border-gray-200'
                      }`}
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 text-base">°C</span>
                  </div>
                </div>
                {result && (
                  <div className={`flex items-center gap-2 px-3 py-2 rounded-lg ${result === 'pass' ? 'bg-hop-apple/10 text-hop-apple' : 'bg-hop-marmalade/10 text-hop-marmalade-dark'}`}>
                    <span className="font-semibold text-sm">{result === 'pass' ? '✓ Pass' : '✗ Fail'}</span>
                    {result === 'fail' && <span className="text-xs">— one or both readings outside acceptable range</span>}
                  </div>
                )}
                <div>
                  <label className="block text-sm font-medium text-hop-forest mb-2">Initials</label>
                  <input
                    type="text"
                    value={p.initials || ''}
                    onChange={(e) => updateProbe(n, 'initials', e.target.value)}
                    placeholder="e.g. PF"
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg text-hop-forest text-base font-body focus:outline-none focus:border-hop-forest"
                  />
                </div>
              </Card>
            )
          })}

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

  // Render Little Tums section — menu with Lunch and Tea sub-sections
  if (config.isLittleTums) {
    const lunchItems = kitchenSafety.littleTumsItems.filter(i => ['lt1','lt2','lt3','lt4'].includes(i.id))
    const teaItems = kitchenSafety.littleTumsItems.filter(i => ['lt5','lt6'].includes(i.id))
    const lunchDone = !!deliveryData.lunchDone
    const teaDone = !!deliveryData.teaDone

    const saveData = (updatedDeliveryData) => {
      const key = room ? `${nursery}::${room}` : nursery
      const existing = storage.getKitchenSafetyState(key)
      storage.setKitchenSafetyState(key, existing?.completedSections || {}, {
        ...(existing?.sectionData || {}),
        littleTums: { responses, notes, temperatures, deliveryData: updatedDeliveryData },
      })
      saveLittleTumsData(nursery, room, updatedDeliveryData).catch(console.error)
    }

    const itemName = (item) => deliveryData.itemNames?.[item.id] || item.label

    const renderTempFields = (items, dataKey, editableNames = false) => {
      const threshold = (item) => item.type === 'hot' ? 63 : 8
      const isValidTemp = (item) => {
        const t = parseFloat(deliveryData[dataKey]?.[item.id]?.temp)
        return item.type === 'hot' ? t >= threshold(item) : t <= threshold(item)
      }
      return items.map(item => {
        const temp = deliveryData[dataKey]?.[item.id]?.temp || ''
        const skipped = deliveryData[dataKey]?.[item.id]?.skipped
        const valid = temp && isValidTemp(item)
        const invalid = temp && !isValidTemp(item)
        return (
          <div key={item.id} className="space-y-1">
            {editableNames ? (
              <input
                type="text"
                value={deliveryData.itemNames?.[item.id] ?? ''}
                onChange={(e) => setDeliveryData(prev => ({
                  ...prev,
                  itemNames: { ...prev.itemNames, [item.id]: e.target.value }
                }))}
                placeholder={item.label}
                className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg text-hop-forest text-sm font-body focus:outline-none focus:border-hop-forest"
              />
            ) : (
              <label className="block text-sm text-hop-forest">{itemName(item)}</label>
            )}
            <div className="flex gap-2">
              <div className="relative flex-1">
                <input
                  type="text"
                  inputMode="decimal"
                  value={skipped ? '' : temp}
                  disabled={skipped}
                  onChange={(e) => setDeliveryData(prev => ({
                    ...prev,
                    [dataKey]: { ...prev[dataKey], [item.id]: { temp: e.target.value } }
                  }))}
                  placeholder={item.type === 'hot' ? '≥63' : '≤8'}
                  className={`w-full px-3 py-2 pr-10 rounded-lg border-2 text-sm ${
                    skipped ? 'bg-gray-100 border-gray-200 text-gray-400' :
                    valid ? 'border-hop-apple bg-hop-apple/10' :
                    invalid ? 'border-hop-marmalade-dark bg-hop-marmalade/10' :
                    'border-gray-200'
                  }`}
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">°C</span>
              </div>
              <button
                onClick={() => setDeliveryData(prev => ({
                  ...prev,
                  [dataKey]: { ...prev[dataKey], [item.id]: { skipped: !skipped } }
                }))}
                className={`px-3 py-2 border-2 rounded-lg text-sm ${skipped ? 'border-hop-marmalade bg-hop-marmalade/20 text-hop-marmalade-dark font-medium' : 'border-gray-200 text-gray-500'}`}
              >
                N/A
              </button>
            </div>
          </div>
        )
      })
    }

    // Lunch — step 1: arrival temperatures
    if (phase === 'lunch') {
      const allFilled = lunchItems.some(i => deliveryData.lunch?.[i.id]?.temp || deliveryData.lunch?.[i.id]?.skipped)
      return (
        <div className="min-h-screen bg-hop-pebble">
          <Header title="Lunch — Arrival" subtitle="Little Tums temperatures" showBack onBack={() => setPhase('ltMenu')} />
          <div className="px-4 py-6 max-w-md mx-auto space-y-4">
            <Card className="space-y-4">
              <p className="text-xs text-gray-500">Edit item names if needed · Hot ≥63°C · Cold ≤8°C</p>
              {renderTempFields(lunchItems, 'lunch', true)}
            </Card>
            <Button color="marmalade" size="large" fullWidth disabled={!allFilled} onClick={() => {
              saveData(deliveryData)
              setPhase('lunchServing')
            }}>
              Continue to Serving
            </Button>
          </div>
        </div>
      )
    }

    // Lunch — step 2: serving (2-hour check)
    if (phase === 'lunchServing') {
      const twoHours = deliveryData.lunchTwoHours
      const servingAllFilled = twoHours === 'no'
        ? lunchItems.every(i => deliveryData.lunchServing?.[i.id]?.temp || deliveryData.lunchServing?.[i.id]?.skipped)
        : true
      const lunchInitials = deliveryData.lunchInitials || ''
      const canComplete = twoHours && lunchInitials.trim() && (twoHours === 'yes' || servingAllFilled)

      return (
        <div className="min-h-screen bg-hop-pebble">
          <Header title="Lunch — Serving" subtitle="Little Tums" showBack onBack={() => setPhase('lunch')} />
          <div className="px-4 py-6 max-w-md mx-auto space-y-4">
            <Card className="space-y-4">
              <p className="font-medium text-hop-forest text-sm">Is it 2 hours or less between time of arrival and distribution?</p>
              <div className="flex gap-3">
                {['yes', 'no'].map(val => (
                  <button
                    key={val}
                    onClick={() => setDeliveryData(prev => ({ ...prev, lunchTwoHours: val }))}
                    className={`flex-1 py-3 rounded-lg font-medium text-sm border-2 transition-all ${
                      twoHours === val
                        ? val === 'yes' ? 'bg-hop-apple border-hop-apple text-white' : 'bg-hop-marmalade border-hop-marmalade text-white'
                        : 'bg-white border-gray-200 text-gray-600'
                    }`}
                  >
                    {val === 'yes' ? 'Yes' : 'No'}
                  </button>
                ))}
              </div>
            </Card>

            {twoHours === 'no' && (
              <Card className="space-y-4">
                <p className="text-sm text-hop-marmalade-dark font-medium">Temperature check the food again and record the temperature here</p>
                <p className="text-xs text-gray-500">Hot ≥63°C · Cold ≤8°C</p>
                {renderTempFields(lunchItems, 'lunchServing')}
              </Card>
            )}

            {twoHours && (
              <Card>
                <label className="block text-sm font-medium text-hop-forest mb-2">
                  Your initials <span className="text-hop-marmalade-dark">*</span>
                </label>
                <input
                  type="text"
                  value={lunchInitials}
                  onChange={(e) => setDeliveryData(prev => ({ ...prev, lunchInitials: e.target.value }))}
                  placeholder="e.g. PF"
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg text-hop-forest text-base font-body focus:outline-none focus:border-hop-forest"
                />
              </Card>
            )}

            {twoHours && (
              <Button
                color="marmalade"
                size="large"
                fullWidth
                disabled={!canComplete}
                onClick={() => {
                  const updated = { ...deliveryData, lunchDone: true }
                  setDeliveryData(updated)
                  saveData(updated)
                  setPhase('ltMenu')
                }}
              >
                Done
              </Button>
            )}
          </div>
        </div>
      )
    }

    // Tea — step 1: arrival temperatures
    if (phase === 'tea') {
      const allFilled = teaItems.some(i => deliveryData.tea?.[i.id]?.temp || deliveryData.tea?.[i.id]?.skipped)
      return (
        <div className="min-h-screen bg-hop-pebble">
          <Header title="Tea — Arrival" subtitle="Little Tums temperatures" showBack onBack={() => setPhase('ltMenu')} />
          <div className="px-4 py-6 max-w-md mx-auto space-y-4">
            <Card className="space-y-4">
              <p className="text-xs text-gray-500">Edit item names if needed · Hot ≥63°C · Cold ≤8°C</p>
              {renderTempFields(teaItems, 'tea', true)}
            </Card>
            <Button color="marmalade" size="large" fullWidth disabled={!allFilled} onClick={() => {
              saveData(deliveryData)
              setPhase('teaServing')
            }}>
              Continue to Serving
            </Button>
          </div>
        </div>
      )
    }

    // Tea — step 2: serving (2-hour check)
    if (phase === 'teaServing') {
      const twoHours = deliveryData.teaTwoHours
      const servingAllFilled = twoHours === 'no'
        ? teaItems.every(i => deliveryData.teaServing?.[i.id]?.temp || deliveryData.teaServing?.[i.id]?.skipped)
        : true
      const teaInitials = deliveryData.teaInitials || ''
      const canComplete = twoHours && teaInitials.trim() && (twoHours === 'yes' || servingAllFilled)

      return (
        <div className="min-h-screen bg-hop-pebble">
          <Header title="Tea — Serving" subtitle="Little Tums" showBack onBack={() => setPhase('tea')} />
          <div className="px-4 py-6 max-w-md mx-auto space-y-4">
            <Card className="space-y-4">
              <p className="font-medium text-hop-forest text-sm">Is it 2 hours or less between time of arrival and distribution?</p>
              <div className="flex gap-3">
                {['yes', 'no'].map(val => (
                  <button
                    key={val}
                    onClick={() => setDeliveryData(prev => ({ ...prev, teaTwoHours: val }))}
                    className={`flex-1 py-3 rounded-lg font-medium text-sm border-2 transition-all ${
                      twoHours === val
                        ? val === 'yes' ? 'bg-hop-apple border-hop-apple text-white' : 'bg-hop-marmalade border-hop-marmalade text-white'
                        : 'bg-white border-gray-200 text-gray-600'
                    }`}
                  >
                    {val === 'yes' ? 'Yes' : 'No'}
                  </button>
                ))}
              </div>
            </Card>

            {twoHours === 'no' && (
              <Card className="space-y-4">
                <p className="text-sm text-hop-marmalade-dark font-medium">Temperature check the food again and record the temperature here</p>
                <p className="text-xs text-gray-500">Hot ≥63°C · Cold ≤8°C</p>
                {renderTempFields(teaItems, 'teaServing')}
              </Card>
            )}

            {twoHours && (
              <Card>
                <label className="block text-sm font-medium text-hop-forest mb-2">
                  Your initials <span className="text-hop-marmalade-dark">*</span>
                </label>
                <input
                  type="text"
                  value={teaInitials}
                  onChange={(e) => setDeliveryData(prev => ({ ...prev, teaInitials: e.target.value }))}
                  placeholder="e.g. PF"
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg text-hop-forest text-base font-body focus:outline-none focus:border-hop-forest"
                />
              </Card>
            )}

            {twoHours && (
              <Button
                color="marmalade"
                size="large"
                fullWidth
                disabled={!canComplete}
                onClick={() => {
                  const updated = { ...deliveryData, teaDone: true }
                  setDeliveryData(updated)
                  saveData(updated)
                  setPhase('ltMenu')
                }}
              >
                Done
              </Button>
            )}
          </div>
        </div>
      )
    }

    // Menu screen
    return (
      <div className="min-h-screen bg-hop-pebble">
        <Header title="Little Tums" subtitle="Nursery meals & tea" showBack onBack={goBackToSections} />
        <div className="px-4 py-6 max-w-md mx-auto space-y-4">
          <div className="space-y-3">
            {[
              { key: 'lunch', label: 'Lunch', done: lunchDone },
              { key: 'tea', label: 'Tea', done: teaDone },
            ].map(({ key, label, done }) => (
              <button
                key={key}
                onClick={() => setPhase(key)}
                className={`w-full p-4 rounded-xl text-left flex items-center gap-4 border-2 transition-all ${
                  done ? 'bg-white border-hop-apple' : 'bg-white border-gray-200 hover:border-hop-marmalade hover:shadow-md'
                }`}
              >
                <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${done ? 'bg-hop-apple' : 'bg-gray-100'}`}>
                  {done ? (
                    <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                    </svg>
                  ) : (
                    <div className="w-3 h-3 rounded-full bg-gray-300" />
                  )}
                </div>
                <div className="flex-1">
                  <p className="font-medium text-hop-forest">{label}</p>
                  {done && <p className="text-sm text-hop-apple">Completed</p>}
                </div>
                <svg className={`w-5 h-5 ${done ? 'text-gray-400' : 'text-hop-marmalade'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            ))}
          </div>

          <Button
            color="marmalade"
            size="large"
            fullWidth
            disabled={!lunchDone && !teaDone}
            onClick={() => handleComplete()}
          >
            Complete
          </Button>
        </div>
      </div>
    )
  }

  // ── Sterilisation Equipment & Feeding Bottle Checks ───────────────────────
  if (config.isSterilisation) {
    const MORNING_ITEMS = [
      { id: 's1', text: 'Sterilising equipment is clean and filled with fresh water' },
      { id: 's2', text: 'Electric steam / microwave steam sterilisers are being used on the correct temperature / power setting and for the correct time' },
      { id: 's3', text: 'Bottles and feeding equipment are sterilised before use' },
    ]
    const AFTERNOON_ITEMS = [
      { id: 's3pm', text: 'Bottles and feeding equipment are sterilised before use' },
    ]

    const morningDone = !!deliveryData.morningDone
    const afternoonDone = !!deliveryData.afternoonDone

    const updateItem = (period, id, yn) => {
      setDeliveryData(prev => ({
        ...prev,
        [period]: {
          ...prev[period],
          [id]: { ...prev[period]?.[id], yn, time: new Date().toISOString() },
        },
      }))
    }

    const updateInitials = (period, id, initials) => {
      setDeliveryData(prev => ({
        ...prev,
        [period]: {
          ...prev[period],
          [id]: { ...prev[period]?.[id], initials },
        },
      }))
    }

    const renderCheckItems = (period, items) => items.map(item => {
      const entry = deliveryData[period]?.[item.id] || {}
      return (
        <div key={item.id} className="py-3 border-b border-gray-100 last:border-0 space-y-2">
          <p className="text-sm text-hop-forest">{item.text}</p>
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex gap-1">
              <button
                onClick={() => updateItem(period, item.id, 'yes')}
                className={`px-4 py-1.5 rounded text-sm font-medium ${entry.yn === 'yes' ? 'bg-hop-apple text-white' : 'bg-white border border-gray-300 text-gray-600'}`}
              >
                Yes
              </button>
              <button
                onClick={() => updateItem(period, item.id, 'no')}
                className={`px-4 py-1.5 rounded text-sm font-medium ${entry.yn === 'no' ? 'bg-hop-marmalade-dark text-white' : 'bg-white border border-gray-300 text-gray-600'}`}
              >
                No
              </button>
            </div>
            {entry.time && (
              <span className="text-xs text-gray-400">
                {new Date(entry.time).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
              </span>
            )}
            <input
              type="text"
              value={entry.initials || ''}
              onChange={(e) => updateInitials(period, item.id, e.target.value)}
              placeholder="Initials"
              className="w-20 px-2 py-1.5 border border-gray-300 rounded text-sm text-hop-forest focus:outline-none focus:border-hop-forest"
            />
          </div>
        </div>
      )
    })

    // Morning check form
    if (phase === 'morning') {
      const allDone = MORNING_ITEMS.every(item => deliveryData.morning?.[item.id]?.yn && deliveryData.morning?.[item.id]?.initials?.trim())
      return (
        <div className="min-h-screen bg-hop-pebble">
          <Header title="Morning Checks" subtitle={config.title} showBack onBack={() => setPhase('sterilMenu')} />
          <div className="px-4 py-6 max-w-md mx-auto space-y-4">
            <Card>{renderCheckItems('morning', MORNING_ITEMS)}</Card>
            <Button color="marmalade" size="large" fullWidth disabled={!allDone} onClick={() => {
              setDeliveryData(prev => ({ ...prev, morningDone: true }))
              setPhase('sterilMenu')
            }}>
              Done
            </Button>
          </div>
        </div>
      )
    }

    // Afternoon check form
    if (phase === 'afternoon') {
      const allDone = AFTERNOON_ITEMS.every(item => deliveryData.afternoon?.[item.id]?.yn && deliveryData.afternoon?.[item.id]?.initials?.trim())
      return (
        <div className="min-h-screen bg-hop-pebble">
          <Header title="Afternoon Check" subtitle={config.title} showBack onBack={() => setPhase('sterilMenu')} />
          <div className="px-4 py-6 max-w-md mx-auto space-y-4">
            <Card>{renderCheckItems('afternoon', AFTERNOON_ITEMS)}</Card>
            <Button color="marmalade" size="large" fullWidth disabled={!allDone} onClick={() => {
              setDeliveryData(prev => ({ ...prev, afternoonDone: true }))
              setPhase('sterilMenu')
            }}>
              Done
            </Button>
          </div>
        </div>
      )
    }

    // Sub-menu (sterilMenu)
    return (
      <div className="min-h-screen bg-hop-pebble">
        <Header title={config.title} subtitle={config.subtitle} showBack onBack={goBackToSections} />
        <div className="px-4 py-6 max-w-md mx-auto space-y-4">
          {[
            { id: 'morning', label: 'Morning Checks', description: '3 checks', done: morningDone },
            { id: 'afternoon', label: 'Afternoon Check', description: '1 check', done: afternoonDone },
          ].map(item => (
            <button
              key={item.id}
              onClick={() => setPhase(item.id)}
              className="w-full p-4 rounded-xl text-left bg-white border-2 border-gray-200 hover:border-hop-marmalade hover:shadow-md transition-all flex items-center gap-4"
            >
              <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${item.done ? 'bg-hop-apple' : 'bg-hop-marmalade/20'}`}>
                {item.done ? (
                  <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  <span className="text-hop-marmalade text-lg">🍼</span>
                )}
              </div>
              <div className="flex-1">
                <p className="font-medium text-hop-forest">{item.label}</p>
                <p className="text-sm text-gray-500">{item.done ? 'Completed' : item.description}</p>
              </div>
              <svg className="w-5 h-5 text-hop-marmalade flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          ))}

          <Button color="marmalade" size="large" fullWidth disabled={!morningDone} onClick={() => handleComplete()}>
            Complete
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
              {getPackedLunchChecks(isHolidayClub).map((check) => {
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
                {getPackedLunchChecks(isHolidayClub).map((check) => {
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
