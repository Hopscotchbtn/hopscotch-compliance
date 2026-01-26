import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { incidentData, incidentType } = req.body

    if (!incidentData) {
      return res.status(400).json({ error: 'Missing incident data' })
    }

    const prompt = buildAnalysisPrompt(incidentData, incidentType)

    const message = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1500,
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
    })

    const responseText = message.content[0].text
    const analysis = parseAnalysisResponse(responseText)

    return res.status(200).json(analysis)
  } catch (error) {
    console.error('Analysis error:', error)
    return res.status(500).json({ error: 'Failed to analyze incident' })
  }
}

function buildAnalysisPrompt(data, incidentType) {
  const incidentTypeNames = {
    childAccident: 'Child Accident/Injury',
    staffAccident: 'Staff Accident/Injury',
    allergyBreach: 'Allergy Breach',
    nearMiss: 'Near Miss',
  }

  return `You are an expert in UK early years safeguarding and health & safety regulations. Analyze the following nursery incident and provide recommendations.

INCIDENT TYPE: ${incidentTypeNames[incidentType] || incidentType}

INCIDENT DETAILS:
- Nursery: ${data.nursery || 'Not specified'}
- Date: ${data.incidentDate || 'Not specified'}
- Time: ${data.incidentTime || 'Not specified'}
- Person involved: ${data.personName || 'Not specified'}
- Person type: ${data.personType || (incidentType === 'staffAccident' ? 'Staff member' : 'Child')}
- Age: ${data.personAge || 'Not specified'}
- Location: ${data.location || 'Not specified'} ${data.locationDetail ? `(${data.locationDetail})` : ''}

DESCRIPTION:
${data.description || 'No description provided'}

INJURY INFORMATION:
- Types: ${data.injuryTypes?.join(', ') || 'None recorded'}
- Causes: ${data.injuryCauses?.join(', ') || 'None recorded'}
- Body areas: ${data.bodyAreas?.join(', ') || 'None recorded'}
- Severity: ${data.severity || 'Not assessed'}

RESPONSE:
- First aid given: ${data.firstAidGiven || 'Unknown'}
- First aid details: ${data.firstAidDetails || 'None'}
- Medical attention required: ${data.medicalAttentionRequired || 'Unknown'}
- Hospital attendance: ${data.hospitalAttendance || 'Unknown'}

${incidentType === 'allergyBreach' ? `
ALLERGY BREACH SPECIFIC:
- Allergen involved: ${data.allergenInvolved || 'Not specified'}
- Reaction occurred: ${data.reactionOccurred || 'Unknown'}
- Reaction details: ${data.reactionDetails || 'None'}
` : ''}

Please provide your analysis in the following exact format:

SUMMARY:
[2-3 sentence summary of the incident and its key concerns]

OFSTED_RECOMMENDATION:
[yes/no/uncertain]

OFSTED_REASONING:
[Brief explanation of why this may or may not require Ofsted notification under EYFS 2024 requirements. Reference specific criteria like serious injury, child protection concerns, or significant events.]

RIDDOR_RECOMMENDATION:
[yes/no/uncertain]

RIDDOR_REASONING:
[Brief explanation of whether this meets RIDDOR 2013 reporting requirements. Consider over-7-day injuries for staff, specified injuries, or dangerous occurrences.]

IMMEDIATE_ACTIONS:
[Bullet list of any immediate actions that should be considered if not already taken]

PREVENTIVE_MEASURES:
[Bullet list of recommended preventive measures to reduce likelihood of recurrence]

ADDITIONAL_CONCERNS:
[Any other safeguarding or compliance concerns to consider, or "None identified" if none]

Important: Be professional but supportive in tone. Use "consider" and "may need" rather than absolute statements. These are recommendations to assist professional judgement, not definitive rulings.`
}

function parseAnalysisResponse(text) {
  const sections = {
    summary: '',
    ofstedRecommendation: 'uncertain',
    ofstedReasoning: '',
    riddorRecommendation: 'uncertain',
    riddorReasoning: '',
    immediateActions: [],
    preventiveMeasures: [],
    additionalConcerns: '',
  }

  // Parse summary
  const summaryMatch = text.match(/SUMMARY:\s*([\s\S]*?)(?=OFSTED_RECOMMENDATION:|$)/i)
  if (summaryMatch) {
    sections.summary = summaryMatch[1].trim()
  }

  // Parse Ofsted recommendation
  const ofstedRecMatch = text.match(/OFSTED_RECOMMENDATION:\s*(\w+)/i)
  if (ofstedRecMatch) {
    const rec = ofstedRecMatch[1].toLowerCase()
    sections.ofstedRecommendation = ['yes', 'no', 'uncertain'].includes(rec) ? rec : 'uncertain'
  }

  // Parse Ofsted reasoning
  const ofstedReasonMatch = text.match(/OFSTED_REASONING:\s*([\s\S]*?)(?=RIDDOR_RECOMMENDATION:|$)/i)
  if (ofstedReasonMatch) {
    sections.ofstedReasoning = ofstedReasonMatch[1].trim()
  }

  // Parse RIDDOR recommendation
  const riddorRecMatch = text.match(/RIDDOR_RECOMMENDATION:\s*(\w+)/i)
  if (riddorRecMatch) {
    const rec = riddorRecMatch[1].toLowerCase()
    sections.riddorRecommendation = ['yes', 'no', 'uncertain'].includes(rec) ? rec : 'uncertain'
  }

  // Parse RIDDOR reasoning
  const riddorReasonMatch = text.match(/RIDDOR_REASONING:\s*([\s\S]*?)(?=IMMEDIATE_ACTIONS:|$)/i)
  if (riddorReasonMatch) {
    sections.riddorReasoning = riddorReasonMatch[1].trim()
  }

  // Parse immediate actions (bullet points)
  const actionsMatch = text.match(/IMMEDIATE_ACTIONS:\s*([\s\S]*?)(?=PREVENTIVE_MEASURES:|$)/i)
  if (actionsMatch) {
    sections.immediateActions = parseBulletList(actionsMatch[1])
  }

  // Parse preventive measures (bullet points)
  const preventiveMatch = text.match(/PREVENTIVE_MEASURES:\s*([\s\S]*?)(?=ADDITIONAL_CONCERNS:|$)/i)
  if (preventiveMatch) {
    sections.preventiveMeasures = parseBulletList(preventiveMatch[1])
  }

  // Parse additional concerns
  const concernsMatch = text.match(/ADDITIONAL_CONCERNS:\s*([\s\S]*?)$/i)
  if (concernsMatch) {
    sections.additionalConcerns = concernsMatch[1].trim()
  }

  return sections
}

function parseBulletList(text) {
  return text
    .split(/\n/)
    .map(line => line.replace(/^[-•*]\s*/, '').trim())
    .filter(line => line.length > 0)
}
