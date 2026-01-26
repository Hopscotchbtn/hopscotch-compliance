import { useState, useEffect } from 'react'
import { TextArea, Input } from './ui/Input'

export function ChecklistItem({
  number,
  text,
  status,
  note,
  hasTemperatureInput,
  temperature,
  onStatusChange,
  onNoteChange,
  onTemperatureChange,
  color = 'hop-freshair',
}) {
  const [showNote, setShowNote] = useState(status === 'fail')

  useEffect(() => {
    if (status === 'fail') {
      setShowNote(true)
    }
  }, [status])

  const getStatusButtonClass = (buttonStatus) => {
    const isSelected = status === buttonStatus
    const baseClass = 'flex-1 py-2 px-3 rounded-lg font-medium text-sm min-h-[44px] transition-all duration-200 border-2'

    if (buttonStatus === 'pass') {
      return `${baseClass} ${
        isSelected
          ? 'bg-hop-apple text-white border-hop-apple'
          : 'bg-white text-gray-600 border-gray-200 hover:border-hop-apple hover:text-hop-apple'
      }`
    }
    if (buttonStatus === 'fail') {
      return `${baseClass} ${
        isSelected
          ? 'bg-hop-marmalade-dark text-white border-hop-marmalade-dark'
          : 'bg-white text-gray-600 border-gray-200 hover:border-hop-marmalade-dark hover:text-hop-marmalade-dark'
      }`
    }
    if (buttonStatus === 'na') {
      return `${baseClass} ${
        isSelected
          ? 'bg-gray-400 text-white border-gray-400'
          : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400 hover:text-gray-600'
      }`
    }
    return baseClass
  }

  return (
    <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
      <div className="flex gap-3">
        {/* Number badge */}
        <div
          className={`
            w-8 h-8 rounded-full flex items-center justify-center
            text-sm font-bold flex-shrink-0
            ${status === 'pass' ? 'bg-hop-apple text-white' : ''}
            ${status === 'fail' ? 'bg-hop-marmalade-dark text-white' : ''}
            ${status === 'na' ? 'bg-gray-400 text-white' : ''}
            ${!status ? `bg-${color} text-hop-forest` : ''}
          `}
          style={!status ? { backgroundColor: color === 'hop-freshair' ? '#b1c8f6' : color === 'hop-sunshine' ? '#fbee57' : '#6d9f6b' } : {}}
        >
          {status === 'pass' ? '✓' : status === 'fail' ? '✗' : number}
        </div>

        {/* Content */}
        <div className="flex-1">
          <p className="text-hop-forest text-base leading-relaxed mb-3">{text}</p>

          {/* Status buttons */}
          <div className="flex gap-2">
            <button
              onClick={() => onStatusChange('pass')}
              className={getStatusButtonClass('pass')}
            >
              ✓ Pass
            </button>
            <button
              onClick={() => onStatusChange('fail')}
              className={getStatusButtonClass('fail')}
            >
              ✗ Fail
            </button>
            <button
              onClick={() => onStatusChange('na')}
              className={getStatusButtonClass('na')}
            >
              N/A
            </button>
          </div>

          {/* Fail note input */}
          {showNote && status === 'fail' && (
            <div className="mt-3 animate-in slide-in-from-top-2 duration-200">
              <TextArea
                label="What's the issue?"
                value={note || ''}
                onChange={onNoteChange}
                placeholder="Describe the problem and any action taken..."
                rows={2}
              />
            </div>
          )}

          {/* Temperature input for water check */}
          {hasTemperatureInput && status && (
            <div className="mt-3">
              <Input
                label="Temperature reading"
                type="number"
                value={temperature || ''}
                onChange={onTemperatureChange}
                placeholder="e.g., 38"
                suffix="°C"
                min={0}
                max={100}
                step={0.1}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
