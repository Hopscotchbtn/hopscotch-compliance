import { jsPDF } from 'jspdf'
import { childDisplayName, formatDate } from './dataHelpers'
import { computeAccidentReport } from './computeAccidentReport'
import { generateReportSummary } from './reportSummary'

// ─── period helpers ──────────────────────────────────────────────────────────

function ymKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
}

function titleForPeriod(period) {
  if (period.type === 'ytd') return 'Year-to-Date Accident Review'
  if (period.type === '12month') return '12-Month Accident Review'
  return 'Monthly Accident Review'
}

function filenameSlugForPeriod(period) {
  if (period.type === 'ytd') return `ytd-${period.from.getFullYear()}`
  if (period.type === '12month') return `12mo-to-${ymKey(period.to)}`
  return period.monthKey ?? ymKey(period.from)
}

function defaultPreviousMonthPeriod() {
  const now = new Date()
  const from = new Date(now.getFullYear(), now.getMonth() - 1, 1)
  const to = new Date(now.getFullYear(), now.getMonth(), 0)
  return {
    type: 'month',
    from,
    to,
    label: from.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' }),
    monthKey: ymKey(from),
  }
}

// ─── layout helpers ──────────────────────────────────────────────────────────

const PAGE_BOTTOM = 275
const MARGIN = 14
const CONTENT_WIDTH = 210 - MARGIN * 2

const C = {
  forest:         [31,  68,  53],
  forestLight:    [230, 238, 233],
  forestMid:      [76,  105, 93],
  text:           [30,  30,  30],
  mute:           [120, 120, 120],
  rule:           [215, 208, 205],
  pebble:         [242, 238, 237],
  pebbleT2:       [251, 250, 249],
  marmalade:      [253, 136, 74],
  marmaladeT1:    [255, 243, 236],
  marmaladeShade: [220, 70,  20],
  warningBg:      [254, 242, 242],
  warningRule:    [252, 165, 165],
  warningText:    [153, 27,  27],
  white:          [255, 255, 255],
}

function fill(doc, key)   { doc.setFillColor(  C[key][0], C[key][1], C[key][2]) }
function stroke(doc, key) { doc.setDrawColor(  C[key][0], C[key][1], C[key][2]) }
function text(doc, key)   { doc.setTextColor(  C[key][0], C[key][1], C[key][2]) }

// Section heading with pebble strip and forest green left rule
function sectionHeading(doc, label, y) {
  fill(doc, 'pebble')
  stroke(doc, 'pebble')
  doc.rect(MARGIN, y - 4, CONTENT_WIDTH, 8, 'F')
  fill(doc, 'forest')
  doc.rect(MARGIN, y - 4, 2.5, 8, 'F')
  text(doc, 'forest')
  doc.setFontSize(11)
  doc.setFont(undefined, 'bold')
  doc.text(label, MARGIN + 6, y + 1)
  text(doc, 'text')
}

// ─── main generator ──────────────────────────────────────────────────────────

export function generateMonthlyReportPDF(reportOrIncidents, siteName, maybePeriod) {
  const report = Array.isArray(reportOrIncidents)
    ? computeAccidentReport(reportOrIncidents, maybePeriod ?? defaultPreviousMonthPeriod())
    : reportOrIncidents
  const period = report.period
  const {
    totalReports, onArrival, atNursery,
    ofstedCount, riddorCount, ladoCount,
    acknowledged, ackRate,
    high, medium,
    homeLoc, siteLocs,
    homeIncs, settingIncs, injuryTypes,
    periodHome, homeMonthly, homePatterns, homeInjuryTypes, homeRepeats,
    homeAcknowledged, homeAckRate, homeHigh, homeMedium, homeDowCounts, homeSortedIncs,
    nurseryAcknowledged, nurseryAckRate, nurseryHigh, nurseryMedium,
    nurseryDowCounts, nurserySortedIncs, nurseryInjuryTypes, nurseryLocs,
    nurseryMonthly, nurseryPatterns, nurseryRepeats,
    dowOrder, dowCounts, hourCounts,
    yoyDiff, repeats, repeatWindowLabel,
  } = report
  const dowMax = Math.max(1, ...Object.values(dowCounts))

  const doc = new jsPDF()
  const pageWidth = doc.internal.pageSize.getWidth()
  let y = 20
  let pageNumber = 1

  const addPageIfNeeded = (needed = 20) => {
    if (y + needed > PAGE_BOTTOM) {
      addFooter(doc, pageNumber)
      doc.addPage()
      pageNumber++
      y = 20
    }
  }

  // ─── HEADER ──

  fill(doc, 'forest')
  doc.rect(0, 0, pageWidth, 5, 'F')

  y = 18
  text(doc, 'forest')
  doc.setFontSize(18)
  doc.setFont(undefined, 'bold')
  doc.text(titleForPeriod(period), pageWidth / 2, y, { align: 'center' })
  y += 7

  text(doc, 'text')
  doc.setFontSize(13)
  doc.setFont(undefined, 'normal')
  doc.text(siteName, pageWidth / 2, y, { align: 'center' })
  y += 6

  text(doc, 'mute')
  doc.setFontSize(10)
  doc.text(period.label, pageWidth / 2, y, { align: 'center' })
  y += 10

  // ─── SUMMARY ──

  const summaryText = generateReportSummary(report)
  fill(doc, 'forestLight')
  stroke(doc, 'forestLight')
  const summaryLines = doc.splitTextToSize(summaryText, CONTENT_WIDTH - 8)
  const summaryH = 6 + summaryLines.length * 5
  doc.roundedRect(MARGIN, y, CONTENT_WIDTH, summaryH, 1.5, 1.5, 'FD')
  text(doc, 'forest')
  doc.setFontSize(9)
  doc.setFont(undefined, 'normal')
  summaryLines.forEach((line, i) => {
    doc.text(line, MARGIN + 4, y + 5 + i * 5)
  })
  text(doc, 'text')
  y += summaryH + 8

  // ─── KPI CARDS ──

  const cardY = y
  const cardH = 24
  const cardGap = 3
  const cardW = (CONTENT_WIDTH - cardGap * 3) / 4

  const cards = [
    {
      label: 'Reports',
      value: String(totalReports),
      sub: yoyDiff != null
        ? yoyDiff === 0 ? 'same as last year' : yoyDiff > 0 ? `+${yoyDiff} vs last year` : `${yoyDiff} vs last year`
        : period.label,
    },
    {
      label: 'At nursery',
      value: String(atNursery),
      sub: onArrival > 0 ? `${onArrival} arrived with injury` : 'all occurred at nursery',
    },
    {
      label: 'Parent acknowledged',
      value: `${ackRate}%`,
      sub: `${acknowledged} of ${totalReports}`,
    },
    {
      label: 'Needs formal review',
      value: String(high.length + medium.length),
      sub: `${high.length} high · ${medium.length} medium`,
      warn: high.length + medium.length > 0,
    },
  ]

  cards.forEach((card, i) => {
    const x = MARGIN + (cardW + cardGap) * i
    if (card.warn) {
      fill(doc, 'warningBg')
      stroke(doc, 'warningRule')
    } else {
      fill(doc, 'pebble')
      stroke(doc, 'rule')
    }
    doc.roundedRect(x, cardY, cardW, cardH, 1.5, 1.5, 'FD')

    // Coloured top edge
    if (!card.warn) {
      fill(doc, 'forest')
      doc.rect(x, cardY, cardW, 1.5, 'F')
    }

    text(doc, 'mute')
    doc.setFontSize(7)
    doc.setFont(undefined, 'normal')
    doc.text(card.label.toUpperCase(), x + 3, cardY + 6)

    text(doc, card.warn ? 'warningText' : 'forest')
    doc.setFontSize(18)
    doc.setFont(undefined, 'bold')
    doc.text(card.value, x + 3, cardY + 15)

    text(doc, 'mute')
    doc.setFontSize(7)
    doc.setFont(undefined, 'normal')
    doc.text(card.sub, x + 3, cardY + 21, { maxWidth: cardW - 6 })
  })
  y = cardY + cardH + 8
  text(doc, 'text')

  // ─── REGULATORY FLAGS BAR ──

  if (riddorCount + ofstedCount + ladoCount > 0) {
    addPageIfNeeded(14)
    fill(doc, 'marmaladeT1')
    stroke(doc, 'marmalade')
    doc.roundedRect(MARGIN, y, CONTENT_WIDTH, 11, 1.5, 1.5, 'FD')
    text(doc, 'marmaladeShade')
    doc.setFontSize(9)
    doc.setFont(undefined, 'bold')
    const parts = []
    if (riddorCount > 0) parts.push(`RIDDOR: ${riddorCount}`)
    if (ofstedCount > 0) parts.push(`Ofsted: ${ofstedCount}`)
    if (ladoCount > 0) parts.push(`LADO: ${ladoCount}`)
    doc.text(`Regulatory flags  —  ${parts.join('   ·   ')}`, MARGIN + 4, y + 7)
    text(doc, 'text')
    y += 16
  }

  // ─── NEEDS FORMAL REVIEW ──

  if (high.length > 0 || medium.length > 0) {
    addPageIfNeeded(20 + (high.length + medium.length) * 5)
    sectionHeading(doc, 'Needs formal review', y)
    y += 6
    text(doc, 'mute')
    doc.setFontSize(7)
    doc.setFont(undefined, 'normal')
    doc.text('Auto-flagged by keyword match — please review each for context.', MARGIN, y + 3)
    y += 8
    text(doc, 'text')

    if (high.length > 0) {
      text(doc, 'warningText')
      doc.setFontSize(9)
      doc.setFont(undefined, 'bold')
      doc.text(`High priority  ·  ${high.length}`, MARGIN, y)
      y += 5
      doc.setFont(undefined, 'normal')
      doc.setFontSize(9)
      high.forEach(inc => {
        addPageIfNeeded(6)
        doc.text(`•  ${childDisplayName(inc.childName)}  ·  ${formatDate(inc.happenedAt)}  ·  ${inc.injuryCategory}  ·  ${(inc.location || '').slice(0, 28)}`, MARGIN + 2, y)
        y += 5
      })
      y += 3
    }

    if (medium.length > 0) {
      text(doc, 'marmaladeShade')
      doc.setFontSize(9)
      doc.setFont(undefined, 'bold')
      doc.text(`Medium priority  ·  ${medium.length}`, MARGIN, y)
      y += 5
      doc.setFont(undefined, 'normal')
      doc.setFontSize(9)
      medium.forEach(inc => {
        addPageIfNeeded(6)
        doc.text(`•  ${childDisplayName(inc.childName)}  ·  ${formatDate(inc.happenedAt)}  ·  ${inc.injuryCategory}  ·  ${(inc.location || '').slice(0, 28)}`, MARGIN + 2, y)
        y += 5
      })
      y += 3
    }
    text(doc, 'text')
    y += 3
  }

  // ─── REPEAT CHILDREN ──

  if (repeats.length > 0) {
    addPageIfNeeded(20 + repeats.length * 6)
    sectionHeading(doc, `Top repeat children  (${repeatWindowLabel})`, y)
    y += 6
    text(doc, 'mute')
    doc.setFontSize(7)
    doc.setFont(undefined, 'normal')
    doc.text('Ranked by count within this period. Check individual Family accounts for full history. Context matters — some children may have medical or developmental factors.', MARGIN, y + 3)
    y += 8
    text(doc, 'text')

    text(doc, 'mute')
    doc.setFontSize(8)
    doc.setFont(undefined, 'bold')
    doc.text('#',             MARGIN + 2,   y)
    doc.text('Child',         MARGIN + 10,  y)
    doc.text('Count',         MARGIN + 70,  y)
    doc.text('Most recent',   MARGIN + 95,  y)
    doc.text('Last location', MARGIN + 130, y)
    y += 2
    stroke(doc, 'rule')
    doc.setLineWidth(0.2)
    doc.line(MARGIN, y, MARGIN + CONTENT_WIDTH, y)
    y += 4
    text(doc, 'text')

    doc.setFont(undefined, 'normal')
    doc.setFontSize(9)
    repeats.forEach((child, i) => {
      addPageIfNeeded(6)
      doc.text(String(i + 1),                              MARGIN + 2,   y)
      doc.text(child.displayName,                          MARGIN + 10,  y)
      doc.text(String(child.count),                        MARGIN + 70,  y)
      doc.text(formatDate(child.mostRecentDate),           MARGIN + 95,  y)
      doc.text((child.mostRecentLocation || '').slice(0, 26), MARGIN + 130, y)
      y += 5
    })
    y += 6
  }

  // ─── HOME VS SETTING ──

  if (totalReports > 0) {
    addPageIfNeeded(35)
    sectionHeading(doc, 'Home vs. setting', y)
    y += 10

    const homePct    = Math.round((homeIncs.length   / totalReports) * 100)
    const settingPct = Math.round((settingIncs.length / totalReports) * 100)

    doc.setFontSize(9)
    doc.setFont(undefined, 'bold')
    text(doc, 'text')
    doc.text('At the setting:',       MARGIN + 2, y)
    doc.setFont(undefined, 'normal')
    text(doc, 'forestMid')
    doc.text(`${settingIncs.length}   (${settingPct}%)`, MARGIN + 50, y)
    y += 5

    doc.setFont(undefined, 'bold')
    text(doc, 'text')
    doc.text('At home / on arrival:', MARGIN + 2, y)
    doc.setFont(undefined, 'normal')
    text(doc, 'forestMid')
    doc.text(`${homeIncs.length}   (${homePct}%)`, MARGIN + 50, y)
    y += 5

    if (siteLocs.length > 0) {
      y += 2
      text(doc, 'text')
      doc.setFont(undefined, 'bold')
      doc.text('Top rooms / locations (setting):', MARGIN + 2, y)
      y += 5
      doc.setFont(undefined, 'normal')
      if (period.type !== 'month') {
        const locMax = Math.max(1, ...siteLocs.map(l => l.count))
        const locBarMaxW = 65; const locBarX = MARGIN + 52
        doc.setFontSize(8)
        siteLocs.forEach(loc => {
          addPageIfNeeded(6)
          const w = (loc.count / locMax) * locBarMaxW
          text(doc, 'text'); doc.text(loc.location.slice(0, 18), MARGIN + 2, y)
          if (w > 0) {
            fill(doc, 'forestLight'); stroke(doc, 'forestLight')
            doc.rect(locBarX, y - 3, Math.max(w, 0.5), 4, 'F')
            fill(doc, 'marmalade'); doc.rect(locBarX + Math.max(w, 0.5) - 1.5, y - 3, 1.5, 4, 'F')
          }
          text(doc, 'mute'); doc.text(String(loc.count), locBarX + locBarMaxW + 3, y)
          y += 5
        })
        doc.setFontSize(9)
      } else {
        siteLocs.forEach(loc => {
          addPageIfNeeded(6)
          const pct = Math.round((loc.count / totalReports) * 100)
          text(doc, 'text')
          doc.text(`•  ${loc.location}`, MARGIN + 4, y)
          text(doc, 'mute')
          doc.text(`${loc.count}   (${pct}%)`, MARGIN + 90, y)
          y += 5
        })
      }
    }
    y += 6
    text(doc, 'text')
  }

  // ─── HOME HIGHLIGHTS (non-monthly) ──

  if (period.type !== 'month' && homeIncs.length > 0) {
    addPageIfNeeded(20 + Math.min(homeRepeats.length, 8) * 5)
    sectionHeading(doc, 'Home / on-arrival highlights', y)
    y += 10

    const homePctOverview = totalReports > 0 ? Math.round((homeIncs.length / totalReports) * 100) : 0
    text(doc, 'text'); doc.setFontSize(9); doc.setFont(undefined, 'normal')
    doc.text(`${homeIncs.length} home / on-arrival reports this period  (${homePctOverview}% of total)`, MARGIN + 2, y)
    y += 6

    if (homePatterns.length > 0) {
      homePatterns.forEach(p => {
        addPageIfNeeded(5)
        text(doc, 'marmaladeShade'); doc.setFontSize(8); doc.setFont(undefined, 'normal')
        doc.text(`⚑  ${p}`, MARGIN + 2, y); y += 5
      })
      y += 3
    }

    if (homeRepeats.length > 0) {
      text(doc, 'text'); doc.setFontSize(9); doc.setFont(undefined, 'bold')
      doc.text('Children with repeated home / on-arrival reports:', MARGIN + 2, y)
      y += 5
      text(doc, 'mute'); doc.setFontSize(8); doc.setFont(undefined, 'bold')
      doc.text('Child', MARGIN + 4, y); doc.text('Reports', MARGIN + 90, y)
      y += 2; stroke(doc, 'rule'); doc.setLineWidth(0.2); doc.line(MARGIN, y, MARGIN + CONTENT_WIDTH, y); y += 4
      doc.setFont(undefined, 'normal'); doc.setFontSize(9); text(doc, 'text')
      homeRepeats.forEach(child => {
        addPageIfNeeded(5)
        doc.text(child.displayName, MARGIN + 4, y)
        text(doc, 'mute'); doc.text(String(child.count), MARGIN + 90, y)
        text(doc, 'text'); y += 5
      })
    } else {
      text(doc, 'mute'); doc.setFontSize(8); doc.setFont(undefined, 'normal')
      doc.text('No children with repeated home incidents this period.', MARGIN + 2, y); y += 5
    }
    text(doc, 'text'); y += 6
  }

  // ─── INJURY TYPE BREAKDOWN ──

  if (injuryTypes.length > 0) {
    addPageIfNeeded(20 + injuryTypes.length * 5)
    sectionHeading(doc, 'Injury type breakdown', y)
    y += 6
    text(doc, 'mute')
    doc.setFontSize(7)
    doc.setFont(undefined, 'normal')
    doc.text('As a percentage of all reports in this period.', MARGIN, y + 3)
    y += 8
    text(doc, 'text')

    doc.setFontSize(9)
    doc.setFont(undefined, 'normal')
    injuryTypes.forEach(({ category, count }) => {
      addPageIfNeeded(6)
      const pct = totalReports > 0 ? Math.round((count / totalReports) * 100) : 0
      text(doc, 'text')
      doc.text(`•  ${category}`, MARGIN + 4, y)
      text(doc, 'mute')
      doc.text(`${count}   (${pct}%)`, MARGIN + 90, y)
      y += 5
    })
    y += 6
  }

  // ─── DAY OF WEEK ──

  if (totalReports > 0) {
    addPageIfNeeded(45)
    sectionHeading(doc, 'When reports happen', y)
    y += 10

    doc.setFontSize(9)
    doc.setFont(undefined, 'normal')
    const barMaxW = 70
    const barX = MARGIN + 30
    dowOrder.forEach(day => {
      const count = dowCounts[day]
      if ((day === 'Saturday' || day === 'Sunday') && count === 0) return
      const w = (count / dowMax) * barMaxW
      addPageIfNeeded(6)
      text(doc, 'text')
      doc.text(day, MARGIN + 2, y)
      if (w > 0) {
        fill(doc, 'forestLight')
        stroke(doc, 'forestLight')
        doc.rect(barX, y - 3, Math.max(w, 0.5), 4, 'F')
        // Marmalade accent on bar end
        fill(doc, 'marmalade')
        doc.rect(barX + Math.max(w, 0.5) - 1.5, y - 3, 1.5, 4, 'F')
      }
      text(doc, 'mute')
      doc.text(String(count), barX + barMaxW + 3, y)
      y += 5
    })
    text(doc, 'text')
    y += 6
  }

  // ─── TIME OF DAY (non-monthly) ──

  if (period.type !== 'month' && totalReports > 0) {
    const activeHours = hourCounts.filter(h => h.count > 0)
    if (activeHours.length > 0) {
      addPageIfNeeded(20 + activeHours.length * 5)
      sectionHeading(doc, 'Time of day', y)
      y += 10
      const hourMax = Math.max(1, ...activeHours.map(h => h.count))
      const hourBarMaxW = 70; const hourBarX = MARGIN + 25
      doc.setFontSize(8); doc.setFont(undefined, 'normal')
      activeHours.forEach(({ hour, count }) => {
        addPageIfNeeded(5)
        const label = `${String(hour).padStart(2, '0')}:00`
        text(doc, 'text'); doc.text(label, MARGIN + 2, y)
        const w = (count / hourMax) * hourBarMaxW
        if (w > 0) {
          fill(doc, 'forestLight'); stroke(doc, 'forestLight')
          doc.rect(hourBarX, y - 3, Math.max(w, 0.5), 4, 'F')
          fill(doc, 'marmalade'); doc.rect(hourBarX + Math.max(w, 0.5) - 1.5, y - 3, 1.5, 4, 'F')
        }
        text(doc, 'mute'); doc.text(String(count), hourBarX + hourBarMaxW + 3, y)
        y += 5
      })
      text(doc, 'text'); y += 6
    }
  }

  // ─── AT NURSERY ──

  {
    addFooter(doc, pageNumber)
    doc.addPage()
    pageNumber++
    y = 20

    fill(doc, 'forest')
    doc.rect(MARGIN, y - 4, CONTENT_WIDTH, 12, 'F')
    fill(doc, 'marmalade')
    doc.rect(MARGIN, y + 8, CONTENT_WIDTH, 1.5, 'F')
    text(doc, 'white')
    doc.setFontSize(12)
    doc.setFont(undefined, 'bold')
    doc.text('At Nursery', MARGIN + 4, y + 4)
    text(doc, 'text')
    y += 18

    // ── KPI cards ──
    const nurseryPctOfTotal = totalReports > 0 ? Math.round((settingIncs.length / totalReports) * 100) : 0
    const nCardH = 24; const nCardGap = 3; const nCardW = (CONTENT_WIDTH - nCardGap * 2) / 3
    const nCards = [
      { label: 'AT NURSERY',    value: String(settingIncs.length), sub: `${nurseryPctOfTotal}% of all reports` },
      { label: 'ACKNOWLEDGED',  value: `${nurseryAckRate}%`, sub: `${nurseryAcknowledged} of ${settingIncs.length}` },
      { label: 'FORMAL REVIEW', value: String(nurseryHigh.length + nurseryMedium.length), sub: `${nurseryHigh.length} high · ${nurseryMedium.length} medium`, warn: nurseryHigh.length + nurseryMedium.length > 0 },
    ]
    nCards.forEach((card, i) => {
      const x = MARGIN + (nCardW + nCardGap) * i
      if (card.warn) { fill(doc, 'warningBg'); stroke(doc, 'warningRule') }
      else           { fill(doc, 'pebble');    stroke(doc, 'rule') }
      doc.roundedRect(x, y, nCardW, nCardH, 1.5, 1.5, 'FD')
      if (!card.warn) { fill(doc, 'forest'); doc.rect(x, y, nCardW, 1.5, 'F') }
      text(doc, 'mute'); doc.setFontSize(7); doc.setFont(undefined, 'normal')
      doc.text(card.label, x + 3, y + 6)
      text(doc, card.warn ? 'warningText' : 'forest'); doc.setFontSize(18); doc.setFont(undefined, 'bold')
      doc.text(card.value, x + 3, y + 15)
      text(doc, 'mute'); doc.setFontSize(7); doc.setFont(undefined, 'normal')
      doc.text(card.sub, x + 3, y + 21, { maxWidth: nCardW - 6 })
    })
    y += nCardH + 8
    text(doc, 'text')

    // ── Formal review ──
    if (nurseryHigh.length > 0 || nurseryMedium.length > 0) {
      addPageIfNeeded(16 + (nurseryHigh.length + nurseryMedium.length) * 5)
      sectionHeading(doc, 'Needs formal review', y); y += 6
      text(doc, 'mute'); doc.setFontSize(7); doc.setFont(undefined, 'normal')
      doc.text('Auto-flagged by keyword match — please review each for context.', MARGIN, y + 3)
      y += 8; text(doc, 'text')
      if (nurseryHigh.length > 0) {
        text(doc, 'warningText'); doc.setFontSize(9); doc.setFont(undefined, 'bold')
        doc.text(`High priority  ·  ${nurseryHigh.length}`, MARGIN, y); y += 5
        doc.setFont(undefined, 'normal'); doc.setFontSize(9)
        nurseryHigh.forEach(inc => {
          addPageIfNeeded(6); text(doc, 'text')
          doc.text(`•  ${childDisplayName(inc.childName)}  ·  ${formatDate(inc.happenedAt)}  ·  ${inc.injuryCategory}  ·  ${(inc.location || '').slice(0, 28)}`, MARGIN + 2, y); y += 5
        }); y += 3
      }
      if (nurseryMedium.length > 0) {
        text(doc, 'marmaladeShade'); doc.setFontSize(9); doc.setFont(undefined, 'bold')
        doc.text(`Medium priority  ·  ${nurseryMedium.length}`, MARGIN, y); y += 5
        doc.setFont(undefined, 'normal'); doc.setFontSize(9)
        nurseryMedium.forEach(inc => {
          addPageIfNeeded(6); text(doc, 'text')
          doc.text(`•  ${childDisplayName(inc.childName)}  ·  ${formatDate(inc.happenedAt)}  ·  ${inc.injuryCategory}  ·  ${(inc.location || '').slice(0, 28)}`, MARGIN + 2, y); y += 5
        }); y += 3
      }
      text(doc, 'text'); y += 3
    }

    // ── Patterns ──
    if (nurseryPatterns.length > 0) {
      fill(doc, 'marmaladeT1'); stroke(doc, 'marmalade')
      const flagH = 6 + nurseryPatterns.length * 5
      doc.roundedRect(MARGIN, y, CONTENT_WIDTH, flagH, 1.5, 1.5, 'FD')
      text(doc, 'marmaladeShade'); doc.setFontSize(8); doc.setFont(undefined, 'bold')
      doc.text('Patterns detected', MARGIN + 3, y + 5)
      doc.setFont(undefined, 'normal')
      nurseryPatterns.forEach((p, i) => { doc.text(`•  ${p}`, MARGIN + 3, y + 10 + i * 5) })
      text(doc, 'text'); y += flagH + 8
    } else {
      text(doc, 'mute'); doc.setFontSize(8); doc.setFont(undefined, 'normal')
      doc.text('No patterns detected in the last 12 months.', MARGIN, y)
      text(doc, 'text'); y += 8
    }

    // ── Repeat children ──
    if (nurseryRepeats.length > 0) {
      // height: 9 header + per child (4 gap if not first, 6 name, n*5 incidents) + 5 padding
      const flagH = 9 + nurseryRepeats.reduce((acc, child, ci) =>
        acc + (ci > 0 ? 4 : 0) + 6 + child.incidents.length * 5, 0) + 5
      addPageIfNeeded(flagH + 4)
      fill(doc, 'marmaladeT1'); stroke(doc, 'marmalade')
      doc.roundedRect(MARGIN, y, CONTENT_WIDTH, flagH, 1.5, 1.5, 'FD')
      text(doc, 'marmaladeShade'); doc.setFontSize(8); doc.setFont(undefined, 'bold')
      doc.text('Children with repeated nursery reports this period', MARGIN + 4, y + 6)
      y += 9
      nurseryRepeats.forEach((child, ci) => {
        if (ci > 0) {
          stroke(doc, 'rule'); doc.setLineWidth(0.2)
          doc.line(MARGIN + 4, y + 2, MARGIN + CONTENT_WIDTH - 4, y + 2)
          y += 4
        }
        text(doc, 'forest'); doc.setFontSize(8); doc.setFont(undefined, 'bold')
        doc.text(`${child.displayName}  —  ${child.count} reports`, MARGIN + 4, y + 5)
        y += 6
        doc.setFont(undefined, 'normal')
        child.incidents.forEach(inc => {
          text(doc, 'text')
          const loc = inc.location ? `  ·  ${inc.location.slice(0, 30)}` : ''
          doc.text(`•  ${formatDate(inc.date)}  ·  ${inc.injuryCategory}${loc}`, MARGIN + 6, y + 4)
          y += 5
        })
      })
      y += 11
    }

    // ── Injury types ──
    if (nurseryInjuryTypes.length > 0) {
      addPageIfNeeded(20 + nurseryInjuryTypes.length * 5)
      doc.setFontSize(10); doc.setFont(undefined, 'bold'); text(doc, 'forest')
      doc.text('Injury types', MARGIN, y); text(doc, 'text'); y += 6
      doc.setFontSize(9); doc.setFont(undefined, 'normal')
      nurseryInjuryTypes.forEach(({ category, count }) => {
        addPageIfNeeded(6)
        const pct = settingIncs.length > 0 ? Math.round((count / settingIncs.length) * 100) : 0
        text(doc, 'text'); doc.text(`•  ${category}`, MARGIN + 4, y)
        text(doc, 'mute'); doc.text(`${count}   (${pct}%)`, MARGIN + 90, y); y += 5
      }); y += 6
    }

    // ── Location ──
    if (nurseryLocs.length > 0) {
      addPageIfNeeded(20 + nurseryLocs.length * 5)
      doc.setFontSize(10); doc.setFont(undefined, 'bold'); text(doc, 'forest')
      doc.text('Where they happen', MARGIN, y); text(doc, 'text'); y += 6
      doc.setFontSize(9); doc.setFont(undefined, 'normal')
      nurseryLocs.forEach(({ location, count }) => {
        addPageIfNeeded(6)
        const pct = settingIncs.length > 0 ? Math.round((count / settingIncs.length) * 100) : 0
        text(doc, 'text'); doc.text(`•  ${location}`, MARGIN + 4, y)
        text(doc, 'mute'); doc.text(`${count}   (${pct}%)`, MARGIN + 90, y); y += 5
      }); y += 6
    }

    // ── Day of week ──
    if (settingIncs.length > 0) {
      addPageIfNeeded(45)
      doc.setFontSize(10); doc.setFont(undefined, 'bold'); text(doc, 'forest')
      doc.text('When they happen', MARGIN, y); text(doc, 'text'); y += 6
      const nDowMax = Math.max(1, ...Object.values(nurseryDowCounts))
      const barMaxW = 70; const barX = MARGIN + 30
      doc.setFontSize(9); doc.setFont(undefined, 'normal')
      dowOrder.forEach(day => {
        const count = nurseryDowCounts[day]
        if ((day === 'Saturday' || day === 'Sunday') && count === 0) return
        addPageIfNeeded(6); text(doc, 'text'); doc.text(day, MARGIN + 2, y)
        const w = (count / nDowMax) * barMaxW
        if (w > 0) {
          fill(doc, 'forestLight'); stroke(doc, 'forestLight')
          doc.rect(barX, y - 3, Math.max(w, 0.5), 4, 'F')
          fill(doc, 'marmalade'); doc.rect(barX + Math.max(w, 0.5) - 1.5, y - 3, 1.5, 4, 'F')
        }
        text(doc, 'mute'); doc.text(String(count), barX + barMaxW + 3, y); y += 5
      })
      text(doc, 'text'); y += 6
    }

    // ── Monthly trend ──
    doc.setFontSize(10); doc.setFont(undefined, 'bold'); text(doc, 'forest')
    doc.text('Monthly trend  (last 12 months)', MARGIN, y); text(doc, 'text'); y += 6
    const nMax = Math.max(1, ...nurseryMonthly.map(m => m.count))
    const nBarW = 90; const nBarX = MARGIN + 22
    doc.setFontSize(8); doc.setFont(undefined, 'normal')
    nurseryMonthly.forEach(m => {
      addPageIfNeeded(6); text(doc, 'text'); doc.text(m.label, MARGIN + 2, y)
      const w = (m.count / nMax) * nBarW
      if (w > 0) {
        fill(doc, 'forestLight'); stroke(doc, 'forestLight')
        doc.rect(nBarX, y - 3, Math.max(w, 0.5), 4, 'F')
        fill(doc, 'marmalade'); doc.rect(nBarX + Math.max(w, 0.5) - 1.5, y - 3, 1.5, 4, 'F')
      }
      text(doc, 'mute'); doc.text(String(m.count), nBarX + nBarW + 3, y); y += 5
    })
    text(doc, 'text'); y += 6

  }

  // ─── HOME / ON-ARRIVAL INCIDENTS ──

  {
    addFooter(doc, pageNumber)
    doc.addPage()
    pageNumber++
    y = 20

    fill(doc, 'forest')
    doc.rect(MARGIN, y - 4, CONTENT_WIDTH, 12, 'F')
    fill(doc, 'marmalade')
    doc.rect(MARGIN, y + 8, CONTENT_WIDTH, 1.5, 'F')
    text(doc, 'white')
    doc.setFontSize(12)
    doc.setFont(undefined, 'bold')
    doc.text('Home / On-Arrival Incidents', MARGIN + 4, y + 4)
    text(doc, 'text')
    y += 18

    doc.setFontSize(7)
    text(doc, 'mute')
    doc.setFont(undefined, 'normal')
    doc.text('Injuries where the child arrived at the setting already hurt, or where the location field records "Home".', MARGIN, y)
    doc.text('Recurring patterns may warrant a safeguarding conversation.', MARGIN, y + 4)
    text(doc, 'text')
    y += 12

    // ── KPI cards ──
    const homePctOfTotal = totalReports > 0 ? Math.round((homeIncs.length / totalReports) * 100) : 0
    const settingPctOfTotal = totalReports > 0 ? Math.round((settingIncs.length / totalReports) * 100) : 0
    const homeCardH = 24
    const homeCardGap = 3
    const homeCardW = (CONTENT_WIDTH - homeCardGap * 3) / 4
    const homeCards = [
      { label: 'HOME / ON ARRIVAL', value: String(homeIncs.length), sub: `${homePctOfTotal}% of all reports` },
      { label: 'AT SETTING',        value: String(settingIncs.length), sub: `${settingPctOfTotal}% of all reports` },
      { label: 'ACKNOWLEDGED',      value: `${homeAckRate}%`, sub: `${homeAcknowledged} of ${homeIncs.length}` },
      { label: 'FORMAL REVIEW',     value: String(homeHigh.length + homeMedium.length), sub: `${homeHigh.length} high · ${homeMedium.length} medium`, warn: homeHigh.length + homeMedium.length > 0 },
    ]
    homeCards.forEach((card, i) => {
      const x = MARGIN + (homeCardW + homeCardGap) * i
      if (card.warn) { fill(doc, 'warningBg'); stroke(doc, 'warningRule') }
      else           { fill(doc, 'pebble');    stroke(doc, 'rule') }
      doc.roundedRect(x, y, homeCardW, homeCardH, 1.5, 1.5, 'FD')
      if (!card.warn) { fill(doc, 'forest'); doc.rect(x, y, homeCardW, 1.5, 'F') }
      text(doc, 'mute'); doc.setFontSize(7); doc.setFont(undefined, 'normal')
      doc.text(card.label, x + 3, y + 6)
      text(doc, card.warn ? 'warningText' : 'forest'); doc.setFontSize(18); doc.setFont(undefined, 'bold')
      doc.text(card.value, x + 3, y + 15)
      text(doc, 'mute'); doc.setFontSize(7); doc.setFont(undefined, 'normal')
      doc.text(card.sub, x + 3, y + 21, { maxWidth: homeCardW - 6 })
    })
    y += homeCardH + 8
    text(doc, 'text')

    // ── Formal review ──
    if (homeHigh.length > 0 || homeMedium.length > 0) {
      addPageIfNeeded(16 + (homeHigh.length + homeMedium.length) * 5)
      sectionHeading(doc, 'Needs formal review', y)
      y += 6
      text(doc, 'mute'); doc.setFontSize(7); doc.setFont(undefined, 'normal')
      doc.text('Auto-flagged by keyword match — please review each for context.', MARGIN, y + 3)
      y += 8; text(doc, 'text')
      if (homeHigh.length > 0) {
        text(doc, 'warningText'); doc.setFontSize(9); doc.setFont(undefined, 'bold')
        doc.text(`High priority  ·  ${homeHigh.length}`, MARGIN, y); y += 5
        doc.setFont(undefined, 'normal'); doc.setFontSize(9)
        homeHigh.forEach(inc => {
          addPageIfNeeded(6)
          doc.text(`•  ${childDisplayName(inc.childName)}  ·  ${formatDate(inc.happenedAt)}  ·  ${inc.injuryCategory}`, MARGIN + 2, y); y += 5
        }); y += 3
      }
      if (homeMedium.length > 0) {
        text(doc, 'marmaladeShade'); doc.setFontSize(9); doc.setFont(undefined, 'bold')
        doc.text(`Medium priority  ·  ${homeMedium.length}`, MARGIN, y); y += 5
        doc.setFont(undefined, 'normal'); doc.setFontSize(9)
        homeMedium.forEach(inc => {
          addPageIfNeeded(6)
          text(doc, 'text')
          doc.text(`•  ${childDisplayName(inc.childName)}  ·  ${formatDate(inc.happenedAt)}  ·  ${inc.injuryCategory}`, MARGIN + 2, y); y += 5
        }); y += 3
      }
      text(doc, 'text'); y += 3
    }

    // ── Patterns ──
    if (homePatterns.length > 0) {
      fill(doc, 'marmaladeT1'); stroke(doc, 'marmalade')
      const flagH = 6 + homePatterns.length * 5
      doc.roundedRect(MARGIN, y, CONTENT_WIDTH, flagH, 1.5, 1.5, 'FD')
      text(doc, 'marmaladeShade'); doc.setFontSize(8); doc.setFont(undefined, 'bold')
      doc.text('Patterns detected', MARGIN + 3, y + 5)
      doc.setFont(undefined, 'normal')
      homePatterns.forEach((p, i) => { doc.text(`•  ${p}`, MARGIN + 3, y + 10 + i * 5) })
      text(doc, 'text'); y += flagH + 8
    } else {
      text(doc, 'mute'); doc.setFontSize(8); doc.setFont(undefined, 'normal')
      doc.text('No patterns detected in the last 12 months.', MARGIN, y)
      text(doc, 'text'); y += 8
    }

    // ── Repeat children ──
    if (homeRepeats.length > 0) {
      const flagH = 9 + homeRepeats.reduce((acc, child, ci) =>
        acc + (ci > 0 ? 4 : 0) + 6 + child.incidents.length * 5, 0) + 5
      addPageIfNeeded(flagH + 4)
      fill(doc, 'marmaladeT1'); stroke(doc, 'marmalade')
      doc.roundedRect(MARGIN, y, CONTENT_WIDTH, flagH, 1.5, 1.5, 'FD')
      text(doc, 'marmaladeShade'); doc.setFontSize(8); doc.setFont(undefined, 'bold')
      doc.text('Children with repeated home / on-arrival reports this period', MARGIN + 4, y + 6)
      y += 9
      homeRepeats.forEach((child, ci) => {
        if (ci > 0) {
          stroke(doc, 'rule'); doc.setLineWidth(0.2)
          doc.line(MARGIN + 4, y + 2, MARGIN + CONTENT_WIDTH - 4, y + 2)
          y += 4
        }
        text(doc, 'forest'); doc.setFontSize(8); doc.setFont(undefined, 'bold')
        doc.text(`${child.displayName}  —  ${child.count} reports`, MARGIN + 4, y + 5)
        y += 6
        doc.setFont(undefined, 'normal')
        child.incidents.forEach(inc => {
          text(doc, 'text')
          const detail = inc.onArrival ? 'arrived with injury' : 'location: Home'
          doc.text(`•  ${formatDate(inc.date)}  ·  ${inc.injuryCategory}  ·  ${detail}`, MARGIN + 6, y + 4)
          y += 5
        })
      })
      y += 11
    }

    // ── Injury types ──
    if (homeInjuryTypes.length > 0) {
      addPageIfNeeded(20 + homeInjuryTypes.length * 5)
      doc.setFontSize(10); doc.setFont(undefined, 'bold'); text(doc, 'forest')
      doc.text('Injury types', MARGIN, y); text(doc, 'text'); y += 6
      doc.setFontSize(9); doc.setFont(undefined, 'normal')
      homeInjuryTypes.forEach(({ category, count }) => {
        addPageIfNeeded(6)
        const pct = periodHome.length > 0 ? Math.round((count / periodHome.length) * 100) : 0
        text(doc, 'text'); doc.text(`•  ${category}`, MARGIN + 4, y)
        text(doc, 'mute'); doc.text(`${count}   (${pct}%)`, MARGIN + 90, y); y += 5
      }); y += 6
    }

    // ── Day of week ──
    if (homeIncs.length > 0) {
      addPageIfNeeded(45)
      doc.setFontSize(10); doc.setFont(undefined, 'bold'); text(doc, 'forest')
      doc.text('When they happen', MARGIN, y); text(doc, 'text'); y += 6
      const homeDowMax = Math.max(1, ...Object.values(homeDowCounts))
      const barMaxW = 70; const barX = MARGIN + 30
      doc.setFontSize(9); doc.setFont(undefined, 'normal')
      dowOrder.forEach(day => {
        const count = homeDowCounts[day]
        if ((day === 'Saturday' || day === 'Sunday') && count === 0) return
        addPageIfNeeded(6); text(doc, 'text'); doc.text(day, MARGIN + 2, y)
        const w = (count / homeDowMax) * barMaxW
        if (w > 0) {
          fill(doc, 'forestLight'); stroke(doc, 'forestLight')
          doc.rect(barX, y - 3, Math.max(w, 0.5), 4, 'F')
          fill(doc, 'marmalade'); doc.rect(barX + Math.max(w, 0.5) - 1.5, y - 3, 1.5, 4, 'F')
        }
        text(doc, 'mute'); doc.text(String(count), barX + barMaxW + 3, y); y += 5
      })
      text(doc, 'text'); y += 6
    }

    // ── Monthly trend ──
    doc.setFontSize(10); doc.setFont(undefined, 'bold'); text(doc, 'forest')
    doc.text('Monthly trend  (last 12 months)', MARGIN, y); text(doc, 'text'); y += 6
    const homeMax = Math.max(1, ...homeMonthly.map(m => m.count))
    const barMaxW2 = 90; const barX2 = MARGIN + 22
    doc.setFontSize(8); doc.setFont(undefined, 'normal')
    homeMonthly.forEach(m => {
      addPageIfNeeded(6); text(doc, 'text'); doc.text(m.label, MARGIN + 2, y)
      const w = (m.count / homeMax) * barMaxW2
      if (w > 0) {
        fill(doc, 'forestLight'); stroke(doc, 'forestLight')
        doc.rect(barX2, y - 3, Math.max(w, 0.5), 4, 'F')
        fill(doc, 'marmalade'); doc.rect(barX2 + Math.max(w, 0.5) - 1.5, y - 3, 1.5, 4, 'F')
      }
      text(doc, 'mute'); doc.text(String(m.count), barX2 + barMaxW2 + 3, y); y += 5
    })
    text(doc, 'text'); y += 6

    // ── All incidents list (monthly only) ──
    if (period.type === 'month' && homeSortedIncs.length > 0) {
      addPageIfNeeded(20 + homeSortedIncs.length * 5)
      doc.setFontSize(10); doc.setFont(undefined, 'bold'); text(doc, 'forest')
      doc.text('All incidents this period', MARGIN, y); text(doc, 'text'); y += 4
      text(doc, 'mute'); doc.setFontSize(8); doc.setFont(undefined, 'bold')
      doc.text('Child',         MARGIN + 2,   y)
      doc.text('Date',          MARGIN + 55,  y)
      doc.text('Injury',        MARGIN + 90,  y)
      doc.text('Acknowledged',  MARGIN + 145, y)
      y += 2; stroke(doc, 'rule'); doc.setLineWidth(0.2); doc.line(MARGIN, y, MARGIN + CONTENT_WIDTH, y); y += 4
      doc.setFont(undefined, 'normal'); doc.setFontSize(9)
      homeSortedIncs.forEach(inc => {
        addPageIfNeeded(6); text(doc, 'text')
        doc.text(childDisplayName(inc.childName),  MARGIN + 2,   y)
        doc.text(formatDate(inc.happenedAt),        MARGIN + 55,  y)
        doc.text(inc.injuryCategory,                MARGIN + 90,  y, { maxWidth: 52 })
        text(doc, inc.acknowledgedAt ? 'forest' : 'marmaladeShade')
        doc.text(inc.acknowledgedAt ? 'Yes' : 'No', MARGIN + 145, y)
        y += 5
      }); y += 6
    }
  }

  // ─── REVIEWED BY ──

  addPageIfNeeded(30)
  y = Math.max(y, PAGE_BOTTOM - 40)
  stroke(doc, 'rule')
  doc.setLineWidth(0.2)
  doc.line(MARGIN, y, MARGIN + CONTENT_WIDTH, y)
  y += 5
  doc.setFontSize(9)
  doc.setFont(undefined, 'bold')
  text(doc, 'text')
  doc.text('Reviewed by', MARGIN, y)
  y += 7
  doc.setFont(undefined, 'normal')
  doc.setFontSize(8)
  text(doc, 'mute')
  doc.text('Name: ________________________________     Role: ________________     Date: ____________', MARGIN, y)
  y += 6
  doc.text('Comments: _____________________________________________________________________', MARGIN, y)
  y += 6
  doc.text('Actions: ______________________________________________________________________', MARGIN, y)

  addFooter(doc, pageNumber)

  const filename = `accident-review-${siteName.replace(/\s+/g, '-').toLowerCase()}-${filenameSlugForPeriod(period)}.pdf`
  doc.save(filename)
}

function addFooter(doc, pageNumber) {
  const pageWidth = doc.internal.pageSize.getWidth()
  const y = 287
  doc.setTextColor(C.mute[0], C.mute[1], C.mute[2])
  doc.setFontSize(7)
  doc.setFont(undefined, 'normal')
  doc.text('For internal management review only. Not a safeguarding record.', MARGIN, y)
  doc.text(
    `Generated ${new Date().toLocaleString('en-GB')}  ·  Page ${pageNumber}`,
    pageWidth - MARGIN,
    y,
    { align: 'right' },
  )
}
