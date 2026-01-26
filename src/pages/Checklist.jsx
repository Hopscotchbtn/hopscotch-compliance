import { useState } from 'react'
import { useParams, useLocation, useNavigate } from 'react-router-dom'
import { Header } from '../components/Header'
import { ProgressBar } from '../components/ui/ProgressBar'
import { Button } from '../components/ui/Button'
import { ChecklistItem } from '../components/ChecklistItem'
import { WeeklyDivider } from '../components/WeeklyDivider'
import { useChecklist } from '../hooks/useChecklist'
import { checkTypes, isMonday } from '../data/checklists'
import { submitCheck } from '../lib/supabase'

export function Checklist() {
  const { checkTypeId } = useParams()
  const location = useLocation()
  const navigate = useNavigate()

  const { nursery, room, completedBy } = location.state || {}
  const checkType = checkTypes[checkTypeId]

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState(null)

  const {
    items,
    waterTemperature,
    setWaterTemperature,
    updateItemStatus,
    updateItemNote,
    completedCount,
    totalCount,
    allCompleted,
    hasIssues,
    failedItems,
    hasFailsWithoutNotes,
    getSubmitData,
  } = useChecklist(checkTypeId)

  if (!checkType || !nursery) {
    navigate('/')
    return null
  }

  const handleSubmit = async () => {
    setIsSubmitting(true)
    setError(null)

    try {
      const submitData = getSubmitData()

      await submitCheck({
        nursery,
        room,
        checkType: checkTypeId,
        completedBy,
        items: submitData.items,
        waterTemperature: submitData.waterTemperature,
      })

      navigate(`/check/${checkTypeId}/confirmation`, {
        state: {
          nursery,
          room,
          completedBy,
          checkType: checkTypeId,
          hasIssues,
          failedItems: failedItems.map((i) => ({ text: i.text, note: i.note })),
        },
      })
    } catch (err) {
      console.error('Submit error:', err)
      setError('Failed to submit check. Please try again.')
      setIsSubmitting(false)
    }
  }

  // Determine where to show weekly divider
  const standardItemCount = checkType.standardItems.length
  const showWeeklySection = isMonday() && checkType.weeklyItems.length > 0

  return (
    <div className="min-h-screen bg-hop-pebble flex flex-col">
      <Header
        title={checkType.name}
        subtitle={`${nursery} › ${room}`}
        showBack
      />

      <div className="flex-1 px-4 py-4 max-w-xl mx-auto w-full overflow-y-auto checklist-scroll">
        {/* Progress */}
        <div className="mb-4">
          <ProgressBar current={completedCount} total={totalCount} />
        </div>

        {/* Description */}
        <p className="text-gray-600 text-sm mb-6 bg-white/50 p-3 rounded-lg">
          {checkType.description}
        </p>

        {/* Checklist items */}
        <div className="space-y-3 pb-32">
          {items.map((item, index) => (
            <div key={item.id}>
              {/* Show weekly divider before weekly items */}
              {showWeeklySection && index === standardItemCount && (
                <WeeklyDivider />
              )}

              <ChecklistItem
                number={item.id}
                text={item.text}
                status={item.status}
                note={item.note}
                hasTemperatureInput={item.hasTemperatureInput}
                temperature={waterTemperature}
                onStatusChange={(status) => updateItemStatus(item.id, status)}
                onNoteChange={(note) => updateItemNote(item.id, note)}
                onTemperatureChange={setWaterTemperature}
                color={checkType.color}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Sticky footer */}
      <div className="sticky bottom-0 bg-white border-t border-gray-200 px-4 py-4 shadow-lg">
        <div className="max-w-xl mx-auto">
          {error && (
            <div className="mb-3 p-3 bg-hop-marmalade-dark/10 text-hop-marmalade-dark rounded-lg text-sm">
              {error}
            </div>
          )}

          {hasFailsWithoutNotes && allCompleted && (
            <p className="text-sm text-hop-marmalade mb-3 text-center">
              Consider adding notes to failed items
            </p>
          )}

          <Button
            color="forest"
            size="large"
            fullWidth
            disabled={!allCompleted || isSubmitting}
            onClick={handleSubmit}
          >
            {isSubmitting ? 'Submitting...' : 'Submit Check'}
          </Button>
        </div>
      </div>
    </div>
  )
}
