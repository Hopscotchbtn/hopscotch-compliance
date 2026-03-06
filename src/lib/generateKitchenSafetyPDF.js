import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

const FOREST     = [26, 58, 42]
const MARMALADE  = [224, 122, 28]
const LIGHT_GREY = [248, 248, 248]
const MID_GREY   = [130, 130, 130]
const WHITE      = [255, 255, 255]

const PACKED_LUNCH_LABELS = {
  pl2: 'Food inside boxes cool',
  pl4: 'No nuts',
}

function toDateStr(date) {
  return date.toISOString().slice(0, 10)
}

function getDatesInRange(start, end) {
  const dates = []
  const cur = new Date(start); cur.setHours(0, 0, 0, 0)
  const endD = new Date(end);  endD.setHours(23, 59, 59, 999)
  while (cur <= endD) {
    const day = cur.getDay()
    if (day >= 1 && day <= 5) dates.push(toDateStr(cur)) // Mon–Fri only
    cur.setDate(cur.getDate() + 1)
  }
  return dates
}

function formatWeekRange(start, end) {
  const fmt = d => d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
  return `${fmt(start)} – ${fmt(end)}`
}

function formatDayName(dateStr) {
  return new Date(dateStr + 'T12:00:00').toLocaleDateString('en-GB', { weekday: 'long' })
}

function formatDayDate(dateStr) {
  return new Date(dateStr + 'T12:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
}

async function fetchDataURL(url) {
  try {
    const res = await fetch(url)
    const blob = await res.blob()
    return new Promise(resolve => {
      const reader = new FileReader()
      reader.onloadend = () => resolve(reader.result)
      reader.readAsDataURL(blob)
    })
  } catch { return null }
}

function drawPageHeader(doc, nursery, weekRange, logoDataURL, pageW, margin) {
  let y = 8
  if (logoDataURL) {
    try {
      doc.addImage(logoDataURL, 'PNG', (pageW - 50) / 2, y, 50, 36)
      y += 42
    } catch { y += 8 }
  }

  y += 4 // gap between logo and title

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(13)
  doc.setTextColor(...FOREST)
  doc.text('Kitchen Food Safety Diary', pageW / 2, y, { align: 'center' })

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.setTextColor(...MID_GREY)
  doc.text(`${nursery}  ·  Week: ${weekRange}`, pageW / 2, y + 6, { align: 'center' })

  doc.setDrawColor(...MARMALADE)
  doc.setLineWidth(0.6)
  doc.line(margin, y + 10, pageW - margin, y + 10)

  return y + 16
}

function drawDayHeading(doc, dateStr, pageW, margin, headerH) {
  let y = headerH + 4

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(14)
  doc.setTextColor(...FOREST)
  doc.text(formatDayName(dateStr), margin, y)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(...MID_GREY)
  doc.text(formatDayDate(dateStr), margin, y + 6)

  return y + 12
}

function sectionLabel(doc, text, y, margin) {
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(7.5)
  doc.setTextColor(...MID_GREY)
  doc.text(text.toUpperCase(), margin, y)
  return y + 3
}

const TABLE_STYLES = {
  styles: { fontSize: 8.5, cellPadding: 2, font: 'helvetica' },
  headStyles: { fillColor: MARMALADE, textColor: WHITE, fontSize: 7.5, fontStyle: 'bold', cellPadding: 2 },
}

export async function generateKitchenSafetyPDF(nursery, history, weekStart, weekEnd) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const pageW = doc.internal.pageSize.getWidth()
  const margin = 14

  const logoDataURL = await fetchDataURL('/hopscotch-holiday-club-logo.png')
  const weekRange = formatWeekRange(weekStart, weekEnd)
  const dates = getDatesInRange(weekStart, weekEnd)

  for (let di = 0; di < dates.length; di++) {
    const dateStr = dates[di]
    const dayData = history[dateStr]

    if (di > 0) doc.addPage()

    const headerH = drawPageHeader(doc, nursery, weekRange, logoDataURL, pageW, margin)
    let y = drawDayHeading(doc, dateStr, pageW, margin, headerH)

    if (!dayData?.sectionData || Object.keys(dayData.completedSections || {}).length === 0) {
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(9)
      doc.setTextColor(...MID_GREY)
      doc.text('No checks recorded for this day.', margin + 2, y + 6)
      continue
    }

    const sd = dayData.sectionData

    // ── Opening Kitchen Checks ──────────────────────────────────────────────
    if (sd.opening) {
      y = sectionLabel(doc, 'Opening Kitchen Checks', y, margin)
      const rows = [1, 2, 3].map(n => {
        const f = sd.opening.temperatures?.[`fridge${n}`]
        return [`Fridge ${n}`, f?.name || '–', f?.temp ? `${f.temp}°C` : '–']
      })
      autoTable(doc, {
        startY: y,
        margin: { left: margin, right: margin },
        head: [['', 'Unit name', 'Temp']],
        body: [
          ...rows,
          [{ content: 'Initials', styles: { fontStyle: 'bold', textColor: MID_GREY } }, { content: sd.opening.completedBy || '–', colSpan: 2 }],
        ],
        columnStyles: { 0: { cellWidth: 22 }, 2: { cellWidth: 22 } },
        theme: 'grid',
        ...TABLE_STYLES,
      })
      y = doc.lastAutoTable.finalY + 5
    }

    // ── Packed Lunches ────────────────────────────────────────────────────
    if (sd.packedLunch) {
      y = sectionLabel(doc, 'Packed Lunches', y, margin)
      const plRows = Object.entries(PACKED_LUNCH_LABELS).map(([id, label]) => {
        const val = sd.packedLunch.deliveryData?.packedLunch?.[id]
        return [label, val ? val.charAt(0).toUpperCase() + val.slice(1) : '–']
      })
      autoTable(doc, {
        startY: y,
        margin: { left: margin, right: margin },
        head: [['Check', 'Result']],
        body: [
          ...plRows,
          [{ content: 'Initials', styles: { fontStyle: 'bold', textColor: MID_GREY } }, sd.packedLunch.completedBy || '–'],
        ],
        columnStyles: { 1: { cellWidth: 22 } },
        theme: 'grid',
        ...TABLE_STYLES,
      })
      y = doc.lastAutoTable.finalY + 5
    }

    // ── Closing Kitchen Check ──────────────────────────────────────────────
    if (sd.closing) {
      y = sectionLabel(doc, 'Closing Kitchen Check', y, margin)
      const rows = [1, 2, 3].map(n => {
        const f = sd.closing.temperatures?.[`fridge${n}`]
        return [`Fridge ${n}`, f?.name || '–', f?.temp ? `${f.temp}°C` : '–']
      })
      autoTable(doc, {
        startY: y,
        margin: { left: margin, right: margin },
        head: [['', 'Unit name', 'Temp']],
        body: [
          ...rows,
          [{ content: 'Initials', styles: { fontStyle: 'bold', textColor: MID_GREY } }, { content: sd.closing.completedBy || '–', colSpan: 2 }],
        ],
        columnStyles: { 0: { cellWidth: 22 }, 2: { cellWidth: 22 } },
        theme: 'grid',
        ...TABLE_STYLES,
      })
      y = doc.lastAutoTable.finalY + 5
    }

    // ── Manager Sign-off ──────────────────────────────────────────────────
    if (sd.signoff) {
      y = sectionLabel(doc, 'Manager Sign-off', y, margin)
      autoTable(doc, {
        startY: y,
        margin: { left: margin, right: margin },
        body: [
          [{ content: 'Comments', styles: { fontStyle: 'bold', textColor: MID_GREY } }, sd.signoff.responses?.managerComments || '–'],
          [{ content: 'Initials', styles: { fontStyle: 'bold', textColor: MID_GREY } }, sd.signoff.responses?.managerName || '–'],
        ],
        styles: { ...TABLE_STYLES.styles, fillColor: LIGHT_GREY },
        columnStyles: { 0: { cellWidth: 28 } },
        theme: 'plain',
      })
      y = doc.lastAutoTable.finalY + 3

      if (sd.signoff.managerSignature) {
        y = sectionLabel(doc, 'Signature', y, margin)
        try {
          doc.setDrawColor(210)
          doc.setFillColor(...WHITE)
          doc.roundedRect(margin, y, 80, 24, 2, 2, 'FD')
          doc.addImage(sd.signoff.managerSignature, 'PNG', margin + 1, y + 1, 78, 22)
        } catch { /* skip */ }
      }
    }
  }

  // ── Footer ────────────────────────────────────────────────────────────────
  const pageCount = doc.internal.getNumberOfPages()
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7)
    doc.setTextColor(...MID_GREY)
    doc.text(
      `${nursery}  ·  Kitchen Food Safety Diary  ·  ${new Date().toLocaleDateString('en-GB')}  ·  Page ${i} of ${pageCount}`,
      margin, 291
    )
  }

  return doc
}

export function getMondayOfWeek(date) {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  const day = d.getDay()
  d.setDate(d.getDate() + (day === 0 ? -6 : 1 - day))
  return d
}

export function getWeekOptions(count = 5) {
  const options = []
  let monday = getMondayOfWeek(new Date())
  for (let i = 0; i < count; i++) {
    const sunday = new Date(monday)
    sunday.setDate(sunday.getDate() + 6)
    const short = d => d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
    const long  = d => d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
    const label = i === 0 ? `This week (${short(monday)} – ${long(sunday)})`
                : i === 1 ? `Last week (${short(monday)} – ${long(sunday)})`
                : `${short(monday)} – ${long(sunday)}`
    options.push({ value: monday.toISOString().slice(0, 10), label, sunday: sunday.toISOString().slice(0, 10) })
    monday = new Date(monday)
    monday.setDate(monday.getDate() - 7)
  }
  return options
}
