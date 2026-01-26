export const contextPrompts = {
  thinking: [
    'How many children were in the room/area at the time?',
    'How many staff were supervising?',
    'Was this during a transition time (e.g., mealtimes, outdoor play changeover)?',
    'Were there any unusual circumstances?',
  ],
}

export const ageBasedPrompts = {
  'Under 1': 'Babies under 1 year are more vulnerable to certain injuries. Head injuries in particular require careful monitoring.',
}

export const injuryBasedPrompts = {
  'Head Injury': 'Head injuries should be monitored closely. Consider whether parents should be advised to seek medical attention or watch for specific symptoms.',
  'Concussion': 'Head injuries should be monitored closely. Consider whether parents should be advised to seek medical attention or watch for specific symptoms.',
}

export const severityPrompts = {
  serious: 'Serious incidents require prompt investigation. Consider whether head office should be informed today.',
  critical: 'Critical incidents require immediate escalation. Ensure head office is notified as soon as possible.',
}

export const typeBasedPrompts = {
  allergyBreach: 'Allergy breaches, even without reaction, indicate a process failure. Consider what prevented the usual safeguards from working.',
  nearMiss: 'Near misses are valuable learning opportunities. What was the barrier that prevented harm? How reliable is that barrier?',
}

export const ofstedGuidance = `Ofsted must be notified of:
• Death of a child
• Serious accident, illness or injury requiring hospital treatment
• Food poisoning affecting two or more children
• A serious outbreak of infectious disease
• Any significant event that is likely to affect children's welfare

Consider: Does this incident meet the notification threshold?
This is a professional judgement call. If unsure, discuss with your manager or head office.`

export const riddorGuidance = `RIDDOR reporting is required for:

Staff injuries:
• Death
• Specified injuries (fractures other than fingers/toes, amputations, loss of sight)
• Over-7-day incapacitation from work

Injuries to children/visitors:
• Death
• Injuries requiring hospital treatment (not just examination)

If unsure whether this is RIDDOR reportable, Armadillo Safety Solutions can advise.`

export const witnessPrompts = [
  'Where were you when the incident happened?',
  'What were you doing?',
  'How many children and adults were present?',
  'What equipment was being used?',
  'What exactly did you see or hear?',
  'Stick to the facts - don\'t try to guess what happened',
]

export const footerReminder = 'This tool supports your judgement - it doesn\'t replace it.'
