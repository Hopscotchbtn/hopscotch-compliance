import { useState, useCallback } from 'react'
import { getChecklistItems } from '../data/checklists'

export function useChecklist(checkTypeId) {
  const items = getChecklistItems(checkTypeId)

  const [itemStates, setItemStates] = useState(() =>
    items.map((item) => ({
      id: item.id,
      text: item.text,
      status: null,
      note: '',
      hasTemperatureInput: item.hasTemperatureInput || false,
    }))
  )

  const [waterTemperature, setWaterTemperature] = useState('')

  const updateItemStatus = useCallback((itemId, status) => {
    setItemStates((prev) =>
      prev.map((item) =>
        item.id === itemId
          ? { ...item, status, note: status !== 'fail' ? '' : item.note }
          : item
      )
    )
  }, [])

  const updateItemNote = useCallback((itemId, note) => {
    setItemStates((prev) =>
      prev.map((item) => (item.id === itemId ? { ...item, note } : item))
    )
  }, [])

  const completedCount = itemStates.filter((item) => item.status !== null).length
  const totalCount = itemStates.length
  const allCompleted = completedCount === totalCount

  const failedItems = itemStates.filter((item) => item.status === 'fail')
  const hasIssues = failedItems.length > 0
  const hasFailsWithoutNotes = failedItems.some((item) => !item.note?.trim())

  const getSubmitData = () => ({
    items: itemStates.map(({ id, text, status, note }) => ({
      id,
      text,
      status,
      note: note || null,
    })),
    waterTemperature: waterTemperature ? parseFloat(waterTemperature) : null,
  })

  return {
    items: itemStates,
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
  }
}
