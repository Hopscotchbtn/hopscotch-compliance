import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { supabase } from './supabase'

const FOREST    = [26, 58, 42]
const GREEN     = [109, 159, 107]
const MID_GREY  = [130, 130, 130]
const WHITE     = [255, 255, 255]

const ITEMS = [
  'First Aid booklet',
  'Bandages',
  'Plasters (various sizes)',
  'Sterile wipes (alcohol free)',
  'Sterile eyewash',
  'Scissors',
  'Microporous tape',
  'Triangular bandages',
  'Ruler for bee stings',
  'Face shield',
  'Melolin bandages (various sizes)',
  'Non-adhesive patches',
  'Gloves',
  'Steri-strips',
  'Safety pins',
  'Aprons',
  'Biohazard bag',
  'Foil blanket',
  'Tweezers',
  'Mask',
  'Hand sanitiser',
  'Burn shield',
  'Aspirin',
]

function formatDate(isoStr) {
  return new Date(isoStr).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

function formatWeekRange(start, end) {
  const fmt = d => d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
  return `${fmt(start)} – ${fmt(end)}`
}

function parseNotes(notes) {
  if (!notes) return { allPresent: null, missing: '' }
  if (notes === 'All items present') return { allPresent: true, missing: '' }
  if (notes.startsWith('Missing items: ')) return { allPresent: false, missing: notes.slice('Missing items: '.length) }
  return { allPresent: null, missing: notes }
}

function blobToDataURL(blob) {
  return new Promise(resolve => {
    const reader = new FileReader()
    reader.onloadend = () => resolve(reader.result)
    reader.readAsDataURL(blob)
  })
}

async function fetchDataURL(url) {
  if (!url) return null
  try {
    const res = await fetch(url)
    const blob = await res.blob()
    return blobToDataURL(blob)
  } catch { return null }
}

async function fetchSignatureDataURL(url) {
  if (!url) return null
  try {
    const path = url.split('/check-signatures/')[1]
    if (path && supabase) {
      const { data, error } = await supabase.storage.from('check-signatures').download(path)
      if (!error && data) return blobToDataURL(data)
    }
    return fetchDataURL(url)
  } catch { return null }
}

export async function generateFirstAidPDF(nursery, checks, weekStart, weekEnd) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const pageW = doc.internal.pageSize.getWidth()
  const margin = 14

  const logoDataURL = await fetchDataURL('/hopscotch-logo.png')
  const weekRange = formatWeekRange(weekStart, weekEnd)

  // ── Header ────────────────────────────────────────────────────────────────
  let y = 8
  if (logoDataURL) {
    try {
      doc.addImage(logoDataURL, 'PNG', (pageW - 40) / 2, y, 40, 20)
      y += 26
    } catch { y += 8 }
  }
  y += 4

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(13)
  doc.setTextColor(...FOREST)
  doc.text('First Aid Box Check', pageW / 2, y, { align: 'center' })

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.setTextColor(...MID_GREY)
  doc.text(`${nursery}  ·  Week: ${weekRange}`, pageW / 2, y + 6, { align: 'center' })

  doc.setDrawColor(...GREEN)
  doc.setLineWidth(0.6)
  doc.line(margin, y + 10, pageW - margin, y + 10)
  y += 16

  // ── Contents checklist ────────────────────────────────────────────────────
  autoTable(doc, {
    startY: y,
    margin: { left: margin, right: margin },
    head: [['#', 'First Aid Box Contents']],
    body: ITEMS.map((text, i) => [i + 1, text]),
    columnStyles: { 0: { cellWidth: 8 } },
    theme: 'grid',
    styles: { fontSize: 8.5, cellPadding: 2, font: 'helvetica' },
    headStyles: { fillColor: GREEN, textColor: WHITE, fontSize: 7.5, fontStyle: 'bold', cellPadding: 2 },
  })
  y = doc.lastAutoTable.finalY + 8

  // ── Fetch signatures ───────────────────────────────────────────────────────
  const sorted = [...checks].sort((a, b) => a.created_at.localeCompare(b.created_at))
  const sigImages = await Promise.all(
    sorted.map(c => fetchSignatureDataURL(c.signature_url))
  )

  // ── Sign-off table ────────────────────────────────────────────────────────
  const SIG_H = 18
  const SIG_W = 36
  const COL_DATE      = 24
  const COL_INITIALS  = 14
  const COL_PRESENT   = 20
  const COL_SIG       = SIG_W + 4
  const COL_MISSING   = pageW - margin * 2 - COL_DATE - COL_INITIALS - COL_PRESENT - COL_SIG

  // Header row
  doc.setFillColor(...GREEN)
  doc.rect(margin, y, pageW - margin * 2, 7, 'F')
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(7.5)
  doc.setTextColor(...WHITE)
  let x = margin + 1.5
  doc.text('Date', x, y + 4.5); x += COL_DATE
  doc.text('Initials', x, y + 4.5); x += COL_INITIALS
  doc.text('All present?', x, y + 4.5); x += COL_PRESENT
  doc.text('Signature', x, y + 4.5); x += COL_SIG
  doc.text('Missing items for order', x, y + 4.5)
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
    const { allPresent, missing } = parseNotes(check.overall_notes)

    if (y + SIG_H > 280) {
      doc.addPage()
      y = 14
    }

    const rowY = y

    // Row border
    doc.setDrawColor(200)
    doc.setLineWidth(0.2)
    doc.rect(margin, rowY, pageW - margin * 2, SIG_H, 'S')

    // Column dividers
    doc.setDrawColor(220)
    let cx = margin + COL_DATE
    doc.line(cx, rowY, cx, rowY + SIG_H); cx += COL_INITIALS
    doc.line(cx, rowY, cx, rowY + SIG_H); cx += COL_PRESENT
    doc.line(cx, rowY, cx, rowY + SIG_H); cx += COL_SIG
    doc.line(cx, rowY, cx, rowY + SIG_H)

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)
    doc.setTextColor(40, 40, 40)

    // Date
    doc.text(formatDate(check.created_at), margin + 1.5, rowY + SIG_H / 2, { baseline: 'middle' })

    // Initials
    doc.text(check.completed_by || '–', margin + COL_DATE + 1.5, rowY + SIG_H / 2, { baseline: 'middle' })

    // All present?
    const presentText = allPresent === true ? 'Yes' : allPresent === false ? 'No' : '–'
    doc.setTextColor(allPresent === true ? 60 : allPresent === false ? 180 : 130, allPresent === true ? 120 : 40, allPresent === true ? 60 : 40)
    doc.text(presentText, margin + COL_DATE + COL_INITIALS + 1.5, rowY + SIG_H / 2, { baseline: 'middle' })
    doc.setTextColor(40, 40, 40)

    // Signature
    if (sigDataURL) {
      try {
        doc.addImage(sigDataURL, 'PNG', margin + COL_DATE + COL_INITIALS + COL_PRESENT + 1, rowY + 1, SIG_W, SIG_H - 2)
      } catch { /* skip */ }
    }

    // Missing items
    const missingX = margin + COL_DATE + COL_INITIALS + COL_PRESENT + COL_SIG + 1.5
    const missingText = missing || (allPresent ? '–' : '')
    const wrapped = doc.splitTextToSize(missingText, COL_MISSING - 3)
    doc.setFontSize(7.5)
    doc.text(wrapped, missingX, rowY + 3)

    y += SIG_H
  }

  // ── Footer ────────────────────────────────────────────────────────────────
  const pageCount = doc.internal.getNumberOfPages()
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7)
    doc.setTextColor(...MID_GREY)
    doc.text(
      `${nursery}  ·  First Aid Box Check  ·  ${new Date().toLocaleDateString('en-GB')}  ·  Page ${i} of ${pageCount}`,
      margin, 291
    )
  }

  return doc
}
