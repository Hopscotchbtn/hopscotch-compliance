import { classifyInjury } from './classifyInjury'

export function childDisplayName(fullName) {
  const parts = fullName.trim().split(' ')
  if (parts.length < 2) return fullName
  return `${parts[0]} ${parts[parts.length - 1][0]}.`
}

export function classifyAll(incidents) {
  return incidents.map(inc => ({
    ...inc,
    injuryCategory: classifyInjury(inc.id, inc.nature),
  }))
}

export function filterByMonth(incidents, yearMonth) {
  return incidents.filter(inc => inc.happenedAt.startsWith(yearMonth))
}

export function rollingWindow(incidents, months) {
  const cutoff = new Date()
  cutoff.setMonth(cutoff.getMonth() - months)
  cutoff.setDate(1)
  cutoff.setHours(0, 0, 0, 0)
  return incidents.filter(inc => new Date(inc.happenedAt) >= cutoff)
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
      })
    }
  }
  return result.sort((a, b) => b.count - a.count)
}

export function locationCounts(incidents) {
  const map = new Map()
  for (const inc of incidents) {
    const loc = inc.location.trim()
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

export function buildTrend(incidents) {
  const now = new Date()
  const result = []
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
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

export function formatDate(iso) {
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

export function formatTime(iso) {
  return new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
}
