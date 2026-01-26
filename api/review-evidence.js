import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { description, witnessStatements, photos, documents } = req.body

    if (!description) {
      return res.status(400).json({ error: 'Missing incident description' })
    }

    const suggestions = await reviewEvidence(description, witnessStatements, photos, documents)

    return res.status(200).json({ suggestions })
  } catch (error) {
    console.error('Evidence review error:', error)
    return res.status(500).json({ error: 'Failed to review evidence' })
  }
}

async function reviewEvidence(description, witnessStatements = [], photos = [], documents = []) {
  const prompt = buildReviewPrompt(description, witnessStatements, photos, documents)

  const message = await client.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 2000,
    messages: [
      {
        role: 'user',
        content: prompt,
      },
    ],
  })

  const responseText = message.content[0].text
  return parseReviewResponse(responseText)
}

function buildReviewPrompt(description, witnessStatements, photos, documents) {
  let prompt = `You are an expert incident investigator helping a nursery manager ensure their incident report is complete and accurate. Your role is to compare the manager's description against the available evidence and flag any gaps, inconsistencies, or areas that might need clarification.

IMPORTANT: Be helpful but not overwhelming. Only flag genuinely useful observations. If there are no significant issues, return an empty list.

MANAGER'S INCIDENT DESCRIPTION:
${description}

`

  // Add witness statement information
  if (witnessStatements.length > 0) {
    prompt += `WITNESS STATEMENTS:\n`
    witnessStatements.forEach((ws, index) => {
      prompt += `\n--- Witness Statement ${index + 1} (${ws.fileName}) ---\n`
      if (ws.analysis) {
        prompt += `Summary: ${ws.analysis.summary || 'Not analyzed'}\n`
        if (ws.analysis.keyFacts?.length > 0) {
          prompt += `Key facts:\n${ws.analysis.keyFacts.map(f => `- ${f}`).join('\n')}\n`
        }
        if (ws.analysis.timeline?.length > 0) {
          prompt += `Timeline:\n${ws.analysis.timeline.map(t => `- ${t}`).join('\n')}\n`
        }
      } else {
        prompt += `(Statement uploaded but not yet analyzed)\n`
      }
    })
    prompt += `\n`
  }

  // Add photo information
  if (photos.length > 0) {
    prompt += `PHOTOS UPLOADED:\n`
    photos.forEach((photo, index) => {
      prompt += `- Photo ${index + 1}: ${photo.fileName}\n`
    })
    prompt += `\n`
  }

  // Add supporting document information
  if (documents.length > 0) {
    prompt += `SUPPORTING DOCUMENTS:\n`
    documents.forEach((doc, index) => {
      prompt += `- Document ${index + 1}: ${doc.fileName}\n`
    })
    prompt += `\n`
  }

  prompt += `Please review the manager's description against the evidence and identify:

1. GAPS: Important facts from witness statements that are missing from the manager's description
2. INCONSISTENCIES: Differences between the description and witness accounts (times, locations, sequence of events)
3. CLARIFICATIONS: Areas where the description could be clearer or more complete

Respond in the following JSON format ONLY (no other text):

{
  "suggestions": [
    {
      "type": "gap|inconsistency|clarification",
      "source": "Witness statement 1" or "Photo 2" or "General",
      "message": "What you noticed",
      "suggestion": "What the manager might consider adding or changing",
      "severity": "info|warning"
    }
  ]
}

Guidelines:
- Use "warning" severity only for genuine inconsistencies or significant omissions
- Use "info" severity for helpful suggestions that aren't critical
- Keep messages concise and actionable
- Reference specific evidence sources
- If everything looks complete, return {"suggestions": []}
- Maximum 5 suggestions - focus on the most important ones`

  return prompt
}

function parseReviewResponse(text) {
  try {
    // Try to extract JSON from the response
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0])
      // Add unique IDs to each suggestion
      return (parsed.suggestions || []).map((s, index) => ({
        ...s,
        id: `suggestion-${Date.now()}-${index}`,
      }))
    }
  } catch (e) {
    console.error('Failed to parse review response:', e)
  }
  return []
}
