import { jsPDF } from 'jspdf'
import { childDisplayName, formatDate } from './dataHelpers'
import { computeAccidentReport } from './computeAccidentReport'

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
const CONTENT_WIDTH = 210 - MARGIN * 2 // A4 portrait = 210mm wide

const COLOURS = {
  forest: [31, 68, 53],       // Hopscotch deep green
  forestLight: [230, 238, 233],
  text: [30, 30, 30],
  mute: [120, 120, 120],
  rule: [220, 220, 215],
  panelBg: [250, 250, 248],
  warningBg: [254, 242, 242],
  warningRule: [252, 165, 165],
  warningText: [153, 27, 27],
  amberBg: [255, 247, 237],
  amberRule: [251, 191, 36],
  amberText: [180, 83, 9],
  accentBg: [255, 248, 240],
}

function setColor(doc, rgb, method = 'setTextColor') {
  doc[method](rgb[0], rgb[1], rgb[2])
}

// ─── main generator ──────────────────────────────────────────────────────────

export function generateMonthlyReportPDF(reportOrIncidents, siteName, maybePeriod) {
  // Back-compat: accept either a precomputed report or raw incidents + period
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
    dowOrder, dowCounts,
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

  // Colour bar top
  setColor(doc, COLOURS.forest, 'setFillColor')
  doc.rect(0, 0, pageWidth, 4, 'F')

  y = 16
  setColor(doc, COLOURS.forest, 'setTextColor')
  doc.setFontSize(18)
  doc.setFont(undefined, 'bold')
  doc.text(titleForPeriod(period), pageWidth / 2, y, { align: 'center' })
  y += 7

  setColor(doc, COLOURS.text, 'setTextColor')
  doc.setFontSize(13)
  doc.setFont(undefined, 'normal')
  doc.text(siteName, pageWidth / 2, y, { align: 'center' })
  y += 6

  setColor(doc, COLOURS.mute, 'setTextColor')
  doc.setFontSize(10)
  doc.text(period.label, pageWidth / 2, y, { align: 'center' })
  y += 10

  // ─── AT-A-GLANCE SUMMARY STRIP (4 KPI cards) ──

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
    setColor(doc, card.warn ? COLOURS.warningBg : COLOURS.panelBg, 'setFillColor')
    setColor(doc, card.warn ? COLOURS.warningRule : COLOURS.rule, 'setDrawColor')
    doc.roundedRect(x, cardY, cardW, cardH, 1.5, 1.5, 'FD')

    setColor(doc, COLOURS.mute, 'setTextColor')
    doc.setFontSize(7)
    doc.setFont(undefined, 'normal')
    doc.text(card.label.toUpperCase(), x + 3, cardY + 5)

    setColor(doc, card.warn ? COLOURS.warningText : COLOURS.forest, 'setTextColor')
    doc.setFontSize(18)
    doc.setFont(undefined, 'bold')
    doc.text(card.value, x + 3, cardY + 14)

    setColor(doc, COLOURS.mute, 'setTextColor')
    doc.setFontSize(7)
    doc.setFont(undefined, 'normal')
    doc.text(card.sub, x + 3, cardY + 20, { maxWidth: cardW - 6 })
  })
  y = cardY + cardH + 8
  setColor(doc, COLOURS.text, 'setTextColor')

  // ─── REGULATORY FLAGS BAR (only if any are non-zero) ──

  if (riddorCount + ofstedCount + ladoCount > 0) {
    addPageIfNeeded(14)
    setColor(doc, COLOURS.amberBg, 'setFillColor')
    setColor(doc, COLOURS.amberRule, 'setDrawColor')
    doc.roundedRect(MARGIN, y, CONTENT_WIDTH, 11, 1.5, 1.5, 'FD')
    setColor(doc, COLOURS.amberText, 'setTextColor')
    doc.setFontSize(9)
    doc.setFont(undefined, 'bold')
    const parts = []
    if (riddorCount > 0) parts.push(`RIDDOR: ${riddorCount}`)
    if (ofstedCount > 0) parts.push(`Ofsted: ${ofstedCount}`)
    if (ladoCount > 0) parts.push(`LADO: ${ladoCount}`)
    doc.text(`Regulatory flags  —  ${parts.join('   ·   ')}`, MARGIN + 4, y + 7)
    setColor(doc, COLOURS.text, 'setTextColor')
    y += 16
  }

  // ─── NEEDS FORMAL REVIEW (split HIGH / MEDIUM) ──

  if (high.length > 0 || medium.length > 0) {
    addPageIfNeeded(20 + (high.length + medium.length) * 5)
    doc.setFontSize(11)
    doc.setFont(undefined, 'bold')
    doc.text('Needs formal review', MARGIN, y)
    y += 2
    setColor(doc, COLOURS.mute, 'setTextColor')
    doc.setFontSize(7)
    doc.setFont(undefined, 'normal')
    doc.text('Auto-flagged by keyword match — please review each for context.', MARGIN, y + 4)
    y += 8
    setColor(doc, COLOURS.text, 'setTextColor')

    if (high.length > 0) {
      setColor(doc, COLOURS.warningText, 'setTextColor')
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
      setColor(doc, COLOURS.amberText, 'setTextColor')
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
    setColor(doc, COLOURS.text, 'setTextColor')
    y += 3
  }

  // ─── REPEAT CHILDREN — top 8 ranked table ──

  if (repeats.length > 0) {
    addPageIfNeeded(20 + repeats.length * 6)
    doc.setFontSize(11)
    doc.setFont(undefined, 'bold')
    doc.text(`Top repeat children  (${repeatWindowLabel})`, MARGIN, y)
    y += 2
    setColor(doc, COLOURS.mute, 'setTextColor')
    doc.setFontSize(7)
    doc.setFont(undefined, 'normal')
    doc.text('Ranked by count within this period. Check individual Family accounts for full history. Context matters — some children may have medical or developmental factors.', MARGIN, y + 4)
    y += 8
    setColor(doc, COLOURS.text, 'setTextColor')

    // Table header
    setColor(doc, COLOURS.mute, 'setTextColor')
    doc.setFontSize(8)
    doc.setFont(undefined, 'bold')
    doc.text('#', MARGIN + 2, y)
    doc.text('Child', MARGIN + 10, y)
    doc.text('Count', MARGIN + 70, y)
    doc.text('Most recent', MARGIN + 95, y)
    doc.text('Location', MARGIN + 130, y)
    y += 2
    setColor(doc, COLOURS.rule, 'setDrawColor')
    doc.setLineWidth(0.2)
    doc.line(MARGIN, y, MARGIN + CONTENT_WIDTH, y)
    y += 4
    setColor(doc, COLOURS.text, 'setTextColor')

    doc.setFont(undefined, 'normal')
    doc.setFontSize(9)
    repeats.forEach((child, i) => {
      addPageIfNeeded(6)
      doc.text(String(i + 1), MARGIN + 2, y)
      doc.text(child.displayName, MARGIN + 10, y)
      doc.text(String(child.count), MARGIN + 70, y)
      doc.text(formatDate(child.mostRecentDate), MARGIN + 95, y)
      doc.text((child.mostRecentLocation || '').slice(0, 26), MARGIN + 130, y)
      y += 5
    })
    y += 6
  }

  // ─── HOME VS SETTING BREAKDOWN ──

  if (totalReports > 0) {
    addPageIfNeeded(35)
    doc.setFontSize(11)
    doc.setFont(undefined, 'bold')
    setColor(doc, COLOURS.text, 'setTextColor')
    doc.text('Home vs. setting', MARGIN, y)
    y += 7

    const homePct = Math.round((homeIncs.length / totalReports) * 100)
    const settingPct = Math.round((settingIncs.length / totalReports) * 100)

    doc.setFontSize(9)
    doc.setFont(undefined, 'bold')
    doc.text('At the setting:', MARGIN + 2, y)
    doc.setFont(undefined, 'normal')
    doc.text(`${settingIncs.length}   (${settingPct}%)`, MARGIN + 50, y)
    y += 5

    doc.setFont(undefined, 'bold')
    doc.text('At home / on arrival:', MARGIN + 2, y)
    doc.setFont(undefined, 'normal')
    doc.text(`${homeIncs.length}   (${homePct}%)`, MARGIN + 50, y)
    y += 5

    if (siteLocs.length > 0) {
      y += 2
      doc.setFont(undefined, 'bold')
      doc.text('Top locations (setting):', MARGIN + 2, y)
      y += 5
      doc.setFont(undefined, 'normal')
      siteLocs.forEach(loc => {
        addPageIfNeeded(6)
        const pct = totalReports > 0 ? Math.round((loc.count / totalReports) * 100) : 0
        doc.text(`•  ${loc.location}`, MARGIN + 4, y)
        doc.text(`${loc.count}   (${pct}%)`, MARGIN + 90, y)
        y += 5
      })
    }
    y += 6
  }

  // ─── INJURY TYPE BREAKDOWN ──

  if (injuryTypes.length > 0) {
    addPageIfNeeded(20 + injuryTypes.length * 5)
    doc.setFontSize(11)
    doc.setFont(undefined, 'bold')
    setColor(doc, COLOURS.text, 'setTextColor')
    doc.text('Injury type breakdown', MARGIN, y)
    y += 2
    setColor(doc, COLOURS.mute, 'setTextColor')
    doc.setFontSize(7)
    doc.setFont(undefined, 'normal')
    doc.text('As a percentage of all reports in this period.', MARGIN, y + 4)
    y += 8
    setColor(doc, COLOURS.text, 'setTextColor')

    doc.setFontSize(9)
    doc.setFont(undefined, 'normal')
    injuryTypes.forEach(({ category, count }) => {
      addPageIfNeeded(6)
      const pct = totalReports > 0 ? Math.round((count / totalReports) * 100) : 0
      doc.text(`•  ${category}`, MARGIN + 4, y)
      doc.text(`${count}   (${pct}%)`, MARGIN + 90, y)
      y += 5
    })
    y += 6
  }

  // ─── DAY OF WEEK ──

  if (totalReports > 0) {
    addPageIfNeeded(45)
    doc.setFontSize(11)
    doc.setFont(undefined, 'bold')
    doc.text('When reports happen', MARGIN, y)
    y += 7

    doc.setFontSize(9)
    doc.setFont(undefined, 'normal')
    const barMaxW = 70
    const barX = MARGIN + 30
    dowOrder.forEach(day => {
      const count = dowCounts[day]
      if (day === 'Saturday' || day === 'Sunday') {
        if (count === 0) return // skip empty weekend rows
      }
      const w = (count / dowMax) * barMaxW
      addPageIfNeeded(6)
      setColor(doc, COLOURS.text, 'setTextColor')
      doc.text(day, MARGIN + 2, y)
      if (w > 0) {
        setColor(doc, COLOURS.forestLight, 'setFillColor')
        doc.rect(barX, y - 3, Math.max(w, 0.5), 4, 'F')
      }
      setColor(doc, COLOURS.mute, 'setTextColor')
      doc.text(String(count), barX + barMaxW + 3, y)
      y += 5
    })
    setColor(doc, COLOURS.text, 'setTextColor')
    y += 6
  }

  // ─── REVIEWED BY signature line ──

  addPageIfNeeded(30)
  y = Math.max(y, PAGE_BOTTOM - 40)
  setColor(doc, COLOURS.rule, 'setDrawColor')
  doc.setLineWidth(0.2)
  doc.line(MARGIN, y, MARGIN + CONTENT_WIDTH, y)
  y += 5
  doc.setFontSize(9)
  doc.setFont(undefined, 'bold')
  setColor(doc, COLOURS.text, 'setTextColor')
  doc.text('Reviewed by', MARGIN, y)
  y += 7
  doc.setFont(undefined, 'normal')
  doc.setFontSize(8)
  setColor(doc, COLOURS.mute, 'setTextColor')
  doc.text('Name: ________________________________     Role: ________________     Date: ____________', MARGIN, y)
  y += 6
  doc.text('Comments: _____________________________________________________________________', MARGIN, y)
  y += 6
  doc.text('Actions: ______________________________________________________________________', MARGIN, y)

  // ─── FOOTER on final page ──
  addFooter(doc, pageNumber)

  const filename = `accident-review-${siteName.replace(/\s+/g, '-').toLowerCase()}-${filenameSlugForPeriod(period)}.pdf`
  doc.save(filename)
}

function addFooter(doc, pageNumber) {
  const pageWidth = doc.internal.pageSize.getWidth()
  const y = 287
  setColor(doc, COLOURS.mute, 'setTextColor')
  doc.setFontSize(7)
  doc.setFont(undefined, 'normal')
  doc.text(
    'For internal management review only. Not a safeguarding record.',
    MARGIN,
    y,
  )
  doc.text(
    `Generated ${new Date().toLocaleString('en-GB')}  ·  Page ${pageNumber}`,
    pageWidth - MARGIN,
    y,
    { align: 'right' },
  )
}
