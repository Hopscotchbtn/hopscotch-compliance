import { Card } from './ui/Card'
import { StatusDot } from './ui/Badge'
import { checkTypes } from '../data/checklists'

const checkLabels = {
  'holiday-club': {
    roomSafety: 'Holiday Club Daily Checks',
    kitchenSafety: 'Daily Kitchen Safety',
    firstAidBox: 'First Aid Box Checklist',
  },
  nursery: {
    gardenOutdoor: 'Daily Garden Opening Checks',
    kitchenSafety: 'Daily Kitchen Safety',
    firstAidBox: 'Weekly First Aid Box Check',
  },
}

export function SummaryEntry({ check, section = '' }) {
  const isHolidayClub = section === 'holiday-club'
  const checkType = checkTypes[check.check_type]
  const hasIssues = check.has_issues
  const labels = checkLabels[section] || checkLabels.nursery
  const title = labels[check.check_type] || checkType?.name || check.check_type
  const time = new Date(check.created_at).toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
  })
  const failedItems = check.items?.filter(item => item.status === 'fail') || []

  return (
    <Card className={hasIssues ? 'border-l-4 border-l-hop-marmalade' : ''}>
      <div className="flex items-start gap-3">
        <StatusDot status={hasIssues ? 'fail' : 'pass'} />

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-medium text-hop-forest">{title}</span>
          </div>
          <p className="text-sm text-gray-500 truncate">
            {isHolidayClub && check.nursery && <>{check.nursery} · </>}{time} • {check.completed_by}
          </p>
          {check.overall_notes && (
            <p className="text-xs text-gray-400 truncate">{check.overall_notes}</p>
          )}
          {hasIssues && failedItems.length > 0 && (
            <div className="mt-3 pt-3 border-t border-gray-100">
              <p className="text-xs font-medium text-gray-500 mb-2">Issues reported:</p>
              <ul className="text-sm space-y-1">
                {failedItems.map((item, idx) => (
                  <li key={idx} className="text-hop-marmalade-dark">
                    • {item.text}
                    {item.note && (
                      <span className="block text-gray-500 text-xs ml-3">{item.note}</span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </Card>
  )
}

export function RoomSafetyGroupEntry({ nursery, checks }) {
  const completedRooms = new Set(checks.map(c => c.room))

  const base = checkTypes.roomSafety?.rooms || []
  const standardRooms = nursery === 'Preston Park'
    ? (() => { const idx = base.indexOf('Softplay'); return [...base.slice(0, idx), 'Preschool', ...base.slice(idx)] })()
    : [...base]
  const customCompleted = checks.map(c => c.room).filter(r => !standardRooms.includes(r))
  const expectedRooms = [...standardRooms, ...customCompleted]

  const completedCount = expectedRooms.filter(r => completedRooms.has(r)).length
  const allDone = completedCount === expectedRooms.length

  return (
    <Card>
      <div className="flex items-start gap-3">
        <StatusDot status={allDone ? 'pass' : 'pending'} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-medium text-hop-forest">Daily Room Opening Checks</span>
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
