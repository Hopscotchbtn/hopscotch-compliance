import { Card } from './ui/Card'
import { Badge, StatusDot } from './ui/Badge'
import { checkTypes } from '../data/checklists'

export function SummaryEntry({ check }) {
  const checkType = checkTypes[check.check_type]
  const hasIssues = check.has_issues
  const time = new Date(check.created_at).toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
  })

  return (
    <Card>
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
          {check.overall_notes && (
            <p className="text-xs text-gray-400 truncate">{check.overall_notes}</p>
          )}
        </div>
      </div>
    </Card>
  )
}
