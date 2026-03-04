import ExcelJS from 'exceljs'

const GREEN_ARGB = 'FF6D9F6B'
const FOREST_ARGB = 'FF1A3A2A'
const WHITE_ARGB = 'FFFFFFFF'

function formatDate(isoStr) {
  return new Date(isoStr).toLocaleDateString('en-GB', {
    day: '2-digit', month: '2-digit', year: 'numeric',
  })
}

function formatDateRange(start, end) {
  const fmt = d => new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
  return `${fmt(start)} – ${fmt(end)}`
}

function parseFirstAidNotes(notes) {
  if (!notes) return { allPresent: '', missing: '' }
  if (notes === 'All items present') return { allPresent: 'Yes', missing: '' }
  if (notes.startsWith('Missing items: ')) return { allPresent: 'No', missing: notes.slice('Missing items: '.length) }
  return { allPresent: '', missing: notes }
}

async function fetchLogo() {
  try {
    const res = await fetch('/hopscotch-holiday-club-logo.png')
    const blob = await res.blob()
    const dataUrl = await new Promise(resolve => {
      const reader = new FileReader()
      reader.onloadend = () => resolve(reader.result)
      reader.readAsDataURL(blob)
    })
    // Get natural dimensions to preserve aspect ratio
    const dims = await new Promise(resolve => {
      const img = new Image()
      img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight })
      img.onerror = () => resolve(null)
      img.src = dataUrl
    })
    return { base64: dataUrl.split(',')[1], dims }
  } catch { return null }
}

function downloadBuffer(buffer, filename) {
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

function applyHeaderStyle(cell, isColumnHeader = false) {
  if (isColumnHeader) {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: GREEN_ARGB } }
    cell.font = { bold: true, color: { argb: WHITE_ARGB }, size: 10 }
  } else {
    cell.font = { bold: true, color: { argb: FOREST_ARGB }, size: 11 }
  }
  cell.alignment = { vertical: 'middle', wrapText: true }
}

async function buildWorkbook(sheetName, nursery, startDate, endDate, columns, rows) {
  const wb = new ExcelJS.Workbook()
  wb.creator = 'Hopscotch'
  const ws = wb.addWorksheet(sheetName)

  const colCount = columns.length

  // ── Logo ──────────────────────────────────────────────────────────────────
  const logo = await fetchLogo()
  const LOGO_ROWS = 7
  if (logo) {
    const logoId = wb.addImage({ base64: logo.base64, extension: 'png' })
    const targetWidth = 180
    const targetHeight = logo.dims
      ? Math.round(targetWidth * (logo.dims.height / logo.dims.width))
      : 100
    ws.addImage(logoId, {
      tl: { col: 0, row: 0 },
      ext: { width: targetWidth, height: targetHeight },
    })
  }
  for (let i = 0; i < LOGO_ROWS; i++) ws.addRow([])

  // ── Title ──────────────────────────────────────────────────────────────────
  const titleRow = ws.addRow([`Hopscotch Holiday Club – ${sheetName}`])
  ws.mergeCells(titleRow.number, 1, titleRow.number, colCount)
  applyHeaderStyle(titleRow.getCell(1))
  titleRow.height = 20

  const subRow = ws.addRow([`${nursery}  ·  ${formatDateRange(startDate, endDate)}`])
  ws.mergeCells(subRow.number, 1, subRow.number, colCount)
  subRow.getCell(1).font = { color: { argb: FOREST_ARGB }, size: 9 }
  subRow.getCell(1).alignment = { vertical: 'middle' }

  ws.addRow([])

  // ── Column headers ─────────────────────────────────────────────────────────
  const headerRow = ws.addRow(columns.map(c => c.header))
  headerRow.height = 18
  headerRow.eachCell(cell => applyHeaderStyle(cell, true))

  // ── Data rows ──────────────────────────────────────────────────────────────
  rows.forEach(rowData => {
    const r = ws.addRow(rowData)
    r.height = 16
    r.eachCell(cell => {
      cell.alignment = { vertical: 'middle', wrapText: true }
      cell.font = { size: 10 }
    })
    // Alternate row shading
    if (r.number % 2 === 0) {
      r.eachCell(cell => {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF5F5F5' } }
      })
    }
  })

  // ── Column widths ──────────────────────────────────────────────────────────
  columns.forEach((col, i) => {
    ws.getColumn(i + 1).width = col.width
  })

  // ── Borders on data area ───────────────────────────────────────────────────
  const dataStart = LOGO_ROWS + 4 // after logo rows + title + subtitle + blank
  const dataEnd = ws.rowCount
  for (let r = dataStart; r <= dataEnd; r++) {
    for (let c = 1; c <= colCount; c++) {
      ws.getCell(r, c).border = {
        top: { style: 'thin', color: { argb: 'FFE0E0E0' } },
        bottom: { style: 'thin', color: { argb: 'FFE0E0E0' } },
        left: { style: 'thin', color: { argb: 'FFE0E0E0' } },
        right: { style: 'thin', color: { argb: 'FFE0E0E0' } },
      }
    }
  }

  // ── Sheet protection (read-only) ───────────────────────────────────────────
  await ws.protect('', {
    selectLockedCells: true,
    selectUnlockedCells: false,
    formatCells: false,
    formatColumns: false,
    formatRows: false,
    insertRows: false,
    insertColumns: false,
    deleteRows: false,
    deleteColumns: false,
    sort: false,
    autoFilter: false,
  })

  return wb
}

export async function generateDailyChecksExcel(nursery, checks, startDate, endDate) {
  const columns = [
    { header: 'Date', width: 14 },
    { header: 'Checks Completed', width: 18 },
    { header: 'Initials', width: 12 },
    { header: 'Comments', width: 60 },
  ]

  // Index checks by date (YYYY-MM-DD)
  const byDate = {}
  checks.forEach(c => {
    const d = new Date(c.created_at).toISOString().slice(0, 10)
    if (!byDate[d]) byDate[d] = c
  })

  // Generate a row for every date in the range
  const rows = []
  const cursor = new Date(startDate)
  const end = new Date(endDate)
  while (cursor <= end) {
    const key = cursor.toISOString().slice(0, 10)
    const check = byDate[key]
    rows.push([
      formatDate(key),
      check ? 'Yes' : 'No',
      check ? (check.completed_by || '') : '',
      check ? (check.overall_notes || '') : '',
    ])
    cursor.setDate(cursor.getDate() + 1)
  }

  const wb = await buildWorkbook('Daily Checks', nursery, startDate, endDate, columns, rows)
  const buffer = await wb.xlsx.writeBuffer()
  const start = new Date(startDate).toISOString().slice(0, 10)
  downloadBuffer(buffer, `Holiday-Club-Daily-Checks-${nursery.replace(/\s+/g, '-')}-${start}.xlsx`)
}

export async function generateFirstAidExcel(nursery, checks, startDate, endDate) {
  const columns = [
    { header: 'Date', width: 14 },
    { header: 'Checks Completed', width: 18 },
    { header: 'Date Completed', width: 16 },
    { header: 'All items present?', width: 20 },
    { header: 'Initials', width: 12 },
    { header: 'Items to order', width: 50 },
  ]

  // Index checks by date
  const byDate = {}
  checks.forEach(c => {
    const d = new Date(c.created_at).toISOString().slice(0, 10)
    if (!byDate[d]) byDate[d] = c
  })

  // Generate a row for every date in the range
  const rows = []
  const cursor = new Date(startDate)
  const end = new Date(endDate)
  while (cursor <= end) {
    const key = cursor.toISOString().slice(0, 10)
    const check = byDate[key]
    const { allPresent, missing } = check ? parseFirstAidNotes(check.overall_notes) : { allPresent: '', missing: '' }
    rows.push([
      formatDate(key),
      check ? 'Yes' : 'No',
      check ? formatDate(check.created_at) : '',
      allPresent,
      check ? (check.completed_by || '') : '',
      missing,
    ])
    cursor.setDate(cursor.getDate() + 1)
  }

  const wb = await buildWorkbook('First Aid Box Checks', nursery, startDate, endDate, columns, rows)
  const buffer = await wb.xlsx.writeBuffer()
  const start = new Date(startDate).toISOString().slice(0, 10)
  downloadBuffer(buffer, `First-Aid-Box-Checks-${nursery.replace(/\s+/g, '-')}-${start}.xlsx`)
}
