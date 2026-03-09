import { jsPDF } from 'jspdf'
import { filterByMonth, repeatChildren, rollingWindow, locationCounts, childDisplayName, formatDate } from './dataHelpers'

function previousYearMonth() {
  const now = new Date()
  const prev = new Date(now.getFullYear(), now.getMonth() - 1, 1)
  return `${prev.getFullYear()}-${String(prev.getMonth() + 1).padStart(2, '0')}`
}

function previousYearSameMonth() {
  const now = new Date()
  const prev = new Date(now.getFullYear() - 1, now.getMonth() - 1, 1)
  return `${prev.getFullYear()}-${String(prev.getMonth() + 1).padStart(2, '0')}`
}

function monthLabel(yearMonth) {
  const [year, month] = yearMonth.split('-')
  const date = new Date(parseInt(year), parseInt(month) - 1, 1)
  return date.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })
}

export function generateMonthlyReportPDF(incidents, siteName) {
  const doc = new jsPDF()
  const pageWidth = doc.internal.pageSize.getWidth()
  let y = 20

  const addPageIfNeeded = (needed = 20) => {
    if (y + needed > 275) {
      doc.addPage()
      y = 20
    }
  }

  const reviewMonth = previousYearMonth()
  const lastYearMonth = previousYearSameMonth()
  const monthIncs = filterByMonth(incidents, reviewMonth)
  const lastYearIncs = filterByMonth(incidents, lastYearMonth)

  const thisAccidents = monthIncs.filter(x => x.kind === 'Accident').length
  const thisIncidents = monthIncs.filter(x => x.kind === 'Incident').length
  const lastAccidents = lastYearIncs.filter(x => x.kind === 'Accident').length
  const lastIncidents = lastYearIncs.filter(x => x.kind === 'Incident').length
  const needsReview = monthIncs.filter(x => x.severity === 'high' || x.severity === 'medium')
  const locations = locationCounts(monthIncs).slice(0, 5)
  const repeats = repeatChildren(rollingWindow(incidents, 3), 2)

  // Header
  doc.setFontSize(18)
  doc.setFont(undefined, 'bold')
  doc.text('Monthly Accident & Incident Review', pageWidth / 2, y, { align: 'center' })
  y += 10
  doc.setFontSize(12)
  doc.setFont(undefined, 'normal')
  doc.text(siteName, pageWidth / 2, y, { align: 'center' })
  y += 7
  doc.setFontSize(11)
  doc.text(monthLabel(reviewMonth), pageWidth / 2, y, { align: 'center' })
  y += 12

  // Summary box
  doc.setFillColor(250, 250, 248)
  doc.setDrawColor(220, 220, 215)
  doc.roundedRect(14, y, pageWidth - 28, 32, 2, 2, 'FD')
  y += 8

  doc.setFontSize(10)
  doc.setFont(undefined, 'bold')
  doc.text('Summary', 20, y)
  y += 7

  doc.setFont(undefined, 'normal')
  doc.text(`Total accidents: ${thisAccidents}`, 20, y)
  if (lastYearIncs.length > 0) {
    const diff = thisAccidents - lastAccidents
    const diffText = diff === 0 ? '(same as last year)' : diff > 0 ? `(+${diff} vs last year)` : `(${diff} vs last year)`
    doc.text(diffText, 70, y)
  }
  y += 6

  doc.text(`Total incidents: ${thisIncidents}`, 20, y)
  if (lastYearIncs.length > 0) {
    const diff = thisIncidents - lastIncidents
    const diffText = diff === 0 ? '(same as last year)' : diff > 0 ? `(+${diff} vs last year)` : `(${diff} vs last year)`
    doc.text(diffText, 70, y)
  }
  y += 6

  doc.setFont(undefined, 'bold')
  doc.text(`Combined total: ${monthIncs.length}`, 20, y)
  y += 14

  // Flagged for review
  if (needsReview.length > 0) {
    addPageIfNeeded(30)
    doc.setFillColor(254, 242, 242)
    doc.setDrawColor(252, 165, 165)
    doc.roundedRect(14, y, pageWidth - 28, 8 + needsReview.length * 6, 2, 2, 'FD')
    y += 6
    doc.setFont(undefined, 'bold')
    doc.setTextColor(153, 27, 27)
    doc.text(`${needsReview.length} incident(s) flagged for formal review`, 20, y)
    y += 6
    doc.setFont(undefined, 'normal')
    doc.setFontSize(9)
    needsReview.forEach(inc => {
      doc.text(`• ${childDisplayName(inc.childName)} — ${formatDate(inc.happenedAt)} — ${inc.injuryCategory}`, 22, y)
      y += 5
    })
    doc.setTextColor(0)
    doc.setFontSize(10)
    y += 6
  }

  // Repeat children
  if (repeats.length > 0) {
    addPageIfNeeded(30)
    doc.setFont(undefined, 'bold')
    doc.text('Children with repeat incidents (rolling 3 months)', 14, y)
    y += 6
    doc.setFont(undefined, 'normal')
    doc.setFontSize(9)
    repeats.forEach(child => {
      const flag = child.count >= 3 ? ' ** Discuss with DSL **' : ''
      doc.text(`• ${child.displayName}: ${child.count} incidents${flag}`, 18, y)
      y += 5
    })
    doc.setFontSize(10)
    y += 6
  }

  // Location breakdown
  if (locations.length > 0) {
    addPageIfNeeded(30)
    doc.setFont(undefined, 'bold')
    doc.text('Top locations', 14, y)
    y += 6
    doc.setFont(undefined, 'normal')
    doc.setFontSize(9)
    locations.forEach(loc => {
      doc.text(`• ${loc.location}: ${loc.count}`, 18, y)
      y += 5
    })
    doc.setFontSize(10)
    y += 8
  }

  // Divider
  doc.setDrawColor(200)
  doc.line(14, y, pageWidth - 14, y)
  y += 8

  // Incident list
  doc.setFont(undefined, 'bold')
  doc.text('All incidents this month', 14, y)
  y += 8

  if (monthIncs.length === 0) {
    doc.setFont(undefined, 'normal')
    doc.text('No incidents recorded.', 14, y)
    y += 8
  } else {
    const sorted = [...monthIncs].sort((a, b) => new Date(a.happenedAt) - new Date(b.happenedAt))

    // Table header
    doc.setFillColor(245, 245, 244)
    doc.rect(14, y - 1, pageWidth - 28, 7, 'F')
    doc.setFontSize(8)
    doc.setFont(undefined, 'bold')
    doc.text('Date', 16, y + 4)
    doc.text('Child', 42, y + 4)
    doc.text('Type', 75, y + 4)
    doc.text('Location', 95, y + 4)
    doc.text('Description', 125, y + 4)
    y += 9

    doc.setFont(undefined, 'normal')
    sorted.forEach(inc => {
      addPageIfNeeded(12)
      const date = formatDate(inc.happenedAt)
      const child = childDisplayName(inc.childName)
      const nature = inc.nature.length > 35 ? inc.nature.slice(0, 35) + '...' : inc.nature

      doc.text(date, 16, y)
      doc.text(child, 42, y)
      doc.text(inc.kind, 75, y)
      doc.text(inc.location.slice(0, 18), 95, y)
      doc.text(nature, 125, y)
      y += 6
    })
  }

  // Footer
  addPageIfNeeded(20)
  y = 280
  doc.setFontSize(8)
  doc.setTextColor(150)
  doc.text('This report is for internal management review only. It is not a safeguarding record.', pageWidth / 2, y, { align: 'center' })
  y += 4
  doc.text(`Generated ${new Date().toLocaleString('en-GB')} from Famly data`, pageWidth / 2, y, { align: 'center' })

  const filename = `accident-review-${siteName.replace(/\s+/g, '-').toLowerCase()}-${reviewMonth}.pdf`
  doc.save(filename)
}
