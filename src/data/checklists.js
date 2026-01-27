// Rooms that each check type applies to
export const CHECK_ROOMS = {
  roomOpening: ['Baby Room', 'Toddler Room', 'Pre-School Room', 'Garden/Outdoor Area'],
  roomSafety: ['Baby Room', 'Toddler Room', 'Pre-School Room'],
  gardenOutdoor: ['Garden/Outdoor Area'], // autoRoom - no picker needed
}

export const checkTypes = {
  roomOpening: {
    id: 'roomOpening',
    name: 'Room Opening Check',
    shortName: 'Room Opening',
    description: 'Complete this check before the nursery opens and children arrive.',
    color: 'hop-freshair',
    rooms: CHECK_ROOMS.roomOpening,
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
    rooms: CHECK_ROOMS.roomSafety,
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
    rooms: CHECK_ROOMS.gardenOutdoor,
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
  firstAidBox: {
    id: 'firstAidBox',
    name: 'First Aid Box Weekly Check',
    shortName: 'First Aid Box',
    description: 'Check first aid boxes weekly. If the seal is intact, contents are all present. If the box has been used, replace missing items and reseal.',
    color: 'hop-blossom',
    standardItems: [
      { id: 1, text: 'First aid box seal/tag is intact and dated' },
      { id: 2, text: 'Plasters (assorted sizes) present and in date' },
      { id: 3, text: 'Sterile eye pads present and in date' },
      { id: 4, text: 'Triangular bandages present' },
      { id: 5, text: 'Safety pins present' },
      { id: 6, text: 'Sterile wound dressings (medium and large) present and in date' },
      { id: 7, text: 'Disposable gloves present and in date' },
      { id: 8, text: 'Sterile saline eye wash present and in date' },
      { id: 9, text: 'Microporous tape present' },
      { id: 10, text: 'Finger dressings present and in date' },
      { id: 11, text: 'Cleansing wipes present and in date' },
      { id: 12, text: 'Any used or missing items have been noted for reorder' },
      { id: 13, text: 'Box has been resealed with new date tag if restocked' },
    ],
    weeklyItems: [],
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
export const isFirstOfMonth = () => new Date().getDate() === 1

// Kitchen Food Safety configuration
export const kitchenSafety = {
  id: 'kitchenSafety',
  name: 'Kitchen Food Safety',
  shortName: 'Kitchen Safety',
  description: 'Daily food safety diary for kitchen compliance.',
  color: 'hop-marmalade',

  // Opening checks - done first thing in morning
  openingChecks: [
    { id: 'o1', text: 'Hot water in place' },
    { id: 'o2', text: 'Handwash facilities in place' },
    { id: 'o3', text: 'Clean cloths in place' },
    { id: 'o4', text: 'Sanitiser in place' },
    { id: 'o5', text: 'No food left out' },
    { id: 'o6', text: 'All foods in date' },
    { id: 'o7', text: 'Equipment OK' },
    { id: 'o8', text: 'Probe thermometer available & working' },
    { id: 'o9', text: 'Staff fit, well, in uniform' },
  ],

  // Closing checks - done at end of day
  closingChecks: [
    { id: 'c1', text: 'Rubbish out' },
    { id: 'c2', text: 'Cloths & aprons cleaned / removed' },
    { id: 'c3', text: 'No food left out' },
    { id: 'c4', text: 'All foods checked & date labelled' },
    { id: 'c5', text: 'Foods covered' },
    { id: 'c6', text: 'Utensils washed-up' },
    { id: 'c7', text: 'Daily cleaning tasks done' },
    { id: 'c8', text: 'Diary completed' },
  ],

  // Packed lunch visual checks
  packedLunchChecks: [
    { id: 'pl1', text: 'Child\'s name shown on boxes' },
    { id: 'pl2', text: 'Foods inside boxes cool (not warm)' },
    { id: 'pl3', text: 'Food in good condition' },
    { id: 'pl4', text: 'No nuts' },
  ],

  // Little Tums food delivery items
  littleTumsItems: [
    { id: 'lt1', label: 'Hot lunch item 1', type: 'hot' },
    { id: 'lt2', label: 'Hot lunch item 2', type: 'hot' },
    { id: 'lt3', label: 'Cold lunch item 1', type: 'cold' },
    { id: 'lt4', label: 'Cold lunch item 2', type: 'cold' },
    { id: 'lt5', label: 'Hot tea item', type: 'hot' },
    { id: 'lt6', label: 'Cold tea item', type: 'cold' },
  ],

  // Temperature thresholds
  tempThresholds: {
    fridgeMax: 5,      // Fridges must be ≤5°C
    freezerMax: -18,   // Freezers must be ≤-18°C
    hotFoodMin: 63,    // Hot food must be ≥63°C
    coldFoodMax: 8,    // Cold food must be ≤8°C
    twoHourRule: 120,  // Minutes - food must be served within 2 hours
    boilingMin: 99,    // Probe calibration boiling water
    boilingMax: 101,
    icedMin: -1,       // Probe calibration iced water
    icedMax: 1,
  },

  // Default fridge/freezer units (can be customized per nursery)
  defaultUnits: [
    { id: 'unit1', name: 'Fridge 1', type: 'fridge' },
    { id: 'unit2', name: 'Fridge 2', type: 'fridge' },
    { id: 'unit3', name: 'Freezer 1', type: 'freezer' },
    { id: 'unit4', name: 'Freezer 2', type: 'freezer' },
  ],
}
