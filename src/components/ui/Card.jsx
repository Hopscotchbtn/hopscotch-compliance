export function Card({ children, className = '', padding = 'default' }) {
  const paddingStyles = {
    none: '',
    small: 'p-3',
    default: 'p-4',
    large: 'p-6',
  }

  return (
    <div
      className={`
        bg-white rounded-xl shadow-sm
        ${paddingStyles[padding]}
        ${className}
      `}
    >
      {children}
    </div>
  )
}
