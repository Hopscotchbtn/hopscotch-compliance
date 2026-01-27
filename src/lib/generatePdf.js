import { jsPDF } from 'jspdf'
import { checkTypes } from '../data/checklists'

export function generatePdf(checks, nursery, date) {
  const doc = new jsPDF()
  const pageWidth = doc.internal.pageSize.getWidth()
  let y = 20

  const addPageIfNeeded = (needed = 20) => {
    if (y + needed > 275) {
      doc.addPage()
      y = 20
    }
  }

  // Header
  doc.setFontSize(18)
  doc.setFont(undefined, 'bold')
  doc.text('Hopscotch Nurseries', pageWidth / 2, y, { align: 'center' })
  y += 8
  doc.setFontSize(14)
  doc.text('Compliance Report', pageWidth / 2, y, { align: 'center' })
  y += 10

  doc.setFontSize(11)
  doc.setFont(undefined, 'normal')
  doc.text(`Nursery: ${nursery || 'All'}`, 14, y)
  y += 6
  doc.text(`Date: ${date}`, 14, y)
  y += 6
  doc.text(`Total checks: ${checks.length}`, 14, y)
  y += 10

  // Divider
  doc.setDrawColor(200)
  doc.line(14, y, pageWidth - 14, y)
  y += 8

  if (checks.length === 0) {
    doc.text('No checks recorded for this date.', 14, y)
  }

  checks.forEach((check, ci) => {
    addPageIfNeeded(40)

    // Check header
    doc.setFont(undefined, 'bold')
    doc.setFontSize(11)
    const typeName = checkTypes[check.check_type]?.shortName || check.check_type
    doc.text(`${ci + 1}. ${typeName} — ${check.room || 'N/A'}`, 14, y)
    y += 6
    doc.setFont(undefined, 'normal')
    doc.setFontSize(9)
    const time = new Date(check.created_at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
    doc.text(`Completed by ${check.completed_by} at ${time}  |  Status: ${check.has_issues ? 'ISSUES' : 'OK'}`, 14, y)
    y += 7

    // Items table
    if (check.items && check.items.length > 0) {
      // Table header
      doc.setFillColor(240, 240, 240)
      doc.rect(14, y - 1, pageWidth - 28, 7, 'F')
      doc.setFont(undefined, 'bold')
      doc.setFontSize(8)
      doc.text('#', 16, y + 4)
      doc.text('Item', 24, y + 4)
      doc.text('Status', 145, y + 4)
      doc.text('Note', 165, y + 4)
      y += 9

      doc.setFont(undefined, 'normal')
      check.items.forEach((item) => {
        addPageIfNeeded(8)
        const statusLabel = item.status === 'pass' ? 'Pass' : item.status === 'fail' ? 'FAIL' : 'N/A'
        doc.text(String(item.id), 16, y)
        const itemText = doc.splitTextToSize(item.text, 115)
        doc.text(itemText, 24, y)
        doc.text(statusLabel, 145, y)
        if (item.note) {
          const noteText = doc.splitTextToSize(item.note, 30)
          doc.text(noteText, 165, y)
        }
        y += Math.max(itemText.length, 1) * 5 + 2
      })
    }

    y += 6
    doc.setDrawColor(220)
    doc.line(14, y, pageWidth - 14, y)
    y += 8
  })

  // Footer
  addPageIfNeeded(15)
  doc.setFontSize(8)
  doc.setTextColor(150)
  doc.text(`Generated ${new Date().toLocaleString('en-GB')}`, pageWidth / 2, 285, { align: 'center' })

  doc.save(`compliance-report-${date}.pdf`)
}
