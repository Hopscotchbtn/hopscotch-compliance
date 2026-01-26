export const checkTypes = {
  roomOpening: {
    id: 'roomOpening',
    name: 'Room Opening Check',
    shortName: 'Room Opening',
    description: 'Complete this check before the nursery opens and children arrive.',
    color: 'hop-freshair',
    standardItems: [
      { id: 1, text: 'Room set up as per planning, risk assessments checked as required' },
      { id: 2, text: 'Play equipment checked for damage, wear, corrosion, loose fixings, sharp corners, protruding nails/screws' },
      { id: 3, text: 'No strangulation hazards (blind cords, wires, drawstring bags etc)' },
      { id: 4, text: 'Finger guards not damaged or broken' },
      { id: 5, text: 'No trip hazards (loose/draping wires, cables, shoes, coats etc)' },
      { id: 6, text: 'Chemicals and spray bottles out of reach and in correct location' },
      { id: 7, text: 'No food or drink items left in room' },
      { id: 8, text: 'No damaged flooring, plug sockets, broken windows or glass' },
      { id: 9, text: 'Fire exit doors/gates can open, evacuation routes clear' },
      { id: 10, text: 'Rubber feet on tables and chairs in good condition' },
    ],
    weeklyItems: [
      { id: 11, text: 'Care plan boxes checked - care plan info, risk assessment and medication present and in date' },
      { id: 12, text: 'Water temperature of children\'s sink checked and recorded', hasTemperatureInput: true },
    ],
  },
  roomSafety: {
    id: 'roomSafety',
    name: 'Room Safety Check',
    shortName: 'Room Safety',
    description: 'These checks should be carried out before opening. Report any defects immediately to the duty manager.',
    color: 'hop-sunshine',
    standardItems: [
      { id: 1, text: 'Electrical equipment in good condition, wires out of reach or made safe' },
      { id: 2, text: 'Play equipment in good condition, no sharp edges or damage' },
      { id: 3, text: 'Fixtures and fittings secure (heater covers, finger guards, chairs, tables)' },
      { id: 4, text: 'Fire/electrical hazards clear - firefighting equipment accessible, exits clear, signage in place' },
      { id: 5, text: 'Phone lines, intercoms and security cameras working' },
      { id: 6, text: 'Hot water working' },
      { id: 7, text: 'No signs of pests' },
    ],
    weeklyItems: [],
  },
  gardenOutdoor: {
    id: 'gardenOutdoor',
    name: 'Garden & Outdoor Check',
    shortName: 'Garden/Outdoor',
    description: 'Complete before nursery opens. Monitor throughout the day and report any defects immediately. Inform all staff of any hazards.',
    color: 'hop-apple',
    standardItems: [
      { id: 1, text: 'Gates locked and lock mechanisms working' },
      { id: 2, text: 'Play equipment in good working order, no damage or loose fittings' },
      { id: 3, text: 'No dangerous debris from neighbouring gardens or fallen from trees' },
      { id: 4, text: 'No animal excrement' },
      { id: 5, text: 'No slip/trip/fall hazards (leaves, frost, ice, drains, covers)' },
      { id: 6, text: 'No eye-level hazards (coat hooks, buggy park hooks, outside taps)' },
      { id: 7, text: 'No overhead hazards (loose roof tiles, guttering)' },
      { id: 8, text: 'Boundary fencing and walls secure (no protruding nails, overhanging branches)' },
    ],
    weeklyItems: [],
    autoRoom: 'Garden/Outdoor Area',
  },
}

export const getChecklistItems = (checkTypeId) => {
  const checkType = checkTypes[checkTypeId]
  if (!checkType) return []

  const isMonday = new Date().getDay() === 1

  const items = [...checkType.standardItems]

  if (isMonday && checkType.weeklyItems.length > 0) {
    items.push(...checkType.weeklyItems)
  }

  return items
}

export const isMonday = () => new Date().getDay() === 1
