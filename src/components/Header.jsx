import { useNavigate, useLocation } from 'react-router-dom'

export function Header({ title, subtitle, showBack = false, onBack }) {
  const navigate = useNavigate()
  const location = useLocation()
  const isHome = location.pathname === '/'

  const handleBack = () => {
    if (onBack) {
      onBack()
    } else {
      navigate(-1)
    }
  }

  const handleHome = () => {
    navigate('/')
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
        {!isHome && (
          <button
            onClick={handleHome}
            className="p-2 -mr-2 hover:bg-white/10 rounded-lg transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
            aria-label="Go home"
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
                d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-4 0a1 1 0 01-1-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 01-1 1"
              />
            </svg>
          </button>
        )}
      </div>
    </header>
  )
}
