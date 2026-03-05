import { useState, useEffect } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Header } from '../components/Header'
import { Button } from '../components/ui/Button'
import { formatDate } from '../lib/utils'
import { getLastCheck } from '../lib/supabase'

const HOLIDAY_CLUB_LOCATIONS = ['Holland Road', 'School Road']

export function ChecksMenu() {
  const { section } = useParams()
  const title = section === 'holiday-club' ? 'Holiday Club' : 'Nursery'
  const isHolidayClub = section === 'holiday-club'
  const [lastFirstAidDate, setLastFirstAidDate] = useState(undefined)

  useEffect(() => {
    if (!isHolidayClub) return
    Promise.all(
      HOLIDAY_CLUB_LOCATIONS.map(loc => getLastCheck(loc, 'firstAidBox'))
    ).then(results => {
      const latest = results
        .filter(Boolean)
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))[0] || null
      setLastFirstAidDate(latest)
    })
  }, [isHolidayClub])

  return (
    <div className="min-h-screen bg-hop-pebble">
      <Header title={title} showBack />

      <div className="px-4 py-8 max-w-md mx-auto">
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            {isHolidayClub ? (
              <img src="/hopscotch-holiday-club-logo.png" alt="Holiday Club" className="h-48 object-contain" />
            ) : (
              <img src="/hopscotch-logo.png" alt="Nursery" className="h-44 object-contain" />
            )}
          </div>
          <p className="text-hop-forest font-medium">{formatDate()}</p>
        </div>

        <div className="flex flex-col gap-5 mb-8">
          <Link to="/check/roomSafety" state={{ section }}>
            <Button color={isHolidayClub ? 'marmalade' : 'blossom'} size="large" fullWidth className="border border-black">
              <span className="text-lg">🛡️ {isHolidayClub ? 'Holiday Club Daily Checks' : 'Daily Room Opening Checks'}</span>
            </Button>
          </Link>

          {!isHolidayClub && (
            <Link to="/check/gardenOutdoor" state={{ section }}>
              <Button color="apple" size="large" fullWidth className="border border-black">
                <span className="text-lg">🌿 Daily Garden Opening Checks</span>
              </Button>
            </Link>
          )}

          <Link to="/kitchen-safety" state={{ section }}>
            <Button color={isHolidayClub ? 'freshair' : 'freshair'} size="large" fullWidth className="border border-black">
              <span className="text-lg">🍳 Daily Kitchen Safety</span>
            </Button>
          </Link>

          <div>
            <Link to="/check/firstAidBox" state={{ section }}>
              <Button color={isHolidayClub ? 'blossom' : 'marmalade'} size="large" fullWidth className="border border-black">
                <span className="text-lg">🩹 First Aid Box Checklist</span>
              </Button>
            </Link>
            {isHolidayClub && lastFirstAidDate && (
              <p className="text-xs text-center text-gray-500 mt-1">
                Last completed: <span className="font-medium">{new Date(lastFirstAidDate.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
              </p>
            )}
          </div>
        </div>

        {/* View checks links */}
        <div className="text-center mb-8 space-y-2">
          <Link
            to="/summary"
            state={{ section }}
            className="block text-hop-forest hover:text-hop-forest-dark underline underline-offset-2 transition-colors"
          >
            📋 View today's checks →
          </Link>
          <Link
            to="/history"
            state={{ section }}
            className="block text-gray-500 hover:text-hop-forest underline underline-offset-2 transition-colors text-sm"
          >
            📅 View check history (30 days)
          </Link>
        </div>
      </div>
    </div>
  )
}
