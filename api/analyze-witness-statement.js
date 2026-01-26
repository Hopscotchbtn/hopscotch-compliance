import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { file, incidentDescription } = req.body

    if (!file || !file.content) {
      return res.status(400).json({ error: 'Missing file data' })
    }

    const analysis = await analyzeWitnessStatement(file, incidentDescription)

    return res.status(200).json(analysis)
  } catch (error) {
    console.error('Witness statement analysis error:', error)
    return res.status(500).json({ error: 'Failed to analyze witness statement' })
  }
}

async function analyzeWitnessStatement(file, incidentDescription) {
  const { content, fileType, fileName } = file

  // Build the message content based on file type
  const messageContent = []

  // Add the image/document content
  if (fileType.startsWith('image/')) {
    // For images, use vision capability
    const base64Data = content.split(',')[1] // Remove data URL prefix
    const mediaType = fileType === 'image/jpg' ? 'image/jpeg' : fileType

    messageContent.push({
      type: 'image',
      source: {
        type: 'base64',
        media_type: mediaType,
        data: base64Data,
      },
    })
  } else if (fileType === 'application/pdf') {
    // For PDFs, use document support
    const base64Data = content.split(',')[1]
    messageContent.push({
      type: 'document',
      source: {
        type: 'base64',
        media_type: 'application/pdf',
        data: base64Data,
      },
    })
  } else if (fileType === 'text/plain') {
    // For text files, extract and include as text
    const textContent = atob(content.split(',')[1])
    messageContent.push({
      type: 'text',
      text: `WITNESS STATEMENT TEXT:\n\n${textContent}`,
    })
  }

  // Add the analysis prompt
  messageContent.push({
    type: 'text',
    text: buildAnalysisPrompt(fileName, incidentDescription),
  })

  const message = await client.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 1500,
    messages: [
      {
        role: 'user',
        content: messageContent,
      },
    ],
  })

  const responseText = message.content[0].text
  return parseAnalysisResponse(responseText)
}

function buildAnalysisPrompt(fileName, incidentDescription) {
  return `You are an expert in reviewing witness statements for nursery incident investigations. Analyze this witness statement and extract key information.

FILE NAME: ${fileName}

${incidentDescription ? `
INCIDENT DESCRIPTION (for context):
${incidentDescription}
` : ''}

Please analyze the witness statement and provide your analysis in the following exact format:

SUMMARY:
[1-2 sentence summary of what the witness observed]

KEY_FACTS:
[Bullet list of key facts stated by the witness - who, what, when, where]

TIMELINE:
[Bullet list of events in chronological order as described by the witness]

INCONSISTENCIES:
[Bullet list of any potential inconsistencies with the incident description, or "None identified" if none]

FOLLOW_UP_QUESTIONS:
[Bullet list of questions that might need clarification or follow-up with the witness]

CREDIBILITY_NOTES:
[Any observations about the statement's detail level, clarity, or potential reliability - be neutral and factual]

Important:
- Focus on extracting factual information from the statement
- Note specific times, locations, and actions if mentioned
- Be objective and avoid judgmental language
- If the document is unclear or illegible, note this in your analysis`
}

function parseAnalysisResponse(text) {
  const analysis = {
    summary: '',
    keyFacts: [],
    timeline: [],
    inconsistencies: [],
    followUpQuestions: [],
    credibilityNotes: '',
  }

  // Parse summary
  const summaryMatch = text.match(/SUMMARY:\s*([\s\S]*?)(?=KEY_FACTS:|$)/i)
  if (summaryMatch) {
    analysis.summary = summaryMatch[1].trim()
  }

  // Parse key facts
  const factsMatch = text.match(/KEY_FACTS:\s*([\s\S]*?)(?=TIMELINE:|$)/i)
  if (factsMatch) {
    analysis.keyFacts = parseBulletList(factsMatch[1])
  }

  // Parse timeline
  const timelineMatch = text.match(/TIMELINE:\s*([\s\S]*?)(?=INCONSISTENCIES:|$)/i)
  if (timelineMatch) {
    analysis.timeline = parseBulletList(timelineMatch[1])
  }

  // Parse inconsistencies
  const inconsistenciesMatch = text.match(/INCONSISTENCIES:\s*([\s\S]*?)(?=FOLLOW_UP_QUESTIONS:|$)/i)
  if (inconsistenciesMatch) {
    const inconsistencies = parseBulletList(inconsistenciesMatch[1])
    // Filter out "None identified" entries
    analysis.inconsistencies = inconsistencies.filter(
      item => !item.toLowerCase().includes('none identified')
    )
  }

  // Parse follow-up questions
  const questionsMatch = text.match(/FOLLOW_UP_QUESTIONS:\s*([\s\S]*?)(?=CREDIBILITY_NOTES:|$)/i)
  if (questionsMatch) {
    analysis.followUpQuestions = parseBulletList(questionsMatch[1])
  }

  // Parse credibility notes
  const credibilityMatch = text.match(/CREDIBILITY_NOTES:\s*([\s\S]*?)$/i)
  if (credibilityMatch) {
    analysis.credibilityNotes = credibilityMatch[1].trim()
  }

  return analysis
}

function parseBulletList(text) {
  return text
    .split(/\n/)
    .map(line => line.replace(/^[-•*]\s*/, '').trim())
    .filter(line => line.length > 0)
}
