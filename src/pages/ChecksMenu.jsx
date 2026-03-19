import { Link, useParams } from 'react-router-dom'
import { Header } from '../components/Header'
import { Button } from '../components/ui/Button'
import { formatDate } from '../lib/utils'

export function ChecksMenu() {
  const { section } = useParams()
  const title = section === 'holiday-club' ? 'Holiday Club' : 'Nursery'
  const isHolidayClub = section === 'holiday-club'

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

          {isHolidayClub && (
            <Link to="/glue-gun" state={{ section }}>
              <Button color="sunshine" size="large" fullWidth className="border border-black">
                <span className="text-lg">🎨 Hot Glue Gun Register</span>
              </Button>
            </Link>
          )}

          <Link to="/check/firstAidBox" state={{ section }}>
            <Button color={isHolidayClub ? 'blossom' : 'marmalade'} size="large" fullWidth className="border border-black">
              <span className="text-lg">🩹 {isHolidayClub ? 'First Aid Box Checklist' : 'Weekly First Aid Box Check'}</span>
            </Button>
          </Link>
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

        {/* GDPR notice */}
        <div className="rounded-xl p-4 bg-gray-50 border border-gray-200">
          <p className="text-xs text-gray-500 leading-relaxed">
            <span className="font-medium text-gray-600">Data notice:</span> Information collected through these checks is recorded for health, safety, and compliance purposes under legitimate interest (UK GDPR Article 6(1)(f)). Only the minimum data required is collected. Records are held securely and retained in line with Hopscotch's data retention policy. Access is restricted to authorised staff only.
          </p>
        </div>
      </div>
    </div>
  )
}
