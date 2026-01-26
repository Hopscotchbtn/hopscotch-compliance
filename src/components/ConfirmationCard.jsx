import { Card } from './ui/Card'

export function ConfirmationCard({ checkType, nursery, room, completedBy, date, time }) {
  return (
    <Card className="border border-gray-100">
      <div className="space-y-3">
        <div className="flex justify-between">
          <span className="text-gray-500 text-sm">Check Type</span>
          <span className="font-medium text-hop-forest">{checkType}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-500 text-sm">Nursery</span>
          <span className="font-medium text-hop-forest">{nursery}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-500 text-sm">Room</span>
          <span className="font-medium text-hop-forest">{room}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-500 text-sm">Date</span>
          <span className="font-medium text-hop-forest">{date}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-500 text-sm">Time</span>
          <span className="font-medium text-hop-forest">{time}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-500 text-sm">Completed By</span>
          <span className="font-medium text-hop-forest">{completedBy}</span>
        </div>
      </div>
    </Card>
  )
}
