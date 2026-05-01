import { filterByMonth, filterByRange, repeatChildren, rollingWindow, locationCounts, categoryCounts, isOutdoor, outdoorMonthlyTrend, detectMonthlyPatterns, isHome, homeMonthlyTrend, childDisplayName } from './dataHelpers'

const DOW_ORDER = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

export function computeAccidentReport(incidents, period) {
  const periodIncs = filterByRange(incidents, period.from, period.to)
  const totalReports = periodIncs.length

  const onArrival = periodIncs.filter(x => x.onArrival).length
  const atNursery = totalReports - onArrival

  const ofstedCount = periodIncs.filter(x => x.ofsted).length
  const riddorCount = periodIncs.filter(x => x.riddor).length
  const ladoCount = periodIncs.filter(x => x.lado).length

  const acknowledged = periodIncs.filter(x => x.acknowledgedAt).length
  const ackRate = totalReports > 0 ? Math.round((acknowledged / totalReports) * 100) : 100

  const high = periodIncs.filter(x => x.severity === 'high')
  const medium = periodIncs.filter(x => x.severity === 'medium')

  const allLocs = locationCounts(periodIncs)
  const homeLoc = allLocs.find(l => l.location.toLowerCase() === 'home') ?? null
  const siteLocs = allLocs.filter(l => l.location.toLowerCase() !== 'home').slice(0, 5)

  const homeIncs = periodIncs.filter(x => (x.location || '').toLowerCase() === 'home' || x.onArrival)
  const settingIncs = periodIncs.filter(x => (x.location || '').toLowerCase() !== 'home' && !x.onArrival)

  const injuryTypes = categoryCounts(periodIncs)

  const periodOutdoor = periodIncs.filter(isOutdoor)
  const outdoorMonthly = outdoorMonthlyTrend(incidents)
  const outdoorPatterns = detectMonthlyPatterns(outdoorMonthly, 'outdoor')
  const outdoorInjuryTypes = categoryCounts(periodOutdoor)

  const periodHome = periodIncs.filter(isHome)
  const homeMonthly = homeMonthlyTrend(incidents)
  const homePatterns = detectMonthlyPatterns(homeMonthly, 'home/on-arrival')
  const homeInjuryTypes = categoryCounts(periodHome)

  const homeRepeatMap = new Map()
  for (const inc of periodHome) {
    const list = homeRepeatMap.get(inc.childName) ?? []
    list.push(inc)
    homeRepeatMap.set(inc.childName, list)
  }
  const homeRepeats = Array.from(homeRepeatMap.entries())
    .filter(([, incs]) => incs.length >= 2)
    .map(([name, incs]) => {
      const sorted = [...incs].sort((a, b) => new Date(b.happenedAt) - new Date(a.happenedAt))
      return {
        displayName: childDisplayName(name),
        count: incs.length,
        incidents: sorted.map(inc => ({
          date: inc.happenedAt,
          injuryCategory: inc.injuryCategory,
          onArrival: !!inc.onArrival,
        })),
      }
    })
    .sort((a, b) => b.count - a.count)

  const dowCounts = Object.fromEntries(DOW_ORDER.map(d => [d, 0]))
  for (const inc of periodIncs) {
    const d = new Date(inc.happenedAt)
    if (!isNaN(d)) dowCounts[DOW_ORDER[(d.getDay() + 6) % 7]]++
  }

  let yoyDiff = null
  if (period.type === 'month' && period.monthKey) {
    const [y0, m0] = period.monthKey.split('-').map(Number)
    const lastYearKey = `${y0 - 1}-${String(m0).padStart(2, '0')}`
    const lastYearIncs = filterByMonth(incidents, lastYearKey)
    if (lastYearIncs.length > 0) {
      yoyDiff = totalReports - lastYearIncs.length
    }
  }

  const repeatPool = period.type === 'month' ? rollingWindow(incidents, 3) : periodIncs
  const repeatWindowLabel = period.type === 'month' ? 'rolling 3 months' : period.label
  const repeats = repeatChildren(repeatPool, 2).slice(0, 8)

  return {
    period,
    totalReports,
    onArrival,
    atNursery,
    ofstedCount,
    riddorCount,
    ladoCount,
    acknowledged,
    ackRate,
    high,
    medium,
    homeLoc,
    siteLocs,
    homeIncs,
    settingIncs,
    injuryTypes,
    periodOutdoor,
    outdoorMonthly,
    outdoorPatterns,
    outdoorInjuryTypes,
    periodHome,
    homeMonthly,
    homePatterns,
    homeInjuryTypes,
    homeRepeats,
    dowOrder: DOW_ORDER,
    dowCounts,
    yoyDiff,
    repeats,
    repeatWindowLabel,
  }
}
