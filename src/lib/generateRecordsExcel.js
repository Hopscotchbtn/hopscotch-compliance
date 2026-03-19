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

async function fetchLogo(path = '/hopscotch-holiday-club-logo.png') {
  try {
    const res = await fetch(path)
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

async function buildWorkbook(sheetName, nursery, startDate, endDate, columns, rows, { orgLabel = 'Holiday Club', logoPath = '/hopscotch-holiday-club-logo.png' } = {}) {
  const wb = new ExcelJS.Workbook()
  wb.creator = 'Hopscotch'
  const ws = wb.addWorksheet(sheetName)

  const colCount = columns.length

  // ── Logo ──────────────────────────────────────────────────────────────────
  const logo = await fetchLogo(logoPath)
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
  const titleRow = ws.addRow([`Hopscotch ${orgLabel} – ${sheetName}`])
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

export async function generateDailyChecksExcel(nursery, checks, startDate, endDate, { isHolidayClub = true, logoPath } = {}) {
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
      check ? (check.overall_notes || 'No defects found') : '',
    ])
    cursor.setDate(cursor.getDate() + 1)
  }

  const wb = await buildWorkbook('Daily Checks', nursery, startDate, endDate, columns, rows, { orgLabel: isHolidayClub ? 'Holiday Club' : 'Nursery', logoPath })
  const buffer = await wb.xlsx.writeBuffer()
  const start = new Date(startDate).toISOString().slice(0, 10)
  downloadBuffer(buffer, `Holiday-Club-Daily-Checks-${nursery.replace(/\s+/g, '-')}-${start}.xlsx`)
}

async function addRoomSheet(wb, logo, nursery, room, checks, startDate, endDate) {
  const LOGO_ROWS = 7
  const columns = [
    { header: 'Date', width: 14 },
    { header: 'Checks Completed', width: 18 },
    { header: 'Initials', width: 12 },
    { header: 'Signed', width: 12 },
    { header: 'Comments', width: 60 },
  ]
  const colCount = columns.length
  const ws = wb.addWorksheet(room.slice(0, 31))

  if (logo) {
    const logoId = wb.addImage({ base64: logo.base64, extension: 'png' })
    const targetWidth = 180
    const targetHeight = logo.dims ? Math.round(targetWidth * (logo.dims.height / logo.dims.width)) : 100
    ws.addImage(logoId, { tl: { col: 0, row: 0 }, ext: { width: targetWidth, height: targetHeight } })
  }
  for (let i = 0; i < LOGO_ROWS; i++) ws.addRow([])
  ws.addRow([])
  ws.addRow([])

  const titleRow = ws.addRow([`Hopscotch ${nursery} – ${room}`])
  ws.mergeCells(titleRow.number, 1, titleRow.number, colCount)
  applyHeaderStyle(titleRow.getCell(1))
  titleRow.height = 20

  const subRow = ws.addRow([formatDateRange(startDate, endDate)])
  ws.mergeCells(subRow.number, 1, subRow.number, colCount)
  subRow.getCell(1).font = { color: { argb: FOREST_ARGB }, size: 9 }
  subRow.getCell(1).alignment = { vertical: 'middle' }

  ws.addRow([])

  const headerRow = ws.addRow(columns.map(c => c.header))
  headerRow.height = 18
  headerRow.eachCell(cell => applyHeaderStyle(cell, true))

  const byDate = {}
  checks.forEach(c => {
    const d = new Date(c.created_at).toISOString().slice(0, 10)
    if (!byDate[d]) byDate[d] = c
  })

  const cursor = new Date(startDate)
  const end = new Date(endDate)
  while (cursor <= end) {
    const key = cursor.toISOString().slice(0, 10)
    const check = byDate[key]
    const r = ws.addRow([
      formatDate(key),
      check ? 'Yes' : 'No',
      check ? (check.completed_by || '') : '',
      check ? 'Yes' : '',
      check ? (check.overall_notes || 'No defects found') : '',
    ])
    r.height = 16
    r.eachCell(cell => { cell.alignment = { vertical: 'middle', wrapText: true }; cell.font = { size: 10 } })
    if (r.number % 2 === 0) {
      r.eachCell(cell => { cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF5F5F5' } } })
    }
    cursor.setDate(cursor.getDate() + 1)
  }

  columns.forEach((col, i) => { ws.getColumn(i + 1).width = col.width })

  const dataStart = LOGO_ROWS + 6
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

  await ws.protect('', {
    selectLockedCells: true, selectUnlockedCells: false,
    formatCells: false, formatColumns: false, formatRows: false,
    insertRows: false, insertColumns: false, deleteRows: false,
    deleteColumns: false, sort: false, autoFilter: false,
  })
}

export async function generateNurseryRoomChecksExcel(nursery, rooms, allChecks, startDate, endDate) {
  const wb = new ExcelJS.Workbook()
  wb.creator = 'Hopscotch'
  const logo = await fetchLogo('/hopscotch-logo.png')

  // All rooms that have checks + all standard/custom rooms supplied
  const allRooms = [...new Set([...rooms, ...allChecks.map(c => c.room).filter(Boolean)])]

  for (const room of allRooms) {
    const roomChecks = allChecks.filter(c => c.room === room)
    await addRoomSheet(wb, logo, nursery, room, roomChecks, startDate, endDate)
  }

  const buffer = await wb.xlsx.writeBuffer()
  const start = new Date(startDate).toISOString().slice(0, 10)
  downloadBuffer(buffer, `${nursery.replace(/\s+/g, '-')}-Room-Checks-${start}.xlsx`)
}

export async function generateFirstAidExcel(nursery, checks, startDate, endDate, { isHolidayClub = true, logoPath } = {}) {
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

  const wb = await buildWorkbook('First Aid Box Checks', nursery, startDate, endDate, columns, rows, { orgLabel: isHolidayClub ? 'Holiday Club' : 'Nursery', logoPath })
  const buffer = await wb.xlsx.writeBuffer()
  const start = new Date(startDate).toISOString().slice(0, 10)
  downloadBuffer(buffer, `First-Aid-Box-Checks-${nursery.replace(/\s+/g, '-')}-${start}.xlsx`)
}

export async function generateGlueGunExcel(nursery, entries, startDate, endDate) {
  const columns = [
    { header: 'Date', width: 16 },
    { header: 'Signed In Initials', width: 22 },
    { header: 'Sign In Comments', width: 36 },
    { header: 'Signed Out Initials', width: 22 },
    { header: 'Sign Out Comments', width: 36 },
  ]

  // Index entries by local date
  const byDate = {}
  entries.forEach(e => {
    const d = new Date(e.created_at)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    if (!byDate[key]) byDate[key] = { signedIn: [], signedInComments: [], signedOut: [], signedOutComments: [] }
    if (e.check_type === 'glueGunOut') {
      byDate[key].signedIn.push(e.completed_by || '')
      if (e.overall_notes) byDate[key].signedInComments.push(e.overall_notes)
    } else {
      byDate[key].signedOut.push(e.completed_by || '')
      if (e.overall_notes) byDate[key].signedOutComments.push(e.overall_notes)
    }
  })

  // One row per date in range
  const rows = []
  const cursor = new Date(startDate)
  cursor.setHours(0, 0, 0, 0)
  const end = new Date(endDate)
  end.setHours(23, 59, 59, 999)
  while (cursor <= end) {
    const key = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, '0')}-${String(cursor.getDate()).padStart(2, '0')}`
    const day = byDate[key]
    rows.push([
      formatDate(key),
      day ? day.signedIn.join(', ') : '',
      day ? day.signedInComments.join(' | ') : '',
      day ? day.signedOut.join(', ') : '',
      day ? day.signedOutComments.join(' | ') : '',
    ])
    cursor.setDate(cursor.getDate() + 1)
  }

  const wb = await buildWorkbook('Hot Glue Gun Register', nursery, startDate, endDate, columns, rows, { orgLabel: 'Holiday Club', logoPath: '/hopscotch-holiday-club-logo.png' })
  const buffer = await wb.xlsx.writeBuffer()
  const start = new Date(startDate).toISOString().slice(0, 10)
  downloadBuffer(buffer, `Glue-Gun-Register-${nursery.replace(/\s+/g, '-')}-${start}.xlsx`)
}

export async function generateKitchenSafetyExcel(nursery, checks, startDate, endDate) {
  const columns = [
    { header: 'Date', width: 14 },
    { header: 'Opening Fridge 1', width: 16 },
    { header: 'Opening Fridge 2', width: 16 },
    { header: 'Opening Fridge 3', width: 16 },
    { header: 'Opening Initials', width: 14 },
    { header: 'Closing Fridge 1', width: 16 },
    { header: 'Closing Fridge 2', width: 16 },
    { header: 'Closing Fridge 3', width: 16 },
    { header: 'Closing Initials', width: 14 },
    { header: 'Packed Lunches', width: 14 },
    { header: 'Manager Sign-off', width: 16 },
  ]

  // Index checks by local date
  const byDate = {}
  checks.forEach(c => {
    const d = new Date(c.created_at)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    let sd = null
    try { sd = JSON.parse(c.overall_notes || '{}').sectionData } catch {}
    if (!byDate[key] || sd) byDate[key] = sd
  })

  const fridgeTemp = (sd, section, n) => {
    const f = sd?.[section]?.temperatures?.[`fridge${n}`]
    if (!f?.temp) return '–'
    return f.name ? `${f.name}: ${f.temp}°C` : `${f.temp}°C`
  }

  const rows = []
  const cursor = new Date(startDate)
  cursor.setHours(0, 0, 0, 0)
  const end = new Date(endDate)
  end.setHours(23, 59, 59, 999)
  while (cursor <= end) {
    const key = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, '0')}-${String(cursor.getDate()).padStart(2, '0')}`
    const sd = byDate[key]
    rows.push([
      formatDate(key),
      fridgeTemp(sd, 'opening', 1),
      fridgeTemp(sd, 'opening', 2),
      fridgeTemp(sd, 'opening', 3),
      sd?.opening?.completedBy || sd?.opening?.signedBy || '–',
      fridgeTemp(sd, 'closing', 1),
      fridgeTemp(sd, 'closing', 2),
      fridgeTemp(sd, 'closing', 3),
      sd?.closing?.completedBy || sd?.closing?.signedBy || '–',
      sd?.packedLunch ? 'Done' : '–',
      sd?.signoff?.responses?.managerName || '–',
    ])
    cursor.setDate(cursor.getDate() + 1)
  }

  const wb = await buildWorkbook('Kitchen Food Safety', nursery, startDate, endDate, columns, rows, { orgLabel: 'Holiday Club', logoPath: '/hopscotch-holiday-club-logo.png' })
  const buffer = await wb.xlsx.writeBuffer()
  const start = new Date(startDate).toISOString().slice(0, 10)
  downloadBuffer(buffer, `Kitchen-Safety-${nursery.replace(/\s+/g, '-')}-${start}.xlsx`)
}

export async function generateNurseryKitchenSafetyExcel(nursery, checks, rooms, startDate, endDate, periodicChecks) {
  const wb = new ExcelJS.Workbook()
  wb.creator = 'Hopscotch'
  const logo = await fetchLogo('/hopscotch-logo.png')
  const LOGO_ROWS = 7

  const addSheetHeader = (ws, title, colCount) => {
    if (logo) {
      const logoId = wb.addImage({ base64: logo.base64, extension: 'png' })
      const targetWidth = 180
      const targetHeight = logo.dims ? Math.round(targetWidth * (logo.dims.height / logo.dims.width)) : 100
      ws.addImage(logoId, { tl: { col: 0, row: 0 }, ext: { width: targetWidth, height: targetHeight } })
    }
    for (let i = 0; i < LOGO_ROWS; i++) ws.addRow([])
    const titleRow = ws.addRow([`Hopscotch Nursery – ${title}`])
    ws.mergeCells(titleRow.number, 1, titleRow.number, colCount)
    applyHeaderStyle(titleRow.getCell(1))
    titleRow.height = 20
    const subRow = ws.addRow([`${nursery}  ·  ${formatDateRange(startDate, endDate)}`])
    ws.mergeCells(subRow.number, 1, subRow.number, colCount)
    subRow.getCell(1).font = { color: { argb: FOREST_ARGB }, size: 9 }
    subRow.getCell(1).alignment = { vertical: 'middle' }
    ws.addRow([])
  }

  const addBorders = (ws, dataStart, colCount) => {
    for (let r = dataStart; r <= ws.rowCount; r++) {
      for (let c = 1; c <= colCount; c++) {
        ws.getCell(r, c).border = {
          top: { style: 'thin', color: { argb: 'FFE0E0E0' } },
          bottom: { style: 'thin', color: { argb: 'FFE0E0E0' } },
          left: { style: 'thin', color: { argb: 'FFE0E0E0' } },
          right: { style: 'thin', color: { argb: 'FFE0E0E0' } },
        }
      }
    }
  }

  const styleDataRow = (r) => {
    r.height = 16
    r.eachCell(cell => { cell.alignment = { vertical: 'middle', wrapText: true }; cell.font = { size: 10 } })
    if (r.number % 2 === 0) {
      r.eachCell(cell => { cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF5F5F5' } } })
    }
  }

  const parseSd = (check) => {
    try { return JSON.parse(check.overall_notes || '{}').sectionData || {} } catch { return {} }
  }

  const fridgeTemp = (sd, section, n) => {
    const f = sd?.[section]?.temperatures?.[`fridge${n}`]
    if (!f?.temp) return '–'
    return f.name ? `${f.name}: ${f.temp}°C` : `${f.temp}°C`
  }

  const tick = (sd) => sd ? '✓' : '–'

  // ── Per-room daily sheets ─────────────────────────────────────────────────
  const dailyCols = [
    { header: 'Date', width: 14 },
    { header: 'Opening ✓', width: 12 },
    { header: 'Fridge 1 Opening', width: 18 },
    { header: 'Fridge 2 Opening', width: 18 },
    { header: 'Fridge 3 Opening', width: 18 },
    { header: 'Opening Initials', width: 15 },
    { header: 'Packed Lunches ✓', width: 16 },
    { header: 'Packed Lunch Initials', width: 18 },
    { header: 'Little Tums Lunch ✓', width: 18 },
    { header: 'Little Tums Tea ✓', width: 16 },
    { header: 'Little Tums Initials', width: 18 },
    { header: 'Closing ✓', width: 12 },
    { header: 'Fridge 1 Closing', width: 18 },
    { header: 'Fridge 2 Closing', width: 18 },
    { header: 'Fridge 3 Closing', width: 18 },
    { header: 'Closing Initials', width: 15 },
    { header: 'Manager Sign-off', width: 16 },
    { header: 'Manager Comments', width: 40 },
  ]

  for (const room of rooms) {
    const ws = wb.addWorksheet(room.slice(0, 31))
    addSheetHeader(ws, room, dailyCols.length)

    const headerRow = ws.addRow(dailyCols.map(c => c.header))
    headerRow.height = 18
    headerRow.eachCell(cell => applyHeaderStyle(cell, true))

    const byDate = {}
    checks.filter(c => c.room === room).forEach(c => {
      const d = new Date(c.created_at)
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
      const sd = parseSd(c)
      if (!byDate[key] || sd) byDate[key] = sd
    })

    const cursor = new Date(startDate); cursor.setHours(0, 0, 0, 0)
    const end = new Date(endDate); end.setHours(23, 59, 59, 999)
    while (cursor <= end) {
      const key = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, '0')}-${String(cursor.getDate()).padStart(2, '0')}`
      const sd = byDate[key]
      const ltData = sd?.littleTums?.deliveryData
      const r = ws.addRow([
        formatDate(key),
        tick(sd?.opening),
        fridgeTemp(sd, 'opening', 1),
        fridgeTemp(sd, 'opening', 2),
        fridgeTemp(sd, 'opening', 3),
        sd?.opening?.completedBy || sd?.opening?.signedBy || '–',
        tick(sd?.packedLunch),
        sd?.packedLunch?.completedBy || '–',
        ltData ? '✓' : '–',
        ltData ? '✓' : '–',
        sd?.littleTums?.completedBy || sd?.littleTums?.signedBy || '–',
        tick(sd?.closing),
        fridgeTemp(sd, 'closing', 1),
        fridgeTemp(sd, 'closing', 2),
        fridgeTemp(sd, 'closing', 3),
        sd?.closing?.completedBy || sd?.closing?.signedBy || '–',
        sd?.signoff?.responses?.managerName || '–',
        sd?.signoff?.responses?.managerComments || '–',
      ])
      styleDataRow(r)
      cursor.setDate(cursor.getDate() + 1)
    }

    dailyCols.forEach((col, i) => { ws.getColumn(i + 1).width = col.width })
    addBorders(ws, LOGO_ROWS + 4, dailyCols.length)
    await ws.protect('', { selectLockedCells: true, selectUnlockedCells: false })
  }

  // ── Reheated Food Log sheet ───────────────────────────────────────────────
  const reheatCols = [
    { header: 'Date', width: 14 },
    { header: 'Room', width: 16 },
    { header: 'Food Name', width: 24 },
    { header: "Child's Initials", width: 14 },
    { header: 'Core Temp', width: 14 },
    { header: 'Pass / Fail', width: 12 },
    { header: 'Checker Initials', width: 16 },
  ]

  const wsReheat = wb.addWorksheet('Reheated Food Log')
  addSheetHeader(wsReheat, 'Reheated Food Log', reheatCols.length)

  const rhHeader = wsReheat.addRow(reheatCols.map(c => c.header))
  rhHeader.height = 18
  rhHeader.eachCell(cell => applyHeaderStyle(cell, true))

  const allReheatEntries = []
  checks.forEach(c => {
    const sd = parseSd(c)
    const entries = sd?.reheatTemp?.deliveryData?.reheatEntries || []
    const d = new Date(c.created_at)
    const dateKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    entries.filter(e => e.foodName || e.temp).forEach(e => {
      allReheatEntries.push({ dateKey, room: c.room || '', ...e })
    })
  })
  allReheatEntries.sort((a, b) => a.dateKey.localeCompare(b.dateKey))

  if (allReheatEntries.length === 0) {
    const r = wsReheat.addRow(['No reheated food entries recorded in this period'])
    wsReheat.mergeCells(r.number, 1, r.number, reheatCols.length)
    r.getCell(1).font = { size: 10, color: { argb: 'FF888888' } }
    r.getCell(1).alignment = { vertical: 'middle' }
  } else {
    allReheatEntries.forEach(e => {
      const temp = parseFloat(e.temp)
      const passFail = e.temp !== '' && !isNaN(temp) ? (temp >= 75 ? 'Pass' : 'FAIL') : '–'
      const r = wsReheat.addRow([
        formatDate(e.dateKey),
        e.room,
        e.foodName || '–',
        e.childInitials || '–',
        e.temp ? `${e.temp}°C` : '–',
        passFail,
        e.checkerInitials || '–',
      ])
      styleDataRow(r)
      if (passFail === 'FAIL') {
        r.getCell(6).font = { size: 10, bold: true, color: { argb: 'FFB22222' } }
      }
    })
  }

  reheatCols.forEach((col, i) => { wsReheat.getColumn(i + 1).width = col.width })
  addBorders(wsReheat, LOGO_ROWS + 4, reheatCols.length)
  await wsReheat.protect('', { selectLockedCells: true, selectUnlockedCells: false })

  // ── Periodic Checks sheet ─────────────────────────────────────────────────
  const wsP = wb.addWorksheet('Periodic Checks')
  const pColCount = 4
  addSheetHeader(wsP, 'Periodic Checks', pColCount)

  const addSectionHeader = (ws, label) => {
    const r = ws.addRow([label])
    ws.mergeCells(r.number, 1, r.number, pColCount)
    applyHeaderStyle(r.getCell(1), true)
    r.height = 18
  }

  // Extract periodic data from checks sectionData
  let latestProbeCheck = null
  let latestSupermarketTemp = null
  checks.forEach(c => {
    const sd = parseSd(c)
    if (sd?.probeCheck) latestProbeCheck = sd.probeCheck
    if (sd?.supermarketTemp) latestSupermarketTemp = sd.supermarketTemp
  })

  // Probe check
  addSectionHeader(wsP, 'Fridge/Freezer Probe Thermometer Check (Weekly)')
  const probeSubHeader = wsP.addRow(['Check', 'Temperature', 'Initials', ''])
  probeSubHeader.eachCell(cell => { cell.font = { bold: true, size: 10, color: { argb: FOREST_ARGB } }; cell.alignment = { vertical: 'middle' } })
  if (latestProbeCheck) {
    styleDataRow(wsP.addRow(['Opening', latestProbeCheck.temperatures?.probeOpening ? `${latestProbeCheck.temperatures.probeOpening}°C` : '–', latestProbeCheck.responses?.openingInitials || latestProbeCheck.completedBy || '–', '']))
    styleDataRow(wsP.addRow(['Closing', latestProbeCheck.temperatures?.probeClosing ? `${latestProbeCheck.temperatures.probeClosing}°C` : '–', latestProbeCheck.responses?.closingInitials || '–', '']))
  } else {
    wsP.addRow([{ value: 'Not completed this period', colSpan: pColCount }])
  }

  wsP.addRow([])

  // Supermarket temps
  addSectionHeader(wsP, 'Supermarket Food Temperatures (Weekly)')
  const smSubHeader = wsP.addRow(['Food', 'Time', 'Temperature', 'Initials'])
  smSubHeader.eachCell(cell => { cell.font = { bold: true, size: 10, color: { argb: FOREST_ARGB } }; cell.alignment = { vertical: 'middle' } })
  const smEntries = (latestSupermarketTemp?.deliveryData?.supermarketEntries || []).filter(e => e.food || e.temp)
  if (smEntries.length) {
    smEntries.forEach(e => styleDataRow(wsP.addRow([e.food || '–', e.time || '–', e.temp ? `${e.temp}°C` : '–', e.initials || '–'])))
  } else {
    wsP.addRow(['Not completed this period'])
  }

  wsP.addRow([])

  // Calibration
  addSectionHeader(wsP, 'Probe Calibration (Monthly)')
  const calDate = periodicChecks?.calibration?.created_at
    ? new Date(periodicChecks.calibration.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
    : 'Not recorded'
  styleDataRow(wsP.addRow([`Last calibration: ${calDate}`, '', '', '']))

  ;[20, 16, 16, 14].forEach((w, i) => { wsP.getColumn(i + 1).width = w })
  addBorders(wsP, LOGO_ROWS + 4, pColCount)
  await wsP.protect('', { selectLockedCells: true, selectUnlockedCells: false })

  const buffer = await wb.xlsx.writeBuffer()
  const start = new Date(startDate).toISOString().slice(0, 10)
  downloadBuffer(buffer, `Kitchen-Safety-${nursery.replace(/\s+/g, '-')}-${start}.xlsx`)
}
