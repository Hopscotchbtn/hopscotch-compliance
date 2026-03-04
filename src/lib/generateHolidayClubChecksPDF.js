import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

const FOREST    = [26, 58, 42]
const MARMALADE = [109, 159, 107]
const MID_GREY  = [130, 130, 130]
const WHITE     = [255, 255, 255]

const CHECK_ITEMS = [
  'All electrical equipment present must be in good condition, with wires out of reach of children or made safe.',
  'Play equipment in good condition, with no sharp edges or damage.',
  'Fixtures and fittings should be secure and in good condition, including tables, chairs and benches.',
  'Fire and electrical hazards e.g. firefighting equipment easily accessible and fire exits free of obstacles, signage in place.',
  'Phone lines, intercoms and security cameras are working (if applicable)',
  'Hot water is working',
  'Pests',
  'Gates are locked and lock mechanism in good working order',
  'Checking whole outside for any possible dangerous debris which could have come from neighbouring gardens / fallen from trees.',
  'Check for animal excrement.',
  'Slip, trip, fall hazards, such as leaves, frost, ice, drains and covers.',
]

function formatWeekRange(start, end) {
  const fmt = d => d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
  return `${fmt(start)} – ${fmt(end)}`
}

function formatDate(isoStr) {
  return new Date(isoStr).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
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

export async function generateHolidayClubChecksPDF(nursery, checks, weekStart, weekEnd) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const pageW = doc.internal.pageSize.getWidth()
  const margin = 14

  const logoDataURL = await fetchDataURL('/hopscotch-holiday-club-logo.png')
  const weekRange = formatWeekRange(weekStart, weekEnd)

  // ── Header ────────────────────────────────────────────────────────────────
  let y = 8
  if (logoDataURL) {
    try {
      doc.addImage(logoDataURL, 'PNG', (pageW - 50) / 2, y, 50, 36)
      y += 42
    } catch { y += 8 }
  }
  y += 4

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(13)
  doc.setTextColor(...FOREST)
  doc.text('Holiday Club Daily Checks', pageW / 2, y, { align: 'center' })

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.setTextColor(...MID_GREY)
  doc.text(`${nursery}  ·  Week: ${weekRange}`, pageW / 2, y + 6, { align: 'center' })

  doc.setDrawColor(...MARMALADE)
  doc.setLineWidth(0.6)
  doc.line(margin, y + 10, pageW - margin, y + 10)
  y += 16

  // ── Check items list ──────────────────────────────────────────────────────
  autoTable(doc, {
    startY: y,
    margin: { left: margin, right: margin },
    head: [['#', 'The checks carried out will consist of the following']],
    body: CHECK_ITEMS.map((text, i) => [i + 1, text]),
    columnStyles: { 0: { cellWidth: 8 } },
    theme: 'grid',
    styles: { fontSize: 8.5, cellPadding: 2, font: 'helvetica' },
    headStyles: { fillColor: MARMALADE, textColor: WHITE, fontSize: 7.5, fontStyle: 'bold', cellPadding: 2 },
  })
  y = doc.lastAutoTable.finalY + 8

  // ── Fetch signatures and build rows ───────────────────────────────────────
  // Sort checks ascending by date
  const sorted = [...checks].sort((a, b) => a.created_at.localeCompare(b.created_at))

  // Pre-fetch all signature images
  const sigImages = await Promise.all(
    sorted.map(c => c.signature_url ? fetchDataURL(c.signature_url) : Promise.resolve(null))
  )

  // ── Sign-off table ────────────────────────────────────────────────────────
  const SIG_H = 18   // row height for signature rows (mm)
  const SIG_W = 40   // signature image width (mm)
  const COL_DATE     = 28
  const COL_INITIALS = 16
  const COL_SIG      = SIG_W + 4
  const COL_COMMENTS = pageW - margin * 2 - COL_DATE - COL_INITIALS - COL_SIG

  // Draw header row manually
  doc.setFillColor(...MARMALADE)
  doc.rect(margin, y, pageW - margin * 2, 7, 'F')
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(7.5)
  doc.setTextColor(...WHITE)
  let x = margin + 1.5
  doc.text('Date', x, y + 4.5); x += COL_DATE
  doc.text('Initials', x, y + 4.5); x += COL_INITIALS
  doc.text('Signature', x, y + 4.5); x += COL_SIG
  doc.text('Comments', x, y + 4.5)
  y += 7

  if (sorted.length === 0) {
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8.5)
    doc.setTextColor(...MID_GREY)
    doc.rect(margin, y, pageW - margin * 2, 10, 'S')
    doc.text('No checks recorded for this week.', margin + 2, y + 6.5)
    y += 10
  }

  for (let i = 0; i < sorted.length; i++) {
    const check = sorted[i]
    const sigDataURL = sigImages[i]

    // Check if we need a new page
    if (y + SIG_H > 280) {
      doc.addPage()
      y = 14
    }

    const rowY = y
    const rowH = SIG_H

    // Row border
    doc.setDrawColor(200)
    doc.setLineWidth(0.2)
    doc.rect(margin, rowY, pageW - margin * 2, rowH, 'S')

    // Column dividers
    doc.setDrawColor(220)
    let cx = margin + COL_DATE
    doc.line(cx, rowY, cx, rowY + rowH); cx += COL_INITIALS
    doc.line(cx, rowY, cx, rowY + rowH); cx += COL_SIG
    doc.line(cx, rowY, cx, rowY + rowH)

    // Date
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)
    doc.setTextColor(40, 40, 40)
    doc.text(formatDate(check.created_at), margin + 1.5, rowY + rowH / 2, { baseline: 'middle' })

    // Initials
    doc.text(check.completed_by || '–', margin + COL_DATE + 1.5, rowY + rowH / 2, { baseline: 'middle' })

    // Signature image
    if (sigDataURL) {
      try {
        doc.addImage(sigDataURL, 'PNG', margin + COL_DATE + COL_INITIALS + 1, rowY + 1, SIG_W, rowH - 2)
      } catch { /* skip */ }
    }

    // Comments — wrap text
    const commentX = margin + COL_DATE + COL_INITIALS + COL_SIG + 1.5
    const commentText = check.overall_notes || '–'
    const wrapped = doc.splitTextToSize(commentText, COL_COMMENTS - 3)
    doc.setFontSize(7.5)
    doc.text(wrapped, commentX, rowY + 3)

    y += rowH
  }

  // ── Footer ────────────────────────────────────────────────────────────────
  const pageCount = doc.internal.getNumberOfPages()
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7)
    doc.setTextColor(...MID_GREY)
    doc.text(
      `${nursery}  ·  Holiday Club Daily Checks  ·  ${new Date().toLocaleDateString('en-GB')}  ·  Page ${i} of ${pageCount}`,
      margin, 291
    )
  }

  return doc
}
