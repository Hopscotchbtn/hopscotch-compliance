import Docxtemplater from 'docxtemplater'
import PizZip from 'pizzip'
import fs from 'fs'
import path from 'path'

function getRatingFill(rating) {
  if (rating === 'H') return 'ff0000'
  if (rating === 'M') return 'ffc000'
  return '00b050'
}

// Fix the fill color of a cell that contains a text placeholder like {pre_rating_1}.
// The template hardcodes colors regardless of the actual rating value.
function fixRatingCellColor(xml, fieldName, n, rating) {
  const tag = `{${fieldName}_${n}}`
  const idx = xml.indexOf(tag)
  if (idx === -1) return xml

  const cellStart = xml.lastIndexOf('<w:tc>', idx)
  const cellXml = xml.substring(cellStart, idx)
  const shdMatch = cellXml.match(/w:fill="([^"]+)"/)
  if (!shdMatch) return xml

  const oldColor = shdMatch[1]
  const newColor = getRatingFill(rating)
  if (oldColor === newColor) return xml

  // Replace only the fill in this cell's shd element
  const shdPos = cellStart + cellXml.lastIndexOf(`w:fill="${oldColor}"`)
  return xml.substring(0, shdPos) + `w:fill="${newColor}"` + xml.substring(shdPos + `w:fill="${oldColor}"`.length)
}

// The template has 10 empty green cells (no text) for reassess_rating — one per
// hazard row. Find them in document order and replace with the correct fill color
// and rating text. pre_rating / post_rating cells are handled by fixRatingCellColor.
function injectRatingColors(xml, data) {
  let result = xml

  // Fix pre_rating and post_rating cells (they have text placeholders)
  for (let i = 1; i <= 10; i++) {
    result = fixRatingCellColor(result, 'pre_rating', i, data[`pre_rating_${i}`] || '')
    result = fixRatingCellColor(result, 'post_rating', i, data[`post_rating_${i}`] || '')
  }

  // Fix reassess_rating cells (no text placeholder — replace the whole cell)
  let hazardIndex = 1
  let searchFrom = 0

  while (hazardIndex <= 10) {
    const greenIdx = result.indexOf('w:fill="00b050"', searchFrom)
    if (greenIdx === -1) break

    const cellStart = result.lastIndexOf('<w:tc>', greenIdx)
    const cellEnd = result.indexOf('</w:tc>', greenIdx) + '</w:tc>'.length
    const cell = result.substring(cellStart, cellEnd)

    // Skip cells that already have text (post_rating cells after color fix may now differ)
    if (cell.includes('<w:t>') || cell.includes('<w:t ')) {
      searchFrom = greenIdx + 1
      continue
    }

    const rating = data[`reassess_rating_${hazardIndex}`] || ''
    const fill = getRatingFill(rating)
    const textContent = rating ? `<w:t>${rating}</w:t>` : ''
    const replacement = `<w:tc><w:tcPr><w:shd w:fill="${fill}" w:val="clear"/><w:vAlign w:val="center"/></w:tcPr><w:p w:rsidR="00000000"><w:pPr><w:jc w:val="center"/><w:rPr/></w:pPr><w:r><w:rPr><w:rtl w:val="0"/></w:rPr>${textContent}</w:r></w:p></w:tc>`

    result = result.substring(0, cellStart) + replacement + result.substring(cellEnd)
    searchFrom = cellStart + replacement.length
    hazardIndex++
  }

  return result
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { data, fileName } = req.body

    if (!data) {
      return res.status(400).json({ error: 'Missing assessment data' })
    }

    // Read the template file
    const templatePath = path.join(process.cwd(), 'public', 'templates', 'hopscotch_risk_assessment_template.docx')

    let templateContent
    try {
      templateContent = fs.readFileSync(templatePath)
    } catch (err) {
      console.error('Template not found:', err)
      return res.status(500).json({ error: 'Template file not found. Please ensure the template exists at public/templates/hopscotch_risk_assessment_template.docx' })
    }

    // Load the template into PizZip
    const zip = new PizZip(templateContent)

    // Fix all rating cell colours: template hardcodes colors regardless of value.
    // Also injects rating text into reassess_rating cells which had no placeholder.
    let docXml = zip.files['word/document.xml'].asText()
    docXml = injectRatingColors(docXml, data)
    zip.file('word/document.xml', docXml)

    // Create docxtemplater instance
    const doc = new Docxtemplater(zip, {
      paragraphLoop: true,
      linebreaks: true,
      delimiters: { start: '{', end: '}' }
    })

    // Prepare the data - ensure all fields have values (empty string if undefined)
    const templateData = {
      assessment_type: data.assessment_type || '',
      assessment_date: data.assessment_date || '',
      assessor_name: data.assessor_name || '',
      unique_id: data.unique_id || '',
      activity_description: data.activity_description || '',
      location: data.location || '',
      people_at_risk: data.people_at_risk || '',
      review_date: data.review_date || '',
      safe_system_of_work: data.safe_system_of_work || ''
    }

    // Add hazard fields (1-10)
    for (let i = 1; i <= 10; i++) {
      templateData[`hazard_${i}`] = data[`hazard_${i}`] || ''
      templateData[`pre_rating_${i}`] = data[`pre_rating_${i}`] || ''
      templateData[`control_measures_${i}`] = data[`control_measures_${i}`] || ''
      templateData[`post_rating_${i}`] = data[`post_rating_${i}`] || ''
      templateData[`additional_controls_${i}`] = data[`additional_controls_${i}`] || ''
      templateData[`reassess_rating_${i}`] = data[`reassess_rating_${i}`] || ''
    }

    // Render the document
    doc.render(templateData)

    // Generate the output
    const buffer = doc.getZip().generate({
      type: 'nodebuffer',
      compression: 'DEFLATE'
    })

    // Generate filename
    const outputFileName = fileName || `Risk Assessment - ${data.activity_description || 'General'} - ${data.assessment_date || new Date().toISOString().split('T')[0]}.docx`

    // Set response headers
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document')
    res.setHeader('Content-Disposition', `attachment; filename="${outputFileName}"`)
    res.setHeader('Content-Length', buffer.length)

    // Send the buffer
    return res.send(buffer)

  } catch (error) {
    console.error('DOCX generation error:', error)

    // Provide more specific error messages
    if (error.properties && error.properties.errors) {
      const templateErrors = error.properties.errors.map(e => e.message).join(', ')
      return res.status(500).json({ error: `Template error: ${templateErrors}` })
    }

    return res.status(500).json({ error: 'Failed to generate document' })
  }
}

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '10mb'
    }
  }
}
