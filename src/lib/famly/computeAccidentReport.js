import { filterByMonth, filterByRange, repeatChildren, rollingWindow, locationCounts, categoryCounts, isOutdoor, outdoorMonthlyTrend, detectMonthlyPatterns, isHome, homeMonthlyTrend, childDisplayName } from './dataHelpers'

const DOW_ORDER = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

export function computeAccidentReport(incidents, period) {
  const periodIncs = filterByRange(incidents, period.from, period.to)
  const totalReports = periodIncs.length

  const onArrival = periodIncs.filter(x => x.onArrival).length
  const atNursery = totalReports - onArrival

  const ofstedIncs = periodIncs.filter(x => x.ofsted)
  const riddorIncs = periodIncs.filter(x => x.riddor)
  const ladoIncs = periodIncs.filter(x => x.lado)
  const ofstedCount = ofstedIncs.length
  const riddorCount = riddorIncs.length
  const ladoCount = ladoIncs.length

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
  const homeAcknowledged = homeIncs.filter(x => x.acknowledgedAt).length
  const homeAckRate = homeIncs.length > 0 ? Math.round((homeAcknowledged / homeIncs.length) * 100) : 100
  const homeHigh = homeIncs.filter(x => x.severity === 'high')
  const homeMedium = homeIncs.filter(x => x.severity === 'medium')
  const homeDowCounts = Object.fromEntries(DOW_ORDER.map(d => [d, 0]))
  for (const inc of homeIncs) {
    const d = new Date(inc.happenedAt)
    if (!isNaN(d)) homeDowCounts[DOW_ORDER[(d.getDay() + 6) % 7]]++
  }
  const homeSortedIncs = [...homeIncs].sort((a, b) => new Date(b.happenedAt) - new Date(a.happenedAt))

  const threeMonthCutoff = new Date(period.to)
  threeMonthCutoff.setMonth(threeMonthCutoff.getMonth() - 3)
  threeMonthCutoff.setDate(1)
  threeMonthCutoff.setHours(0, 0, 0, 0)
  const home3MonthIncs = filterByRange(incidents, threeMonthCutoff, period.to)
    .filter(x => (x.location || '').toLowerCase() === 'home' || x.onArrival)
  const home3MonthSortedIncs = [...home3MonthIncs].sort((a, b) => new Date(b.happenedAt) - new Date(a.happenedAt))
  const homeRepeat3Map = new Map()
  for (const inc of home3MonthIncs) {
    const list = homeRepeat3Map.get(inc.childName) ?? []
    list.push(inc)
    homeRepeat3Map.set(inc.childName, list)
  }
  const homeRepeats3Month = Array.from(homeRepeat3Map.entries())
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

  // Nursery (at-setting) stats
  const nurseryAcknowledged = settingIncs.filter(x => x.acknowledgedAt).length
  const nurseryAckRate = settingIncs.length > 0 ? Math.round((nurseryAcknowledged / settingIncs.length) * 100) : 100
  const nurseryHigh = settingIncs.filter(x => x.severity === 'high')
  const nurseryMedium = settingIncs.filter(x => x.severity === 'medium')
  const nurseryDowCounts = Object.fromEntries(DOW_ORDER.map(d => [d, 0]))
  for (const inc of settingIncs) {
    const d = new Date(inc.happenedAt)
    if (!isNaN(d)) nurseryDowCounts[DOW_ORDER[(d.getDay() + 6) % 7]]++
  }
  const nurserySortedIncs = [...settingIncs].sort((a, b) => new Date(b.happenedAt) - new Date(a.happenedAt))
  const nurseryInjuryTypes = categoryCounts(settingIncs)
  const nurseryLocs = locationCounts(settingIncs)
  const nowN = new Date()
  const nurseryMonthly = Array.from({ length: 12 }, (_, i) => {
    const d = new Date(nowN.getFullYear(), nowN.getMonth() - (11 - i), 1)
    const yearMonth = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    return {
      yearMonth,
      label: d.toLocaleDateString('en-GB', { month: 'short', year: '2-digit' }),
      count: incidents.filter(inc => inc.happenedAt.startsWith(yearMonth) && !isHome(inc)).length,
    }
  })
  const nurseryPatterns = detectMonthlyPatterns(nurseryMonthly, 'nursery')
  const nurseryRepeatMap = new Map()
  for (const inc of settingIncs) {
    const list = nurseryRepeatMap.get(inc.childName) ?? []
    list.push(inc)
    nurseryRepeatMap.set(inc.childName, list)
  }
  const nurseryRepeats = Array.from(nurseryRepeatMap.entries())
    .filter(([, incs]) => incs.length >= 2)
    .map(([name, incs]) => {
      const sorted = [...incs].sort((a, b) => new Date(b.happenedAt) - new Date(a.happenedAt))
      return {
        displayName: childDisplayName(name),
        count: incs.length,
        incidents: sorted.map(inc => ({
          date: inc.happenedAt,
          injuryCategory: inc.injuryCategory,
          location: inc.location,
        })),
      }
    })
    .sort((a, b) => b.count - a.count)

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

  const hourCounts = Array.from({ length: 24 }, (_, h) => ({
    hour: h,
    count: periodIncs.filter(inc => {
      if (inc.time) return parseInt(inc.time.split(':')[0], 10) === h
      const d = new Date(inc.happenedAt)
      return !isNaN(d) && d.getHours() === h
    }).length,
  }))

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

  const siteMap = new Map()
  for (const inc of periodIncs) {
    const key = inc.siteName || inc.siteId || 'Unknown'
    const entry = siteMap.get(key) ?? { siteName: key, incs: [] }
    entry.incs.push(inc)
    siteMap.set(key, entry)
  }
  const siteComparison = siteMap.size > 1
    ? Array.from(siteMap.values())
        .map(({ siteName: sName, incs: sIncs }) => {
          const acked = sIncs.filter(x => x.acknowledgedAt).length
          return {
            siteName: sName,
            total: sIncs.length,
            high: sIncs.filter(x => x.severity === 'high').length,
            medium: sIncs.filter(x => x.severity === 'medium').length,
            ackRate: sIncs.length > 0 ? Math.round((acked / sIncs.length) * 100) : 100,
            homeCount: sIncs.filter(isHome).length,
            regulatoryCount: sIncs.filter(x => x.riddor || x.ofsted || x.lado).length,
          }
        })
        .sort((a, b) => a.siteName.localeCompare(b.siteName))
    : []

  let siteMonthlyComparison = null
  const trailingMonths = Array.from({ length: 12 }, (_, i) => {
    const d = new Date(nowN.getFullYear(), nowN.getMonth() - (11 - i), 1)
    return {
      yearMonth: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
      label: d.toLocaleDateString('en-GB', { month: 'short', year: '2-digit' }),
    }
  })
  const ymIndex = new Map(trailingMonths.map((m, i) => [m.yearMonth, i]))
  const buckets = new Map()
  for (const inc of incidents) {
    const key = inc.siteName || inc.siteId
    if (!key) continue
    const idx = ymIndex.get((inc.happenedAt || '').slice(0, 7))
    if (idx === undefined) continue
    let entry = buckets.get(key)
    if (!entry) {
      entry = { nursery: Array(12).fill(0), home: Array(12).fill(0) }
      buckets.set(key, entry)
    }
    if (isHome(inc)) entry.home[idx]++
    else entry.nursery[idx]++
  }
  function hourLabel(h) {
    if (h === 0) return '12am'
    if (h < 12) return `${h}am`
    if (h === 12) return '12pm'
    return `${h - 12}pm`
  }
  const todHourBuckets = new Map()
  for (const inc of periodIncs) {
    const key = inc.siteName || inc.siteId
    if (!key) continue
    let h
    if (inc.time) {
      h = parseInt(inc.time.split(':')[0], 10)
    } else {
      const d = new Date(inc.happenedAt)
      h = isNaN(d) ? null : d.getHours()
    }
    if (h === null || isNaN(h) || h < 0 || h > 23) continue
    let counts = todHourBuckets.get(key)
    if (!counts) {
      counts = Array(24).fill(0)
      todHourBuckets.set(key, counts)
    }
    counts[h]++
  }
  let siteTimeOfDayComparison = null
  if (todHourBuckets.size > 1) {
    const hourTotals = Array.from({ length: 24 }, (_, h) =>
      Array.from(todHourBuckets.values()).reduce((a, c) => a + c[h], 0)
    )
    const activeHours = hourTotals
      .map((total, h) => ({ hour: h, total }))
      .filter(x => x.total > 0)
    if (activeHours.length > 0) {
      const activeBuckets = activeHours.map(({ hour }) => ({ key: `h${hour}`, label: hourLabel(hour), hour }))
      const sortedSites = Array.from(todHourBuckets.keys()).sort((a, b) => a.localeCompare(b))
      const todRows = sortedSites.map(siteName => {
        const fullCounts = todHourBuckets.get(siteName)
        const counts = activeBuckets.map(b => fullCounts[b.hour])
        let peakIdx = -1
        let peakVal = 0
        counts.forEach((c, i) => { if (c > peakVal) { peakVal = c; peakIdx = i } })
        return {
          siteName,
          counts,
          peakLabel: peakIdx === -1 ? '—' : activeBuckets[peakIdx].label,
        }
      })
      const bucketTotals = activeBuckets.map((_, i) => todRows.reduce((a, r) => a + r.counts[i], 0))
      siteTimeOfDayComparison = {
        buckets: activeBuckets.map(b => ({ key: b.key, label: b.label })),
        rows: todRows,
        bucketTotals,
      }
    }
  }

  if (buckets.size > 1) {
    const sortedSites = Array.from(buckets.keys()).sort((a, b) => a.localeCompare(b))
    const nursery = sortedSites.map(siteName => {
      const counts = buckets.get(siteName).nursery
      return { siteName, counts, total: counts.reduce((a, b) => a + b, 0) }
    })
    const home = sortedSites.map(siteName => {
      const counts = buckets.get(siteName).home
      return { siteName, counts, total: counts.reduce((a, b) => a + b, 0) }
    })
    const nurseryMonthTotals = trailingMonths.map((_, i) => nursery.reduce((a, s) => a + s.counts[i], 0))
    const homeMonthTotals = trailingMonths.map((_, i) => home.reduce((a, s) => a + s.counts[i], 0))
    siteMonthlyComparison = {
      months: trailingMonths,
      nursery,
      home,
      nurseryMonthTotals,
      homeMonthTotals,
      nurseryGrandTotal: nursery.reduce((a, s) => a + s.total, 0),
      homeGrandTotal: home.reduce((a, s) => a + s.total, 0),
    }
  }

  return {
    period,
    totalReports,
    onArrival,
    atNursery,
    ofstedCount,
    riddorCount,
    ladoCount,
    ofstedIncs,
    riddorIncs,
    ladoIncs,
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
    homeAcknowledged,
    homeAckRate,
    homeHigh,
    homeMedium,
    homeDowCounts,
    homeSortedIncs,
    home3MonthSortedIncs,
    homeRepeats3Month,
    nurseryAcknowledged,
    nurseryAckRate,
    nurseryHigh,
    nurseryMedium,
    nurseryDowCounts,
    nurserySortedIncs,
    nurseryInjuryTypes,
    nurseryLocs,
    nurseryMonthly,
    nurseryPatterns,
    nurseryRepeats,
    dowOrder: DOW_ORDER,
    dowCounts,
    hourCounts,
    yoyDiff,
    repeats,
    repeatWindowLabel,
    siteComparison,
    siteMonthlyComparison,
    siteTimeOfDayComparison,
  }
}
