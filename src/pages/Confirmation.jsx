import { useLocation, useNavigate, Link } from 'react-router-dom'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { ConfirmationCard } from '../components/ConfirmationCard'
import { checkTypes } from '../data/checklists'
import { formatShortDate, formatTime } from '../lib/utils'

export function Confirmation() {
  const location = useLocation()
  const navigate = useNavigate()

  const { nursery, room, completedBy, checkType, hasIssues, failedItems } =
    location.state || {}

  const checkTypeData = checkTypes[checkType]

  if (!checkTypeData || !nursery) {
    navigate('/')
    return null
  }

  const now = new Date()

  return (
    <div className="min-h-screen bg-hop-pebble px-4 py-8">
      <div className="max-w-md mx-auto">
        {/* Success checkmark */}
        <div className="text-center mb-6">
          <div className="w-20 h-20 bg-hop-apple rounded-full flex items-center justify-center mx-auto mb-4 animate-scale-in">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-10 w-10 text-white"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={3}
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>
          <h1 className="font-display text-2xl text-hop-forest font-semibold">
            Check Complete
          </h1>
        </div>

        {/* Summary card */}
        <div className="mb-6">
          <ConfirmationCard
            checkType={checkTypeData.name}
            nursery={nursery}
            room={room}
            completedBy={completedBy}
            date={formatShortDate(now)}
            time={formatTime(now)}
          />
        </div>

        {/* Issues warning */}
        {hasIssues && (
          <Card className="mb-6 bg-hop-marmalade/10 border border-hop-marmalade">
            <div className="flex items-start gap-3">
              <span className="text-2xl">⚠️</span>
              <div>
                <p className="font-medium text-hop-forest mb-2">
                  {failedItems?.length} issue{failedItems?.length !== 1 ? 's' : ''} recorded
                </p>
                <p className="text-sm text-gray-600 mb-3">
                  Please ensure the duty manager has been informed
                </p>
                <ul className="text-sm space-y-2">
                  {failedItems?.map((item, index) => (
                    <li key={index} className="text-hop-marmalade-dark">
                      • {item.text}
                      {item.note && (
                        <span className="block text-gray-600 text-xs ml-3 mt-0.5">
                          Note: {item.note}
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </Card>
        )}

        {/* Action buttons */}
        <div className="space-y-3">
          <Link to="/">
            <Button color="forest" size="large" fullWidth>
              Done
            </Button>
          </Link>

          <Link to={`/check/${checkType}`}>
            <Button color="forest" variant="secondary" size="large" fullWidth>
              Start another check
            </Button>
          </Link>
        </div>
      </div>
    </div>
  )
}
