import { useState, useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { Header } from '../components/Header'
import { Select } from '../components/ui/Select'
import { SummaryEntry, RoomSafetyGroupEntry, KitchenSafetySummaryEntry, GlueGunSummaryEntry } from '../components/SummaryEntry'
import { getTodayChecks } from '../lib/supabase'
import { nurseries } from '../data/nurseries'
import { formatDate } from '../lib/utils'
import { storage } from '../lib/storage'

const holidayClubLocations = ['Holland Road', 'School Road']

const GLUE_GUN_TYPES = ['glueGunOut', 'glueGunIn']

const holidayClubCheckTypes = [
  { value: 'roomSafety', label: 'Holiday Club Daily Checks' },
  { value: 'kitchenSafety', label: 'Daily Kitchen Safety' },
  { value: 'firstAidBox', label: 'Weekly First Aid Box Check' },
  { value: 'glueGun', label: 'Hot Glue Gun Register' },
]

const nurseryCheckTypes = [
  { value: 'roomSafety', label: 'Daily Room Opening Checks' },
  { value: 'gardenOutdoor', label: 'Daily Garden Opening Checks' },
  { value: 'kitchenSafety', label: 'Daily Kitchen Safety' },
  { value: 'firstAidBox', label: 'Weekly First Aid Box Check' },
]

export function Summary() {
  const location = useLocation()
  const section = location.state?.section
  const locationOptions = section === 'holiday-club' ? holidayClubLocations : nurseries
  const availableCheckTypes = section === 'holiday-club' ? holidayClubCheckTypes : nurseryCheckTypes

  const [checks, setChecks] = useState([])
  const [loading, setLoading] = useState(true)
  const [checkTypeFilter, setCheckTypeFilter] = useState('all')
  const [filter, setFilter] = useState(() => {
    const last = storage.getLastNursery()
    if (section === 'holiday-club') {
      return holidayClubLocations.includes(last) ? last : 'all'
    }
    return last && nurseries.includes(last) ? last : 'all'
  })

  useEffect(() => {
    loadChecks()
  }, [filter])

  const loadChecks = async () => {
    setLoading(true)
    try {
      const data = await getTodayChecks(filter === 'all' ? null : filter)
      setChecks(data)
    } catch (err) {
      console.error('Error loading checks:', err)
    } finally {
      setLoading(false)
    }
  }

  // Filter to section's locations when showing all
  const locationFiltered = filter === 'all' && section
    ? checks.filter(c => locationOptions.includes(c.nursery))
    : checks

  const visibleChecks = checkTypeFilter === 'all'
    ? locationFiltered
    : checkTypeFilter === 'glueGun'
      ? locationFiltered.filter(c => GLUE_GUN_TYPES.includes(c.check_type))
      : locationFiltered.filter(c => c.check_type === checkTypeFilter)

  // Group checks by nursery
  const groupedChecks = visibleChecks.reduce((acc, check) => {
    const nursery = check.nursery
    if (!acc[nursery]) {
      acc[nursery] = []
    }
    acc[nursery].push(check)
    return acc
  }, {})

  return (
    <div className="min-h-screen bg-hop-pebble">
      <Header title="Today's Checks" subtitle={formatDate()} showBack />

      <div className="px-4 py-4 max-w-xl mx-auto">
        {/* Filters */}
        <div className="mb-6 space-y-2">
          <Select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            options={['all', ...locationOptions]}
            placeholder="Filter by location"
          />
          <Select
            value={checkTypeFilter}
            onChange={(e) => setCheckTypeFilter(e.target.value)}
          >
            <option value="all">All check types</option>
            {availableCheckTypes.map(t => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </Select>
        </div>

        {/* Content */}
        {loading ? (
          <div className="text-center py-12">
            <div className="w-8 h-8 border-2 border-hop-forest border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-gray-500">Loading checks...</p>
          </div>
        ) : visibleChecks.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-8 w-8 text-gray-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                />
              </svg>
            </div>
            <p className="text-gray-500 font-medium">No checks completed yet today</p>
            <p className="text-gray-400 text-sm mt-1">
              Checks will appear here once submitted
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {Object.entries(groupedChecks).map(([nurseryName, nurseryChecks]) => (
              <div key={nurseryName}>
                <h3 className="font-display text-lg text-hop-forest font-semibold mb-3">
                  {nurseryName}
                </h3>
                <div className="space-y-3">
                  {(() => {
                    const glueGunTypes = ['glueGunOut', 'glueGunIn']
                    const roomSafetyChecks = section !== 'holiday-club' ? nurseryChecks.filter(c => c.check_type === 'roomSafety') : []
                    const otherChecks = section !== 'holiday-club' ? nurseryChecks.filter(c => c.check_type !== 'roomSafety') : nurseryChecks
                    const glueGunChecks = otherChecks.filter(c => glueGunTypes.includes(c.check_type))
                    // Deduplicate kitchenSafety: keep only the most recent per room (getTodayChecks is DESC so first wins)
                    const seenKS = new Set()
                    const deduped = otherChecks.filter(c => {
                      if (glueGunTypes.includes(c.check_type)) return false
                      if (c.check_type !== 'kitchenSafety') return true
                      const key = c.room || ''
                      if (seenKS.has(key)) return false
                      seenKS.add(key)
                      return true
                    })
                    return (
                      <>
                        {roomSafetyChecks.length > 0 && (
                          <RoomSafetyGroupEntry key="rs-group" nursery={nurseryName} checks={roomSafetyChecks} />
                        )}
                        {glueGunChecks.length > 0 && (
                          <GlueGunSummaryEntry key="glue-gun-group" checks={glueGunChecks} />
                        )}
                        {deduped.map(check => (
                          check.check_type === 'kitchenSafety'
                            ? <KitchenSafetySummaryEntry key={check.id} check={check} section={section} />
                            : <SummaryEntry key={check.id} check={check} section={section} />
                        ))}
                      </>
                    )
                  })()}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
