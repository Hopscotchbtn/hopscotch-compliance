export const incidentTypes = {
  childAccident: {
    id: 'childAccident',
    name: 'Child Accident/Injury',
    description: 'An accident or injury to a child requiring investigation',
    color: 'hop-marmalade',
    personType: 'child',
  },
  staffAccident: {
    id: 'staffAccident',
    name: 'Staff Accident/Injury',
    description: 'A workplace injury to a staff member',
    color: 'hop-freshair',
    personType: 'staff',
  },
  allergyBreach: {
    id: 'allergyBreach',
    name: 'Allergy Breach',
    description: 'Exposure to a known allergen',
    color: 'hop-marmalade-dark',
    personType: 'child',
  },
  nearMiss: {
    id: 'nearMiss',
    name: 'Near Miss',
    description: 'An event that could have caused harm',
    color: 'hop-sunshine',
    personType: 'any',
  },
}

export const nurseryCodes = {
  'Brunswick': 'BR',
  'Davigdor': 'DV',
  'Hove Station': 'HS',
  'Old Shoreham Road': 'OS',
  'Peacehaven': 'PH',
  'Poets Corner': 'PC',
  'Wilbury': 'WB',
}

export const generateReference = (nursery, date) => {
  const code = nurseryCodes[nursery] || 'XX'
  const d = new Date(date)
  const dateStr = d.toISOString().slice(2, 10).replace(/-/g, '')
  const random = Math.floor(Math.random() * 900) + 100
  return `INC-${code}-${dateStr}-${random}`
}
