// Stable mock child IDs — keyed by name so they're consistent across sites
const CHILD_IDS = {}
function childId(name) {
  if (!CHILD_IDS[name]) CHILD_IDS[name] = 'mock-child-' + name.toLowerCase().replace(/\s+/g, '-')
  return CHILD_IDS[name]
}

export const MOCK_SITES = [
  { id: 'site-1', name: 'Brighton Central' },
  { id: 'site-2', name: 'Hove' },
  { id: 'site-3', name: 'Portslade' },
  { id: 'site-4', name: 'Hangleton' },
  { id: 'site-5', name: 'Patcham' },
  { id: 'site-6', name: 'Kemptown' },
  { id: 'site-7', name: 'Woodingdean' },
]

const FREQUENT_CHILDREN = ['Luca Mitchell', 'Evie Davidson', 'Freddie Palmer']

const ALL_CHILDREN = [
  ...FREQUENT_CHILDREN,
  'Oliver Barnett', 'Amelia Chen', 'Noah Davies', 'Isla Foster',
  'Jack Griffiths', 'Sophia Hughes', 'Charlie Jenkins', 'Emily King',
  'Grace Morgan', 'Harry Norris', 'Poppy Owen', 'George Price',
  'Lily Roberts', 'Alfie Stone', 'Rosie Taylor', 'Archie Wilson',
  'Daisy Brooks', 'Theodore Carter', 'Oscar Fletcher', 'Imogen Grant',
  'Arthur Holmes', 'Florence James', 'Henry Kerr',
]

const LOCATIONS = [
  'Garden', 'Blue Room', 'Yellow Room', 'Red Room',
  'Green Room', 'Pre-School', 'Soft Play', 'Hall', 'Toilet Area',
]

const TEMPLATES = [
  { nature: '{child} tripped on the path and scraped their left knee on the ground.', firstAid: 'Cleaned wound with water and sterile wipe, applied plaster.', kind: 'Accident' },
  { nature: '{child} bumped their head on the edge of the table while standing up from their chair.', firstAid: 'Cold compress applied, monitored for 30 minutes. No loss of consciousness.', kind: 'Accident' },
  { nature: 'During free play, {child} fell from the low climbing frame and landed on their hands.', firstAid: 'Hands checked for swelling, cold compress applied. No swelling noted.', kind: 'Accident' },
  { nature: '{child} was bitten on the forearm by another child during a disagreement over a toy.', firstAid: 'Cleaned area with antiseptic wipe, no skin broken. Monitored for bruising.', kind: 'Incident' },
  { nature: '{child} tripped while running in the hall and fell, cutting their chin on the floor.', firstAid: 'Wound cleaned and butterfly strip applied. Bleeding stopped within 2 minutes.', kind: 'Accident' },
  { nature: '{child} slipped on the wet floor near the sink and bumped their elbow on the wall.', firstAid: 'Cold compress applied to elbow. No swelling noted.', kind: 'Accident' },
  { nature: 'During outdoor play, {child} ran into the fence post and scraped their forehead.', firstAid: 'Cleaned graze, applied small plaster. Child settled quickly.', kind: 'Accident' },
  { nature: '{child} fell from the scooter during outdoor play and grazed both knees.', firstAid: 'Grazed knees cleaned and plasters applied to both knees.', kind: 'Accident' },
  { nature: '{child} was hit in the face by a swinging door and sustained a small cut to their lip.', firstAid: 'Cold compress applied to lip. Bleeding stopped. Monitored for swelling.', kind: 'Accident' },
  { nature: 'During soft play, {child} landed awkwardly and twisted their ankle.', firstAid: 'Cold compress applied, ankle monitored. Child was able to weight-bear after 10 minutes.', kind: 'Accident' },
  { nature: '{child} got their finger caught in the hinge side of the door and bruised two fingers.', firstAid: 'Cold compress applied. No swelling or discolouration after 15 minutes.', kind: 'Accident' },
  { nature: 'During outdoor play, {child} fell while climbing the steps and bumped their nose on the handrail.', firstAid: 'Cold compress. Nose checked — no swelling, no bleeding.', kind: 'Accident' },
  { nature: '{child} and another child collided during free play and {child} banged their forehead.', firstAid: 'Cold compress applied. Small bump noted. Parents informed at collection.', kind: 'Accident' },
  { nature: '{child} got a small splinter from the wooden craft stick in their right index finger.', firstAid: 'Splinter removed with sterile tweezers. Cleaned with antiseptic.', kind: 'Accident' },
  { nature: '{child} fell off the balance beam during PE and landed on their elbow, grazing the skin.', firstAid: 'Elbow cleaned with antiseptic wipe, plaster applied.', kind: 'Accident' },
]

const STAFF = ['Emma', 'Paula', 'Sarah', 'Mark', 'Naomi', 'Jade', 'Tom', 'Rachel', 'Charlotte', 'Ben']

function randomFrom(arr) {
  return arr[Math.floor(Math.random() * arr.length)]
}

function iso(date) {
  return date.toISOString().replace('Z', '')
}

function randomDateInMonth(year, month) {
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const day = Math.floor(Math.random() * daysInMonth) + 1
  const hour = 8 + Math.floor(Math.random() * 9)
  const min = Math.floor(Math.random() * 60)
  return new Date(year, month, day, hour, min)
}

function makeIncident(id, child, month, year, siteId) {
  const template = randomFrom(TEMPLATES)
  const happened = randomDateInMonth(year, month)
  const creator = randomFrom(STAFF)
  return {
    id: `mock-${siteId}-${id}`,
    childName: child,
    kind: template.kind,
    happenedAt: iso(happened),
    createdBy: creator,
    location: randomFrom(LOCATIONS),
    status: 'Sent',
    nature: template.nature.replace(/{child}/g, child.split(' ')[0]),
    firstAid: template.firstAid,
    witnesses: [randomFrom(STAFF.filter(s => s !== creator))],
    siteId,
    siteName: siteId,
    childId: childId(child),
  }
}

export function generateMockIncidents(siteId) {
  const incidents = []
  let counter = 1

  // March 2025 – December 2025 (~10 per month)
  for (let month = 2; month <= 11; month++) {
    const count = 8 + Math.floor(Math.random() * 5)
    for (let i = 0; i < count; i++) {
      incidents.push(makeIncident(counter++, randomFrom(ALL_CHILDREN.slice(3)), month, 2025, siteId))
    }
  }

  // January 2026: regulars + repeat children
  for (let i = 0; i < 8; i++) {
    incidents.push(makeIncident(counter++, randomFrom(ALL_CHILDREN.slice(3)), 0, 2026, siteId))
  }
  for (const child of FREQUENT_CHILDREN) {
    incidents.push(makeIncident(counter++, child, 0, 2026, siteId))
  }

  // February 2026
  for (let i = 0; i < 8; i++) {
    incidents.push(makeIncident(counter++, randomFrom(ALL_CHILDREN.slice(3)), 1, 2026, siteId))
  }
  for (const child of ['Luca Mitchell', 'Evie Davidson']) {
    incidents.push(makeIncident(counter++, child, 1, 2026, siteId))
  }

  // March 2026 (partial — Luca appears twice more)
  for (const child of ['Luca Mitchell', 'Luca Mitchell', 'Evie Davidson', 'Oliver Barnett', 'Amelia Chen']) {
    const template = randomFrom(TEMPLATES)
    const happened = new Date(2026, 2, 1 + Math.floor(Math.random() * 5), 9, 15)
    incidents.push({
      id: `mock-${siteId}-${counter++}`,
      childName: child,
      kind: template.kind,
      happenedAt: iso(happened),
      createdBy: randomFrom(STAFF),
      location: randomFrom(LOCATIONS),
      status: 'Sent',
      nature: template.nature.replace(/{child}/g, child.split(' ')[0]),
      firstAid: template.firstAid,
      witnesses: [randomFrom(STAFF)],
      siteId,
      siteName: siteId,
      childId: childId(child),
    })
  }

  return incidents.sort((a, b) => new Date(a.happenedAt) - new Date(b.happenedAt))
}

const _cache = new Map()
export function getMockIncidents(siteId) {
  if (siteId === 'all') {
    return MOCK_SITES.flatMap(s => getMockIncidents(s.id))
  }
  if (!_cache.has(siteId)) _cache.set(siteId, generateMockIncidents(siteId))
  return _cache.get(siteId)
}
