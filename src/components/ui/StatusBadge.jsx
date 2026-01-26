export function StatusBadge({ status }) {
  const statusStyles = {
    draft: 'bg-gray-200 text-gray-600',
    open: 'bg-hop-sunshine text-hop-forest',
    'pending-review': 'bg-hop-marmalade/20 text-hop-marmalade-dark',
    'signed-off': 'bg-hop-apple/20 text-hop-apple',
    escalated: 'bg-hop-marmalade-dark/20 text-hop-marmalade-dark',
  }

  const statusLabels = {
    draft: 'Draft',
    open: 'Open',
    'pending-review': 'Pending Review',
    'signed-off': 'Signed Off',
    escalated: 'Escalated',
  }

  return (
    <span className={`px-3 py-1 rounded-full text-sm font-medium ${statusStyles[status] || statusStyles.draft}`}>
      {statusLabels[status] || status}
    </span>
  )
}

export function SeverityBadge({ severity }) {
  const severityStyles = {
    minor: 'bg-hop-apple/20 text-hop-apple',
    moderate: 'bg-hop-sunshine text-hop-forest',
    serious: 'bg-hop-marmalade text-white',
    critical: 'bg-hop-marmalade-dark text-white',
  }

  return (
    <span className={`px-3 py-1 rounded-full text-sm font-medium capitalize ${severityStyles[severity] || 'bg-gray-200 text-gray-600'}`}>
      {severity}
    </span>
  )
}
