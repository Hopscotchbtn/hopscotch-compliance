// Priority-ordered keyword rules — more specific/serious categories first
const RULES = [
  { category: 'Choking', keywords: ['chok', 'gagg', 'unable to breathe', 'airway obstruct'] },
  { category: 'Fracture / Dislocation', keywords: ['fracture', 'broken bone', 'disloc', 'snapped', 'broke their'] },
  { category: 'Concussion', keywords: ['concuss', 'loss of consciousness', 'unresponsive', 'dazed', 'knocked unconscious'] },
  { category: 'Burn', keywords: ['burn', 'scald', 'blister', 'hot liquid', 'hot surface'] },
  { category: 'Bite', keywords: ['bitten by', 'bite mark', 'bit by', 'was bitten', 'another child bit'] },
  { category: 'Splinter', keywords: ['splinter'] },
  { category: 'Puncture', keywords: ['puncture', ' stabbed', ' pierced', 'poked with'] },
  { category: 'Sprain / Strain', keywords: ['sprain', 'strain', 'twisted ankle', 'twisted wrist', 'twisted their'] },
  { category: 'Eye Injury', keywords: ['eye ', 'eyes ', 'eyelid', 'cornea', 'in their eye', 'into their eye'] },
  { category: 'Dental Injury', keywords: ['tooth', 'teeth', 'dental', 'molar', 'knocked out a tooth'] },
  { category: 'Nose Injury', keywords: ['nose', 'nosebleed', 'nostril', 'nasal', 'nose bleed'] },
  { category: 'Lips', keywords: ['upper lip', 'lower lip', ' lip ', ' lips', 'split lip', 'bitten lip', 'cut their lip'] },
  { category: 'Fingers', keywords: ['finger', 'thumb', 'pinched finger', 'trapped finger', 'fingers caught'] },
  { category: 'Head Injury', keywords: ['head ', 'forehead', 'scalp', 'temple', 'back of their head', 'hit their head', 'bumped their head', 'banged their head'] },
  { category: 'Cut / Scrape', keywords: ['cut ', 'cuts ', 'cutting', 'scrape', 'scraped', 'graze', 'grazed', 'scratch', 'scratched', 'lacerat', 'bleeding', ' bled'] },
  { category: 'Bump / Bruise', keywords: ['bump', 'bumped', 'bruise', 'bruised', 'bruising', 'knock', 'knocked', 'fell ', 'fallen ', 'fall ', 'trip', 'tumble', 'bang', 'banged', 'collision'] },
  { category: 'Medical Issue', keywords: ['allerg', 'reaction', 'seizure', 'fit ', 'vomit', 'unwell', 'fever', 'rash', 'medication', 'illness', ' ill ', 'temperature'] },
]

const cache = new Map()

export function classifyInjury(incidentId, nature) {
  if (cache.has(incidentId)) return cache.get(incidentId)

  const lower = nature.toLowerCase()
  for (const rule of RULES) {
    if (rule.keywords.some(kw => lower.includes(kw))) {
      cache.set(incidentId, rule.category)
      return rule.category
    }
  }

  cache.set(incidentId, 'Other')
  return 'Other'
}
