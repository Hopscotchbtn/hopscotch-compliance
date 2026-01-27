import { useState, useRef, useEffect, useCallback } from 'react'
import { TextArea } from './ui/Input'

export function SwipeCard({
  item,
  currentIndex,
  totalCount,
  onPass,
  onFail,
  onNA,
  onNoteChange,
  onPhotoChange,
  note,
  photo,
  color = 'hop-freshair',
}) {
  const fileInputRef = useRef(null)
  const [dragX, setDragX] = useState(0)
  const [isDragging, setIsDragging] = useState(false)
  const [showFailNote, setShowFailNote] = useState(false)
  const [exitDirection, setExitDirection] = useState(null)
  const cardRef = useRef(null)
  const startX = useRef(0)
  const noteInputRef = useRef(null)

  const SWIPE_THRESHOLD = 100

  // Reset state when item changes
  useEffect(() => {
    setDragX(0)
    setExitDirection(null)
    setShowFailNote(false)
  }, [item.id])

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (showFailNote) return // Don't handle shortcuts when typing note

      switch (e.key.toLowerCase()) {
        case 'p':
        case 'arrowright':
          e.preventDefault()
          handlePass()
          break
        case 'f':
        case 'arrowleft':
          e.preventDefault()
          handleFail()
          break
        case 'n':
        case 'arrowdown':
          e.preventDefault()
          handleNA()
          break
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [showFailNote])

  const handlePass = useCallback(() => {
    setExitDirection('right')
    setTimeout(() => onPass(), 250)
  }, [onPass])

  const handleFail = useCallback(() => {
    setShowFailNote(true)
    setTimeout(() => noteInputRef.current?.focus(), 100)
  }, [])

  const handleNA = useCallback(() => {
    setExitDirection('left')
    setTimeout(() => onNA(), 250)
  }, [onNA])

  const handleFailSubmit = useCallback(() => {
    setExitDirection('left')
    setTimeout(() => onFail(note), 250)
  }, [onFail, note])

  // Touch handlers
  const handleTouchStart = (e) => {
    if (showFailNote) return
    startX.current = e.touches[0].clientX
    setIsDragging(true)
  }

  const handleTouchMove = (e) => {
    if (!isDragging || showFailNote) return
    const currentX = e.touches[0].clientX
    const diff = currentX - startX.current
    setDragX(diff)
  }

  const handleTouchEnd = () => {
    if (!isDragging || showFailNote) return
    setIsDragging(false)

    if (dragX > SWIPE_THRESHOLD) {
      handlePass()
    } else if (dragX < -SWIPE_THRESHOLD) {
      handleFail()
    } else {
      setDragX(0)
    }
  }

  // Mouse handlers
  const handleMouseDown = (e) => {
    if (showFailNote) return
    startX.current = e.clientX
    setIsDragging(true)
  }

  const handleMouseMove = (e) => {
    if (!isDragging || showFailNote) return
    const diff = e.clientX - startX.current
    setDragX(diff)
  }

  const handleMouseUp = () => {
    if (!isDragging || showFailNote) return
    setIsDragging(false)

    if (dragX > SWIPE_THRESHOLD) {
      handlePass()
    } else if (dragX < -SWIPE_THRESHOLD) {
      handleFail()
    } else {
      setDragX(0)
    }
  }

  const handleMouseLeave = () => {
    if (isDragging) {
      setIsDragging(false)
      setDragX(0)
    }
  }

  // Calculate visual feedback
  const rotation = dragX * 0.05
  const opacity = Math.max(0.5, 1 - Math.abs(dragX) / 300)

  const getSwipeIndicator = () => {
    if (dragX > 50) return { text: 'PASS', color: 'bg-hop-apple', show: true }
    if (dragX < -50) return { text: 'FAIL', color: 'bg-hop-marmalade-dark', show: true }
    return { show: false }
  }

  const indicator = getSwipeIndicator()

  // Exit animation
  const getExitTransform = () => {
    if (exitDirection === 'right') return 'translateX(120%) rotate(20deg)'
    if (exitDirection === 'left') return 'translateX(-120%) rotate(-20deg)'
    return `translateX(${dragX}px) rotate(${rotation}deg)`
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-4">
      {/* Progress indicator */}
      <div className="mb-6 text-center">
        <span className="text-2xl font-display font-semibold text-hop-forest">
          {currentIndex + 1}
        </span>
        <span className="text-lg text-gray-400 mx-2">of</span>
        <span className="text-2xl font-display font-semibold text-hop-forest">
          {totalCount}
        </span>
      </div>

      {/* Progress dots */}
      <div className="flex gap-1.5 mb-8 flex-wrap justify-center max-w-xs">
        {Array.from({ length: totalCount }).map((_, i) => (
          <div
            key={i}
            className={`w-2.5 h-2.5 rounded-full transition-all duration-300 ${
              i < currentIndex
                ? 'bg-hop-apple'
                : i === currentIndex
                ? 'bg-hop-forest w-6'
                : 'bg-gray-300'
            }`}
          />
        ))}
      </div>

      {/* Swipe card */}
      <div
        ref={cardRef}
        className={`
          relative w-full max-w-md bg-white rounded-2xl shadow-lg border-2 border-gray-100
          cursor-grab active:cursor-grabbing select-none
          ${exitDirection ? 'transition-transform duration-300 ease-out' : isDragging ? '' : 'transition-transform duration-200'}
        `}
        style={{
          transform: getExitTransform(),
          opacity: exitDirection ? 0 : opacity,
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
      >
        {/* Swipe indicator overlay */}
        {indicator.show && (
          <div
            className={`absolute inset-0 ${indicator.color} rounded-2xl flex items-center justify-center transition-opacity duration-150`}
            style={{ opacity: Math.min(0.9, Math.abs(dragX) / 150) }}
          >
            <span className="text-white text-4xl font-bold">{indicator.text}</span>
          </div>
        )}

        {/* Card content */}
        <div className="p-6 relative z-10">
          {/* Item number badge */}
          <div
            className="w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold mb-4 mx-auto"
            style={{ backgroundColor: '#b1c8f6' }}
          >
            {item.id}
          </div>

          {/* Item text */}
          <p className="text-hop-forest text-xl text-center leading-relaxed mb-6 min-h-[80px] flex items-center justify-center">
            {item.text}
          </p>

          {/* Fail note input */}
          {showFailNote && (
            <div className="mb-4 animate-in slide-in-from-bottom-4 duration-200">
              <TextArea
                ref={noteInputRef}
                label="What's the issue?"
                value={note || ''}
                onChange={onNoteChange}
                placeholder="Describe the problem and any action taken..."
                rows={3}
              />

              {/* Photo evidence */}
              <div className="mt-3">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0]
                    if (!file) return
                    const reader = new FileReader()
                    reader.onload = (ev) => onPhotoChange?.(ev.target.result)
                    reader.readAsDataURL(file)
                  }}
                />
                {photo ? (
                  <div className="relative inline-block">
                    <img src={photo} alt="Evidence" className="w-20 h-20 object-cover rounded-lg border" />
                    <button
                      type="button"
                      onClick={() => { onPhotoChange?.(null); if (fileInputRef.current) fileInputRef.current.value = '' }}
                      className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white rounded-full text-xs flex items-center justify-center"
                    >
                      ×
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="flex items-center gap-2 text-sm text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg px-3 py-2 transition-colors"
                  >
                    📷 Add photo evidence
                  </button>
                )}
              </div>

              <div className="flex gap-3 mt-3">
                <button
                  onClick={() => setShowFailNote(false)}
                  className="flex-1 py-3 px-4 rounded-xl font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleFailSubmit}
                  className="flex-1 py-3 px-4 rounded-xl font-medium text-white bg-hop-marmalade-dark hover:brightness-95 transition-all"
                >
                  Submit Issue
                </button>
              </div>
            </div>
          )}

          {/* Action buttons */}
          {!showFailNote && (
            <div className="flex gap-3">
              <button
                onClick={handleFail}
                className="flex-1 py-4 px-4 rounded-xl font-medium text-hop-marmalade-dark bg-hop-marmalade-dark/10 hover:bg-hop-marmalade-dark/20 transition-colors text-lg min-h-[60px]"
              >
                ✗ Fail
              </button>
              <button
                onClick={handlePass}
                className="flex-1 py-4 px-4 rounded-xl font-medium text-white bg-hop-apple hover:brightness-95 transition-all text-lg min-h-[60px]"
              >
                ✓ Pass
              </button>
              <button
                onClick={handleNA}
                className="py-4 px-4 rounded-xl font-medium text-gray-500 bg-gray-100 hover:bg-gray-200 transition-colors text-lg min-h-[60px]"
              >
                N/A
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Interaction hints */}
      {!showFailNote && (
        <div className="mt-6 text-center text-sm text-gray-400">
          <span className="hidden md:inline">
            Keyboard: <kbd className="px-2 py-1 bg-gray-100 rounded text-xs">P</kbd> Pass ·
            <kbd className="px-2 py-1 bg-gray-100 rounded text-xs ml-2">F</kbd> Fail ·
            <kbd className="px-2 py-1 bg-gray-100 rounded text-xs ml-2">N</kbd> N/A
          </span>
          <span className="md:hidden flex items-center justify-center gap-3">
            <span className="text-hop-marmalade-dark">← Fail</span>
            <span className="text-gray-300">·</span>
            <span>Swipe or tap</span>
            <span className="text-gray-300">·</span>
            <span className="text-hop-apple">Pass →</span>
          </span>
        </div>
      )}
    </div>
  )
}
