export function Badge({ children, color = 'forest', size = 'default' }) {
  const colorStyles = {
    forest: 'bg-hop-forest text-white',
    freshair: 'bg-hop-freshair text-hop-forest',
    sunshine: 'bg-hop-sunshine text-hop-forest',
    apple: 'bg-hop-apple text-white',
    marmalade: 'bg-hop-marmalade text-white',
    pebble: 'bg-hop-pebble text-hop-forest',
    gray: 'bg-gray-200 text-gray-600',
  }

  const sizeStyles = {
    small: 'px-2 py-0.5 text-xs',
    default: 'px-3 py-1 text-sm',
    large: 'px-4 py-1.5 text-base',
  }

  return (
    <span
      className={`
        inline-flex items-center justify-center
        font-medium rounded-full
        ${colorStyles[color]}
        ${sizeStyles[size]}
      `}
    >
      {children}
    </span>
  )
}

export function StatusDot({ status }) {
  const statusStyles = {
    pass: 'bg-hop-apple',
    fail: 'bg-hop-marmalade-dark',
    pending: 'bg-gray-300',
  }

  return (
    <span
      className={`
        inline-block w-3 h-3 rounded-full
        ${statusStyles[status] || statusStyles.pending}
      `}
    />
  )
}
