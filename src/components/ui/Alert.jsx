export function Alert({ type = 'info', title, children }) {
  const styles = {
    info: 'bg-hop-freshair/30 border-hop-freshair text-hop-forest',
    warning: 'bg-hop-sunshine/30 border-hop-marmalade text-hop-forest',
    error: 'bg-hop-marmalade/20 border-hop-marmalade-dark text-hop-marmalade-dark',
    success: 'bg-hop-apple/20 border-hop-apple text-hop-forest',
  }

  const icons = {
    info: 'ℹ️',
    warning: '⚠️',
    error: '❌',
    success: '✅',
  }

  return (
    <div className={`p-4 rounded-lg border-2 ${styles[type]}`}>
      <div className="flex gap-3">
        <span className="text-xl flex-shrink-0">{icons[type]}</span>
        <div className="flex-1">
          {title && <p className="font-semibold mb-1">{title}</p>}
          <div className="text-sm whitespace-pre-line">{children}</div>
        </div>
      </div>
    </div>
  )
}

export function PromptBox({ title, children, color = 'freshair' }) {
  const colorStyles = {
    freshair: 'bg-hop-freshair/20 border-hop-freshair',
    sunshine: 'bg-hop-sunshine/20 border-hop-sunshine',
    pebble: 'bg-hop-pebble border-gray-200',
  }

  return (
    <div className={`p-4 rounded-lg border ${colorStyles[color]}`}>
      {title && (
        <p className="font-medium text-hop-forest mb-2">{title}</p>
      )}
      <div className="text-sm text-gray-600">{children}</div>
    </div>
  )
}
