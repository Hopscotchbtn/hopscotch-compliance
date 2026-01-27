export function Button({
  children,
  variant = 'primary',
  color = 'forest',
  size = 'default',
  disabled = false,
  fullWidth = false,
  onClick,
  type = 'button',
  className = '',
}) {
  const baseStyles = 'font-body font-medium rounded-lg transition-all duration-200 flex items-center justify-center gap-2'

  const sizeStyles = {
    default: 'px-6 py-3 text-base min-h-[44px]',
    large: 'px-8 py-4 text-lg min-h-[56px]',
    small: 'px-4 py-2 text-sm min-h-[44px]',
  }

  const colorMap = {
    forest: {
      primary: 'bg-hop-forest text-white hover:bg-hop-forest-dark active:bg-hop-forest-dark',
      secondary: 'bg-white text-hop-forest border-2 border-hop-forest hover:bg-hop-pebble',
    },
    freshair: {
      primary: 'bg-hop-freshair text-hop-forest hover:bg-hop-freshair-dark active:bg-hop-freshair-dark',
      secondary: 'bg-white text-hop-forest border-2 border-hop-freshair hover:bg-hop-freshair/20',
    },
    sunshine: {
      primary: 'bg-hop-sunshine text-hop-forest hover:brightness-95 active:brightness-90',
      secondary: 'bg-white text-hop-forest border-2 border-hop-sunshine hover:bg-hop-sunshine/20',
    },
    apple: {
      primary: 'bg-hop-apple text-white hover:brightness-95 active:brightness-90',
      secondary: 'bg-white text-hop-forest border-2 border-hop-apple hover:bg-hop-apple/20',
    },
    marmalade: {
      primary: 'bg-hop-marmalade text-white hover:bg-hop-marmalade-dark active:bg-hop-marmalade-dark',
      secondary: 'bg-white text-hop-forest border-2 border-hop-marmalade hover:bg-hop-marmalade/20',
    },
    blossom: {
      primary: 'bg-hop-blossom text-hop-forest hover:brightness-95 active:brightness-90',
      secondary: 'bg-white text-hop-forest border-2 border-hop-blossom hover:bg-hop-blossom/20',
    },
  }

  const disabledStyles = 'opacity-50 cursor-not-allowed'
  const widthStyles = fullWidth ? 'w-full' : ''

  const variantStyles = colorMap[color]?.[variant] || colorMap.forest.primary

  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      className={`
        ${baseStyles}
        ${sizeStyles[size]}
        ${variantStyles}
        ${disabled ? disabledStyles : ''}
        ${widthStyles}
        ${className}
      `}
    >
      {children}
    </button>
  )
}
