import { useState, useRef } from 'react'
import { Button } from './Button'
import { Alert } from './Alert'

const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB
const ACCEPTED_TYPES = {
  'application/pdf': 'PDF',
  'image/png': 'PNG',
  'image/jpeg': 'JPG',
  'image/jpg': 'JPG',
  'text/plain': 'TXT',
}

/**
 * FileUpload component for witness statement uploads
 * Supports drag-and-drop and click to select
 */
export function FileUpload({
  label = 'Upload files',
  hint,
  files = [],
  onFilesChange,
  onAnalyze,
  analyzing = false,
  maxFiles = 5,
  accept = Object.keys(ACCEPTED_TYPES).join(','),
}) {
  const [dragActive, setDragActive] = useState(false)
  const [error, setError] = useState(null)
  const inputRef = useRef(null)

  const handleDrag = (e) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true)
    } else if (e.type === 'dragleave') {
      setDragActive(false)
    }
  }

  const validateFile = (file) => {
    if (!ACCEPTED_TYPES[file.type]) {
      return `${file.name}: File type not supported. Please use PDF, PNG, JPG, or TXT files.`
    }
    if (file.size > MAX_FILE_SIZE) {
      return `${file.name}: File too large. Maximum size is 10MB.`
    }
    return null
  }

  const processFile = async (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => {
        resolve({
          id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          fileName: file.name,
          fileType: file.type,
          fileSize: file.size,
          content: reader.result, // base64 data URL
          uploadedAt: new Date().toISOString(),
          analysis: null,
        })
      }
      reader.onerror = () => reject(new Error('Failed to read file'))
      reader.readAsDataURL(file)
    })
  }

  const handleFiles = async (fileList) => {
    setError(null)

    const newFiles = Array.from(fileList)

    // Check max files limit
    if (files.length + newFiles.length > maxFiles) {
      setError(`Maximum ${maxFiles} files allowed.`)
      return
    }

    // Validate each file
    const validationErrors = newFiles.map(validateFile).filter(Boolean)
    if (validationErrors.length > 0) {
      setError(validationErrors[0])
      return
    }

    // Process valid files
    try {
      const processedFiles = await Promise.all(newFiles.map(processFile))
      onFilesChange([...files, ...processedFiles])
    } catch (err) {
      setError('Failed to process file(s). Please try again.')
    }
  }

  const handleDrop = (e) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFiles(e.dataTransfer.files)
    }
  }

  const handleChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFiles(e.target.files)
    }
  }

  const handleRemove = (fileId) => {
    onFilesChange(files.filter(f => f.id !== fileId))
  }

  const handleAnalyzeFile = (file) => {
    if (onAnalyze) {
      onAnalyze(file)
    }
  }

  const formatFileSize = (bytes) => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  const getFileIcon = (fileType) => {
    if (fileType.startsWith('image/')) {
      return (
        <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd" />
        </svg>
      )
    }
    if (fileType === 'application/pdf') {
      return (
        <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd" />
        </svg>
      )
    }
    return (
      <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
      </svg>
    )
  }

  return (
    <div className="space-y-3">
      {label && (
        <label className="block text-sm font-medium text-hop-forest">
          {label}
        </label>
      )}

      {/* Drop zone */}
      <div
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        className={`
          relative border-2 border-dashed rounded-lg p-6 text-center cursor-pointer
          transition-colors duration-200
          ${dragActive
            ? 'border-hop-forest bg-hop-freshair/20'
            : 'border-gray-300 hover:border-hop-forest hover:bg-hop-pebble/50'
          }
        `}
      >
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          multiple
          onChange={handleChange}
          className="hidden"
        />

        <div className="flex flex-col items-center gap-2">
          <div className={`w-12 h-12 rounded-full flex items-center justify-center ${dragActive ? 'bg-hop-forest' : 'bg-gray-100'}`}>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className={`w-6 h-6 ${dragActive ? 'text-white' : 'text-gray-400'}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
          </div>
          <div>
            <p className="text-sm font-medium text-hop-forest">
              {dragActive ? 'Drop files here' : 'Drag and drop files, or click to select'}
            </p>
            <p className="text-xs text-gray-500 mt-1">
              PDF, PNG, JPG, or TXT files up to 10MB
            </p>
          </div>
        </div>
      </div>

      {hint && (
        <p className="text-xs text-gray-500">{hint}</p>
      )}

      {error && (
        <Alert type="error" className="text-sm">
          {error}
        </Alert>
      )}

      {/* Uploaded files list */}
      {files.length > 0 && (
        <div className="space-y-2">
          {files.map((file) => (
            <div
              key={file.id}
              className="bg-white border border-gray-200 rounded-lg p-3"
            >
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 bg-hop-pebble rounded-lg flex items-center justify-center text-hop-forest flex-shrink-0">
                  {getFileIcon(file.fileType)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-hop-forest truncate">
                    {file.fileName}
                  </p>
                  <p className="text-xs text-gray-500">
                    {ACCEPTED_TYPES[file.fileType]} - {formatFileSize(file.fileSize)}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {!file.analysis && onAnalyze && (
                    <Button
                      color="forest"
                      variant="secondary"
                      size="small"
                      onClick={() => handleAnalyzeFile(file)}
                      disabled={analyzing}
                    >
                      {analyzing ? 'Analysing...' : 'Analyse'}
                    </Button>
                  )}
                  <button
                    onClick={() => handleRemove(file.id)}
                    className="p-1.5 rounded-full hover:bg-gray-100 text-gray-400 hover:text-hop-marmalade"
                    title="Remove file"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                  </button>
                </div>
              </div>

              {/* Analysis results */}
              {file.analysis && (
                <div className="mt-3 pt-3 border-t border-gray-100">
                  <WitnessAnalysisResult analysis={file.analysis} />
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

/**
 * Display component for witness statement AI analysis results
 */
export function WitnessAnalysisResult({ analysis }) {
  const [expanded, setExpanded] = useState(false)

  if (!analysis) return null

  return (
    <div className="space-y-2">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-2 w-full text-left"
      >
        <div className="w-5 h-5 bg-hop-freshair rounded-full flex items-center justify-center">
          <svg xmlns="http://www.w3.org/2000/svg" className="w-3 h-3 text-hop-forest" viewBox="0 0 20 20" fill="currentColor">
            <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
            <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
          </svg>
        </div>
        <span className="text-sm font-medium text-hop-forest">AI Analysis</span>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className={`w-4 h-4 text-gray-400 transition-transform ${expanded ? 'rotate-180' : ''}`}
          viewBox="0 0 20 20"
          fill="currentColor"
        >
          <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
        </svg>
      </button>

      {expanded && (
        <div className="space-y-3 text-sm">
          {analysis.summary && (
            <div>
              <p className="font-medium text-hop-forest mb-1">Summary</p>
              <p className="text-gray-600">{analysis.summary}</p>
            </div>
          )}

          {analysis.keyFacts?.length > 0 && (
            <div>
              <p className="font-medium text-hop-forest mb-1">Key Facts</p>
              <ul className="list-disc list-inside text-gray-600 space-y-0.5">
                {analysis.keyFacts.map((fact, i) => (
                  <li key={i}>{fact}</li>
                ))}
              </ul>
            </div>
          )}

          {analysis.timeline?.length > 0 && (
            <div>
              <p className="font-medium text-hop-forest mb-1">Timeline</p>
              <ul className="list-disc list-inside text-gray-600 space-y-0.5">
                {analysis.timeline.map((item, i) => (
                  <li key={i}>{item}</li>
                ))}
              </ul>
            </div>
          )}

          {analysis.inconsistencies?.length > 0 && (
            <div className="bg-hop-marmalade/10 rounded-lg p-2">
              <p className="font-medium text-hop-marmalade mb-1">Potential Inconsistencies</p>
              <ul className="list-disc list-inside text-gray-600 space-y-0.5">
                {analysis.inconsistencies.map((item, i) => (
                  <li key={i}>{item}</li>
                ))}
              </ul>
            </div>
          )}

          {analysis.followUpQuestions?.length > 0 && (
            <div>
              <p className="font-medium text-hop-forest mb-1">Follow-up Questions</p>
              <ul className="list-disc list-inside text-gray-600 space-y-0.5">
                {analysis.followUpQuestions.map((q, i) => (
                  <li key={i}>{q}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
