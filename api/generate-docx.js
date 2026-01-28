import Docxtemplater from 'docxtemplater'
import PizZip from 'pizzip'
import fs from 'fs'
import path from 'path'

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
