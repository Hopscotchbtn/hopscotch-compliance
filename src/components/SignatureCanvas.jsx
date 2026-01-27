import { useRef, useEffect, useState, useCallback } from 'react'

export function SignatureCanvas({ onSignature }) {
  const canvasRef = useRef(null)
  const [isDrawing, setIsDrawing] = useState(false)
  const [hasDrawn, setHasDrawn] = useState(false)

  useEffect(() => {
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    const dpr = window.devicePixelRatio || 1
    const rect = canvas.getBoundingClientRect()
    canvas.width = rect.width * dpr
    canvas.height = rect.height * dpr
    ctx.scale(dpr, dpr)
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.lineWidth = 2.5
    ctx.strokeStyle = '#1a1a1a'
  }, [])

  const getPos = (e) => {
    const rect = canvasRef.current.getBoundingClientRect()
    const touch = e.touches?.[0]
    const clientX = touch ? touch.clientX : e.clientX
    const clientY = touch ? touch.clientY : e.clientY
    return { x: clientX - rect.left, y: clientY - rect.top }
  }

  const startDraw = useCallback((e) => {
    e.preventDefault()
    const ctx = canvasRef.current.getContext('2d')
    const pos = getPos(e)
    ctx.beginPath()
    ctx.moveTo(pos.x, pos.y)
    setIsDrawing(true)
  }, [])

  const draw = useCallback((e) => {
    if (!isDrawing) return
    e.preventDefault()
    const ctx = canvasRef.current.getContext('2d')
    const pos = getPos(e)
    ctx.lineTo(pos.x, pos.y)
    ctx.stroke()
  }, [isDrawing])

  const endDraw = useCallback(() => {
    if (!isDrawing) return
    setIsDrawing(false)
    setHasDrawn(true)
    const dataUrl = canvasRef.current.toDataURL('image/png')
    onSignature(dataUrl)
  }, [isDrawing, onSignature])

  const clear = () => {
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    const dpr = window.devicePixelRatio || 1
    ctx.clearRect(0, 0, canvas.width / dpr, canvas.height / dpr)
    setHasDrawn(false)
    onSignature(null)
  }

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">
        Signature <span className="text-red-500">*</span>
      </label>
      <div className="relative border-2 border-dashed border-gray-300 rounded-xl bg-white overflow-hidden">
        <canvas
          ref={canvasRef}
          className="w-full"
          style={{ height: 160, touchAction: 'none' }}
          onMouseDown={startDraw}
          onMouseMove={draw}
          onMouseUp={endDraw}
          onMouseLeave={endDraw}
          onTouchStart={startDraw}
          onTouchMove={draw}
          onTouchEnd={endDraw}
        />
        {!hasDrawn && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none text-gray-400 text-sm">
            Sign here with your finger
          </div>
        )}
      </div>
      {hasDrawn && (
        <button
          type="button"
          onClick={clear}
          className="mt-2 text-sm text-gray-500 hover:text-hop-forest underline"
        >
          Clear signature
        </button>
      )}
    </div>
  )
}
