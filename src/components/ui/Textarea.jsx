import { useState, useEffect, useRef } from 'react'

// Check for browser support
const SpeechRecognition = typeof window !== 'undefined'
  ? (window.SpeechRecognition || window.webkitSpeechRecognition)
  : null

export function Textarea({
  label,
  value,
  onChange,
  placeholder = '',
  rows = 4,
  minLength,
  required = false,
  disabled = false,
  hint,
  enableDictation = true,
}) {
  const [isListening, setIsListening] = useState(false)
  const [dictationSupported, setDictationSupported] = useState(false)
  const recognitionRef = useRef(null)

  const charCount = value?.length || 0
  const showMinWarning = minLength && charCount > 0 && charCount < minLength

  useEffect(() => {
    setDictationSupported(!!SpeechRecognition)
  }, [])

  useEffect(() => {
    if (!SpeechRecognition) return

    const recognition = new SpeechRecognition()
    recognition.continuous = true
    recognition.interimResults = true
    recognition.lang = 'en-GB'

    recognition.onresult = (event) => {
      let finalTranscript = ''
      let interimTranscript = ''

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript
        if (event.results[i].isFinal) {
          finalTranscript += transcript
        } else {
          interimTranscript = transcript
        }
      }

      if (finalTranscript) {
        // Append final transcript to existing value
        const newValue = value ? value + ' ' + finalTranscript : finalTranscript
        onChange(newValue)
      }
    }

    recognition.onerror = (event) => {
      console.error('Speech recognition error:', event.error)
      setIsListening(false)
    }

    recognition.onend = () => {
      setIsListening(false)
    }

    recognitionRef.current = recognition

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop()
      }
    }
  }, [value, onChange])

  const toggleDictation = () => {
    if (!recognitionRef.current) return

    if (isListening) {
      recognitionRef.current.stop()
      setIsListening(false)
    } else {
      recognitionRef.current.start()
      setIsListening(true)
    }
  }

  return (
    <div className="w-full">
      {label && (
        <label className="block text-sm font-medium text-hop-forest mb-2">
          {label}
          {required && <span className="text-hop-marmalade-dark ml-1">*</span>}
        </label>
      )}
      <div className="relative">
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          rows={rows}
          required={required}
          disabled={disabled}
          minLength={minLength}
          className={`
            w-full px-4 py-3 pr-12
            bg-white border-2 rounded-lg
            text-hop-forest font-body text-base
            focus:outline-none focus:ring-2 focus:ring-hop-forest/20
            disabled:bg-gray-100 disabled:cursor-not-allowed
            placeholder:text-gray-400
            resize-none
            ${showMinWarning ? 'border-hop-marmalade' : 'border-gray-200 focus:border-hop-forest'}
            ${isListening ? 'border-hop-marmalade ring-2 ring-hop-marmalade/20' : ''}
          `}
        />
        {enableDictation && dictationSupported && !disabled && (
          <button
            type="button"
            onClick={toggleDictation}
            className={`
              absolute right-2 top-2
              w-9 h-9 rounded-full
              flex items-center justify-center
              transition-all
              ${isListening
                ? 'bg-hop-marmalade text-white animate-pulse'
                : 'bg-gray-100 text-gray-500 hover:bg-hop-forest hover:text-white'
              }
            `}
            title={isListening ? 'Stop dictation' : 'Start dictation'}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="currentColor"
              className="w-5 h-5"
            >
              <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z" />
              <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z" />
            </svg>
          </button>
        )}
      </div>
      <div className="flex justify-between mt-1">
        <div className="flex items-center gap-2">
          {hint && <p className="text-xs text-gray-500">{hint}</p>}
          {isListening && (
            <span className="text-xs text-hop-marmalade font-medium animate-pulse">
              Listening...
            </span>
          )}
        </div>
        {minLength && (
          <p className={`text-xs ${showMinWarning ? 'text-hop-marmalade' : 'text-gray-400'}`}>
            {charCount}/{minLength} min characters
          </p>
        )}
      </div>
    </div>
  )
}
