export function Logo({ size = 'default' }) {
  const sizeStyles = {
    small: 'w-12 h-12',
    default: 'w-20 h-20',
    large: 'w-28 h-28',
  }

  return (
    <img
      src="/hopscotch-logo.jpg"
      alt="Hopscotch"
      className={`${sizeStyles[size]} object-contain`}
    />
  )
}

export function LogoWithText({ size = 'default' }) {
  const logoSizes = {
    small: 'w-16 h-16',
    default: 'w-24 h-24',
    large: 'w-32 h-32',
  }

  return (
    <div className="flex flex-col items-center gap-2">
      <img
        src="/hopscotch-logo.jpg"
        alt="Hopscotch"
        className={`${logoSizes[size]} object-contain`}
      />
      <p className="text-sm text-gray-500">Children's Nurseries</p>
    </div>
  )
}
