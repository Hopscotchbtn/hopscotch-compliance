import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { kitchenSafety } from '../data/checklists'

const nurseryPackedLunchChecks = [
  { id: 'pl1', text: 'Child name shown on boxes' },
  { id: 'pl2', text: 'Food inside cool boxes' },
  { id: 'pl3', text: 'Food in good condition' },
  { id: 'pl4', text: 'No nuts' },
]

const FOREST     = [26, 58, 42]
const MARMALADE  = [224, 122, 28]
const LIGHT_GREY = [248, 248, 248]
const MID_GREY   = [130, 130, 130]
const WHITE      = [255, 255, 255]


function toDateStr(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
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

function drawPageHeader(doc, nursery, weekRange, logoDataURL, pageW, margin, room) {
  let y = 8
  if (logoDataURL) {
    try {
      doc.addImage(logoDataURL, 'PNG', (pageW - 50) / 2, y, 50, 36)
      y += 38
    } catch { y += 8 }
  }

  y += 4

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(13)
  doc.setTextColor(...FOREST)
  doc.text('Kitchen Food Safety Diary', pageW / 2, y, { align: 'center' })

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.setTextColor(...MID_GREY)
  const subtitle = room ? `${nursery}  ·  ${room}  ·  Week: ${weekRange}` : `${nursery}  ·  Week: ${weekRange}`
  doc.text(subtitle, pageW / 2, y + 6, { align: 'center' })

  doc.setDrawColor(...MARMALADE)
  doc.setLineWidth(0.6)
  doc.line(margin, y + 10, pageW - margin, y + 10)

  return y + 10
}

function renderDayContent(doc, sd, completedSections, y, margin, pageW) {
  const hasData = sd && (sd.opening || sd.closing || sd.packedLunch || sd.signoff)
  if (!hasData) {
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9)
    doc.setTextColor(...MID_GREY)
    doc.text('No checks recorded for this day.', margin + 2, y + 6)
    return
  }

  // ── Opening Fridge Checks ─────────────────────────────────────────────────
  if (sd.opening) {
    y = sectionLabel(doc, 'Opening Fridge Checks', y, margin)
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
        [{ content: 'Initials', styles: { fontStyle: 'bold', textColor: MID_GREY } }, { content: sd.opening.completedBy || sd.opening.signedBy || '–', colSpan: 2 }],
      ],
      columnStyles: { 0: { cellWidth: 22 }, 2: { cellWidth: 22 } },
      theme: 'grid',
      ...TABLE_STYLES,
    })
    y = doc.lastAutoTable.finalY + 5
  }

  // ── Packed Lunches ──────────────────────────────────────────────────────
  if (sd.packedLunch) {
    y = sectionLabel(doc, 'Packed Lunches', y, margin)
    const plRows = kitchenSafety.packedLunchChecks.map(item => {
      const val = sd.packedLunch.deliveryData?.packedLunch?.[item.id]
      return [item.text, val ? val.charAt(0).toUpperCase() + val.slice(1) : '–']
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

  // ── Closing Fridge Checks ────────────────────────────────────────────────
  if (sd.closing) {
    y = sectionLabel(doc, 'Closing Fridge Checks', y, margin)
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
        [{ content: 'Initials', styles: { fontStyle: 'bold', textColor: MID_GREY } }, { content: sd.closing.completedBy || sd.closing.signedBy || '–', colSpan: 2 }],
      ],
      columnStyles: { 0: { cellWidth: 22 }, 2: { cellWidth: 22 } },
      theme: 'grid',
      ...TABLE_STYLES,
    })
    y = doc.lastAutoTable.finalY + 5
  }

  // ── Manager Sign-off ────────────────────────────────────────────────────
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

function drawDayHeading(doc, dateStr, pageW, margin, headerH) {
  let y = headerH + 8

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(13)
  doc.setTextColor(...FOREST)
  doc.text(`${formatDayName(dateStr)}, ${formatDayDate(dateStr)}`, margin, y)

  doc.setDrawColor(...MARMALADE)
  doc.setLineWidth(0.5)
  doc.line(margin, y + 4, pageW - margin, y + 4)

  return y + 10
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

function addFooters(doc, nursery, margin) {
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
}

function formatDayHeader(dateStr) {
  const d = new Date(dateStr + 'T12:00:00')
  const weekday = d.toLocaleDateString('en-GB', { weekday: 'short' })
  const date = d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
  return `${weekday} ${date}`
}


const N_BLUE  = [177, 200, 246]  // #b1c8f6 — section header fill
const N_GREEN = [109, 159, 107]  // #6d9f6b — column header fill
const N_CREAM = [242, 238, 237]  // #f2eeed — alternating rows
const N_PINK  = [250, 225, 233]  // #fae1e9 — reference panel header

function sectionHeaderRow(label, colCount) {
  return [{ content: label, colSpan: colCount, styles: { fillColor: N_BLUE, textColor: FOREST, fontStyle: 'bold', fontSize: 7.5, cellPadding: { top: 2, bottom: 2, left: 3, right: 3 } } }]
}

const OPENING_ITEMS = [
  'Hot water in place',
  'Handwash facilities in place',
  'Clean cloths in place',
  'Sanitiser in place',
  'No food left out',
  'All foods in date',
  'Equipment OK',
  'Probe thermometer available & working',
  'Staff fit, well, in uniform',
]

const CLOSING_ITEMS = [
  'Rubbish out',
  'Cloths & aprons cleaned / removed',
  'No food left out',
  'All foods checked & date labelled',
  'Foods covered',
  'Utensils washed-up',
  'Daily cleaning tasks done',
  'Diary completed',
]

const LT_LUNCH_IDS = ['lt1', 'lt2', 'lt3', 'lt4']
const LT_TEA_IDS   = ['lt5', 'lt6']

function tick(sectionData) {
  return sectionData?.completedBy || sectionData?.signedBy ? '✓' : '–'
}

function ltTemp(ltData, mealKey, itemId) {
  const entry = ltData?.[mealKey]?.[itemId]
  if (!entry) return '–'
  if (entry.skipped) return 'N/A'
  return entry.temp ? `${entry.temp}°C` : '–'
}

// Returns { body1: opening + packed lunches, body2: little tums + closing + sign-off }
function buildRoomTable(dates, history) {
  const colCount = dates.length + 1
  const sd = (d) => history[d]?.sectionData || {}

  const openFridges = [1, 2, 3].filter(n =>
    dates.some(d => sd(d).opening?.temperatures?.[`fridge${n}`]?.temp)
  )
  const closeFridges = [1, 2, 3].filter(n =>
    dates.some(d => sd(d).closing?.temperatures?.[`fridge${n}`]?.temp)
  )
  if (!openFridges.length) openFridges.push(1)
  if (!closeFridges.length) closeFridges.push(1)

  const ltItems = kitchenSafety.littleTumsItems || []
  const ltLunchItems = ltItems.filter(i => LT_LUNCH_IDS.includes(i.id))
  const ltTeaItems   = ltItems.filter(i => LT_TEA_IDS.includes(i.id))

  const body1 = []

  // ── Opening Kitchen Checks ─────────────────────────────────────────────
  body1.push(sectionHeaderRow('Opening Kitchen Checks', colCount))
  body1.push(['All opening checks completed', ...dates.map(d => tick(sd(d).opening))])
  openFridges.forEach(n => {
    body1.push([
      `Fridge ${n} temperature`,
      ...dates.map(d => {
        const f = sd(d).opening?.temperatures?.[`fridge${n}`]
        if (!f?.temp) return '–'
        return f.name ? `${f.name}: ${f.temp}°C` : `${f.temp}°C`
      }),
    ])
  })
  body1.push(['Initials', ...dates.map(d => sd(d).opening?.completedBy || sd(d).opening?.signedBy || '–')])

  // ── Packed Lunches ────────────────────────────────────────────────────
  body1.push(sectionHeaderRow('Packed Lunches', colCount))
  nurseryPackedLunchChecks.forEach(item => {
    body1.push([
      item.text,
      ...dates.map(d => {
        const val = sd(d).packedLunch?.deliveryData?.packedLunch?.[item.id]
        if (!val) return sd(d).packedLunch ? '✓' : '–'
        return val.charAt(0).toUpperCase() + val.slice(1)
      }),
    ])
  })
  body1.push(['Initials', ...dates.map(d => sd(d).packedLunch?.completedBy || '–')])

  const body2 = []

  // ── Little Tums — Lunch ───────────────────────────────────────────────
  body2.push(sectionHeaderRow('Little Tums — Lunch', colCount))
  ltLunchItems.forEach(item => {
    body2.push([
      item.label,
      ...dates.map(d => {
        const ltData = sd(d).littleTums?.deliveryData
        const customName = ltData?.itemNames?.[item.id]
        const display = ltTemp(ltData, 'lunch', item.id)
        return customName && display !== '–' && display !== 'N/A' ? `${customName}: ${display}` : display
      }),
    ])
  })
  body2.push(['Initials', ...dates.map(d => {
    const lt = sd(d).littleTums
    return lt?.completedBy || lt?.signedBy || (lt?.deliveryData?.lunchDone ? '✓' : '–')
  })])

  // ── Little Tums — Tea ─────────────────────────────────────────────────
  body2.push(sectionHeaderRow('Little Tums — Tea', colCount))
  ltTeaItems.forEach(item => {
    body2.push([
      item.label,
      ...dates.map(d => {
        const ltData = sd(d).littleTums?.deliveryData
        const customName = ltData?.itemNames?.[item.id]
        const display = ltTemp(ltData, 'tea', item.id)
        return customName && display !== '–' && display !== 'N/A' ? `${customName}: ${display}` : display
      }),
    ])
  })
  body2.push(['Initials', ...dates.map(d => {
    const lt = sd(d).littleTums
    return lt?.completedBy || lt?.signedBy || (lt?.deliveryData?.teaDone ? '✓' : '–')
  })])

  // ── Closing Kitchen Check ─────────────────────────────────────────────
  body2.push(sectionHeaderRow('Closing Kitchen Check', colCount))
  body2.push(['All closing checks completed', ...dates.map(d => tick(sd(d).closing))])
  closeFridges.forEach(n => {
    body2.push([
      `Fridge ${n} temperature`,
      ...dates.map(d => {
        const f = sd(d).closing?.temperatures?.[`fridge${n}`]
        if (!f?.temp) return '–'
        return f.name ? `${f.name}: ${f.temp}°C` : `${f.temp}°C`
      }),
    ])
  })
  body2.push(['Initials', ...dates.map(d => sd(d).closing?.completedBy || sd(d).closing?.signedBy || '–')])

  // ── Manager/Room Lead Sign-off ────────────────────────────────────────
  body2.push(sectionHeaderRow('Manager/Room Lead Sign-off', colCount))
  body2.push(['Initials', ...dates.map(d => sd(d).signoff?.responses?.managerName || '–')])
  body2.push(['Comments', ...dates.map(d => sd(d).signoff?.responses?.managerComments || '–')])

  return { body1, body2 }
}

function twoColumnText(items) {
  // Split items into two side-by-side columns: left half then right half
  const half = Math.ceil(items.length / 2)
  const left  = items.slice(0, half)
  const right = items.slice(half)
  const rows = left.map((t, i) => {
    const leftCell  = `${i + 1}. ${t}`
    const rightCell = right[i] ? `${half + i + 1}. ${right[i]}` : ''
    return [leftCell, rightCell]
  })
  return rows
}

function drawChecklistReference(doc, y, margin, pageW) {
  const totalW = pageW - margin * 2
  const panelW = totalW / 2 - 2
  const itemColW = panelW / 2

  const openingRows = twoColumnText(OPENING_ITEMS)
  const closingRows = twoColumnText(CLOSING_ITEMS)

  // Opening checks panel (left half of page)
  autoTable(doc, {
    startY: y,
    margin: { left: margin, right: pageW / 2 + 1 },
    head: [['Opening Kitchen Checks', '']],
    body: openingRows,
    headStyles: { fillColor: N_PINK, textColor: FOREST, fontSize: 8, fontStyle: 'bold', cellPadding: 2.5, halign: 'left' },
    styles: { fontSize: 8, cellPadding: { top: 2.5, bottom: 2.5, left: 4, right: 4 }, font: 'helvetica', lineColor: [220, 220, 220], fillColor: N_CREAM },
    columnStyles: { 0: { cellWidth: itemColW }, 1: { cellWidth: itemColW } },
    theme: 'grid',
    didParseCell: (data) => {
      if (data.row.index === -1 && data.column.index === 1) {
        data.cell.styles.fillColor = N_PINK
      }
    },
  })
  const panelBottomY = doc.lastAutoTable.finalY

  // Closing checks panel (right half of page)
  autoTable(doc, {
    startY: y,
    margin: { left: pageW / 2 + 1, right: margin },
    head: [['Closing Kitchen Check', '']],
    body: closingRows,
    headStyles: { fillColor: N_PINK, textColor: FOREST, fontSize: 8, fontStyle: 'bold', cellPadding: 2.5, halign: 'left' },
    styles: { fontSize: 8, cellPadding: { top: 2.5, bottom: 2.5, left: 4, right: 4 }, font: 'helvetica', lineColor: [220, 220, 220], fillColor: N_CREAM },
    columnStyles: { 0: { cellWidth: itemColW }, 1: { cellWidth: itemColW } },
    theme: 'grid',
    didParseCell: (data) => {
      if (data.row.index === -1 && data.column.index === 1) {
        data.cell.styles.fillColor = N_PINK
      }
    },
  })

  return Math.max(panelBottomY, doc.lastAutoTable.finalY) + 3
}

function drawPeriodicChecks(doc, y, room, periodicChecks, margin, pageW) {
  const { weekly = [], calibration = null } = periodicChecks || {}

  const probeCheck       = weekly.find(c => c.check_type === 'probeCheck')
  const supermarketCheck = weekly.find(c => c.check_type === 'supermarketTemp')

  const fmtDate = (iso) => iso
    ? new Date(iso).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })
    : '–'

  const totalW = pageW - margin * 2
  const labelW = totalW * 0.55
  const dateW  = totalW * 0.28
  const byW    = totalW - labelW - dateW

  autoTable(doc, {
    startY: y,
    margin: { left: margin, right: margin },
    head: [['Weekly Checks', 'Date completed', 'By']],
    body: [
      [
        'Fridge/Freezer Probe Thermometer Check',
        probeCheck ? fmtDate(probeCheck.created_at) : 'Not done this week',
        probeCheck?.completed_by || '–',
      ],
      [
        'Supermarket Food Temperature Checks',
        supermarketCheck ? fmtDate(supermarketCheck.created_at) : 'Not done this week',
        supermarketCheck?.completed_by || '–',
      ],
    ],
    headStyles: { fillColor: N_GREEN, textColor: WHITE, fontSize: 7.5, fontStyle: 'bold', cellPadding: 2.5 },
    styles: { fontSize: 7.5, cellPadding: { top: 2.5, bottom: 2.5, left: 3, right: 3 }, font: 'helvetica' },
    columnStyles: { 0: { cellWidth: labelW }, 1: { cellWidth: dateW }, 2: { cellWidth: byW } },
    theme: 'grid',
    alternateRowStyles: { fillColor: N_CREAM },
    didParseCell: (data) => {
      if (data.section === 'body' && data.column.index === 1) {
        const notDone = data.cell.text[0] === 'Not done this week'
        if (notDone) data.cell.styles.textColor = [180, 60, 60]
      }
    },
  })
  y = doc.lastAutoTable.finalY + 3

  const now = new Date()
  const isOverdue = !calibration || (now - new Date(calibration.created_at)) > 31 * 24 * 60 * 60 * 1000
  const calDate = calibration
    ? new Date(calibration.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
    : 'Never recorded'

  autoTable(doc, {
    startY: y,
    margin: { left: margin, right: margin },
    head: [['Monthly Check', 'Last completed', 'Status']],
    body: [['Probe Calibration Check', calDate, isOverdue ? 'OVERDUE' : 'Up to date']],
    headStyles: { fillColor: N_PINK, textColor: FOREST, fontSize: 7.5, fontStyle: 'bold', cellPadding: 2.5 },
    styles: { fontSize: 7.5, cellPadding: { top: 2.5, bottom: 2.5, left: 3, right: 3 }, font: 'helvetica' },
    columnStyles: { 0: { cellWidth: labelW }, 1: { cellWidth: dateW }, 2: { cellWidth: byW } },
    theme: 'grid',
    didParseCell: (data) => {
      if (data.section === 'body' && data.column.index === 2) {
        data.cell.styles.textColor = isOverdue ? [180, 60, 60] : [60, 140, 60]
        data.cell.styles.fontStyle = 'bold'
      }
    },
  })

  return doc.lastAutoTable.finalY
}

export async function generateAllRoomsKitchenSafetyPDF(nursery, checks, weekStart, weekEnd, allRooms = null, periodicChecks = null) {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })
  const pageW = doc.internal.pageSize.getWidth()  // 297mm
  const pageH = doc.internal.pageSize.getHeight() // 210mm
  const margin = 12

  const logoDataURL = await fetchDataURL('/hopscotch-logo.png')
  const weekRange = formatWeekRange(weekStart, weekEnd)
  const dates = getDatesInRange(weekStart, weekEnd)

  // Group checks by room, then by date
  const byRoom = {}
  for (const check of checks) {
    const room = check.room || 'Kitchen'
    if (!byRoom[room]) byRoom[room] = {}
    const dateStr = toDateStr(new Date(check.created_at))
    let sectionData = null
    let completedSections = {}
    try {
      const parsed = JSON.parse(check.overall_notes || '{}')
      sectionData = parsed.sectionData
    } catch {}
    if (check.items) {
      check.items.forEach(item => { if (item.status === 'pass') completedSections[item.id] = true })
    }
    byRoom[room][dateStr] = { sectionData, completedSections }
  }

  // Ensure all expected rooms appear, even with no data
  if (allRooms) {
    for (const room of allRooms) {
      if (!byRoom[room]) byRoom[room] = {}
    }
  }

  const rooms = allRooms
    ? allRooms.filter(r => byRoom[r] !== undefined)
    : Object.keys(byRoom)

  if (rooms.length === 0) {
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(11)
    doc.setTextColor(...FOREST)
    doc.text('Kitchen Food Safety Diary', pageW / 2, 20, { align: 'center' })
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)
    doc.setTextColor(...MID_GREY)
    doc.text(`${nursery}  ·  Week: ${weekRange}`, pageW / 2, 27, { align: 'center' })
    doc.text('No checks recorded for this week.', pageW / 2, 50, { align: 'center' })
    return doc
  }

  const labelColW = 50
  const dayColW = (pageW - margin * 2 - labelColW) / dates.length

  for (let ri = 0; ri < rooms.length; ri++) {
    const room = rooms[ri]
    const history = byRoom[room]

    const drawRoomHeader = (doc, y) => {
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(11)
      doc.setTextColor(...FOREST)
      doc.text(`Kitchen Food Safety Diary — ${room}`, pageW / 2, y, { align: 'center' })
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(7.5)
      doc.setTextColor(...MID_GREY)
      doc.text(`${nursery}  ·  Week: ${weekRange}`, pageW / 2, y + 6, { align: 'center' })
      doc.setDrawColor(...N_GREEN)
      doc.setLineWidth(0.5)
      doc.line(margin, y + 8, pageW - margin, y + 8)
      return y + 12
    }

    const tableStyles = {
      headStyles: { fillColor: N_GREEN, textColor: WHITE, fontSize: 7.5, fontStyle: 'bold', halign: 'center', cellPadding: 2 },
      styles: { fontSize: 7, cellPadding: { top: 1.5, bottom: 1.5, left: 3, right: 3 }, font: 'helvetica', valign: 'middle' },
      alternateRowStyles: { fillColor: N_CREAM },
      columnStyles: {
        0: { cellWidth: labelColW, textColor: FOREST, fillColor: [245, 247, 245] },
        ...Object.fromEntries(dates.map((_, i) => [i + 1, { cellWidth: dayColW, halign: 'center' }])),
      },
    }

    // ── Page 1: logo + header + reference panel + opening + packed lunches ──
    if (ri > 0) doc.addPage()
    let y = 6
    if (logoDataURL) {
      try { doc.addImage(logoDataURL, 'PNG', (pageW - 22) / 2, y, 22, 22); y += 26 }
      catch { y += 4 }
    }
    y = drawRoomHeader(doc, y)
    y = drawChecklistReference(doc, y, margin, pageW)

    const head = [['', ...dates.map(d => formatDayHeader(d))]]
    const { body1, body2 } = buildRoomTable(dates, history)

    autoTable(doc, {
      startY: y,
      margin: { left: margin, right: margin },
      head,
      body: body1,
      ...tableStyles,
    })

    // ── Page 2: little tums + closing + manager sign-off ───────────────────
    doc.addPage()
    let y2 = 6
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(9)
    doc.setTextColor(...FOREST)
    doc.text(`Kitchen Food Safety Diary — ${room}`, pageW / 2, y2, { align: 'center' })
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7.5)
    doc.setTextColor(...MID_GREY)
    doc.text(`${nursery}  ·  Week: ${weekRange}`, pageW / 2, y2 + 5, { align: 'center' })
    y2 += 10

    autoTable(doc, {
      startY: y2,
      margin: { left: margin, right: margin },
      head,
      body: body2,
      ...tableStyles,
    })

    drawPeriodicChecks(doc, doc.lastAutoTable.finalY + 4, room, periodicChecks, margin, pageW)

  }

  // ── Footers on all pages ──────────────────────────────────────────────────
  const totalPages = doc.internal.getNumberOfPages()
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(6.5)
    doc.setTextColor(...MID_GREY)
    doc.text(
      `${nursery}  ·  Kitchen Food Safety Diary  ·  ${new Date().toLocaleDateString('en-GB')}  ·  Page ${i} of ${totalPages}`,
      margin, pageH - 5
    )
  }

  return doc
}

// Legacy single-room export (kept for compatibility)
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
    renderDayContent(doc, dayData?.sectionData, dayData?.completedSections, y, margin, pageW)
  }

  addFooters(doc, nursery, margin)
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
