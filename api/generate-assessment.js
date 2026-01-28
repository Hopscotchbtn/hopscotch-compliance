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
    const {
      assessmentType,
      activityName,
      assessmentDate,
      assessorName,
      location,
      nursery,
      peopleAtRisk,
      hazards,
      policiesSelected,
      overview
    } = req.body

    if (!assessmentType || !activityName || !hazards || hazards.length === 0) {
      return res.status(400).json({ error: 'Missing required fields' })
    }

    // Fetch similar assessments for context
    let existingAssessments = ''
    try {
      const { data: documents } = await supabase
        .from('documents')
        .select('content')
        .textSearch('content', assessmentType.replace(/[&]/g, ' '))
        .limit(5)

      if (documents && documents.length > 0) {
        existingAssessments = documents.map(d => d.content.substring(0, 1000)).join('\n---\n')
      }
    } catch (err) {
      console.log('Could not fetch existing assessments:', err.message)
    }

    const systemPrompt = `You are helping a nursery prepare a risk assessment document for one of the following categories: Equipment and Toys, Medicine & Health, Food & Kitchen, Staffing & Supervision, Trips, Building, Weather, Infection Control, Fire and Emergency, Security.

You will receive a JSON object with all the relevant information needed to create the risk assessment.

Please output JSON that fills in the following fields for a document:

- assessment_type: The type of risk assessment being created
- assessment_date: The calendar date (use the date provided)
- assessor_name: Full name of the person preparing the assessment
- unique_id: A short identifier in the format YYMMDD-INITIALS-HHMMSS
- activity_description: A brief phrase describing the activity or resource being assessed
- location: Specific site or setting where the activity takes place
- people_at_risk: Comma-separated list of groups who could be harmed
- review_date: One year from assessment_date, in YYYY-MM-DD format

Then for each hazard (up to 10), provide:
- hazard_N: Short name of the specific hazard
- pre_rating_N: Risk rating before controls (H = High, M = Medium, L = Low)
- control_measures_N: Detailed practical measures to mitigate the hazard (2-3 sentences)
- post_rating_N: Risk rating after existing controls (H, M, or L)
- additional_controls_N: Extra actions recommended to reduce risk further (or empty string)
- reassess_rating_N: Expected risk rating after additional controls (H, M, or L)

Finally provide:
- safe_system_of_work: A concise paragraph outlining routine safety procedures (3-4 sentences)

Important guidelines:
- Control measures should be detailed and specific to nursery settings
- Reference EYFS requirements and Ofsted expectations where relevant
- Consider the age group and developmental stage of children
- Include supervision requirements appropriate to the activity
- Ensure measures are practical and implementable
- Pre-ratings should generally be H or M, post-ratings M or L, reassess ratings should be L

You MUST return ONLY valid JSON with no additional text, explanations, or markdown code fences.`

    // Generate unique ID
    const date = new Date(assessmentDate || new Date())
    const initials = assessorName ? assessorName.split(' ').map(n => n[0]).join('').toUpperCase() : 'XX'
    const dateStr = date.toISOString().slice(2, 10).replace(/-/g, '')
    const timeStr = new Date().toTimeString().slice(0, 8).replace(/:/g, '')
    const uniqueId = `${dateStr}-${initials}-${timeStr}`

    // Calculate review date (1 year from assessment)
    const reviewDate = new Date(date)
    reviewDate.setFullYear(reviewDate.getFullYear() + 1)
    const reviewDateStr = reviewDate.toISOString().split('T')[0]

    const userPrompt = `Create a complete risk assessment with these details:

${JSON.stringify({
  assessment_type: assessmentType,
  activity_description: activityName,
  assessment_date: assessmentDate || new Date().toISOString().split('T')[0],
  assessor_name: assessorName || 'Not specified',
  unique_id: uniqueId,
  location: location || 'Hopscotch Nursery',
  nursery: nursery || 'Hopscotch Children\'s Nursery',
  people_at_risk: Array.isArray(peopleAtRisk) ? peopleAtRisk.join(', ') : peopleAtRisk || 'Children, Staff',
  review_date: reviewDateStr,
  hazards_to_assess: hazards,
  policies_referenced: policiesSelected || [],
  activity_overview: overview || ''
}, null, 2)}

${existingAssessments ? `
Reference these similar assessments for guidance on control measures and formatting:
${existingAssessments}
` : ''}

Generate the complete risk assessment JSON with all hazard details filled in.`

    const message = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4000,
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
    let assessment
    try {
      // Clean any markdown code fences if present
      const cleaned = responseText.replace(/```json\s*|\s*```/g, '').trim()
      assessment = JSON.parse(cleaned)
    } catch (parseErr) {
      console.error('Failed to parse assessment response:', parseErr)
      console.error('Raw response:', responseText.substring(0, 500))
      return res.status(500).json({ error: 'Failed to parse AI response' })
    }

    // Ensure all hazard fields exist (fill empty ones for hazards 1-10)
    for (let i = 1; i <= 10; i++) {
      if (!assessment[`hazard_${i}`]) {
        assessment[`hazard_${i}`] = ''
        assessment[`pre_rating_${i}`] = ''
        assessment[`control_measures_${i}`] = ''
        assessment[`post_rating_${i}`] = ''
        assessment[`additional_controls_${i}`] = ''
        assessment[`reassess_rating_${i}`] = ''
      }
    }

    return res.status(200).json(assessment)
  } catch (error) {
    console.error('Generate assessment error:', error)
    return res.status(500).json({ error: 'Failed to generate assessment' })
  }
}
