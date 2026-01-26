import { useNavigate } from 'react-router-dom'

export function Header({ title, subtitle, showBack = false, onBack }) {
  const navigate = useNavigate()

  const handleBack = () => {
    if (onBack) {
      onBack()
    } else {
      navigate(-1)
    }
  }

  return (
    <header className="bg-hop-forest text-white px-4 py-4 sticky top-0 z-10">
      <div className="max-w-xl mx-auto flex items-center gap-3">
        {showBack && (
          <button
            onClick={handleBack}
            className="p-2 -ml-2 hover:bg-white/10 rounded-lg transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
            aria-label="Go back"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-6 w-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
          </button>
        )}
        <div className="flex-1">
          <h1 className="font-display text-lg font-semibold">{title}</h1>
          {subtitle && (
            <p className="text-white/80 text-sm">{subtitle}</p>
          )}
        </div>
      </div>
    </header>
  )
}
