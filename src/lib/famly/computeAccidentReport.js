import { filterByMonth, filterByRange, repeatChildren, rollingWindow, locationCounts } from './dataHelpers'

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
    dowOrder: DOW_ORDER,
    dowCounts,
    yoyDiff,
    repeats,
    repeatWindowLabel,
  }
}
