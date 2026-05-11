import { classifyInjury } from './classifyInjury'
import { classifySeverity } from './classifySeverity'

const SITE_ABBREVIATIONS = {
  'Hopscotch Hove Station': 'HS',
  'Hopscotch Peacehaven':   'PH',
  'Hopscotch Preston Park': 'PP',
  'Hopscotch Seaford':      'SF',
  'Hopscotch Seven Dials':  'SD',
  'Hopscotch West Hove':    'WH',
  'Hopscotch Worthing':     'W',
}

export function abbreviateSite(name) {
  return SITE_ABBREVIATIONS[name] ?? name
}

export function childDisplayName(fullName) {
  const parts = fullName.trim().split(' ')
  if (parts.length < 2) return fullName
  return `${parts[0]} ${parts[parts.length - 1][0]}.`
}

export function classifyAll(incidents) {
  return incidents.map(inc => ({
    ...inc,
    injuryCategory: classifyInjury(inc.nature),
    severity: classifySeverity(inc.nature, inc.firstAid),
  }))
}

export function filterByMonth(incidents, yearMonth) {
  return incidents.filter(inc => (inc.happenedAt || '').startsWith(yearMonth))
}

export function rollingWindow(incidents, months) {
  const cutoff = new Date()
  cutoff.setMonth(cutoff.getMonth() - months)
  cutoff.setDate(1)
  cutoff.setHours(0, 0, 0, 0)
  return incidents.filter(inc => new Date(inc.happenedAt) >= cutoff)
}

export function filterByRange(incidents, from, to) {
  const fromMs = from instanceof Date ? from.getTime() : new Date(from).getTime()
  const toMs = to instanceof Date ? to.getTime() : new Date(to).getTime()
  return incidents.filter(inc => {
    const t = new Date(inc.happenedAt).getTime()
    return t >= fromMs && t <= toMs
  })
}

export function repeatChildren(incidents, minCount = 2) {
  const map = new Map()
  for (const inc of incidents) {
    const list = map.get(inc.childName) ?? []
    list.push(inc)
    map.set(inc.childName, list)
  }
  const result = []
  for (const [name, incs] of map.entries()) {
    if (incs.length >= minCount) {
      const sorted = [...incs].sort((a, b) => new Date(b.happenedAt) - new Date(a.happenedAt))
      result.push({
        fullName: name,
        displayName: childDisplayName(name),
        count: incs.length,
        mostRecentDate: sorted[0].happenedAt,
        mostRecentLocation: sorted[0].location,
        siteName: sorted[0].siteName ?? '',
      })
    }
  }
  return result.sort((a, b) => b.count - a.count)
}

export function locationCounts(incidents) {
  const map = new Map()
  for (const inc of incidents) {
    const loc = (inc.location || '').trim()
    map.set(loc, (map.get(loc) ?? 0) + 1)
  }
  return Array.from(map.entries())
    .map(([location, count]) => ({ location, count }))
    .sort((a, b) => b.count - a.count)
}

export function categoryCounts(incidents) {
  const map = new Map()
  for (const inc of incidents) {
    map.set(inc.injuryCategory, (map.get(inc.injuryCategory) ?? 0) + 1)
  }
  return Array.from(map.entries())
    .map(([category, count]) => ({ category, count }))
    .sort((a, b) => b.count - a.count)
}

export function buildTrend(incidents, anchor = new Date()) {
  const result = []
  for (let i = 11; i >= 0; i--) {
    const d = new Date(anchor.getFullYear(), anchor.getMonth() - i, 1)
    const yearMonth = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    const label = d.toLocaleDateString('en-GB', { month: 'short', year: '2-digit' })
    const monthIncs = filterByMonth(incidents, yearMonth)
    result.push({
      month: label,
      yearMonth,
      accidents: monthIncs.filter(x => x.kind === 'Accident').length,
      incidents: monthIncs.filter(x => x.kind === 'Incident').length,
      total: monthIncs.length,
    })
  }
  return result
}

export function currentYearMonth() {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

export function lastYearYearMonth() {
  const now = new Date()
  return `${now.getFullYear() - 1}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

const OUTDOOR_KEYWORDS = ['garden', 'outdoor', 'outside', 'playground', 'yard', 'external', 'park', 'field', 'patio']

export function isOutdoor(inc) {
  const loc = (inc.location || '').toLowerCase()
  return OUTDOOR_KEYWORDS.some(kw => loc.includes(kw))
}

// Returns monthly outdoor incident counts for the 12 months ending at `anchor` (defaults to today).
export function outdoorMonthlyTrend(allIncidents, anchor = new Date()) {
  const months = []
  for (let i = 11; i >= 0; i--) {
    const d = new Date(anchor.getFullYear(), anchor.getMonth() - i, 1)
    const yearMonth = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    const label = d.toLocaleDateString('en-GB', { month: 'short', year: '2-digit' })
    const count = allIncidents.filter(inc => (inc.happenedAt || '').startsWith(yearMonth) && isOutdoor(inc)).length
    months.push({ yearMonth, label, count })
  }
  return months
}

// Detects patterns in a 12-month trend: high months, consecutive streaks.
// incidentLabel is used in the streak message, e.g. 'outdoor' or 'home/on-arrival'.
export function detectMonthlyPatterns(monthlyTrend, incidentLabel = 'incidents') {
  const patterns = []
  const total = monthlyTrend.reduce((a, m) => a + m.count, 0)
  if (total === 0) return patterns

  const avg = total / monthlyTrend.length
  const threshold = Math.max(3, avg * 2)

  const highMonths = monthlyTrend.filter(m => m.count >= threshold)
  if (highMonths.length > 0) {
    patterns.push(`Notably high months: ${highMonths.map(m => `${m.label} (${m.count})`).join(', ')}`)
  }

  let maxStreak = 0, currentStreak = 0, streakStart = ''
  let bestStart = '', bestEnd = ''
  for (const m of monthlyTrend) {
    if (m.count > 0) {
      if (currentStreak === 0) streakStart = m.label
      currentStreak++
      if (currentStreak > maxStreak) {
        maxStreak = currentStreak
        bestStart = streakStart
        bestEnd = m.label
      }
    } else {
      currentStreak = 0
    }
  }
  if (maxStreak >= 3) {
    const range = bestStart === bestEnd ? bestStart : `${bestStart} – ${bestEnd}`
    patterns.push(`${maxStreak} consecutive months with ${incidentLabel} incidents (${range})`)
  }

  return patterns
}

// Keep old name as alias so existing imports don't break
export const detectOutdoorPatterns = (t) => detectMonthlyPatterns(t, 'outdoor')


// Substring matches against inc.location (case-insensitive). Covers off-site
// locations like "grandparents", "at park with mum", etc. — these are treated
// as home/on-arrival rather than nursery-setting incidents.
const HOME_KEYWORDS = [
  'home', 'house',
  'grandparent', 'granny', 'grandma', 'grandpa', 'grandad', 'grandfather', 'grandmother',
  'nan', 'nanna', 'nana',
  'mum', 'mummy', 'mom', 'mommy', 'mam', 'mama',
  'dad', 'daddy', 'papa',
  'aunt', 'uncle',
  'beach', 'shop', 'walk', 'holiday', 'outing',
]

export function locationLooksLikeHome(locStr) {
  const loc = (locStr || '').trim().toLowerCase()
  if (!loc) return false
  return HOME_KEYWORDS.some(kw => loc.includes(kw))
}

export function isHome(inc) {
  if (inc.onArrival) return true
  return locationLooksLikeHome(inc.location)
}

// Returns monthly home/on-arrival incident counts for the 12 months ending at `anchor` (defaults to today).
export function homeMonthlyTrend(allIncidents, anchor = new Date()) {
  const months = []
  for (let i = 11; i >= 0; i--) {
    const d = new Date(anchor.getFullYear(), anchor.getMonth() - i, 1)
    const yearMonth = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    const label = d.toLocaleDateString('en-GB', { month: 'short', year: '2-digit' })
    const count = allIncidents.filter(inc => (inc.happenedAt || '').startsWith(yearMonth) && isHome(inc)).length
    months.push({ yearMonth, label, count })
  }
  return months
}

export function formatDate(iso) {
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

export function formatTime(iso) {
  return new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
}
