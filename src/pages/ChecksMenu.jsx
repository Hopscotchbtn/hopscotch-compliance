import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Header } from '../components/Header'
import { Button } from '../components/ui/Button'
import { formatDate } from '../lib/utils'
import { getChecksForWeek, getFirstAidChecksForWeek } from '../lib/supabase'
import { getWeekOptions } from '../lib/generateKitchenSafetyPDF'
import { generateDailyChecksExcel, generateFirstAidExcel } from '../lib/generateRecordsExcel'

const HOLIDAY_LOCATIONS = ['Holland Road', 'School Road']

export function ChecksMenu() {
  const { section } = useParams()
  const title = section === 'holiday-club' ? 'Holiday Club' : 'Nursery'
  const isHolidayClub = section === 'holiday-club'

  const weekOptions = getWeekOptions(8)
  const [dlLocation, setDlLocation] = useState('')
  const [dlType, setDlType] = useState('daily')
  const [dlWeek, setDlWeek] = useState('')
  const [downloading, setDownloading] = useState(false)
  const [dlError, setDlError] = useState(null)

  const handleDownload = async () => {
    const week = weekOptions.find(w => w.value === dlWeek)
    if (!week || !dlLocation) return
    setDownloading(true)
    setDlError(null)
    try {
      const weekStart = new Date(week.value + 'T12:00:00')
      const weekEnd = new Date(week.sunday + 'T12:00:00')
      if (dlType === 'daily') {
        const checks = await getChecksForWeek(dlLocation, weekStart, weekEnd)
        generateDailyChecksExcel(dlLocation, checks, weekStart, weekEnd)
      } else {
        const checks = await getFirstAidChecksForWeek(dlLocation, weekStart, weekEnd)
        generateFirstAidExcel(dlLocation, checks, weekStart, weekEnd)
      }
    } catch (err) {
      console.error('Download error:', err)
      setDlError('Failed to download. Please try again.')
    } finally {
      setDownloading(false)
    }
  }

  const selectClass = 'w-full px-3 py-2 border-2 border-gray-200 rounded-lg text-hop-forest text-sm font-body focus:outline-none focus:border-hop-forest mb-3'

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

            <select value={dlWeek} onChange={e => setDlWeek(e.target.value)} className={selectClass}>
              <option value="">Select a week…</option>
              {weekOptions.map(w => <option key={w.value} value={w.value}>{w.label}</option>)}
            </select>

            <Button
              color="marmalade"
              size="large"
              fullWidth
              disabled={!dlLocation || !dlWeek || downloading}
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
