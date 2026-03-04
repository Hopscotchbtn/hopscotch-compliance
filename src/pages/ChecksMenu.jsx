import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Header } from '../components/Header'
import { Button } from '../components/ui/Button'
import { formatDate } from '../lib/utils'
import { getChecksForDateRange } from '../lib/supabase'
import { generateDailyChecksExcel, generateFirstAidExcel } from '../lib/generateRecordsExcel'

const HOLIDAY_LOCATIONS = ['Holland Road', 'School Road']

function prevMonthRange() {
  const now = new Date()
  const start = new Date(now.getFullYear(), now.getMonth() - 1, 1)
  const end = new Date(now.getFullYear(), now.getMonth(), 0)
  return {
    start: start.toISOString().slice(0, 10),
    end: end.toISOString().slice(0, 10),
  }
}

export function ChecksMenu() {
  const { section } = useParams()
  const title = section === 'holiday-club' ? 'Holiday Club' : 'Nursery'
  const isHolidayClub = section === 'holiday-club'

  const defaultRange = prevMonthRange()
  const [dlLocation, setDlLocation] = useState('')
  const [dlType, setDlType] = useState('daily')
  const [dlStart, setDlStart] = useState(defaultRange.start)
  const [dlEnd, setDlEnd] = useState(defaultRange.end)
  const [downloading, setDownloading] = useState(false)
  const [dlError, setDlError] = useState(null)

  const handleDownload = async () => {
    if (!dlLocation || !dlStart || !dlEnd) return
    setDownloading(true)
    setDlError(null)
    try {
      if (dlType === 'daily') {
        const checks = await getChecksForDateRange(dlLocation, dlStart, dlEnd, { room: 'Holiday Club' })
        await generateDailyChecksExcel(dlLocation, checks, dlStart, dlEnd)
      } else {
        const checks = await getChecksForDateRange(dlLocation, dlStart, dlEnd, { checkType: 'firstAidBox' })
        await generateFirstAidExcel(dlLocation, checks, dlStart, dlEnd)
      }
    } catch (err) {
      console.error('Download error:', err)
      setDlError('Failed to download. Please try again.')
    } finally {
      setDownloading(false)
    }
  }

  const selectClass = 'w-full px-3 py-2 border-2 border-gray-200 rounded-lg text-hop-forest text-sm font-body focus:outline-none focus:border-hop-forest mb-3'
  const inputClass = 'w-full px-3 py-2 border-2 border-gray-200 rounded-lg text-hop-forest text-sm font-body focus:outline-none focus:border-hop-forest mb-3'

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
          {!isHolidayClub && (
            <Link to="/check/roomOpening">
              <Button color="freshair" size="large" fullWidth className="border border-black">
                <span className="text-lg">🌅 Room Opening Check</span>
              </Button>
            </Link>
          )}

          <Link to="/check/roomSafety" state={{ section }}>
            <Button color={isHolidayClub ? 'marmalade' : 'sunshine'} size="large" fullWidth className="border border-black">
              <span className="text-lg">🛡️ {isHolidayClub ? 'Holiday Club Daily Checks' : 'Room Safety Check'}</span>
            </Button>
          </Link>

          {!isHolidayClub && (
            <Link to="/check/gardenOutdoor">
              <Button color="apple" size="large" fullWidth className="border border-black">
                <span className="text-lg">🌿 Garden & Outdoor Check</span>
              </Button>
            </Link>
          )}

          <Link to="/kitchen-safety" state={{ section }}>
            <Button color={isHolidayClub ? 'freshair' : 'marmalade'} size="large" fullWidth className="border border-black">
              <span className="text-lg">🍳 Kitchen Food Safety</span>
            </Button>
          </Link>

          <Link to="/check/firstAidBox" state={{ section }}>
            <Button color="blossom" size="large" fullWidth className="border border-black">
              <span className="text-lg">🩹 First Aid Box Check</span>
            </Button>
          </Link>
        </div>

        {/* Nursery: view links */}
        {!isHolidayClub && (
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
        )}

        {/* Holiday Club: Download Records */}
        {isHolidayClub && (
          <div className="p-4 bg-white rounded-xl border-2 border-gray-200">
            <p className="text-sm font-medium text-hop-forest mb-3">📥 Download Records</p>

            <select value={dlLocation} onChange={e => setDlLocation(e.target.value)} className={selectClass}>
              <option value="">Select location…</option>
              {HOLIDAY_LOCATIONS.map(l => <option key={l} value={l}>{l}</option>)}
            </select>

            <select value={dlType} onChange={e => setDlType(e.target.value)} className={selectClass}>
              <option value="daily">Holiday Club Daily Checks</option>
              <option value="firstAid">First Aid Box Checks</option>
            </select>

            <div className="flex gap-2 mb-3">
              <div className="flex-1">
                <p className="text-xs text-gray-500 mb-1">From</p>
                <input type="date" value={dlStart} onChange={e => setDlStart(e.target.value)}
                  className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg text-hop-forest text-sm font-body focus:outline-none focus:border-hop-forest" />
              </div>
              <div className="flex-1">
                <p className="text-xs text-gray-500 mb-1">To</p>
                <input type="date" value={dlEnd} onChange={e => setDlEnd(e.target.value)}
                  className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg text-hop-forest text-sm font-body focus:outline-none focus:border-hop-forest" />
              </div>
            </div>

            <Button
              color="marmalade"
              size="large"
              fullWidth
              disabled={!dlLocation || !dlStart || !dlEnd || downloading}
              onClick={handleDownload}
            >
              {downloading ? 'Generating…' : 'Download Excel'}
            </Button>

            {dlError && <p className="mt-2 text-xs text-red-600">{dlError}</p>}
          </div>
        )}
      </div>
    </div>
  )
}
