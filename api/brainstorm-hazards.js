import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@supabase/supabase-js'

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

const supabase = createClient(
  process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY
)

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { assessmentType, activityName, location, nursery, peopleAtRisk, overview, policiesSelected } = req.body

    if (!assessmentType || !activityName) {
      return res.status(400).json({ error: 'Missing required fields: assessmentType and activityName' })
    }

    // Fetch similar assessments from vector database for context
    let existingAssessments = ''
    try {
      const { data: documents } = await supabase
        .from('documents')
        .select('content')
        .textSearch('content', assessmentType.replace(/[&]/g, ' '))
        .limit(3)

      if (documents && documents.length > 0) {
        existingAssessments = documents.map(d => d.content.substring(0, 500)).join('\n---\n')
      }
    } catch (err) {
      console.log('Could not fetch existing assessments:', err.message)
    }

    // Fetch relevant policies
    let policies = ''
    try {
      const { data: policyDocs } = await supabase
        .from('policies')
        .select('policy_name, full_text')
        .limit(4)

      if (policyDocs && policyDocs.length > 0) {
        policies = policyDocs.map(p => `${p.policy_name}:\n${p.full_text.substring(0, 800)}`).join('\n\n')
      }
    } catch (err) {
      console.log('Could not fetch policies:', err.message)
    }

    const systemPrompt = `You are a specialist in UK early years risk assessment.

Task: Generate a comprehensive list of potential hazards and risks that will form part of a risk assessment.

Context: The setting is a children's nursery in the UK. Hazards should reflect real risks in this environment, including:

- Health & medical risks (medication, allergies, food preparation, infections, special conditions)
- Procedural risks (record-keeping, staff training, handovers, parental communication)
- Environmental risks (nursery facilities, equipment, food handling, play areas, outings)
- Human factors (staff error, distraction, turnover, child behaviour, peer interactions)
- Safeguarding & legal risks (data protection, consent, Ofsted compliance, liability)
- Emergency/contingency risks (access to emergency medication, ambulance delays, contact failures)

Guidelines:
- Identify 5-7 specific, actionable hazards relevant to the activity
- Consider the assessment type, location, and age group (0-5 years)
- Focus on realistic risks in early years childcare settings
- Each hazard should be a clear, concise statement (one sentence)
- Prioritize hazards from most to least critical

You MUST return ONLY valid JSON in this EXACT structure with no additional text, explanations, or markdown:

{
  "suggested_hazards": [
    "Hazard description 1",
    "Hazard description 2",
    "Hazard description 3",
    "Hazard description 4",
    "Hazard description 5"
  ]
}`

    const userPrompt = `Generate hazards for this risk assessment:

Assessment Type: ${assessmentType}
Activity Name: ${activityName}
Location: ${location || 'Hopscotch Nursery'}
Nursery: ${nursery || 'Hopscotch Children\'s Nursery'}
People at Risk: ${Array.isArray(peopleAtRisk) ? peopleAtRisk.join(', ') : peopleAtRisk || 'Children, Staff'}
Activity Overview: ${overview || 'General nursery activity'}
Policies to Reference: ${Array.isArray(policiesSelected) ? policiesSelected.join(', ') : policiesSelected || 'Health and Safety'}

${existingAssessments ? `
Reference these similar assessments for context:
${existingAssessments}
` : ''}

${policies ? `
Relevant policy excerpts:
${policies}
` : ''}`

    const message = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1000,
      system: systemPrompt,
      messages: [
        {
          role: 'user',
          content: userPrompt,
        },
      ],
    })

    const responseText = message.content[0].text

    // Parse JSON response
    let hazards
    try {
      // Clean any markdown code fences if present
      const cleaned = responseText.replace(/```json\s*|\s*```/g, '').trim()
      hazards = JSON.parse(cleaned)
    } catch (parseErr) {
      console.error('Failed to parse hazards response:', parseErr)
      // Return empty array if parsing fails
      hazards = { suggested_hazards: [] }
    }

    return res.status(200).json(hazards)
  } catch (error) {
    console.error('Brainstorm hazards error:', error)
    return res.status(500).json({ error: 'Failed to generate hazards' })
  }
}
