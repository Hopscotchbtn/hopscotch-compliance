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

export function RoomSafetyGroupEntry({ nursery, checks }) {
  const completedRooms = new Set(checks.map(c => c.room))

  const base = checkTypes.roomSafety?.rooms || []
  const expectedRooms = (() => {
    if (nursery === 'Preston Park') {
      const idx = base.indexOf('Softplay')
      return [...base.slice(0, idx), 'Preschool', ...base.slice(idx)]
    }
    return [...base]
  })()
  // Append any completed custom rooms not in the standard list
  checks.forEach(c => { if (!expectedRooms.includes(c.room)) expectedRooms.push(c.room) })

  const completedCount = expectedRooms.filter(r => completedRooms.has(r)).length
  const allDone = completedCount === expectedRooms.length

  return (
    <Card>
      <div className="flex items-start gap-3">
        <StatusDot status={allDone ? 'pass' : 'pending'} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-medium text-hop-forest">Daily Room Opening Checks</span>
            <Badge color="sunshine" size="small">Daily Room Opening</Badge>
          </div>
          <p className="text-sm text-gray-500 mt-0.5">
            {completedCount} of {expectedRooms.length} rooms complete
          </p>
          <div className="mt-2 space-y-1">
            {expectedRooms.map(room => (
              <div key={room} className="flex items-center gap-2 text-xs">
                <span className={completedRooms.has(room) ? 'text-hop-apple' : 'text-gray-300'}>
                  {completedRooms.has(room) ? '✓' : '○'}
                </span>
                <span className={completedRooms.has(room) ? 'text-hop-forest' : 'text-gray-400'}>
                  {room}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Card>
  )
}
