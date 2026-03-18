import { useState, useEffect } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Header } from '../components/Header'
import { Button } from '../components/ui/Button'
import { formatDate } from '../lib/utils'
import { getLastCheck } from '../lib/supabase'
import { storage } from '../lib/storage'

const HOLIDAY_CLUB_LOCATIONS = ['Holland Road', 'School Road']

export function ChecksMenu() {
  const { section } = useParams()
  const title = section === 'holiday-club' ? 'Holiday Club' : 'Nursery'
  const isHolidayClub = section === 'holiday-club'
  // firstAidDates: { [location]: { created_at } | null }
  const [firstAidDates, setFirstAidDates] = useState({})

  useEffect(() => {
    if (!isHolidayClub) return
    Promise.all(
      HOLIDAY_CLUB_LOCATIONS.map(loc => getLastCheck(loc, 'firstAidBox'))
    ).then(results => {
      const dates = {}
      HOLIDAY_CLUB_LOCATIONS.forEach((loc, i) => { dates[loc] = results[i] || null })
      setFirstAidDates(dates)
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
                <span className="text-lg">🩹 {isHolidayClub ? 'First Aid Box Checklist' : 'Weekly First Aid Box Check'}</span>
              </Button>
            </Link>
            {isHolidayClub && Object.keys(firstAidDates).length > 0 && (
              <div className="mt-1 space-y-0.5">
                {HOLIDAY_CLUB_LOCATIONS.map(loc => {
                  const d = firstAidDates[loc]
                  return (
                    <p key={loc} className="text-xs text-center text-gray-500">
                      {loc}: <span className="font-medium">{d ? new Date(d.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Not yet completed'}</span>
                    </p>
                  )
                })}
              </div>
            )}
          </div>

          {isHolidayClub && (
            <Link to="/glue-gun" state={{ section }}>
              <Button color="marmalade" size="large" fullWidth className="border border-black">
                <span className="text-lg">🔫 Hot Glue Gun Register</span>
              </Button>
            </Link>
          )}
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
