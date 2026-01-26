export function Logo({ size = 'default' }) {
  const sizeStyles = {
    small: 'w-8 h-8',
    default: 'w-12 h-12',
    large: 'w-16 h-16',
  }

  return (
    <div className={`${sizeStyles[size]} grid grid-cols-3 gap-0.5`}>
      {/* Hopscotch grid logo recreation */}
      <div className="bg-hop-freshair rounded-sm" />
      <div className="bg-hop-marmalade rounded-sm" />
      <div className="bg-hop-sunshine rounded-sm" />
      <div className="bg-hop-apple rounded-sm" />
      <div className="bg-hop-smiles rounded-sm" />
      <div className="bg-hop-forest rounded-sm" />
      <div className="bg-hop-marmalade rounded-sm" />
      <div className="bg-hop-freshair rounded-sm" />
      <div className="bg-hop-apple rounded-sm" />
    </div>
  )
}

export function LogoWithText({ size = 'default' }) {
  return (
    <div className="flex flex-col items-center gap-3">
      <Logo size={size} />
      <div className="text-center">
        <h1 className="font-display text-2xl text-hop-forest font-semibold tracking-tight">
          hopscotch
        </h1>
        <p className="text-sm text-gray-500">Children's Nurseries</p>
      </div>
    </div>
  )
}
