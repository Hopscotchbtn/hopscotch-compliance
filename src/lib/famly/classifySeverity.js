// Severity classification for Famly incidents based on description text.
// Used to surface incidents that may require formal logging in IncidentIQ.
//
// HIGH   — likely requires formal record, possible OFSTED/RIDDOR notification
// MEDIUM — worth reviewing; may need parent notification or medical follow-up
// LOW    — routine minor incident, no escalation expected

const HIGH_KEYWORDS = [
  'hospital', 'a&e', 'a & e', 'accident and emergency', 'ambulance', '999',
  'fracture', 'broken bone', 'broke their', 'snapped',
  'loss of consciousness', 'unconscious', 'unresponsive', 'concuss',
  'dazed', 'knocked out',
  'stitches', 'glued', 'wound closure',
  'ofsted', 'riddor', 'serious injury', 'significant injury',
  'bite broke', 'bite drew blood', 'skin broken', 'broke the skin',
  'deep cut', 'laceration',
  'seizure', 'fit ', 'anaphylaxis', 'epipen', 'allergic reaction',
  'dislocat',
]

const MEDIUM_KEYWORDS = [
  'doctor', ' gp ', 'medical attention', 'medical advice', 'medical treatment',
  'head injury', 'hit their head', 'bumped their head', 'bang to the head',
  'parent notified same day', 'parent called', 'parents came in', 'parent collected early',
  'monitored closely', 'monitored for', 'kept under observation',
  'eye injury', 'into their eye', 'in their eye', 'hit their eye',
  'nose bleed', 'nosebleed', 'significant bleed',
  'winded', 'difficulty breathing',
  'swelling', 'swollen',
  'tooth knocked', 'dental',
]

const severityCache = new Map()

export function classifySeverity(incidentId, nature, firstAid = '') {
  if (severityCache.has(incidentId)) return severityCache.get(incidentId)

  const text = (nature + ' ' + firstAid).toLowerCase()

  for (const kw of HIGH_KEYWORDS) {
    if (text.includes(kw)) {
      severityCache.set(incidentId, 'high')
      return 'high'
    }
  }

  for (const kw of MEDIUM_KEYWORDS) {
    if (text.includes(kw)) {
      severityCache.set(incidentId, 'medium')
      return 'medium'
    }
  }

  severityCache.set(incidentId, 'low')
  return 'low'
}

export const SEVERITY_LABEL = {
  high: 'Needs formal review',
  medium: 'Worth reviewing',
  low: null,
}

export const SEVERITY_STYLE = {
  high: 'text-red-700 bg-red-50 border-red-200',
  medium: 'text-amber-700 bg-amber-50 border-amber-200',
  low: null,
}
