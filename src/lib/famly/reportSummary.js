export function generateReportSummary(report) {
  const {
    totalReports, yoyDiff, period,
    high, medium,
    injuryTypes,
    periodOutdoor, outdoorPatterns,
    periodHome, homePatterns,
    ackRate, acknowledged,
    repeats,
  } = report

  if (totalReports === 0) {
    return 'No accidents were recorded this period.'
  }

  const parts = []
  const periodWord = period.type === 'month' ? 'month' : 'period'

  // ── Opening: count + YoY ──
  let opening = `This ${periodWord} recorded ${totalReports} accident report${totalReports !== 1 ? 's' : ''}`
  if (yoyDiff != null) {
    if (yoyDiff === 0)       opening += ', the same number as the same period last year'
    else if (yoyDiff > 0)    opening += `, up ${yoyDiff} on the same period last year`
    else                     opening += `, down ${Math.abs(yoyDiff)} on the same period last year`
  }
  parts.push(opening + '.')

  // ── Injury types ──
  if (injuryTypes.length > 0) {
    const top2 = injuryTypes.slice(0, 2)
    const topPct = Math.round((top2[0].count / totalReports) * 100)
    if (top2.length === 1) {
      parts.push(`All reports involved ${top2[0].category.toLowerCase()}.`)
    } else {
      parts.push(
        `The most common injury types were ${top2[0].category.toLowerCase()} (${topPct}%) and ${top2[1].category.toLowerCase()}.`
      )
    }
  }

  // ── Formal review ──
  const reviewCount = high.length + medium.length
  if (reviewCount === 0) {
    parts.push('No incidents were flagged for formal review.')
  } else {
    const highPart   = high.length   > 0 ? `${high.length} high priority`   : ''
    const medPart    = medium.length > 0 ? `${medium.length} medium priority` : ''
    const breakdown  = [highPart, medPart].filter(Boolean).join(', ')
    parts.push(
      `${reviewCount} incident${reviewCount !== 1 ? 's' : ''} ${reviewCount !== 1 ? 'have' : 'has'} been flagged for formal review (${breakdown}).`
    )
  }

  // ── Outdoor ──
  if (outdoorPatterns.length > 0) {
    parts.push(`Outdoor incidents show a pattern worth noting: ${outdoorPatterns[0].toLowerCase()}.`)
  } else if (periodOutdoor.length > 0) {
    const pct = Math.round((periodOutdoor.length / totalReports) * 100)
    parts.push(
      `${periodOutdoor.length} incident${periodOutdoor.length !== 1 ? 's' : ''} (${pct}%) occurred outdoors.`
    )
  }

  // ── Home / on-arrival ──
  if (homePatterns.length > 0) {
    parts.push('Patterns in home and on-arrival incidents may warrant a safeguarding review.')
  } else if (periodHome.length > 0) {
    const pct = Math.round((periodHome.length / totalReports) * 100)
    parts.push(
      `${periodHome.length} home or on-arrival incident${periodHome.length !== 1 ? 's' : ''} were recorded (${pct}% of total).`
    )
  }

  // ── Acknowledgement rate ──
  if (ackRate < 80) {
    const outstanding = totalReports - acknowledged
    parts.push(
      `Parent acknowledgement is at ${ackRate}% — ${outstanding} report${outstanding !== 1 ? 's remain' : ' remains'} unacknowledged.`
    )
  }

  // ── Repeat children ──
  if (repeats.length > 0) {
    parts.push(
      `${repeats.length} child${repeats.length !== 1 ? 'ren appear' : ' appears'} in the repeat incidents list.`
    )
  }

  return parts.join(' ')
}
