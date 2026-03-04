import * as XLSX from 'xlsx'

const HOLIDAY_CLUB_LOCATIONS = ['Holland Road', 'School Road']

function formatWeekRange(start, end) {
  const fmt = d => d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
  return `${fmt(start)} – ${fmt(end)}`
}

function formatDate(isoStr) {
  return new Date(isoStr).toLocaleDateString('en-GB', {
    day: '2-digit', month: '2-digit', year: 'numeric',
  })
}

function parseFirstAidNotes(notes) {
  if (!notes) return { allPresent: '', missing: '' }
  if (notes === 'All items present') return { allPresent: 'Yes', missing: '' }
  if (notes.startsWith('Missing items: ')) return { allPresent: 'No', missing: notes.slice('Missing items: '.length) }
  return { allPresent: '', missing: notes }
}

export function generateDailyChecksExcel(nursery, checks, weekStart, weekEnd) {
  const weekRange = formatWeekRange(weekStart, weekEnd)

  const rows = [
    [`Hopscotch Holiday Club – Daily Checks`, '', ''],
    [`${nursery}  ·  Week: ${weekRange}`, '', ''],
    [''],
    ['Date', 'Initials', 'Comments'],
    ...checks
      .sort((a, b) => a.created_at.localeCompare(b.created_at))
      .map(c => [
        formatDate(c.created_at),
        c.completed_by || '',
        c.overall_notes || '',
      ]),
  ]

  const ws = XLSX.utils.aoa_to_sheet(rows)

  // Column widths
  ws['!cols'] = [{ wch: 14 }, { wch: 10 }, { wch: 60 }]

  // Merge title rows across all 3 columns
  ws['!merges'] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: 2 } },
    { s: { r: 1, c: 0 }, e: { r: 1, c: 2 } },
  ]

  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Daily Checks')

  const filename = `Holiday-Club-Daily-Checks-${nursery.replace(/\s+/g, '-')}-${weekStart.toISOString().slice(0, 10)}.xlsx`
  XLSX.writeFile(wb, filename)
}

export function generateFirstAidExcel(nursery, checks, weekStart, weekEnd) {
  const weekRange = formatWeekRange(weekStart, weekEnd)

  const rows = [
    [`Hopscotch Holiday Club – First Aid Box Checks`, '', ''],
    [`${nursery}  ·  Week: ${weekRange}`, '', ''],
    [''],
    ['All items present?', 'Initials', 'Items to order'],
    ...checks
      .sort((a, b) => a.created_at.localeCompare(b.created_at))
      .map(c => {
        const { allPresent, missing } = parseFirstAidNotes(c.overall_notes)
        return [allPresent, c.completed_by || '', missing]
      }),
  ]

  const ws = XLSX.utils.aoa_to_sheet(rows)

  ws['!cols'] = [{ wch: 18 }, { wch: 10 }, { wch: 50 }]
  ws['!merges'] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: 2 } },
    { s: { r: 1, c: 0 }, e: { r: 1, c: 2 } },
  ]

  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'First Aid Box Checks')

  const filename = `First-Aid-Box-Checks-${nursery.replace(/\s+/g, '-')}-${weekStart.toISOString().slice(0, 10)}.xlsx`
  XLSX.writeFile(wb, filename)
}
