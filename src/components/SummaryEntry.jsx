import { useState } from 'react'
import { Card } from './ui/Card'
import { Badge, StatusDot } from './ui/Badge'
import { checkTypes } from '../data/checklists'

export function SummaryEntry({ check }) {
  const [expanded, setExpanded] = useState(false)

  const checkType = checkTypes[check.check_type]
  const hasIssues = check.has_issues
  const time = new Date(check.created_at).toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
  })

  const failedItems = check.items?.filter((item) => item.status === 'fail') || []

  return (
    <Card
      className={`cursor-pointer transition-all duration-200 ${
        expanded ? 'ring-2 ring-hop-forest/20' : ''
      }`}
      onClick={() => setExpanded(!expanded)}
    >
      <div className="flex items-center gap-3">
        <StatusDot status={hasIssues ? 'fail' : 'pass'} />

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-medium text-hop-forest">{check.room}</span>
            <Badge color={checkType?.color || 'gray'} size="small">
              {checkType?.shortName || check.check_type}
            </Badge>
          </div>
          <p className="text-sm text-gray-500 truncate">
            {time} • {check.completed_by}
          </p>
        </div>

        <svg
          xmlns="http://www.w3.org/2000/svg"
          className={`h-5 w-5 text-gray-400 transition-transform duration-200 ${
            expanded ? 'rotate-180' : ''
          }`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </div>

      {expanded && (
        <div className="mt-4 pt-4 border-t border-gray-100 space-y-2">
          {check.items?.map((item) => (
            <div key={item.id} className="flex items-start gap-2 text-sm">
              <span
                className={`
                  flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-xs
                  ${item.status === 'pass' ? 'bg-hop-apple/20 text-hop-apple' : ''}
                  ${item.status === 'fail' ? 'bg-hop-marmalade-dark/20 text-hop-marmalade-dark' : ''}
                  ${item.status === 'na' ? 'bg-gray-200 text-gray-500' : ''}
                `}
              >
                {item.status === 'pass' && '✓'}
                {item.status === 'fail' && '✗'}
                {item.status === 'na' && '—'}
              </span>
              <div className="flex-1">
                <p className={item.status === 'fail' ? 'text-hop-marmalade-dark' : 'text-gray-600'}>
                  {item.text}
                </p>
                {item.note && (
                  <p className="text-hop-marmalade-dark text-xs mt-1 bg-hop-marmalade/10 px-2 py-1 rounded">
                    Note: {item.note}
                  </p>
                )}
              </div>
            </div>
          ))}

          {check.water_temperature && (
            <div className="text-sm text-gray-600 mt-2">
              Water temperature: <strong>{check.water_temperature}°C</strong>
            </div>
          )}
        </div>
      )}
    </Card>
  )
}
